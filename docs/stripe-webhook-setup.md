# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks for reliable payment confirmation and appointment creation.

## Overview

The application uses two methods to ensure appointments are created after successful payment:

1. **Client-side flow**: When a user completes payment, they are redirected to `/success` page which calls the `/api/create-appointment` endpoint
2. **Webhook flow**: Stripe sends webhook events to `/api/webhooks/stripe` for reliable server-side confirmation

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Setting Up Stripe Webhook

1. **Go to Stripe Dashboard**
   - Navigate to [Stripe Dashboard](https://dashboard.stripe.com)
   - Go to **Developers** > **Webhooks**

2. **Add Endpoint**
   - Click **Add endpoint**
   - Enter your webhook URL:
     - Development: `https://your-domain.com/api/webhooks/stripe`
     - Local testing: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:
       ```bash
       stripe listen --forward-to localhost:3000/api/webhooks/stripe
       ```

3. **Select Events**
   - Select the following events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

4. **Get Webhook Secret**
   - After creating the endpoint, click on it to view details
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## How It Works

### Payment Flow

1. User fills out intake form → Data saved to `sessionStorage`
2. User proceeds to payment page
3. Payment intent is created via `/api/create-payment-intent`
4. User completes payment via Stripe Checkout
5. User is redirected to `/success?payment_intent=pi_xxx`

### Appointment Creation

**Method 1: Client-side (Primary)**
- Success page calls `/api/create-appointment` with payment intent ID
- API verifies payment with Stripe
- Creates appointment in Supabase
- Creates payment record

**Method 2: Webhook (Backup/Reliable)**
- Stripe sends `payment_intent.succeeded` event
- Webhook handler verifies signature
- Updates appointment and payment record status
- Ensures data consistency even if user closes browser

## Testing

### Test Webhook Locally

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy the webhook signing secret from the output and add to `.env.local`

5. Trigger a test payment:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Test Payment Flow

1. Complete intake form
2. Proceed to payment
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Verify appointment is created in Supabase

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook URL is correct and accessible
- Verify webhook secret in `.env.local` matches Stripe dashboard
- Check server logs for webhook errors
- Use Stripe CLI to test webhook delivery

### Appointment Not Created

- Check browser console for errors
- Verify sessionStorage has appointment data
- Check API route logs
- Verify Supabase credentials are correct
- Ensure payment intent status is "succeeded"

### Duplicate Appointments

- The system checks for existing appointments by `payment_intent_id`
- If duplicate is created, check for race conditions
- Verify webhook and client-side calls aren't both creating appointments

## Security Notes

- Webhook signature verification prevents unauthorized requests
- Service role key is only used server-side (never exposed to client)
- Payment verification ensures only successful payments create appointments
- RLS policies on Supabase tables provide additional security

