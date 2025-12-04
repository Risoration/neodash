import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  getTransactions,
} from '@/lib/plaid';
import {
  getUserData,
  updateFinancialData,
  FinancialAccount,
  FinancialData,
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
      const linkToken = await createLinkToken(user.id);
      if (!linkToken) {
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
      const { public_token } = body;
      if (!public_token) {
        return NextResponse.json(
          { error: 'Public token required' },
          { status: 400 }
        );
      }

      const result = await exchangePublicToken(public_token);
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to exchange token' },
          { status: 500 }
        );
      }

      // Store access token (in production, encrypt this)
      // For now, we'll store it in user config or a separate storage
      // This is a simplified version - in production, use secure storage

      return NextResponse.json({
        access_token: result.accessToken,
        item_id: result.itemId,
      });
    }

    if (action === 'sync') {
      const { access_token } = body;
      if (!access_token) {
        return NextResponse.json(
          { error: 'Access token required' },
          { status: 400 }
        );
      }

      // Fetch accounts from Plaid
      const plaidAccounts = await getAccounts(access_token);
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
        access_token,
        startDateStr,
        endDate
      );

      // Update user's financial data
      const userData = getUserData(user.id);
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
      const accounts: FinancialAccount[] = plaidAccounts.map((acc: any) => {
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
      });

      // Map Plaid transactions to our format
      const transactions = (plaidTransactions || []).map((tx: any) => ({
        id: tx.transaction_id,
        accountId:
          accounts.find((a) => a.plaidAccountId === tx.account_id)?.id || '',
        date: tx.date,
        amount: Math.abs(tx.amount),
        category: tx.category?.[0] || 'Uncategorized',
        description: tx.name,
        type: tx.amount > 0 ? 'expense' : 'income',
      }));

      // Calculate totals
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const totalIncome = transactions
        .filter((tx: { type: string; amount: number }) => tx.type === 'income')
        .reduce((sum: number, tx: { amount: number }) => sum + tx.amount, 0);
      const totalExpenses = transactions
        .filter((tx: { type: string; amount: number }) => tx.type === 'expense')
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
      const balanceHistory = generateBalanceHistory(transactions, totalBalance);

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

      updateFinancialData(user.id, updatedFinancial);

      return NextResponse.json({ message: 'Accounts synced successfully' });
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
