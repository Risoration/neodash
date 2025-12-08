import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserData,
  updateFinancialData,
  FinancialData,
  SPENDING_CATEGORIES,
} from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, amount, category, description, updateBalance, newBalance } = body;

    if (!accountId || amount === undefined || !description) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, amount, description" },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category && !SPENDING_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${SPENDING_CATEGORIES.join(", ")}` },
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

    const account = userData.financial.accounts.find((acc) => acc.id === accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Only allow updates for manual accounts
    if (account.linkedVia !== "manual") {
      return NextResponse.json(
        { error: "Daily updates are only available for manually linked accounts" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const expenseAmount = Math.abs(Number(amount));

    // Create transaction
    const newTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      date: today,
      amount: expenseAmount,
      category: category || "other",
      description,
      type: "expense" as const,
    };

    const updatedTransactions = [
      ...userData.financial.transactions,
      newTransaction,
    ];

    // Update account balance
    let updatedAccounts = userData.financial.accounts.map((acc) => {
      if (acc.id === accountId) {
        if (updateBalance && newBalance !== undefined) {
          // Direct balance update
          return {
            ...acc,
            balance: Number(newBalance),
          };
        } else {
          // Deduct expense from balance
          return {
            ...acc,
            balance: acc.balance - expenseAmount,
          };
        }
      }
      return acc;
    });

    // Recalculate totals
    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );
    const totalIncome = updatedTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Recalculate spending by category
    const spendingByCategory = updatedTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc: Record<string, number>, tx) => {
        const cat = tx.category || "other";
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
      lastUpdated: new Date().toISOString(),
    };

    await updateFinancialData(user.id, updatedFinancial);

    // Calculate budget status if budgets exist
    let budgetStatus = null;
    if (userData.financial.budgets) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthSpending = updatedTransactions
        .filter((tx) => {
          const txDate = new Date(tx.date);
          return (
            tx.type === "expense" &&
            txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear
          );
        })
        .reduce((acc, tx) => {
          const cat = tx.category || "other";
          acc[cat] = (acc[cat] || 0) + tx.amount;
          return acc;
        }, {} as Record<string, number>);

      budgetStatus = userData.financial.budgets.map((budget) => {
        const spent = currentMonthSpending[budget.category] || 0;
        const remaining = budget.monthlyBudget - spent;
        const percentage =
          budget.monthlyBudget > 0 ? (spent / budget.monthlyBudget) * 100 : 0;

        return {
          category: budget.category,
          monthlyBudget: budget.monthlyBudget,
          spent,
          remaining,
          percentage: Math.min(percentage, 100),
          status:
            percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "good",
        };
      });
    }

    return NextResponse.json({
      message: "Daily update recorded successfully",
      transaction: newTransaction,
      account: updatedAccounts.find((acc) => acc.id === accountId),
      budgetStatus,
    });
  } catch (error) {
    console.error("Daily update error:", error);
    return NextResponse.json(
      { error: "Failed to record daily update" },
      { status: 500 }
    );
  }
}

function generateBalanceHistory(
  transactions: FinancialData["transactions"],
  currentBalance: number
): Array<{ date: string; balance: number }> {
  const now = new Date();
  const history: Array<{ date: string; balance: number }> = [];
  let runningBalance = currentBalance;

  // Generate last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Calculate balance for this date
    const transactionsOnOrAfter = transactions.filter(
      (tx) => tx.date >= dateStr
    );

    transactionsOnOrAfter.forEach((tx) => {
      if (tx.type === "income") {
        runningBalance -= tx.amount;
      } else if (tx.type === "expense") {
        runningBalance += tx.amount;
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
  transactions: FinancialData["transactions"]
): Array<{ month: string; income: number; expenses: number }> {
  const trends: Record<string, { income: number; expenses: number }> = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!trends[monthKey]) {
      trends[monthKey] = { income: 0, expenses: 0 };
    }

    if (tx.type === "income") {
      trends[monthKey].income += tx.amount;
    } else if (tx.type === "expense") {
      trends[monthKey].expenses += tx.amount;
    }
  });

  return Object.entries(trends)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

