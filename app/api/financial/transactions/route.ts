import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserData,
  updateFinancialData,
  FinancialData,
} from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json({ transactions: [] });
    }

    let transactions = userData.financial.transactions || [];

    // Apply filters
    if (accountId) {
      transactions = transactions.filter((tx) => tx.accountId === accountId);
    }
    if (startDate) {
      transactions = transactions.filter((tx) => tx.date >= startDate);
    }
    if (endDate) {
      transactions = transactions.filter((tx) => tx.date <= endDate);
    }
    if (category) {
      transactions = transactions.filter((tx) => tx.category === category);
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Transaction fetch error", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, date, amount, category, description, type } = body;

    if (!accountId || !date || amount === undefined || !description || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json(
        { error: "No financial data found" },
        { status: 404 }
      );
    }

    const newTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      date,
      amount: Math.abs(Number(amount)),
      category: category || "Uncategorized",
      description,
      type: type as "income" | "expense" | "transfer",
    };

    const updatedTransactions = [
      ...userData.financial.transactions,
      newTransaction,
    ];

    // Recalculate totals
    const totalIncome = updatedTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Update account balance if it's an expense or income
    const updatedAccounts = userData.financial.accounts.map((acc) => {
      if (acc.id === accountId) {
        const balanceChange =
          newTransaction.type === "income"
            ? newTransaction.amount
            : -newTransaction.amount;
        return {
          ...acc,
          balance: acc.balance + balanceChange,
        };
      }
      return acc;
    });

    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    // Recalculate spending by category
    const spendingByCategory = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc: Record<string, number>, tx) => {
        const cat = tx.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + tx.amount;
        return acc;
      }, {});

    const spendingByCategoryArray = Object.entries(spendingByCategory).map(
      ([category, amount]) => ({
        category,
        amount: amount as number,
      })
    );

    // Regenerate balance history
    const balanceHistory = generateBalanceHistory(
      updatedTransactions,
      totalBalance
    );

    // Recalculate monthly trends
    const monthlyTrends = calculateMonthlyTrends(updatedTransactions);

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      totalBalance,
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
      balanceHistory,
      spendingByCategory: spendingByCategoryArray,
      monthlyTrends,
    };

    updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({
      transaction: newTransaction,
      message: "Transaction added",
    });
  } catch (error) {
    console.error("Transaction creation error", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, date, amount, category, description, type } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json(
        { error: "No financial data found" },
        { status: 404 }
      );
    }

    const updatedTransactions = userData.financial.transactions.map((tx) =>
      tx.id === id
        ? {
            ...tx,
            ...(date && { date }),
            ...(amount !== undefined && { amount: Math.abs(Number(amount)) }),
            ...(category && { category }),
            ...(description && { description }),
            ...(type && { type }),
          }
        : tx
    );

    // Recalculate all financial metrics
    const totalIncome = updatedTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const spendingByCategory = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc: Record<string, number>, tx) => {
        const cat = tx.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + tx.amount;
        return acc;
      }, {});

    const spendingByCategoryArray = Object.entries(spendingByCategory).map(
      ([category, amount]) => ({
        category,
        amount: amount as number,
      })
    );

    // Recalculate account balances from transactions
    const updatedAccounts = userData.financial.accounts.map((acc) => {
      const accountTransactions = updatedTransactions.filter(
        (tx) => tx.accountId === acc.id
      );
      const balanceChange = accountTransactions.reduce((sum, tx) => {
        return sum + (tx.type === "income" ? tx.amount : -tx.amount);
      }, 0);
      return {
        ...acc,
        balance: balanceChange,
      };
    });

    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const balanceHistory = generateBalanceHistory(
      updatedTransactions,
      totalBalance
    );
    const monthlyTrends = calculateMonthlyTrends(updatedTransactions);

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      totalBalance,
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
      balanceHistory,
      spendingByCategory: spendingByCategoryArray,
      monthlyTrends,
    };

    updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({ message: "Transaction updated" });
  } catch (error) {
    console.error("Transaction update error", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json(
        { error: "No financial data found" },
        { status: 404 }
      );
    }

    const updatedTransactions = userData.financial.transactions.filter(
      (tx) => tx.id !== id
    );

    // Recalculate all metrics
    const totalIncome = updatedTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const spendingByCategory = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc: Record<string, number>, tx) => {
        const cat = tx.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + tx.amount;
        return acc;
      }, {});

    const spendingByCategoryArray = Object.entries(spendingByCategory).map(
      ([category, amount]) => ({
        category,
        amount: amount as number,
      })
    );

    const updatedAccounts = userData.financial.accounts.map((acc) => {
      const accountTransactions = updatedTransactions.filter(
        (tx) => tx.accountId === acc.id
      );
      const balanceChange = accountTransactions.reduce((sum, tx) => {
        return sum + (tx.type === "income" ? tx.amount : -tx.amount);
      }, 0);
      return {
        ...acc,
        balance: balanceChange,
      };
    });

    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const balanceHistory = generateBalanceHistory(
      updatedTransactions,
      totalBalance
    );
    const monthlyTrends = calculateMonthlyTrends(updatedTransactions);

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      totalBalance,
      totalIncome,
      totalExpenses,
      netChange: totalIncome - totalExpenses,
      balanceHistory,
      spendingByCategory: spendingByCategoryArray,
      monthlyTrends,
    };

    updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({ message: "Transaction deleted" });
  } catch (error) {
    console.error("Transaction deletion error", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

function generateBalanceHistory(
  transactions: any[],
  currentBalance: number
): Array<{ date: string; balance: number }> {
  const transactionsByDate: Record<string, number> = {};
  transactions.forEach((tx) => {
    const date = tx.date;
    if (!transactionsByDate[date]) {
      transactionsByDate[date] = 0;
    }
    transactionsByDate[date] += tx.type === "income" ? tx.amount : -tx.amount;
  });

  const history: Array<{ date: string; balance: number }> = [];
  let runningBalance = currentBalance;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

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
    const month = tx.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0 };
    }

    if (tx.type === "income") {
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
    .slice(-6);
}

