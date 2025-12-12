# Stripe Integration - Quick Start Guide

## 🎯 Overview

This SaaS platform includes a complete Stripe integration for subscription billing, payment processing, and usage tracking. The system is multi-tenant aware and includes all necessary security measures.

## ✅ What's Included

- ✅ Subscription management (create, update, cancel, resume)
- ✅ Payment processing with Stripe Checkout
- ✅ Billing portal for customers to manage their subscriptions
- ✅ Invoice management and history
- ✅ Payment method management
- ✅ Usage tracking for metered billing
- ✅ Stripe Connect for multi-tenant payments (optional)
- ✅ Webhook handling for real-time updates
- ✅ Multi-tenant data isolation with RLS
- ✅ Complete UI for billing dashboard and plan selection

## 🚀 Quick Setup (5 Minutes)

### 1. Get Your Stripe Keys

1. Sign up at [stripe.com](https://stripe.com) (free)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 2. Add Environment Variables

Create or update `.env.local`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Webhook Secret (get this in step 4)
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### 3. Run Database Migration

```bash
# Reset database to apply Stripe tables
supabase db reset
```

This creates all necessary tables:
- `stripe_customers`
- `stripe_products`
- `stripe_prices`
- `stripe_subscriptions`
- `stripe_invoices`
- `stripe_payment_methods`
- `stripe_webhook_events`
- `stripe_usage_records`
- `stripe_connect_accounts`

### 4. Set Up Webhooks (Local Development)

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`) and add it to `.env.local`.

### 5. Create Products in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Click **Add product**
3. Create your subscription plans (e.g., "Starter", "Pro", "Enterprise")
4. Set pricing (monthly, yearly, etc.)

### 6. Sync Products to Database

```bash
npx tsx scripts/sync-stripe-products.ts
```

### 7. Test the Integration

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/saas/billing/plans`
3. Select a plan and click **Subscribe**
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. View subscription in: `http://localhost:3000/saas/billing/dashboard`

## 📁 File Structure

```
src/
├── app/
│   ├── actions/stripe/
│   │   ├── customers.ts          # Customer management
│   │   ├── subscriptions.ts      # Subscription CRUD
│   │   ├── products.ts           # Product sync & retrieval
│   │   ├── payment-methods.ts    # Payment method management
│   │   ├── checkout.ts           # Checkout & billing portal
│   │   ├── usage.ts              # Usage tracking
│   │   └── connect.ts            # Stripe Connect (optional)
│   ├── api/webhooks/stripe/
│   │   └── route.ts              # Webhook handler
│   └── saas/billing/
│       ├── dashboard/page.tsx    # Billing dashboard UI
│       └── plans/page.tsx        # Plan selection UI
├── lib/
│   ├── stripe/
│   │   └── config.ts             # Stripe SDK initialization
│   └── tenant/
│       └── server.ts             # Tenant context utilities
└── supabase/migrations/
    └── 20251206120000_create_stripe_tables.sql
```

## 🎨 UI Pages

### Billing Dashboard
**URL**: `/saas/billing/dashboard`

Shows:
- Current subscription status
- Upcoming invoice preview
- Payment methods
- Recent invoices
- Quick actions (manage billing, change plan)

### Plans Page
**URL**: `/saas/billing/plans`

Shows:
- All available subscription plans
- Pricing for each plan
- Subscribe/switch plan buttons
- Current plan indicator

## 🔐 Security Features

1. **Row-Level Security (RLS)**: All Stripe tables have RLS policies
2. **Permission Checks**: All server actions require `billing.read` or `billing.write` permissions
3. **Tenant Isolation**: Users can only access their own tenant's billing data
4. **Platform Admin Access**: Platform Admins can view all billing data
5. **Webhook Verification**: All webhook events are verified using Stripe signature

## 📊 Usage Tracking (Metered Billing)

Track usage for metered billing (e.g., API calls, storage):

```typescript
import { trackUsageEvent } from "@/app/actions/stripe/usage";

// Track API call
await trackUsageEvent({
  eventType: "api_call",
  quantity: 1,
  metadata: { endpoint: "/api/data" },
});

// Track storage usage
await trackUsageEvent({
  eventType: "storage",
  quantity: 1024, // MB
});
```

## 🧪 Testing

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Test Webhooks

```bash
# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger payment_method.attached
```

## 🚢 Production Deployment

### 1. Switch to Live Mode

1. Toggle to **Live mode** in Stripe Dashboard
2. Copy live API keys (start with `pk_live_` and `sk_live_`)
3. Update production environment variables

### 2. Set Up Production Webhook

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter: `https://yourdomain.com/api/webhooks/stripe`
4. Select all events or specific ones
5. Copy the signing secret and add to production env vars

### 3. Create Live Products

1. Create your products in live mode
2. Run sync script in production

### 4. Test with Real Card

Use a real card to test the full flow in production.

## 🔧 Common Operations

### Cancel Subscription

```typescript
import { cancelSubscription } from "@/app/actions/stripe/subscriptions";

await cancelSubscription(subscriptionId, true); // true = cancel at period end
```

### Change Plan

```typescript
import { updateSubscription } from "@/app/actions/stripe/subscriptions";

await updateSubscription(subscriptionId, newPriceId);
```

### Open Billing Portal

```typescript
import { createBillingPortalSession } from "@/app/actions/stripe/checkout";

const result = await createBillingPortalSession(returnUrl);
if (result.success && result.url) {
  window.location.href = result.url;
}
```

## 📚 Documentation

- **Setup Guide**: `docs/STRIPE_SETUP.md` - Detailed setup instructions
- **Integration Summary**: `docs/STRIPE_INTEGRATION_SUMMARY.md` - Complete feature overview
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)

## 🐛 Troubleshooting

### Webhooks Not Working

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook logs in Stripe Dashboard
- Ensure endpoint is publicly accessible (production)

### Subscription Not Showing

- Check `stripe_webhook_events` table for errors
- Verify RLS policies allow user access
- Look for errors in webhook event logs

### Payment Fails

- Check Stripe Dashboard for decline reason
- Verify card details are correct
- Ensure sufficient funds

## 🆘 Support

- Review `docs/STRIPE_SETUP.md` for detailed instructions
- Check Stripe Dashboard logs
- Consult [Stripe Documentation](https://stripe.com/docs)

## 🎉 You're All Set!

Your Stripe integration is ready to process payments. Start by creating products in Stripe Dashboard and syncing them to your database.

**Next Steps:**
1. Create your subscription plans in Stripe
2. Sync products to database
3. Test the subscription flow
4. Customize the UI to match your brand
5. Deploy to production

Happy billing! 💰




