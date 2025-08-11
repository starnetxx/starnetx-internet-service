import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  console.log(`🔔 Webhook received: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("📋 Handling CORS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Log all headers for debugging
    console.log("📥 Request headers:", Object.fromEntries(req.headers.entries()));

    // Get Flutterwave secret key for verification
    const flutterwaveSecretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!flutterwaveSecretKey) {
      console.error("❌ Flutterwave secret key not configured");
      throw new Error("Flutterwave secret key not configured");
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase configuration missing");
      throw new Error("Supabase configuration missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase client initialized");

    // Get the signature from the request headers
    const signature = req.headers.get("verif-hash");
    console.log("🔐 Webhook signature received:", signature ? "Yes" : "No");
    
    // Parse webhook payload first to get the data
    let payload;
    try {
      const rawBody = await req.text();
      console.log("📦 Raw webhook payload:", rawBody);
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("❌ Failed to parse webhook payload:", error);
      throw new Error("Invalid JSON payload");
    }

    // In production, verify the signature (uncomment for production)
    /*
    if (!signature) {
      console.error("❌ Missing webhook signature");
      return new Response(
        JSON.stringify({ success: false, error: "Missing signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify signature matches Flutterwave's hash
    const crypto = await import("node:crypto");
    const hash = crypto.createHmac("sha256", flutterwaveSecretKey).update(JSON.stringify(payload)).digest("hex");
    
    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    */

    console.log("📋 Webhook payload processed:", {
      event: payload.event,
      payment_type: payload.data?.payment_type,
      status: payload.data?.status,
      tx_ref: payload.data?.tx_ref,
      flw_ref: payload.data?.flw_ref
    });

    // Verify this is a charge.completed event for a bank transfer
    if (payload.event !== "charge.completed" || 
        payload.data?.payment_type !== "bank_transfer" || 
        payload.data?.status !== "successful") {
      
      console.log("ℹ️ Not a successful bank transfer event, ignoring");
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

    // Extract relevant data from the webhook
    const { tx_ref, flw_ref, amount, currency, customer } = payload.data;
    const email = customer?.email;

    if (!tx_ref || !flw_ref || !amount || !email) {
      console.error("❌ Missing required fields in webhook data:", {
        tx_ref: !!tx_ref,
        flw_ref: !!flw_ref,
        amount: !!amount,
        email: !!email
      });
      throw new Error("Missing required fields in webhook payload");
    }

    console.log("💰 Processing transaction:", {
      tx_ref,
      flw_ref,
      amount: parseFloat(amount),
      currency,
      email
    });

    // Check if this transaction has already been processed (idempotency)
    const { data: existingTransaction, error: txCheckError } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("flutterwave_tx_ref", flw_ref)
      .eq("status", "success")
      .maybeSingle();

    if (txCheckError) {
      console.error("❌ Error checking for existing transaction:", txCheckError);
    }

    if (existingTransaction) {
      console.log("ℹ️ Transaction already processed:", flw_ref);
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

    // Find the user by the virtual account reference (tx_ref)
    console.log("🔍 Looking up user by virtual_account_reference:", tx_ref);
    
    const { data: profileData, error: userError } = await supabase
      .from("profiles")
      .select("id, wallet_balance, email, first_name, last_name")
      .eq("virtual_account_reference", tx_ref)
      .single();

    let userProfile = profileData;

    if (userError || !userProfile) {
      console.log("⚠️ User not found by virtual_account_reference, trying email fallback");
      
      // Try to find by email as a fallback
      const { data: userByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, wallet_balance, email, first_name, last_name")
        .eq("email", email)
        .single();

      if (emailError || !userByEmail) {
        console.error("❌ User not found by either method:", {
          virtualAccountError: userError?.message,
          emailError: emailError?.message
        });
        throw new Error(`User profile not found for tx_ref: ${tx_ref} or email: ${email}`);
      }
      
      console.log("✅ User found by email fallback");
      userProfile = userByEmail;
    }

    // Verify the email matches (additional security check)
    if (userProfile.email !== email) {
      console.error("❌ Email mismatch:", {
        profileEmail: userProfile.email,
        webhookEmail: email
      });
      throw new Error("Email mismatch in transaction");
    }

    console.log("👤 User found:", {
      id: userProfile.id,
      email: userProfile.email,
      currentBalance: userProfile.wallet_balance
    });

    // Get funding charge settings
    const { data: chargeSettings, error: chargeError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "funding_charge_enabled",
        "funding_charge_type", 
        "funding_charge_value",
        "funding_charge_min_deposit",
        "funding_charge_max_deposit"
      ]);

    if (chargeError) {
      console.error("⚠️ Error fetching charge settings:", chargeError);
    }

    // Process funding charges if enabled
    let chargeAmount = 0;
    let originalAmount = parseFloat(amount);
    let amountToCredit = originalAmount;

    if (chargeSettings && chargeSettings.length > 0) {
      const settings = {};
      chargeSettings.forEach((setting) => {
        settings[setting.key] = setting.value;
      });

      const chargesEnabled = settings.funding_charge_enabled === 'true';
      const chargeType = settings.funding_charge_type || 'percentage';
      const chargeValue = parseFloat(settings.funding_charge_value || '0');
      const minDeposit = parseFloat(settings.funding_charge_min_deposit || '0');
      const maxDeposit = parseFloat(settings.funding_charge_max_deposit || '0');

      console.log("💳 Charge settings:", {
        enabled: chargesEnabled,
        type: chargeType,
        value: chargeValue,
        minDeposit,
        maxDeposit
      });

      // Apply charges if enabled and amount is within range
      if (chargesEnabled && chargeValue > 0 && 
          (minDeposit === 0 || originalAmount >= minDeposit) && 
          (maxDeposit === 0 || originalAmount <= maxDeposit)) {
        
        if (chargeType === 'percentage') {
          chargeAmount = originalAmount * (chargeValue / 100);
        } else {
          chargeAmount = chargeValue;
        }
        
        // Ensure charge doesn't exceed the deposit amount
        chargeAmount = Math.min(chargeAmount, originalAmount);
        amountToCredit = originalAmount - chargeAmount;

        console.log("💰 Service charge applied:", {
          originalAmount,
          chargeAmount,
          amountToCredit
        });
      }
    }

    // Update user's wallet balance
    const currentBalance = parseFloat(userProfile.wallet_balance || '0');
    const newBalance = currentBalance + amountToCredit;
    
    console.log("💼 Updating wallet balance:", {
      previous: currentBalance,
      adding: amountToCredit,
      new: newBalance
    });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", userProfile.id);

    if (updateError) {
      console.error("❌ Error updating wallet balance:", updateError);
      throw new Error("Failed to update wallet balance");
    }

    // Create a transaction record
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
        flutterwave_data: payload.data,
        service_charge: chargeAmount > 0 ? {
          amount: chargeAmount,
          type: chargeSettings?.find((s) => s.key === 'funding_charge_type')?.value || 'percentage',
          value: parseFloat(chargeSettings?.find((s) => s.key === 'funding_charge_value')?.value || '0'),
          original_amount: originalAmount,
          credited_amount: amountToCredit
        } : null
      }
    };

    console.log("📝 Creating transaction record");
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([transactionData]);

    if (transactionError) {
      console.error("❌ Error creating transaction record:", transactionError);
      throw new Error("Failed to create transaction record");
    }

    // Log the successful wallet funding
    console.log("📊 Creating admin log");
    await supabase.from("admin_logs").insert([
      {
        admin_id: null,
        action: "wallet_funding_webhook",
        details: {
          user_id: userProfile.id,
          user_email: userProfile.email,
          amount: originalAmount,
          tx_ref,
          flw_ref,
          previous_balance: currentBalance,
          new_balance: newBalance,
          service_charge: chargeAmount > 0 ? chargeAmount : null,
          timestamp: new Date().toISOString()
        }
      }
    ]);

    console.log("🎉 Webhook processing completed successfully");

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Wallet funded successfully",
      data: {
        user_id: userProfile.id,
        amount_credited: amountToCredit,
        new_balance: newBalance,
        transaction_ref: `FLW-${flw_ref}`
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("💥 Webhook processing error:", error);
    
    // Log error for debugging
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to process webhook",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});