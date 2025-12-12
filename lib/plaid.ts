// Plaid integration utilities
// Note: This requires the 'plaid' npm package and Plaid API credentials

export interface PlaidConfig {
  clientId: string;
  secret: string;
  env: 'sandbox' | 'development' | 'production';
}

let plaidClient: any = null;

export function initPlaidClient(config: PlaidConfig) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:12',
      message: 'initPlaidClient entry',
      data: {
        hasExistingClient: !!plaidClient,
        env: config.env,
        clientIdLength: config.clientId?.length,
        secretLength: config.secret?.length,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    }),
  }).catch(() => {});
  // #endregion
  if (plaidClient) return plaidClient;

  try {
    // Dynamic import to avoid errors if plaid package is not installed
    const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:19',
        message: 'plaid package loaded',
        data: {
          hasPlaidEnvironments: !!PlaidEnvironments,
          envPath: PlaidEnvironments?.[config.env],
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    const configuration = new Configuration({
      basePath: PlaidEnvironments[config.env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.clientId,
          'PLAID-SECRET': config.secret,
        },
      },
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:29',
        message: 'configuration created',
        data: { basePath: configuration.basePath },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    plaidClient = new PlaidApi(configuration);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:32',
        message: 'PlaidApi created',
        data: { hasClient: !!plaidClient },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    return plaidClient;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:34',
        message: 'initPlaidClient error',
        data: {
          errorName: error?.name,
          errorMessage: error?.message,
          errorStack: error?.stack?.substring(0, 200),
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    console.error('Plaid client initialization error:', error);
    return null;
  }
}

export async function createLinkToken(userId: string): Promise<string | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:37',
      message: 'createLinkToken entry',
      data: { userId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:45',
      message: 'env vars loaded',
      data: {
        hasClientId: !!clientId,
        hasSecret: !!secret,
        clientIdLength: clientId?.length,
        secretLength: secret?.length,
        env,
        clientIdPrefix: clientId?.substring(0, 10),
        secretPrefix: secret?.substring(0, 10),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion

  // Check if secret is still a placeholder
  const isPlaceholderSecret =
    secret === 'your_development_secret_here' ||
    secret === 'your_plaid_secret_here' ||
    secret?.includes('your_') ||
    secret?.includes('here');

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:55',
      message: 'placeholder check',
      data: {
        isPlaceholderSecret,
        hasClientId: !!clientId,
        hasSecret: !!secret,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion

  if (!clientId || !secret || isPlaceholderSecret) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:60',
        message: 'credentials check failed',
        data: {
          hasClientId: !!clientId,
          hasSecret: !!secret,
          isPlaceholder: isPlaceholderSecret,
          clientId: clientId,
          secret: secret ? `${secret.substring(0, 20)}...` : 'undefined',
          env: process.env.PLAID_ENV,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    console.error('[PLAID DEBUG] Missing or placeholder credentials:', {
      hasClientId: !!clientId,
      hasSecret: !!secret,
      isPlaceholder: isPlaceholderSecret,
      clientId: clientId,
      secret: secret ? `${secret.substring(0, 20)}...` : 'undefined',
      env: process.env.PLAID_ENV,
    });
    console.warn('Plaid credentials not configured or still using placeholder');
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const linkTokenRequest: any = {
      user: {
        client_user_id: userId,
      },
      client_name: 'NeoDash',
      products: ['transactions', 'auth', 'investments'], // Add investments for crypto exchanges
      country_codes: ['US'],
      language: 'en',
    };

    // Add webhook URL for production/development (optional but recommended)
    if (process.env.PLAID_WEBHOOK_URL && env !== 'sandbox') {
      linkTokenRequest.webhook = process.env.PLAID_WEBHOOK_URL;
    }

    // Add redirect URI if configured (for OAuth flows)
    if (process.env.PLAID_REDIRECT_URI) {
      linkTokenRequest.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    // For production, enable additional features
    if (env === 'production' || env === 'development') {
      // Enable account selection (users can choose which accounts to link)
      linkTokenRequest.account_filters = {
        depository: {
          account_subtypes: ['checking', 'savings'],
        },
        investment: {
          account_subtypes: ['crypto exchange'], // Support crypto exchanges
        },
      };

      // Note: Data Transparency Messaging (DTM) must be configured in the Plaid Dashboard
      // (Team Settings → Link Customization → Data Transparency Messaging)
      // It cannot be set via the API linkTokenCreate endpoint
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:111',
        message: 'before linkTokenCreate',
        data: {
          hasWebhook: !!linkTokenRequest.webhook,
          hasRedirectUri: !!linkTokenRequest.redirect_uri,
          hasAccountFilters: !!linkTokenRequest.account_filters,
          hasDataTransparency: !!linkTokenRequest.data_transparency,
          env,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
    const response = await client.linkTokenCreate(linkTokenRequest);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:294',
        message: 'linkTokenCreate success',
        data: {
          hasLinkToken: !!response?.data?.link_token,
          linkTokenLength: response?.data?.link_token?.length,
          expiration: response?.data?.expiration,
          requestId: response?.data?.request_id,
          warnings: response?.data?.warnings,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion

    return response.data.link_token;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:118',
        message: 'linkTokenCreate error',
        data: {
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorResponse: error?.response?.data,
          errorStatus: error?.response?.status,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
    console.error('[PLAID DEBUG] Error creating link token:', error);
    console.error('[PLAID DEBUG] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      syscall: error?.syscall,
      hostname: error?.hostname,
      env: env,
      basePath: error?.config?.baseURL || 'unknown',
    });
    // Log more details in production
    if (env === 'production' || env === 'development') {
      const errorDetails = {
        error_code: error?.response?.data?.error_code,
        error_message: error?.response?.data?.error_message,
        error_type: error?.response?.data?.error_type,
        full_error: error?.response?.data,
      };
      console.error('[PLAID DEBUG] Plaid error details:', errorDetails);
    }
    return null;
  }
}

export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string } | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:358',
      message: 'exchangePublicToken entry',
      data: {
        publicTokenLength: publicToken?.length,
        publicTokenPrefix: publicToken?.substring(0, 20),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'D',
    }),
  }).catch(() => {});
  // #endregion
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:370',
      message: 'exchangePublicToken env check',
      data: {
        hasClientId: !!clientId,
        hasSecret: !!secret,
        env,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'D',
    }),
  }).catch(() => {});
  // #endregion

  if (!clientId || !secret) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:375',
        message: 'exchangePublicToken missing credentials',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'D',
      }),
    }).catch(() => {});
    // #endregion
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'lib/plaid.ts:383',
      message: 'exchangePublicToken client check',
      data: { hasClient: !!client },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run2',
      hypothesisId: 'D',
    }),
  }).catch(() => {});
  // #endregion
  if (!client) {
    return null;
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:390',
        message: 'before itemPublicTokenExchange',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'D',
      }),
    }).catch(() => {});
    // #endregion
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:396',
        message: 'itemPublicTokenExchange success',
        data: {
          hasAccessToken: !!response?.data?.access_token,
          hasItemId: !!response?.data?.item_id,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'D',
      }),
    }).catch(() => {});
    // #endregion

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/plaid.ts:410',
        message: 'itemPublicTokenExchange error',
        data: {
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorResponse: error?.response?.data,
          errorStatus: error?.response?.status,
          plaidErrorCode: error?.response?.data?.error_code,
          plaidErrorMessage: error?.response?.data?.error_message,
          plaidErrorType: error?.response?.data?.error_type,
          plaidDisplayMessage: error?.response?.data?.display_message,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'E',
      }),
    }).catch(() => {});
    // #endregion
    console.error('Error exchanging public token:', error);
    return null;
  }
}

