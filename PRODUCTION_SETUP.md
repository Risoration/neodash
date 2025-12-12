# Production Setup for Plaid with Real Bank Data

Congratulations on being approved for real bank data! This guide will help you configure NeoDash to work with actual bank accounts.

## Quick Setup Checklist

✅ **1. Update Environment Variables**

Open `.env.local` and update:

```env
PLAID_CLIENT_ID=your_actual_client_id
PLAID_SECRET=your_development_or_production_secret
PLAID_ENV=development  # or 'production' for live apps
PLAID_ENCRYPTION_KEY=442fb5a527b9779e1cef4e59774d1e78384208264a8e92cb2f18c27d82016ed9
```

**Important:**

- Use **Development** environment for testing with real banks
- Use **Production** environment only for live applications
- Never commit `.env.local` to version control

✅ **2. Configure Webhooks (Recommended)**

Webhooks enable real-time updates from Plaid:

1. Get a public URL for your webhook endpoint (use ngrok for local dev):

   ```bash
   ngrok http 3000
   ```

2. In Plaid Dashboard → Team Settings → Webhooks, add:

   ```
   https://your-domain.com/api/financial/plaid/webhook
   ```

3. Add to `.env.local`:
   ```env
   PLAID_WEBHOOK_URL=https://your-domain.com/api/financial/plaid/webhook
   ```

✅ **3. Run Database Migration**

Make sure the `plaid_items` table exists:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/003_plaid_items.sql
```

✅ **4. Restart Your Server**

```bash
npm run dev
```

## What's Different with Real Data?

### Enhanced Features

1. **Automatic Pagination**: Transactions are automatically paginated to fetch all available data
2. **Better Error Handling**: More detailed error messages for production scenarios
3. **Webhook Support**: Real-time notifications for new transactions and errors
4. **Account Selection**: Users can choose which accounts to link
5. **Secure Token Storage**: All access tokens are encrypted before storage

### Security Improvements

- ✅ Access tokens encrypted with AES-256-GCM
- ✅ Tokens never sent to client-side
- ✅ Automatic handling of expired tokens
- ✅ Secure webhook verification (can be added)

### User Experience

- Users connect their **real bank accounts** through Plaid's secure flow
- All authentication happens through Plaid (no credentials stored)
- Accounts sync automatically or on-demand
- Users can manage multiple linked accounts
- Visual indicators show sync status

## Testing with Real Banks

1. Navigate to **Settings → Financial Accounts**
2. Click **"Link Account with Plaid"**
3. Search for your bank (e.g., "Chase", "Bank of America")
4. Enter your real bank credentials
5. Complete any MFA/2FA if required
6. Select which accounts to link
7. Accounts will sync automatically

## Monitoring & Troubleshooting

### Check Logs

Monitor your server logs for:

- Plaid API errors
- Webhook events
- Token exchange issues
- Sync failures

### Common Issues

**"ITEM_LOGIN_REQUIRED"**

- User needs to re-authenticate
- PlaidAccountManager will show a "Needs Reconnection" badge
- User can click "Sync" to trigger re-authentication

**"INVALID_ACCESS_TOKEN"**

- Token expired or invalid
- System automatically removes invalid items
- User needs to reconnect

**Rate Limiting**

- Plaid has rate limits
- Errors are handled gracefully
- Users see friendly error messages

## Production Checklist

Before going live:

- [ ] Use `PLAID_ENV=production`
- [ ] Set up production webhook URL
- [ ] Test with real bank accounts
- [ ] Verify encryption key is secure
- [ ] Set up monitoring/alerts
- [ ] Review Plaid's production requirements
- [ ] Test error handling scenarios
- [ ] Verify webhook endpoint is accessible

## Support

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid Dashboard](https://dashboard.plaid.com/)
- [Plaid Support](https://support.plaid.com/)
