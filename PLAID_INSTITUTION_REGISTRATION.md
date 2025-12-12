# Plaid Institution Registration Guide

## Understanding Institution Registration

Some major banks (like Chase, Bank of America, Wells Fargo) require **business registration** in your Plaid Dashboard before users can link accounts. This is a security requirement from these institutions.

## Quick Solution: Use Other Banks

**You don't need to register your business right away!** Many banks work without registration:

### Banks That Typically DON'T Require Registration:
- Most regional and community banks
- Many credit unions
- Smaller financial institutions
- Online-only banks

### Banks That DO Require Registration:
- Chase (`ins_56`)
- Bank of America (`ins_2`)
- Wells Fargo (`ins_3`)
- Some other major national banks

## For Development/Testing

1. **Try different institutions**: When linking accounts, select a bank that doesn't require registration
2. **Users can link their own banks**: Your users can link any bank they have access to - they're not limited to what you've registered
3. **Test with multiple banks**: Try linking accounts from different institutions to see which ones work

## When You Need Business Registration

You'll need to complete business registration when:
- You want to support specific major banks (Chase, BofA, etc.)
- You're going to production and need broad bank coverage
- Users specifically request support for registered-only banks

## How to Register (When Ready)

1. Go to [Plaid Dashboard](https://dashboard.plaid.com)
2. Navigate to **Team Settings** → **US OAuth Institutions**
3. Find the institution you want to enable (e.g., Chase)
4. Complete the registration form with your business information
5. Wait for approval (can take time for some institutions)

## Current Status

Your app is configured for **production** environment, which means:
- ✅ Users can link accounts from banks that don't require registration
- ✅ Real bank data will be synced
- ⚠️ Some major banks require registration (users will see a helpful error message)
- ✅ You can add more banks later as your business grows

## Recommendation

For now, **let users link accounts from banks that don't require registration**. When you're ready to support major banks like Chase, complete the business registration process. Your app will work perfectly fine with the many banks that don't require registration!

