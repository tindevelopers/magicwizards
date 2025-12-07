# Stripe Integration Setup Guide

This guide will help you set up Stripe for billing and subscriptions in your multi-tenant SaaS application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Stripe Dashboard Setup](#stripe-dashboard-setup)
4. [Database Migration](#database-migration)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

## Prerequisites

- A Stripe account (sign up at [stripe.com](https://stripe.com))
- Supabase project set up and running
- Node.js and npm installed

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (test mode)

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook signing secret

# Stripe Connect (optional, for multi-tenant payments)
STRIPE_CONNECT_ENABLED=false # Set to true to enable Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_... # Your Stripe Connect client ID
```

### Getting Your API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**
4. For test mode, use the keys starting with `pk_test_` and `sk_test_`
5. For production, use the keys starting with `pk_live_` and `sk_live_`

## Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to **Products** in your Stripe Dashboard
2. Click **Add product**
3. Fill in the product details:
   - **Name**: e.g., "Pro Plan"
   - **Description**: Brief description of the plan
   - **Pricing**: Set up one or more prices
     - **Recurring**: For subscriptions (monthly, yearly, etc.)
     - **One-time**: For one-time payments
4. Add metadata if needed (e.g., `features: "unlimited_users,priority_support"`)
5. Click **Save product**

### 2. Sync Products to Database

After creating products in Stripe, sync them to your database:

```bash
# Run the sync script (you'll need to create this)
npx tsx scripts/sync-stripe-products.ts
```

Or use the admin UI to sync products (if implemented).

### 3. Enable Stripe Connect (Optional)

If you want to enable multi-tenant payments where each tenant can receive payments:

1. Go to **Connect** → **Settings** in your Stripe Dashboard
2. Enable **Express accounts**
3. Set up your **Branding** and **Business details**
4. Copy your **Client ID** and add it to `STRIPE_CONNECT_CLIENT_ID`
5. Set `STRIPE_CONNECT_ENABLED=true` in your `.env.local`

## Database Migration

The Stripe tables are created automatically when you run the migration:

```bash
supabase db reset
```

This creates the following tables:
- `stripe_customers` - Stripe customer records
- `stripe_products` - Cached Stripe products
- `stripe_prices` - Cached Stripe prices
- `stripe_subscriptions` - Active and past subscriptions
- `stripe_invoices` - Invoice records
- `stripe_payment_methods` - Saved payment methods
- `stripe_webhook_events` - Webhook event log

## Webhook Configuration

Webhooks allow Stripe to notify your application of events (e.g., subscription created, payment succeeded).

### Local Development

For local testing, use the Stripe CLI:

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Log in to your Stripe account:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add it to `STRIPE_WEBHOOK_SECRET`

### Production

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select the events to listen to (or select "Select all events"):
   - `customer.created`
   - `customer.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.updated`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.updated`
   - `payment_method.detached`
   - `checkout.session.completed`
5. Copy the **Signing secret** and add it to your production environment variables

## Testing

### Test Cards

Use these test card numbers in test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Test Subscription Flow

1. Navigate to `/saas/billing/plans`
2. Select a plan and click **Subscribe**
3. Enter test card details
4. Complete the checkout
5. Verify the subscription appears in `/saas/billing/dashboard`

### Test Webhooks

1. Make sure the Stripe CLI is running (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
2. Trigger test events:
   ```bash
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   ```
3. Check your application logs and database to verify the events were processed

## Production Deployment

### 1. Switch to Live Mode

1. In your Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Copy your live API keys
3. Update your production environment variables with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

### 2. Update Webhook Endpoint

1. Create a webhook endpoint in live mode (see [Webhook Configuration](#production) above)
2. Update `STRIPE_WEBHOOK_SECRET` with the live webhook signing secret

### 3. Verify Products

1. Ensure your products and prices are created in live mode
2. Run the sync script in production to cache products in your database

### 4. Test in Production

1. Use a real card to test the full flow
2. Monitor the Stripe Dashboard for events and payments
3. Check webhook logs to ensure events are being processed

## Usage Tracking (Metered Billing)

If you're using metered billing (e.g., charging per API call, per GB of storage):

1. Create a product with **Usage is metered** pricing in Stripe
2. Use the `trackUsageEvent` function to record usage:
   ```typescript
   import { trackUsageEvent } from "@/app/actions/stripe/usage";

   await trackUsageEvent({
     eventType: "api_call",
     quantity: 1,
     metadata: { endpoint: "/api/data" },
   });
   ```
3. View usage in `/saas/billing/dashboard` or Stripe Dashboard

## Troubleshooting

### Webhook Events Not Being Received

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check that your webhook endpoint is publicly accessible (for production)
- Review webhook logs in Stripe Dashboard → **Developers** → **Webhooks**

### Subscription Not Showing Up

- Check the `stripe_webhook_events` table to see if the event was received
- Look for errors in the `error_message` column
- Ensure RLS policies allow the user to read their subscription data

### Payment Fails

- Check the Stripe Dashboard for declined payments
- Verify the card details are correct
- Ensure the customer has sufficient funds

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

## Support

For issues related to this integration, please contact your development team or refer to the Stripe documentation.
