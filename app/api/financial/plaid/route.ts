import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getTransactions,
  getInstitutionName,
  removeItem,
  isPlaidError,
  getPlaidErrorMessage,
  getItem,
} from '@/lib/plaid';
import {
  getUserData,
  updateFinancialData,
  FinancialAccount,
  FinancialData,
  storePlaidItem,
  getPlaidItems,
  getPlaidItemByItemId,
  deletePlaidItem,
  updatePlaidItemLastSynced,
  updatePlaidItemInstitution,
} from '@/lib/db';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_link_token') {
      // #region agent log
      fetch(
        'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/api/financial/plaid/route.ts:37',
            message: 'create_link_token action',
            data: {
              userId: user.id,
              envPLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID?.substring(0, 10),
              envPLAID_SECRET: process.env.PLAID_SECRET?.substring(0, 10),
              envPLAID_ENV: process.env.PLAID_ENV,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A',
          }),
        }
      ).catch(() => {});
      // #endregion
      const linkToken = await createLinkToken(user.id);
      // #region agent log
      fetch(
        'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/api/financial/plaid/route.ts:40',
            message: 'createLinkToken result',
            data: {
              hasLinkToken: !!linkToken,
              linkTokenLength: linkToken?.length,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A',
          }),
        }
      ).catch(() => {});
      // #endregion
      if (!linkToken) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'app/api/financial/plaid/route.ts:42',
              message: 'linkToken is null, returning error',
              data: {},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'A',
            }),
          }
        ).catch(() => {});
        // #endregion
        return NextResponse.json(
          {
            error: 'Failed to create link token. Plaid may not be configured.',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ link_token: linkToken });
    }

    if (action === 'exchange_token') {
      // #region agent log
      fetch(
        'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'app/api/financial/plaid/route.ts:112',
            message: 'exchange_token action started',
            data: {
              userId: user.id,
              hasPublicToken: !!body.public_token,
              publicTokenLength: body.public_token?.length,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run2',
            hypothesisId: 'D',
          }),
        }
      ).catch(() => {});
      // #endregion
      const { public_token } = body;
      if (!public_token) {
        return NextResponse.json(
          { error: 'Public token required' },
          { status: 400 }
        );
      }

      try {
        // #region agent log
        fetch(
          'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'app/api/financial/plaid/route.ts:122',
              message: 'before exchangePublicToken',
              data: { publicTokenPrefix: public_token?.substring(0, 20) },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run2',
              hypothesisId: 'D',
            }),
          }
        ).catch(() => {});
        // #endregion
        const result = await exchangePublicToken(public_token);
        // #region agent log
        fetch(
          'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'app/api/financial/plaid/route.ts:125',
              message: 'after exchangePublicToken',
              data: {
                hasResult: !!result,
                hasAccessToken: !!result?.accessToken,
                hasItemId: !!result?.itemId,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run2',
              hypothesisId: 'D',
            }),
          }
        ).catch(() => {});
        // #endregion
        if (!result) {
          // #region agent log
          fetch(
            'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'app/api/financial/plaid/route.ts:128',
                message: 'exchangePublicToken returned null',
                data: {},
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run2',
                hypothesisId: 'D',
              }),
            }
          ).catch(() => {});
          // #endregion
          return NextResponse.json(
            { error: 'Failed to exchange token' },
            { status: 500 }
          );
        }

        // Get institution information
        let institutionId: string | undefined;
        let institutionName: string | undefined;
        try {
          const institutionInfo = await getInstitutionName(result.accessToken);
          if (institutionInfo) {
            institutionId = institutionInfo.institutionId;
            institutionName = institutionInfo.institutionName;
          }
        } catch (error) {
          console.error('Error fetching institution info:', error);
          // Continue even if institution info fails
        }

        // Store access token in database (encrypted)
        await storePlaidItem(
          user.id,
          result.itemId,
          result.accessToken,
          institutionId,
          institutionName
        );

        // Return only item_id (never return access_token to client)
        return NextResponse.json({
          item_id: result.itemId,
          institution_id: institutionId,
          institution_name: institutionName,
        });
      } catch (error: any) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'app/api/financial/plaid/route.ts:227',
              message: 'exchange_token catch block',
              data: {
                errorName: error?.name,
                errorMessage: error?.message,
                errorCode: error?.code,
                isPlaidError: isPlaidError(error),
                plaidErrorCode: error?.response?.data?.error_code,
                plaidErrorMessage: error?.response?.data?.error_message,
                plaidErrorType: error?.response?.data?.error_type,
                plaidDisplayMessage: error?.response?.data?.display_message,
                errorResponse: error?.response?.data,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run2',
              hypothesisId: 'E',
            }),
          }
        ).catch(() => {});
        // #endregion
        console.error('Token exchange error:', error);
        if (isPlaidError(error)) {
          const errorMsg = getPlaidErrorMessage(error);
          // #region agent log
          fetch(
            'http://127.0.0.1:7242/ingest/5ce623e7-82d8-49c9-abb4-9873ba0b4b5d',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'app/api/financial/plaid/route.ts:250',
                message: 'isPlaidError true, returning error',
                data: {
                  errorMessage: errorMsg,
                  plaidErrorCode: error?.response?.data?.error_code,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run2',
                hypothesisId: 'E',
              }),
            }
          ).catch(() => {});
          // #endregion
          return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
        return NextResponse.json(
          { error: 'Failed to exchange token' },
          { status: 500 }
        );
      }
    }

    if (action === 'sync') {
      const { access_token, item_id } = body;
      let accessToken: string | null = null;

      // Support both item_id (preferred) and access_token (backward compatibility)
      if (item_id) {
        const plaidItem = await getPlaidItemByItemId(user.id, item_id);
        if (!plaidItem) {
          return NextResponse.json(
            { error: 'Plaid item not found. Please reconnect your account.' },
            { status: 404 }
          );
        }
        accessToken = plaidItem.accessToken;
      } else if (access_token) {
        accessToken = access_token;
      } else {
        return NextResponse.json(
          { error: 'Either item_id or access_token is required' },
          { status: 400 }
        );
      }

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Access token not available' },
          { status: 400 }
        );
      }

      try {
        // Fetch accounts from Plaid
        const plaidAccounts = await getAccounts(accessToken);
        if (!plaidAccounts) {
          return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
          );
        }

        // Fetch transactions (last 30 days)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const startDateStr = startDate.toISOString().split('T')[0];

        const plaidTransactions = await getTransactions(
          accessToken,
          startDateStr,
          endDate
        );

        // Update user's financial data
        const userData = await getUserData(user.id);
        const existingFinancial = userData?.financial || {
          totalBalance: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netChange: 0,
          accounts: [],
          transactions: [],
          balanceHistory: [],
          spendingByCategory: [],
          monthlyTrends: [],
        };

        // Map Plaid accounts to our format
        const newAccounts: FinancialAccount[] = plaidAccounts.map(
          (acc: any) => {
            const existingAccount = existingFinancial.accounts.find(
              (a: FinancialAccount) => a.plaidAccountId === acc.account_id
            );

            return {
              id:
                existingAccount?.id ||
                `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: acc.name,
              type: mapPlaidType(acc.type),
              institution: acc.institution_id || undefined,
              balance: acc.balances.current || 0,
              currency: acc.balances.iso_currency_code || 'USD',
              lastSynced: new Date().toISOString(),
              linkedVia: 'plaid',
              plaidAccountId: acc.account_id,
            };
          }
        );

        // Merge with existing manual accounts
        const manualAccounts = existingFinancial.accounts.filter(
          (acc) => acc.linkedVia !== 'plaid'
        );
        const accounts = [...manualAccounts, ...newAccounts];

        // Map Plaid transactions to our format
        const newTransactions = (plaidTransactions || []).map((tx: any) => ({
          id: tx.transaction_id,
          accountId:
            accounts.find((a) => a.plaidAccountId === tx.account_id)?.id || '',
          date: tx.date,
          amount: Math.abs(tx.amount),
          category: tx.category?.[0] || 'Uncategorized',
          description: tx.name,
          type: tx.amount > 0 ? 'expense' : 'income',
        }));

        // Merge with existing transactions (avoid duplicates)
        const existingTransactionIds = new Set(
          existingFinancial.transactions.map((tx) => tx.id)
        );
        const uniqueNewTransactions = newTransactions.filter(
          (tx: any) => !existingTransactionIds.has(tx.id)
        );
        const transactions = [
          ...existingFinancial.transactions,
          ...uniqueNewTransactions,
        ];

        // Calculate totals
        const totalBalance = accounts.reduce(
          (sum, acc) => sum + acc.balance,
          0
        );
        const totalIncome = transactions
          .filter(
            (tx: { type: string; amount: number }) => tx.type === 'income'
          )
          .reduce((sum: number, tx: { amount: number }) => sum + tx.amount, 0);
        const totalExpenses = transactions
          .filter(
            (tx: { type: string; amount: number }) => tx.type === 'expense'
          )
          .reduce((sum: number, tx: { amount: number }) => sum + tx.amount, 0);

        // Calculate spending by category
        const spendingByCategory = transactions
          .filter(
            (tx: { type: string; category?: string; amount: number }) =>
              tx.type === 'expense'
          )
          .reduce(
            (
              acc: Record<string, number>,
              tx: { category?: string; amount: number }
            ) => {
              const category = tx.category || 'Uncategorized';
              acc[category] = (acc[category] || 0) + tx.amount;
              return acc;
            },
            {}
          );

        const spendingByCategoryArray = Object.entries(spendingByCategory).map(
          ([category, amount]) => ({
            category,
            amount: amount as number,
          })
        );

        // Generate balance history from transactions
        const balanceHistory = generateBalanceHistory(
          transactions,
          totalBalance
        );

        // Calculate monthly trends
        const monthlyTrends = calculateMonthlyTrends(transactions);

        const updatedFinancial: FinancialData = {
          totalBalance,
          totalIncome,
          totalExpenses,
          netChange: totalIncome - totalExpenses,
          accounts,
          transactions,
          balanceHistory,
          spendingByCategory: spendingByCategoryArray,
          monthlyTrends,
        };

        await updateFinancialData(user.id, updatedFinancial);

        // Update last synced timestamp for the item
        if (item_id) {
          await updatePlaidItemLastSynced(user.id, item_id);
        }

        return NextResponse.json({
          message: 'Accounts synced successfully',
          accountsCount: newAccounts.length,
          transactionsCount: uniqueNewTransactions.length,
        });
      } catch (error: any) {
        console.error('Sync error:', error);
        if (isPlaidError(error)) {
          // Handle specific Plaid errors
          if (error.errorCode === 'ITEM_LOGIN_REQUIRED') {
            return NextResponse.json(
              {
                error: getPlaidErrorMessage(error),
                requiresRelink: true,
              },
              { status: 400 }
            );
          }
          if (
            error.errorCode === 'INVALID_ACCESS_TOKEN' ||
            error.errorCode === 'ITEM_NOT_FOUND'
          ) {
            // Remove invalid item from database
            if (item_id) {
              try {
                await deletePlaidItem(user.id, item_id);
              } catch (deleteError) {
                console.error('Error deleting invalid item:', deleteError);
              }
            }
            return NextResponse.json(
              {
                error: getPlaidErrorMessage(error),
                requiresRelink: true,
              },
              { status: 400 }
            );
          }
          return NextResponse.json(
            { error: getPlaidErrorMessage(error) },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to sync accounts' },
          { status: 500 }
        );
      }
    }

    if (action === 'sync_all') {
      const plaidItems = await getPlaidItems(user.id);
      if (plaidItems.length === 0) {
        return NextResponse.json({
          message: 'No Plaid items to sync',
          synced: 0,
        });
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const item of plaidItems) {
        try {
          // Sync each item directly (reuse sync logic)
          const accessToken = item.accessToken;
          if (!accessToken) {
            errorCount++;
            results.push({
              itemId: item.itemId,
              institutionName: item.institutionName,
              status: 'error',
              error: 'Access token not available',
            });
            continue;
          }

          // Fetch accounts from Plaid
          const plaidAccounts = await getAccounts(accessToken);
          if (!plaidAccounts) {
            errorCount++;
            results.push({
              itemId: item.itemId,
              institutionName: item.institutionName,
              status: 'error',
              error: 'Failed to fetch accounts',
            });
            continue;
          }

          // Fetch transactions (last 30 days)
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          const startDateStr = startDate.toISOString().split('T')[0];

          const plaidTransactions = await getTransactions(
            accessToken,
            startDateStr,
            endDate
          );

          // Update user's financial data (reuse sync logic)
          const userData = await getUserData(user.id);
          const existingFinancial = userData?.financial || {
            totalBalance: 0,
            totalIncome: 0,
            totalExpenses: 0,
            netChange: 0,
            accounts: [],
            transactions: [],
            balanceHistory: [],
            spendingByCategory: [],
            monthlyTrends: [],
          };

          // Map Plaid accounts to our format
          const newAccounts: FinancialAccount[] = plaidAccounts.map(
            (acc: any) => {
              const existingAccount = existingFinancial.accounts.find(
                (a: FinancialAccount) => a.plaidAccountId === acc.account_id
              );

              return {
                id:
                  existingAccount?.id ||
                  `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: acc.name,
                type: mapPlaidType(acc.type),
                institution: acc.institution_id || undefined,
                balance: acc.balances.current || 0,
                currency: acc.balances.iso_currency_code || 'USD',
                lastSynced: new Date().toISOString(),
                linkedVia: 'plaid',
                plaidAccountId: acc.account_id,
              };
            }
          );

          // Merge with existing manual accounts
          const manualAccounts = existingFinancial.accounts.filter(
            (acc) => acc.linkedVia !== 'plaid'
          );
          const accounts = [...manualAccounts, ...newAccounts];

          // Map Plaid transactions to our format
          const newTransactions = (plaidTransactions || []).map((tx: any) => ({
            id: tx.transaction_id,
            accountId:
              accounts.find((a) => a.plaidAccountId === tx.account_id)?.id ||
              '',
            date: tx.date,
            amount: Math.abs(tx.amount),
            category: tx.category?.[0] || 'Uncategorized',
            description: tx.name,
            type: tx.amount > 0 ? 'expense' : 'income',
          }));

          // Merge with existing transactions (avoid duplicates)
          const existingTransactionIds = new Set(
            existingFinancial.transactions.map((tx) => tx.id)
          );
          const uniqueNewTransactions = newTransactions.filter(
            (tx: any) => !existingTransactionIds.has(tx.id)
          );
          const transactions = [
            ...existingFinancial.transactions,
            ...uniqueNewTransactions,
          ];

          // Calculate totals
          const totalBalance = accounts.reduce(
            (sum, acc) => sum + acc.balance,
            0
          );
          const totalIncome = transactions
            .filter(
              (tx: { type: string; amount: number }) => tx.type === 'income'
            )
            .reduce(
              (sum: number, tx: { amount: number }) => sum + tx.amount,
              0
            );
          const totalExpenses = transactions
            .filter(
              (tx: { type: string; amount: number }) => tx.type === 'expense'
            )
            .reduce(
              (sum: number, tx: { amount: number }) => sum + tx.amount,
              0
            );

          // Calculate spending by category
          const spendingByCategory = transactions
            .filter(
              (tx: { type: string; category?: string; amount: number }) =>
                tx.type === 'expense'
            )
            .reduce(
              (
                acc: Record<string, number>,
                tx: { category?: string; amount: number }
              ) => {
                const category = tx.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + tx.amount;
                return acc;
              },
              {}
            );

          const spendingByCategoryArray = Object.entries(
            spendingByCategory
          ).map(([category, amount]) => ({
            category,
            amount: amount as number,
          }));

          // Generate balance history from transactions
          const balanceHistory = generateBalanceHistory(
            transactions,
            totalBalance
          );

          // Calculate monthly trends
          const monthlyTrends = calculateMonthlyTrends(transactions);

          const updatedFinancial: FinancialData = {
            totalBalance,
            totalIncome,
            totalExpenses,
            netChange: totalIncome - totalExpenses,
            accounts,
            transactions,
            balanceHistory,
            spendingByCategory: spendingByCategoryArray,
            monthlyTrends,
          };

          await updateFinancialData(user.id, updatedFinancial);
          await updatePlaidItemLastSynced(user.id, item.itemId);

          successCount++;
          results.push({
            itemId: item.itemId,
            institutionName: item.institutionName,
            status: 'success',
          });
        } catch (error: any) {
          errorCount++;
          console.error(`Error syncing item ${item.itemId}:`, error);
          if (isPlaidError(error)) {
            // Handle specific Plaid errors
            if (
              error.errorCode === 'INVALID_ACCESS_TOKEN' ||
              error.errorCode === 'ITEM_NOT_FOUND'
            ) {
              // Remove invalid item from database
              try {
                await deletePlaidItem(user.id, item.itemId);
              } catch (deleteError) {
                console.error('Error deleting invalid item:', deleteError);
              }
            }
            results.push({
              itemId: item.itemId,
              institutionName: item.institutionName,
              status: 'error',
              error: getPlaidErrorMessage(error),
            });
          } else {
            results.push({
              itemId: item.itemId,
              institutionName: item.institutionName,
              status: 'error',
              error: error.message || 'Unknown error',
            });
          }
        }
      }

      return NextResponse.json({
        message: `Synced ${successCount} of ${plaidItems.length} items`,
        synced: successCount,
        errors: errorCount,
        results,
      });
    }

    if (action === 'get_items') {
      const plaidItems = await getPlaidItems(user.id);
      // Return items without access tokens
      const items = plaidItems.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        institutionId: item.institutionId,
        institutionName: item.institutionName,
        lastSyncedAt: item.lastSyncedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return NextResponse.json({ items });
    }

    if (action === 'remove_item') {
      const { item_id } = body;
      if (!item_id) {
        return NextResponse.json(
          { error: 'Item ID required' },
          { status: 400 }
        );
      }

      try {
        const plaidItem = await getPlaidItemByItemId(user.id, item_id);
        if (!plaidItem) {
          return NextResponse.json(
            { error: 'Plaid item not found' },
            { status: 404 }
          );
        }

        // Remove from Plaid
        try {
          await removeItem(plaidItem.accessToken);
        } catch (error: any) {
          console.error('Error removing item from Plaid:', error);
          // Continue with database deletion even if Plaid removal fails
        }

        // Remove from database
        await deletePlaidItem(user.id, item_id);

        // Remove associated accounts from financial data
        const userData = await getUserData(user.id);
        if (userData?.financial) {
          const updatedAccounts = userData.financial.accounts.filter(
            (acc) =>
              acc.linkedVia !== 'plaid' ||
              acc.institution !== plaidItem.institutionId
          );
          const updatedTransactions = userData.financial.transactions.filter(
            (tx) => {
              const account = updatedAccounts.find(
                (acc) => acc.id === tx.accountId
              );
              return account !== undefined;
            }
          );

          const totalBalance = updatedAccounts.reduce(
            (sum, acc) => sum + acc.balance,
            0
          );

          await updateFinancialData(user.id, {
            ...userData.financial,
            accounts: updatedAccounts,
            transactions: updatedTransactions,
            totalBalance,
          });
        }

        return NextResponse.json({ message: 'Item removed successfully' });
      } catch (error: any) {
        console.error('Remove item error:', error);
        return NextResponse.json(
          { error: 'Failed to remove item' },
          { status: 500 }
        );
      }
    }

    if (action === 'refresh_item') {
      const { item_id } = body;
      if (!item_id) {
        return NextResponse.json(
          { error: 'Item ID required' },
          { status: 400 }
        );
      }

      // Refresh is just a sync for a specific item
      return POST(
        new Request(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            item_id,
          }),
        })
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Plaid API error', error);
    return NextResponse.json(
      { error: 'Failed to process Plaid request' },
      { status: 500 }
    );
  }
}