export async function getAccounts(accessToken: string) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

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
  endDate: string,
  options?: { count?: number; offset?: number }
) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const request: any = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    };

    // Add pagination options if provided
    if (options?.count) {
      request.count = options.count;
    }
    if (options?.offset) {
      request.offset = options.offset;
    }

    const response = await client.transactionsGet(request);

    // Handle pagination - Plaid returns up to 500 transactions per request
    let allTransactions = response.data.transactions || [];
    let totalTransactions =
      response.data.total_transactions || allTransactions.length;
    let hasMore = allTransactions.length < totalTransactions;

    // Fetch additional pages if needed (Plaid allows up to 500 per page)
    while (hasMore && allTransactions.length < totalTransactions) {
      const nextOffset = allTransactions.length;
      const nextResponse = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        count: 500,
        offset: nextOffset,
      });

      const nextTransactions = nextResponse.data.transactions || [];
      allTransactions = [...allTransactions, ...nextTransactions];
      hasMore =
        nextTransactions.length > 0 &&
        allTransactions.length < totalTransactions;
    }

    return allTransactions;
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    // Log more details in production
    if (env === 'production' || env === 'development') {
      if (error?.response?.data?.error_code) {
        console.error('Plaid transaction error:', {
          error_code: error.response.data.error_code,
          error_message: error.response.data.error_message,
          error_type: error.response.data.error_type,
        });
      }
    }
    return null;
  }
}

