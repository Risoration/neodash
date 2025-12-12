# Plaid Sandbox Setup Guide

## Why Use Sandbox?

**Sandbox is perfect for development and testing!** It provides:
- ✅ Test banks that **don't require registration**
- ✅ Free to use (no charges)
- ✅ Test credentials that always work
- ✅ Perfect for testing your integration

## Quick Setup

### Step 1: Get Your Sandbox Secret

1. Go to [Plaid Dashboard](https://dashboard.plaid.com/)
2. Navigate to **Team Settings** → **Keys**
3. Find the **Sandbox** section
4. Click the **eye icon** next to "Sandbox secret" to reveal it
5. Copy the sandbox secret

### Step 2: Update `.env.local`

Update your `.env.local` file:

```env
PLAID_CLIENT_ID=68b3307a30c9690024a8cc69
PLAID_SECRET=your_sandbox_secret_here  # Paste your sandbox secret
PLAID_ENV=sandbox
```

**Note:** Your `PLAID_CLIENT_ID` is the same for all environments, so you don't need to change it.

### Step 3: Restart Your Server

```bash
npm run dev
```

### Step 4: Test with Sandbox Banks

When you click "Link Account with Plaid", you'll see test banks like:
- **First Platypus Bank** (test credentials: `user_good` / `pass_good`)
- **First Gingham Credit Union** (test credentials: `user_good` / `pass_good`)
- And other test institutions

## Test Credentials

For sandbox banks, use these test credentials:

- **Username**: `user_good`
- **Password**: `pass_good`

These credentials work for all sandbox banks and will successfully link accounts.

## Switching Back to Production

When you're ready to use real bank data:

1. Get your **Production Secret** from Plaid Dashboard → Team Settings → Keys → Production
2. Update `.env.local`:
   ```env
   PLAID_SECRET=your_production_secret_here
   PLAID_ENV=production
   ```
3. Restart your server

## Benefits of Sandbox

- ✅ **No registration needed** - All test banks work immediately
- ✅ **Free** - No charges for sandbox usage
- ✅ **Reliable** - Test credentials always work
- ✅ **Safe** - No real bank accounts involved
- ✅ **Fast** - Perfect for rapid development and testing

## Common Test Banks in Sandbox

- First Platypus Bank
- First Gingham Credit Union
- Tattersall Federal Credit Union
- And many more test institutions

All of these work without any business registration!

