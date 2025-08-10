import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateVirtualAccountRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  bvn?: string;
  currency: string;
  account_type: string;
  amount: number;
  reference: string;
}

interface FlutterwaveResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    amount: number;
    account_number: string;
    reference: string;
    account_bank_name: string;
    account_type: string;
    status: string;
    currency: string;
    customer_id: string;
    created_datetime: string;
    account_expiration_datetime?: string;
    note?: string;
    meta?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated
    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: Partial<CreateVirtualAccountRequest> = await req.json()

    // Always use authenticated user ID
    const authenticatedUserId = user.id

    // Check if user already has a virtual account
    const { data: existingAccount } = await supabaseClient
      .from('profiles')
      .select('virtual_account_number, virtual_account_bank_name, virtual_account_reference')
      .eq('id', authenticatedUserId)
      .single()

    if (existingAccount?.virtual_account_number) {
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Virtual account already exists',
          data: {
            id: existingAccount.virtual_account_reference || '',
            account_number: existingAccount.virtual_account_number,
            account_bank_name: existingAccount.virtual_account_bank_name || 'WEMA BANK',
            reference: existingAccount.virtual_account_reference || '',
            currency: 'NGN',
            account_type: 'static',
            status: 'active',
            amount: requestData.amount || 0,
            customer_id: authenticatedUserId,
            created_datetime: new Date().toISOString(),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch profile details to fill missing fields
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, phone, bvn, email')
      .eq('id', authenticatedUserId)
      .single()

    const effectiveEmail = requestData.email || profile?.email || user.email || ''
    const effectiveFirstName = requestData.firstName || profile?.first_name || ''
    const effectiveLastName = requestData.lastName || profile?.last_name || ''
    const effectivePhone = requestData.phoneNumber || profile?.phone || undefined
    const effectiveBvn = requestData.bvn || profile?.bvn || undefined

    // Require minimal fields
    if (!effectiveEmail || !effectiveFirstName || !effectiveLastName) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing user profile details (email, first name, last name)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate permanent account requirements
    const wantsPermanent = (requestData.account_type || '').toLowerCase() === 'static'
    if (wantsPermanent && !requestData.bvn) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'BVN is required for permanent virtual accounts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // For dynamic accounts, amount is optional. If provided, we'll include it.

    // Prepare Flutterwave request aligned to v3 virtual account numbers API
    const flutterwaveData = {
      tx_ref: requestData.reference || `${authenticatedUserId}-${Date.now()}`,
      email: effectiveEmail,
      is_permanent: wantsPermanent,
      bvn: effectiveBvn || undefined,
      firstname: effectiveFirstName,
      lastname: effectiveLastName,
      phonenumber: effectivePhone || undefined,
      narration: `${effectiveFirstName} ${effectiveLastName} - StarNetX`,
      // Flutterwave virtual accounts are NGN only
      currency: 'NGN',
      ...(wantsPermanent ? {} : { amount: Number(requestData.amount) })
    }

    // Call Flutterwave API
    const flutterwaveKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    if (!flutterwaveKey) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Flutterwave configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Flutterwave Key (first 10 chars):', flutterwaveKey.substring(0, 10) + '...')
    console.log('Flutterwave Request Data:', JSON.stringify(flutterwaveData, null, 2))

    // Use Flutterwave v3 endpoint (sandbox uses the same host with test keys)
    const flutterwaveUrl = 'https://api.flutterwave.com/v3/virtual-account-numbers'
    
    console.log('Using Flutterwave URL:', flutterwaveUrl)
    
    const flutterwaveResponse = await fetch(flutterwaveUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(flutterwaveData)
    })

    console.log('Flutterwave Response Status:', flutterwaveResponse.status)
    console.log('Flutterwave Response Headers:', Object.fromEntries(flutterwaveResponse.headers.entries()))

    // Always read body as text first to avoid crashes from mislabeled content-type
    const responseText = await flutterwaveResponse.text()
    let flutterwaveResult: FlutterwaveResponse
    try {
      flutterwaveResult = JSON.parse(responseText) as FlutterwaveResponse
    } catch (e) {
      console.error('Failed to parse Flutterwave response as JSON:', responseText)
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid response from Flutterwave API',
          details: responseText.substring(0, 300)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Flutterwave Response Body:', JSON.stringify(flutterwaveResult, null, 2))

    if (flutterwaveResult.status === 'success' && flutterwaveResult.data) {
      const bankName = (flutterwaveResult.data as any).account_bank_name
        || (flutterwaveResult.data as any).bank_name
        || (flutterwaveResult.data as any).account_bank
        || ((flutterwaveResult.data as any).bank && (flutterwaveResult.data as any).bank.name)
        || 'WEMA BANK'
      const referenceValue = (flutterwaveResult.data as any).reference
        || (flutterwaveResult.data as any).tx_ref
        || (flutterwaveResult.data as any).order_ref
        || requestData.reference
      // Save virtual account details to user profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          virtual_account_number: flutterwaveResult.data.account_number,
          virtual_account_bank_name: bankName,
          virtual_account_reference: referenceValue,
          // Persist account holder name for display
          first_name: effectiveFirstName,
          last_name: effectiveLastName,
        })
        .eq('id', authenticatedUserId)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        // Continue anyway, as the account was created successfully
      }

      return new Response(
        JSON.stringify(flutterwaveResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Pass through Flutterwave error details if present, but use 200 so clients can read the message
      const flwMessage = (flutterwaveResult && (flutterwaveResult as any).message) || 'Failed to create virtual account'
      const normalizedMessage = /invalid\s*bvn/i.test(flwMessage) ? 'Invalid BVN' : flwMessage
      return new Response(
        JSON.stringify({
          status: 'error',
          message: normalizedMessage,
          details: (flutterwaveResult as any).errors || (flutterwaveResult as any).data || null,
          flutterwave_status: flutterwaveResponse.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in create-virtual-account function:', error)
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
