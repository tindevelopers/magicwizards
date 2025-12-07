# Stripe Integration Summary

## Overview

This document summarizes the complete Stripe integration for the multi-tenant SaaS platform. The integration enables subscription billing, payment processing, and usage tracking for tenants.

## Completed Features

### 1. Database Schema ✅

**Migration File**: `supabase/migrations/20251206120000_create_stripe_tables.sql`

Created the following tables with Row-Level Security (RLS):

- **stripe_customers**: Stores Stripe customer records linked to tenants
- **stripe_products**: Caches Stripe products for faster access
- **stripe_prices**: Caches Stripe pricing information
- **stripe_subscriptions**: Tracks active and historical subscriptions
- **stripe_invoices**: Stores invoice records
- **stripe_payment_methods**: Manages saved payment methods
- **stripe_webhook_events**: Logs all webhook events for debugging

**RLS Policies**:
- Tenants can only view/manage their own data
- Platform Admins can view/manage all data
- Service role bypasses RLS for webhook processing

### 2. Stripe Configuration ✅

**File**: `src/lib/stripe/config.ts`

- Initialized Stripe SDK with API keys
- Created helper functions for amount formatting
- Configured Stripe Connect settings
- Added webhook secret management

### 3. Server Actions ✅

#### Customer Management
**File**: `src/app/actions/stripe/customers.ts`

- `createOrRetrieveCustomer()`: Get or create Stripe customer for tenant
- `getCustomer()`: Fetch customer details
- `updateCustomer()`: Update customer information

#### Subscription Management
**File**: `src/app/actions/stripe/subscriptions.ts`

- `getSubscriptions()`: List all subscriptions for tenant
- `getActiveSubscription()`: Get current active subscription
- `cancelSubscription()`: Cancel a subscription
- `resumeSubscription()`: Resume a canceled subscription
- `updateSubscription()`: Change subscription plan
- `getSubscriptionDetails()`: Get detailed subscription info
- `getUpcomingInvoice()`: Preview next invoice
- `getInvoices()`: List invoice history

#### Product Management
**File**: `src/app/actions/stripe/products.ts`

- `syncProducts()`: Sync Stripe products to database
- `getProducts()`: List all products with prices
- `getProduct()`: Get single product details
- `getPrices()`: List prices for a product

#### Payment Methods
**File**: `src/app/actions/stripe/payment-methods.ts`

- `getPaymentMethods()`: List saved payment methods
- `setDefaultPaymentMethod()`: Set default payment method
- `deletePaymentMethod()`: Remove a payment method
- `createSetupIntent()`: Generate setup intent for adding cards

#### Checkout & Billing Portal
**File**: `src/app/actions/stripe/checkout.ts`

- `createCheckoutSession()`: Create subscription checkout session
- `createBillingPortalSession()`: Generate billing portal link
- `createPaymentSession()`: Create one-time payment session
- `getCheckoutSession()`: Retrieve checkout session details

#### Usage Tracking (Metered Billing)
**File**: `src/app/actions/stripe/usage.ts`

- `recordUsage()`: Record usage for metered subscriptions
- `getUsageRecords()`: Fetch usage history
- `trackUsageEvent()`: Helper to track custom usage events
- `getCurrentUsage()`: Get current billing period usage

### 4. Stripe Connect Integration ✅

**File**: `src/app/actions/stripe/connect.ts`

Enables multi-tenant payment processing where each tenant can receive payments:

- `createConnectAccount()`: Create Express account for tenant
- `getConnectAccountStatus()`: Check onboarding status
- `createConnectAccountLink()`: Generate onboarding/management link
- `deleteConnectAccount()`: Remove Connect account

### 5. Webhook Handler ✅

**File**: `src/app/api/webhooks/stripe/route.ts`

Processes Stripe webhook events:

- **Customer Events**: `customer.created`, `customer.updated`
- **Subscription Events**: `customer.subscription.created`, `updated`, `deleted`
- **Invoice Events**: `invoice.created`, `updated`, `paid`, `payment_failed`
- **Payment Method Events**: `payment_method.attached`, `updated`, `detached`
- **Checkout Events**: `checkout.session.completed`

All events are logged to `stripe_webhook_events` table for debugging.

### 6. User Interface ✅

#### Billing Dashboard
**File**: `src/app/saas/billing/dashboard/page.tsx`

Displays:
- Current subscription status and details
- Upcoming invoice preview
- Saved payment methods
- Recent invoice history
- Quick actions (manage billing, change plan)

#### Plans Page
**File**: `src/app/saas/billing/plans/page.tsx`

Features:
- Display all available products and pricing
- Subscribe to new plans
- Switch between plans
- Current plan indicator
- Pricing comparison

### 7. Tenant Context ✅

**File**: `src/lib/tenant/server.ts`

Server-side utilities for tenant management:

- `getCurrentTenant()`: Get current tenant ID from user session
- `getCurrentTenantDetails()`: Get full tenant information
- `validateTenantAccess()`: Verify user has access to tenant