function mapPlaidType(plaidType: string): FinancialAccount['type'] {
  const typeMap: Record<string, FinancialAccount['type']> = {
    depository: 'checking',
    credit: 'credit_card',
    investment: 'investment',
  };

  if (plaidType === 'depository') {
    // Plaid doesn't distinguish checking vs savings, default to checking
    return 'checking';
  }

  return typeMap[plaidType] || 'checking';
}

function generateBalanceHistory(
  transactions: any[],
  currentBalance: number
): Array<{ date: string; balance: number }> {
  // Group transactions by date
  const transactionsByDate: Record<string, number> = {};
  transactions.forEach((tx) => {
    const date = tx.date;
    if (!transactionsByDate[date]) {
      transactionsByDate[date] = 0;
    }
    transactionsByDate[date] += tx.type === 'income' ? tx.amount : -tx.amount;
  });

  // Generate 30-day history
  const history: Array<{ date: string; balance: number }> = [];
  let runningBalance = currentBalance;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Subtract transactions that happened after this date
    Object.entries(transactionsByDate).forEach(([txDate, amount]) => {
      if (txDate > dateStr) {
        runningBalance -= amount;
      }
    });

    history.push({
      date: dateStr,
      balance: runningBalance,
    });
  }

  return history;
}

function calculateMonthlyTrends(
  transactions: any[]
): Array<{ month: string; income: number; expenses: number }> {
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  transactions.forEach((tx) => {
    const month = tx.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0 };
    }

    if (tx.type === 'income') {
      monthlyData[month].income += tx.amount;
    } else {
      monthlyData[month].expenses += tx.amount;
    }
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Last 6 months
}
