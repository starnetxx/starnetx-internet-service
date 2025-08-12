import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    // Parse payload as JSON
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized');

    // Check for various possible event types and statuses
    const eventType = payload.type || payload.event;
    const eventData = payload.data || payload;
    const status = eventData?.status;
    
    console.log('Event analysis:', {
      eventType,
      status,
      hasData: !!eventData,
      dataKeys: eventData ? Object.keys(eventData) : []
    });

    // Accept multiple event types that could indicate successful payment
    const validEvents = ['charge.completed', 'transfer.completed', 'payment.completed'];
    const validStatuses = ['succeeded', 'successful', 'completed'];
    
    const isValidEvent = validEvents.includes(eventType);
    const isValidStatus = validStatuses.includes(status);
    
    console.log('Event validation:', { isValidEvent, isValidStatus });

    if (!isValidEvent || !isValidStatus) {
      console.log('Not a valid payment completion event, ignoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'Event ignored - not a payment completion'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Extract relevant data from the webhook
    const flw_ref = eventData.id || eventData.flw_ref;
    const tx_ref = eventData.reference || eventData.tx_ref;
    const amount = eventData.amount;
    const currency = eventData.currency;
    const email = eventData.customer?.email;

    console.log('Extracted payment data:', { 
      flw_ref, 
      tx_ref, 
      amount, 
      currency, 
      email,
      hasCustomer: !!eventData.customer
    });

    if (!amount || !email) {
      console.error('Missing required payment data');
      throw new Error('Missing required payment data (amount or email)');
    }

    // Check if this transaction has already been processed (idempotency)
    if (flw_ref) {
      const { data: existingTransaction, error: txCheckError } = await supabase
        .from("transactions")
        .select("id")
        .eq("flutterwave_tx_ref", flw_ref)
        .eq("status", "success")
        .maybeSingle();

      if (txCheckError) {
        console.error("Error checking for existing transaction:", txCheckError);
      }

      if (existingTransaction) {
        console.log("Transaction already processed:", flw_ref);
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
    }

    // Find the user by the virtual account reference (tx_ref) or email
    let userProfile;
    
    if (tx_ref) {
      const { data: profileData, error: userError } = await supabase
        .from("profiles")
        .select("id, wallet_balance, email")
        .eq("virtual_account_reference", tx_ref)
        .single();

      if (userError) {
        console.log("User not found by virtual_account_reference:", tx_ref);
      } else {
        userProfile = profileData;
        console.log("User found by virtual account reference");
      }
    }

    // If not found by tx_ref, try email
    if (!userProfile && email) {
      console.log("Trying to find user by email:", email);
      const { data: userByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, wallet_balance, email")
        .eq("email", email)
        .single();

      if (emailError || !userByEmail) {
        console.error("Error finding user profile by email:", emailError);
      } else {
        userProfile = userByEmail;
        console.log("User found by email fallback");
      }
    }

    if (!userProfile) {
      throw new Error("User profile not found for this transaction");
    }

    // Verify the email matches (additional security check)
    if (userProfile.email !== email) {
      console.error("Email mismatch:", userProfile.email, email);
      throw new Error("Email mismatch in transaction");
    }

    console.log("Processing payment for user:", {
      user_id: userProfile.id,
      current_balance: userProfile.wallet_balance,
      payment_amount: amount
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
      console.error("Error fetching charge settings:", chargeError);
      // Continue without charges if settings can't be fetched
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

      console.log("Charge settings:", {
        chargesEnabled,
        chargeType,
        chargeValue,
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
        
        console.log("Charges applied:", {
          originalAmount,
          chargeAmount,
          amountToCredit
        });
      }
    }

    // Update user's wallet balance
    const newBalance = parseFloat(userProfile.wallet_balance || '0') + amountToCredit;
    console.log("Updating wallet balance:", {
      from: userProfile.wallet_balance,
      to: newBalance,
      added: amountToCredit
    });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", userProfile.id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      throw new Error("Failed to update wallet balance");
    }

    console.log("Wallet balance updated successfully");

    // Create a transaction record
    const transactionData = {
      user_id: userProfile.id,
      type: "wallet_funding",
      amount: originalAmount,
      status: "success",
      reference: `FLW-${flw_ref || tx_ref || Date.now()}`,
      flutterwave_tx_ref: flw_ref,
      details: {
        payment_method: "bank_transfer",
        currency,
        flutterwave_data: eventData,
        service_charge: chargeAmount > 0 ? {
          amount: chargeAmount,
          type: chargeSettings?.find((s) => s.key === 'funding_charge_type')?.value || 'percentage',
          value: parseFloat(chargeSettings?.find((s) => s.key === 'funding_charge_value')?.value || '0'),
          original_amount: originalAmount,
          credited_amount: amountToCredit
        } : null
      }
    };

    console.log("Creating transaction record:", transactionData);

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([transactionData]);

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError);
      throw new Error("Failed to create transaction record");
    }

    console.log("Transaction record created successfully");

    // Log the successful wallet funding
    await supabase.from("admin_logs").insert([
      {
        admin_id: null,
        action: "wallet_funding_webhook",
        details: {
          user_id: userProfile.id,
          amount: originalAmount,
          tx_ref,
          flw_ref,
          previous_balance: userProfile.wallet_balance,
          new_balance: newBalance,
          service_charge: chargeAmount > 0 ? chargeAmount : null
        }
      }
    ]);

    console.log("Admin log created successfully");

    console.log("=== WEBHOOK PROCESSED SUCCESSFULLY ===");
    console.log("User wallet funded:", {
      user_id: userProfile.id,
      amount: originalAmount,
      new_balance: newBalance,
      transaction_id: flw_ref || tx_ref
    });

    // Return success response (200 status required by Flutterwave)
    return new Response(JSON.stringify({
      success: true,
      message: "Wallet funded successfully",
      details: {
        user_id: userProfile.id,
        amount: originalAmount,
        new_balance: newBalance
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("=== WEBHOOK ERROR ===");
    console.error("Error processing webhook:", error);
    console.error("Error stack:", error.stack);
    
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