### 8. Documentation ✅

**File**: `docs/STRIPE_SETUP.md`

Comprehensive setup guide covering:
- Environment variable configuration
- Stripe Dashboard setup
- Product and price creation
- Webhook configuration (local and production)
- Testing procedures
- Production deployment checklist
- Usage tracking setup
- Troubleshooting guide

## Architecture

### Data Flow

```
User → UI Component → Server Action → Stripe API
                                    ↓
                              Database (Cache)
                                    ↓
                              Webhook Handler
                                    ↓
                              Database (Update)
```

### Security

1. **Row-Level Security (RLS)**: All Stripe tables have RLS policies
2. **Permission Checks**: Server actions require `billing.read` or `billing.write` permissions
3. **Tenant Isolation**: Users can only access their own tenant's billing data
4. **Platform Admin Access**: Platform Admins can view all billing data
5. **Webhook Verification**: All webhook events are verified using Stripe signature

### Multi-Tenancy

- Each tenant has their own Stripe customer record
- Subscriptions are linked to tenants via `tenant_id`
- Invoices and payment methods are tenant-scoped
- Platform Admins can manage billing for all tenants

## Environment Variables Required

```bash
# Required
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional (Stripe Connect)
STRIPE_CONNECT_ENABLED=false
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## Usage Examples

### Subscribe to a Plan

```typescript
import { createCheckoutSession } from "@/app/actions/stripe/checkout";

const result = await createCheckoutSession({
  priceId: "price_xxx",
  successUrl: "https://app.com/success",
  cancelUrl: "https://app.com/cancel",
  trialDays: 14, // Optional
});

if (result.success && result.url) {
  window.location.href = result.url;
}
```

### Track Usage (Metered Billing)

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

### Manage Billing

```typescript
import { createBillingPortalSession } from "@/app/actions/stripe/checkout";

const result = await createBillingPortalSession(
  "https://app.com/billing/dashboard"
);

if (result.success && result.url) {
  window.location.href = result.url;
}
```

### Cancel Subscription

```typescript
import { cancelSubscription } from "@/app/actions/stripe/subscriptions";

const result = await cancelSubscription(subscriptionId, true); // true = cancel at period end

if (result.success) {
  console.log("Subscription will cancel at end of billing period");
}
```

## Testing

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

### Local Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
```

## Next Steps

1. **Create Products in Stripe Dashboard**
   - Define your subscription plans
   - Set up pricing (monthly, yearly, etc.)
   - Add product metadata

2. **Sync Products to Database**
   ```bash
   npx tsx scripts/sync-stripe-products.ts
   ```

3. **Configure Webhooks**
   - Set up webhook endpoint in Stripe Dashboard
   - Add webhook secret to environment variables

4. **Test Subscription Flow**
   - Navigate to `/saas/billing/plans`
   - Subscribe using test card
   - Verify subscription in dashboard

5. **Deploy to Production**
   - Switch to live Stripe keys
   - Update webhook endpoint
   - Test with real card

## Maintenance

### Monitoring

- Check `stripe_webhook_events` table for failed events
- Review Stripe Dashboard for payment issues
- Monitor subscription churn and renewal rates

### Syncing Products

Run the sync script periodically or when products change:

```bash
npx tsx scripts/sync-stripe-products.ts
```

### Handling Failed Payments

The webhook handler automatically updates subscription status when payments fail. You can:

1. Send email notifications to customers
2. Display warnings in the UI
3. Implement grace periods before service suspension

## Support

For issues or questions:
- Review `docs/STRIPE_SETUP.md` for detailed setup instructions
- Check Stripe Dashboard logs for payment/webhook issues
- Consult [Stripe Documentation](https://stripe.com/docs)

## Files Modified/Created

### New Files
- `src/lib/stripe/config.ts`
- `src/lib/tenant/server.ts`
- `src/app/actions/stripe/customers.ts`
- `src/app/actions/stripe/subscriptions.ts`
- `src/app/actions/stripe/products.ts`
- `src/app/actions/stripe/payment-methods.ts`
- `src/app/actions/stripe/checkout.ts`
- `src/app/actions/stripe/usage.ts`
- `src/app/actions/stripe/connect.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/saas/billing/dashboard/page.tsx`
- `src/app/saas/billing/plans/page.tsx`
- `supabase/migrations/20251206120000_create_stripe_tables.sql`
- `docs/STRIPE_SETUP.md`
- `docs/STRIPE_INTEGRATION_SUMMARY.md`

### Dependencies Added
- `stripe` - Stripe Node.js SDK
- `@stripe/stripe-js` - Stripe.js for client-side

## Status

✅ All Stripe integration features are complete and ready for use!

The system is now capable of:
- Processing subscription payments
- Managing customer billing
- Tracking usage for metered billing
- Handling webhooks for real-time updates
- Supporting multi-tenant payment isolation
- Enabling Stripe Connect for tenant-to-tenant payments (optional)

