# Plaid Data Transparency Messaging (DTM) Configuration

## What is DTM?

Data Transparency Messaging (DTM) is a Plaid requirement for production environments. It helps users understand how their financial data will be used.

## Error Message

If you see: "At least one Data Transparency Messaging use case if require to be configured"

This means you need to configure DTM use cases either:
1. In the Plaid Dashboard (recommended)
2. In your code (already added)

## Solution 1: Configure in Plaid Dashboard (Recommended)

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/)
2. Navigate to **Team Settings** → **Link Customization**
3. Find the **Data Transparency Messaging** section
4. Click **Configure** or **Edit**
5. Select at least one use case:
   - **Account Verification** - Verify account ownership
   - **Fraud Detection** - Detect fraudulent transactions
   - **Identity Verification** - Verify user identity
   - **Account Monitoring** - Monitor account activity
   - **Credit Underwriting** - Assess creditworthiness
   - **Other** - Custom use case

6. Save your changes

## Solution 2: Code Configuration (Already Added)

The code has been updated to include DTM use cases in the link token request:
- `account_verification`
- `fraud_detection`
- `identity_verification`

These are automatically included when using production/development environment.

## Customizing Use Cases

If you need different use cases, you can modify `lib/plaid.ts` in the `createLinkToken` function:

```typescript
linkTokenRequest.data_transparency = {
  use_cases: [
    'account_verification',
    'fraud_detection',
    // Add other use cases as needed
  ],
};
```

## Available Use Cases

- `account_verification` - Verify account ownership
- `fraud_detection` - Detect fraudulent transactions
- `identity_verification` - Verify user identity
- `account_monitoring` - Monitor account activity
- `credit_underwriting` - Assess creditworthiness

## After Configuration

1. Restart your development server
2. Try linking an account again
3. The DTM error should be resolved

## Notes

- DTM is only required for **production** and **development** environments
- Sandbox environment doesn't require DTM configuration
- You can configure use cases in both the dashboard and code, but dashboard configuration takes precedence

