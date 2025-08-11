const fetch = require('node-fetch');

const testPayload = {
  "event": "charge.completed",
  "data": {
    "payment_type": "bank_transfer",
    "status": "successful",
    "tx_ref": "TEST-USER-123-1693123456", // Replace with actual virtual_account_reference
    "flw_ref": "FLW-TEST-" + Date.now(),
    "amount": 1000,
    "currency": "NGN",
    "customer": {
      "email": "test@example.com" // Replace with actual user email
    }
  }
};

const webhookUrl = 'https://xgvxtnvdxqqeehjrvkwr.supabase.co/functions/v1/flutterwave-webhook';

async function testWebhook() {
  console.log('🧪 Testing webhook...');
  console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'verif-hash': 'test-signature'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('✅ Status:', response.status);
    const responseText = await response.text();
    console.log('📄 Response:', responseText);
    
    if (response.status === 200) {
      console.log('🎉 Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

console.log('🚀 Starting webhook test...');
testWebhook();
