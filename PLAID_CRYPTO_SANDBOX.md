# Plaid Crypto Exchange Sandbox Testing Guide

## Overview

Plaid supports connecting to crypto exchanges (like Binance.US, Kraken, Gemini) through their **investment** product. In sandbox mode, you can test crypto exchange connections without real accounts or business registration.

## Setting Up Crypto Exchange Testing

### Step 1: Ensure Investment Products Are Enabled

The Plaid integration is already configured to support investment accounts (crypto exchanges). The `createLinkToken` function includes:
- `products: ['transactions', 'auth', 'investments']`
- `account_filters` with `investment: { account_subtypes: ['crypto exchange'] }`

### Step 2: Use Sandbox Environment

Make sure your `.env.local` is configured for sandbox:

```env
PLAID_ENV=sandbox
PLAID_SECRET=your_sandbox_secret_here
```

### Step 3: Create Custom Test Crypto Account

In Plaid Sandbox, you can create custom test accounts with crypto exchange holdings:

1. **Use `user_custom` test username** when linking
2. **Select a crypto exchange** (Binance.US, Kraken, Gemini, etc.)
3. **Configure account metadata**:
   - Account type: `investment`
   - Account subtype: `crypto exchange`
   - Holdings: Specify crypto holdings (BTC, ETH, etc.)

### Step 4: Test Credentials

For sandbox crypto exchanges, use these test credentials:
- **Username**: `user_custom` (for custom accounts)
- **Password**: `pass_good`

## Using the Crypto Link Component

### In Your Onboarding/Settings Page

```tsx
import { PlaidCryptoLinkButton } from '@/components/plaid-crypto-link-button';

<PlaidCryptoLinkButton
  onSuccess={(itemId, institutionName) => {
    console.log(`Connected to ${institutionName}`);
    // Holdings are automatically synced
  }}
  onError={(error) => {
    console.error('Failed to link:', error);
  }}
/>
```

## Supported Crypto Exchanges

Plaid supports these crypto exchanges (availability varies by environment):

### Sandbox (Test)
- Binance.US (test)
- Kraken (test)
- Gemini (test)
- Custom test exchanges

### Production/Development (Real)
- Binance.US
- Kraken
- Gemini
- Coinbase (if available)
- Other supported exchanges

## How It Works

1. **Link Exchange**: User clicks "Link Crypto Exchange with Plaid"
2. **Plaid Link Opens**: User selects their crypto exchange
3. **Authentication**: User authenticates with exchange credentials
4. **Token Exchange**: Public token is exchanged for access token
5. **Sync Holdings**: Crypto holdings are fetched via `investmentsHoldingsGet`
6. **Store Data**: Holdings are converted to your crypto format and stored

## API Endpoints

### Sync Crypto Holdings

```typescript
POST /api/crypto/plaid
{
  "action": "sync",
  "item_id": "your_plaid_item_id"
}
```

### Get Linked Crypto Exchanges

```typescript
POST /api/crypto/plaid
{
  "action": "get_items"
}
```

## Data Format

Crypto holdings from Plaid are converted to your `CryptoCoin` format:

```typescript
{
  id: string;           // Security ID from Plaid
  symbol: string;       // Ticker symbol (BTC, ETH, etc.)
  name: string;         // Full name
  amount: number;       // Quantity held
  price: number;        // Current price per unit
  value: number;        // Total value (amount * price)
  change24h: number;    // 24h price change (0 for Plaid data)
}
```

## Sandbox Test Accounts

### Creating Custom Crypto Test Account

When using `user_custom` in sandbox:

1. Link with Plaid
2. Select a crypto exchange institution
3. Use credentials: `user_custom` / `pass_good`
4. Configure holdings in the Plaid Link interface
5. Holdings will be synced automatically

### Example Test Holdings

You can configure test holdings like:
- **BTC**: 0.5 Bitcoin
- **ETH**: 2.0 Ethereum
- **SOL**: 10 Solana
- etc.

## Troubleshooting

### "No crypto holdings found"
- Make sure the exchange account has holdings configured
- Check that the account type is `investment` with subtype `crypto exchange`

### "Failed to fetch crypto holdings"
- Verify the Plaid item is linked correctly
- Check that `investments` product is enabled in link token
- Ensure access token is valid

### "UNAUTHORIZED_INSTITUTION"
- Some exchanges require business registration in production
- Use sandbox for testing without registration
- Try a different exchange that doesn't require registration

## Benefits of Sandbox Testing

- ✅ **No real accounts needed** - Test with simulated exchange accounts
- ✅ **No business registration** - Test without completing registration forms
- ✅ **Custom holdings** - Configure test crypto holdings
- ✅ **Free** - No charges for sandbox usage
- ✅ **Safe** - No real funds involved

## Next Steps

1. **Test in Sandbox**: Use sandbox environment to test crypto exchange linking
2. **Verify Holdings**: Check that holdings are synced correctly
3. **Test UI**: Ensure the crypto dashboard displays Plaid-linked holdings
4. **Production**: When ready, switch to production and link real exchanges

## Integration with Existing Crypto System

The Plaid crypto integration works alongside your existing crypto methods:
- **Manual Entry**: Still available
- **Exchange APIs**: Still available (Binance, Coinbase direct APIs)
- **Wallet Addresses**: Still available
- **Browser Wallets**: Still available
- **Plaid Crypto Exchanges**: NEW - Link via Plaid

All methods can coexist - users can have holdings from multiple sources!

