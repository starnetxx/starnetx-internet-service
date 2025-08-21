import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log("Webhook started - processing request");
    
    // Get Flutterwave secret key for verification
    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    console.log("Flutterwave secret key exists:", !!flutterwaveSecretKey);
    
    if (!flutterwaveSecretKey) {
      throw new Error("Flutterwave secret key not configured");
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    console.log("Supabase URL exists:", !!supabaseUrl);
    console.log("Supabase service key exists:", !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client created successfully");

    // Get the signature from the request headers
    const signature = req.headers.get("verif-hash");
    console.log("Signature header:", signature);
    
    // Parse webhook payload
    let payload;
    try {
      const rawBody = await req.text();
      console.log("Raw body received, length:", rawBody.length);
      payload = JSON.parse(rawBody);
      console.log("Payload parsed successfully");
    } catch (error) {
      console.error("JSON parse error:", error);
      throw new Error("Invalid JSON payload");
    }

    // Quick validation - exit early if not a bank transfer
    if (payload.event !== "charge.completed" || 
        payload.data?.payment_type !== "bank_transfer" || 
        payload.data?.status !== "successful") {
      
      console.log("Event ignored - not a successful bank transfer");
      return new Response(JSON.stringify({
        success: true,
        message: "Event ignored - not a successful bank transfer"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Processing bank transfer event");

    // Extract data
    const { tx_ref, flw_ref, amount, currency, customer } = payload.data;
    const email = customer?.email;

    console.log("Extracted data:", { tx_ref, flw_ref, amount, currency, email });

    if (!tx_ref || !flw_ref || !amount || !email) {
      throw new Error("Missing required fields in webhook payload");
    }

    // FAST: Check if transaction already processed (idempotency)
    console.log("Checking for existing transaction...");
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("flutterwave_tx_ref", flw_ref)
      .eq("status", "success")
      .maybeSingle();

    if (existingTransaction) {
      console.log("Transaction already processed");
      return new Response(JSON.stringify({
        success: true,
        message: "Transaction already processed"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // FAST: Find user by virtual account reference or email
    console.log("Finding user profile...");
    let userProfile;
    const { data: profileData, error: userError } = await supabase
      .from("profiles")
      .select("id, wallet_balance, email")
      .eq("virtual_account_reference", tx_ref)
      .single();

    if (userError || !profileData) {
      console.log("User not found by virtual_account_reference, trying email...");
      // Fallback to email lookup
      const { data: userByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, wallet_balance, email")
        .eq("email", email)
        .single();

      if (emailError || !userByEmail) {
        console.error("User not found by email either");
        throw new Error(`User profile not found for tx_ref: ${tx_ref} or email: ${email}`);
      }
      
      userProfile = userByEmail;
      console.log("User found by email");
    } else {
      userProfile = profileData;
      console.log("User found by virtual_account_reference");
    }

    // Verify email match
    if (userProfile.email !== email) {
      throw new Error("Email mismatch in transaction");
    }

    // FAST: Calculate new balance (no charges)
    const originalAmount = parseFloat(amount);
    const currentBalance = parseFloat(userProfile.wallet_balance || '0');
    const newBalance = currentBalance + originalAmount;

    console.log("Balance calculation:", { currentBalance, originalAmount, newBalance });

    // FAST: Update wallet balance
    console.log("Updating wallet balance...");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", userProfile.id);

    if (updateError) {
      console.error("Wallet update error:", updateError);
      throw new Error("Failed to update wallet balance");
    }

    console.log("Wallet balance updated successfully");

    // FAST: Create transaction record
    console.log("Creating transaction record...");
    const transactionData = {
      user_id: userProfile.id,
      type: "wallet_funding",
      amount: originalAmount,
      status: "success",
      reference: `FLW-${flw_ref}`,
      flutterwave_tx_ref: flw_ref,
      details: {
        payment_method: "bank_transfer",
        currency,
        tx_ref,
        note: "Full amount credited - no service charges"
      }
    };

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([transactionData]);

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      throw new Error("Failed to create transaction record");
    }

    console.log("Transaction record created successfully");

    // FAST: Create admin log (non-blocking)
    console.log("Creating admin log...");
    try {
      await supabase.from("admin_logs").insert([
        {
          admin_id: null,
          action: "wallet_funding_webhook",
          details: {
            user_id: userProfile.id,
            amount: originalAmount,
            tx_ref,
            flw_ref,
            previous_balance: currentBalance,
            new_balance: newBalance,
            note: "Full amount credited - no service charges"
          }
        }
      ]);
      console.log("Admin log created successfully");
    } catch (logError) {
      // Log error but don't fail the webhook
      console.error("Admin log creation failed:", logError);
    }

    console.log("Webhook completed successfully");

    // Return success response immediately
    return new Response(JSON.stringify({
      success: true,
      message: "Wallet funded successfully - full amount credited",
      data: {
        user_id: userProfile.id,
        amount_credited: originalAmount,
        new_balance: newBalance,
        transaction_ref: `FLW-${flw_ref}`,
        note: "No service charges applied"
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to process webhook"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});