export async function getItem(accessToken: string) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.itemGet({
      access_token: accessToken,
    });

    return response.data.item;
  } catch (error: any) {
    console.error('Error fetching item:', error);
    // Check for specific Plaid errors
    if (error?.response?.data?.error_code) {
      throw {
        errorCode: error.response.data.error_code,
        errorMessage: error.response.data.error_message,
        errorType: error.response.data.error_type,
      };
    }
    return null;
  }
}

export async function getInstitutionName(
  accessToken: string
): Promise<{ institutionId: string; institutionName: string } | null> {
  const item = await getItem(accessToken);
  if (!item) {
    return null;
  }

  const institutionId = item.institution_id;
  if (!institutionId) {
    return null;
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: ['US'],
    });

    return {
      institutionId,
      institutionName: response.data.institution.name,
    };
  } catch (error) {
    console.error('Error fetching institution:', error);
    return {
      institutionId,
      institutionName: 'Unknown Institution',
    };
  }
}

export async function getInvestmentHoldings(accessToken: string) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  if (!clientId || !secret) {
    return null;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return null;
  }

  try {
    const response = await client.investmentsHoldingsGet({
      access_token: accessToken,
    });

    return {
      accounts: response.data.accounts,
      holdings: response.data.holdings,
      securities: response.data.securities,
    };
  } catch (error) {
    console.error('Error fetching investment holdings:', error);
    return null;
  }
}

export async function removeItem(accessToken: string): Promise<boolean> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  // Default to production if not specified, since user is approved for real data
  const env =
    (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') ||
    'production';

  if (!clientId || !secret) {
    return false;
  }

  const client = initPlaidClient({ clientId, secret, env });
  if (!client) {
    return false;
  }

  try {
    await client.itemRemove({
      access_token: accessToken,
    });
    return true;
  } catch (error: any) {
    console.error('Error removing item:', error);
    // Check for specific Plaid errors
    if (error?.response?.data?.error_code) {
      throw {
        errorCode: error.response.data.error_code,
        errorMessage: error.response.data.error_message,
        errorType: error.response.data.error_type,
      };
    }
    return false;
  }
}

export function isPlaidError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    'errorCode' in error &&
    'errorType' in error
  );
}

export function getPlaidErrorMessage(error: any): string {
  if (!isPlaidError(error)) {
    return 'An unknown error occurred';
  }

  const errorCode = error.errorCode;
  const errorMessage = error.errorMessage || 'Unknown error';

  // Map common Plaid error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    ITEM_LOGIN_REQUIRED:
      'Your bank connection requires re-authentication. Please reconnect your account.',
    INVALID_ACCESS_TOKEN:
      'Your bank connection has expired. Please reconnect your account.',
    ITEM_NOT_FOUND:
      'The bank connection was not found. Please reconnect your account.',
    RATE_LIMIT_EXCEEDED:
      'Too many requests. Please try again in a few moments.',
    INSTITUTION_DOWN:
      'The bank is temporarily unavailable. Please try again later.',
    INVALID_REQUEST: 'Invalid request. Please try again.',
  };

  return errorMessages[errorCode] || errorMessage;
}
