// Plaid integration utilities
// Note: This requires the 'plaid' npm package and Plaid API credentials

export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: 'sandbox' | 'development' | 'production';
}

let plaidClient: any = null;

export function initPlaidClient(config: PlaidConfig) {
  if (plaidClient) return plaidClient;

  try {
    // Dynamic import to avoid errors if plaid package is not installed
    const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
    
    const configuration = new Configuration({
      basePath: PlaidEnvironments[config.env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.clientId,
          'PLAID-SECRET': config.secret,
        },
      },
    });

    plaidClient = new PlaidApi(configuration);
    return plaidClient;
  } catch (error) {
    console.error('Plaid client initialization error:', error);
    return null;
  }
}

export async function createLinkToken(userId: string): Promise<string | null> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox';

  if (!clientId || !secret) {
    console.warn('Plaid credentials not configured');
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'NeoDash',
      products: ['transactions', 'auth'],
      country_codes: ['US'],
      language: 'en',
    });

    return response.data.link_token;
  } catch (error) {
    console.error('Error creating link token:', error);
    return null;
  }
}

export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string } | null> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error) {
    console.error('Error exchanging public token:', error);
    return null;
  }
}

export async function getAccounts(accessToken: string) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.accountsGet({
      access_token: accessToken,
    });

    return response.data.accounts;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return null;
  }
}

export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    return response.data.transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return null;
  }
}

