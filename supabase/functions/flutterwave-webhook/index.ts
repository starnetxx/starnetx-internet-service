import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, flutterwave-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Helper function to verify Flutterwave webhook signature
async function verifyFlutterwaveSignature(rawBody: string, signature: string, secretHash: string): Promise<boolean> {
  try {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(rawBody);
    
    // Import crypto key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretHash),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the data
    const signedData = await crypto.subtle.sign('HMAC', key, data);
    
    // Convert to base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
    
    const computedSignature = arrayBufferToBase64(signedData);
    return computedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log("=== FLUTTERWAVE WEBHOOK RECEIVED ===");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    // Get the raw body for signature verification
    const rawBody = await req.text();
    console.log('Raw webhook body:', rawBody);
    
    // Parse payload as JSON
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse JSON payload:', error);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid JSON payload"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log('Parsed webhook payload:', JSON.stringify(payload, null, 2));

    // Get Flutterwave secret hash for verification
    const secretHash = Deno.env.get('FLW_SECRET_HASH');
    if (!secretHash) {
      console.error('FLW_SECRET_HASH not configured');
      return new Response(JSON.stringify({
        success: false,
        error: "Webhook secret not configured"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify webhook signature
    const flutterwaveSignature = req.headers.get('flutterwave-signature');
    if (flutterwaveSignature) {
      console.log('Verifying Flutterwave signature...');
      const isValidSignature = await verifyFlutterwaveSignature(rawBody, flutterwaveSignature, secretHash);
      
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid signature"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      console.log('Signature verification successful');
    } else {
      console.log('No signature header found, skipping verification');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized');

    // Extract event details
    const eventType = payload.type;
    const eventData = payload.data;
    const webhookId = payload.id;
    const timestamp = payload.timestamp;
    
    console.log('Event details:', {
      eventType,
      webhookId,
      timestamp,
      hasData: !!eventData,
      dataKeys: eventData ? Object.keys(eventData) : []
    });

    // Check if this is a charge.completed event for successful payment
    if (eventType !== 'charge.completed') {
      console.log('Not a charge.completed event, ignoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'Event ignored - not a charge.completed event'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if payment is successful
    if (eventData?.status !== 'succeeded') {
      console.log('Payment not successful, ignoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'Event ignored - payment not successful'
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extract payment data
    const {
      id: chargeId,
      amount,
      currency,
      reference: txRef,
      customer,
      payment_method,
      created_datetime
    } = eventData;

    const customerEmail = customer?.email;
    
    console.log('Payment data extracted:', {
      chargeId,
      amount,
      currency,
      txRef,
      customerEmail,
      paymentMethod: payment_method?.type,
      createdDatetime: created_datetime
    });

    if (!amount || !customerEmail || !txRef) {
      console.error('Missing required payment data');
      throw new Error('Missing required payment data (amount, email, or reference)');
    }

    // Check if this transaction has already been processed (idempotency)
    const { data: existingTransaction, error: txCheckError } = await supabase
      .from("transactions")
      .select("id")
      .eq("flutterwave_tx_ref", chargeId)
      .eq("status", "success")
      .maybeSingle();

    if (txCheckError) {
      console.error("Error checking for existing transaction:", txCheckError);
    }

    if (existingTransaction) {
      console.log("Transaction already processed:", chargeId);
      return new Response(JSON.stringify({
        success: true,
        message: "Transaction already processed"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find the user by the virtual account reference (txRef)
    let userProfile;
    const { data: profileData, error: userError } = await supabase
      .from("profiles")
      .select("id, wallet_balance, email, virtual_account_reference")
      .eq("virtual_account_reference", txRef)
      .single();

    if (userError) {
      console.log("User not found by virtual_account_reference:", txRef);
      
      // Try to find by email as fallback
      const { data: userByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, wallet_balance, email, virtual_account_reference")
        .eq("email", customerEmail)
        .single();

      if (emailError || !userByEmail) {
        console.error("Error finding user profile:", userError);
        throw new Error("User profile not found for this transaction reference");
      }
      
      userProfile = userByEmail;
      console.log("User found by email fallback");
    } else {
      userProfile = profileData;
      console.log("User found by virtual account reference");
    }

    // Verify the email matches (additional security check)
    if (userProfile.email !== customerEmail) {
      console.error("Email mismatch:", userProfile.email, customerEmail);
      throw new Error("Email mismatch in transaction");
    }

    console.log("Processing payment for user:", {
      user_id: userProfile.id,
      current_balance: userProfile.wallet_balance,
      payment_amount: amount,
      virtual_account_ref: userProfile.virtual_account_reference
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
      reference: `FLW-${chargeId}`,
      flutterwave_tx_ref: chargeId,
      details: {
        payment_method: payment_method?.type || "bank_transfer",
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
          tx_ref: txRef,
          flw_ref: chargeId,
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
      transaction_id: chargeId,
      virtual_account_ref: txRef
    });

    // Return success response (200 status required by Flutterwave)
    return new Response(JSON.stringify({
      success: true,
      message: "Wallet funded successfully",
      details: {
        user_id: userProfile.id,
        amount: originalAmount,
        new_balance: newBalance,
        transaction_id: chargeId
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
