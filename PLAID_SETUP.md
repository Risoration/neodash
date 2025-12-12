# Plaid Configuration Guide

This guide will help you set up Plaid for bank account linking in NeoDash with **real bank data** (Development/Production environment).

## Step 1: Create a Plaid Account

1. Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Sign up for a free account (Sandbox environment is free)
3. Complete the registration process

## Step 2: Get Your API Credentials

1. Log in to the [Plaid Dashboard](https://dashboard.plaid.com/)
2. Navigate to **Team Settings** → **Keys**
3. You'll see different environments:
   - **Sandbox** (for development/testing - FREE, test data only)
   - **Development** (for testing with real banks - requires approval) ✅ **Use this for real data**
   - **Production** (for live apps - requires approval)

4. For real bank data, use the **Development** or **Production** credentials:
   - Copy your **Client ID**
   - Copy your **Development Secret** (or **Production Secret** for live apps)

## Step 3: Configure Environment Variables

Open your `.env.local` file and add/update these variables:

```env
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_development_secret_here
PLAID_ENV=development
# Optional: Webhook URL for receiving Plaid events (recommended)
PLAID_WEBHOOK_URL=https://yourdomain.com/api/financial/plaid/webhook
PLAID_ENCRYPTION_KEY=442fb5a527b9779e1cef4e59774d1e78384208264a8e92cb2f18c27d82016ed9
```

**Important Notes:**

- Replace `your_client_id_here` with your actual Plaid Client ID
- Replace `your_development_secret_here` with your actual Development Secret (or Production Secret)
- Set `PLAID_ENV` to `development` for testing with real banks, or `production` for live apps
- The `PLAID_ENCRYPTION_KEY` is already generated and should be kept secure
- **Webhook URL is optional but recommended** - enables real-time updates from Plaid

## Step 4: Configure Webhooks (Recommended)

Webhooks allow Plaid to notify your app about important events (new transactions, login required, etc.)

1. In Plaid Dashboard, go to **Team Settings** → **Webhooks**
2. Add your webhook URL: `https://yourdomain.com/api/financial/plaid/webhook`
3. For local development, use a service like [ngrok](https://ngrok.com/) to expose your local server
4. Add the webhook URL to your `.env.local`:
   ```env
   PLAID_WEBHOOK_URL=https://yourdomain.com/api/financial/plaid/webhook
   ```

## Step 5: Test the Configuration

1. Restart your development server:

   ```bash
   npm run dev
   ```

2. Navigate to Settings → Financial Accounts
3. Click "Link Account with Plaid"
4. **With Development/Production environment**, you'll connect to real banks:
   - Users will authenticate with their actual bank credentials
   - Real account data and transactions will be synced
   - All data is encrypted and stored securely

## Real Bank Connection

With Development/Production environment:

- Users connect their **real bank accounts**
- All authentication happens through Plaid's secure flow
- Data is encrypted in transit and at rest
- Access tokens are encrypted before storage
- Users can sync accounts on-demand or automatically

**Security Features:**

- ✅ Access tokens encrypted with AES-256-GCM
- ✅ Tokens never exposed to client-side code
- ✅ Automatic error handling for expired tokens
- ✅ Webhook support for real-time updates
- ✅ Secure token storage in database

## Environment Options

- **`sandbox`**: Free, for development and testing
- **`development`**: Requires approval, for testing with real banks
- **`production`**: Requires approval, for live applications

## Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Keep your encryption key secure** - It's used to encrypt access tokens in the database
3. **Use different keys for different environments** - Don't use production keys in development
4. **Rotate keys if compromised** - You can regenerate keys in the Plaid dashboard

## Troubleshooting

### Error: "Plaid credentials not configured"

- Make sure all Plaid environment variables are set in `.env.local`
- Restart your development server after adding variables
- Check that variable names match exactly (case-sensitive)

### Error: "Failed to create link token"

- Verify your `PLAID_CLIENT_ID` and `PLAID_SECRET` are correct
- Check that `PLAID_ENV` is set to `sandbox`, `development`, or `production`
- Ensure you're using the correct credentials for your selected environment

### Error: "Module not found: Can't resolve 'plaid'"

- Run `npm install` to install the Plaid package
- The package should already be in `package.json`

## Next Steps

Once configured:

1. Users can link their bank accounts via the Plaid Link flow
2. Access tokens are automatically encrypted and stored
3. Accounts can be synced on-demand or automatically
4. Users can manage multiple linked accounts

For more information, visit the [Plaid Documentation](https://plaid.com/docs/).
