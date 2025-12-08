import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserData,
  updateFinancialData,
  FinancialData,
  SPENDING_CATEGORIES,
} from "@/lib/db";

// Helper function to calculate current month spending by category
function calculateCurrentMonthSpending(
  transactions: FinancialData["transactions"]
): Record<string, number> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter((tx) => {
      const txDate = new Date(tx.date);
      return (
        tx.type === "expense" &&
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    })
    .reduce((acc, tx) => {
      const category = tx.category || "other";
      acc[category] = (acc[category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
}

// Helper function to calculate budget status
function calculateBudgetStatus(
  budgets: Array<{ category: string; monthlyBudget: number }>,
  currentSpending: Record<string, number>
) {
  return budgets.map((budget) => {
    const spent = currentSpending[budget.category] || 0;
    const remaining = budget.monthlyBudget - spent;
    const percentage = budget.monthlyBudget > 0 
      ? (spent / budget.monthlyBudget) * 100 
      : 0;
    
    return {
      category: budget.category,
      monthlyBudget: budget.monthlyBudget,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      status: percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "good",
    };
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json({
        budgets: [],
        dailyGoal: 0,
        monthlyGoal: 0,
        currentSpending: {},
        budgetStatus: [],
      });
    }

    const financial = userData.financial;
    const budgets = financial.budgets || [];
    const currentSpending = calculateCurrentMonthSpending(financial.transactions);
    const budgetStatus = calculateBudgetStatus(budgets, currentSpending);

    // Calculate daily spending
    const today = new Date().toISOString().split("T")[0];
    const todaySpending = financial.transactions
      .filter(
        (tx) => tx.type === "expense" && tx.date === today
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate monthly spending
    const monthlySpending = Object.values(currentSpending).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return NextResponse.json({
      budgets,
      dailyGoal: financial.dailyGoal || 0,
      monthlyGoal: financial.monthlyGoal || 0,
      currentSpending,
      budgetStatus,
      todaySpending,
      monthlySpending,
      lastUpdated: financial.lastUpdated,
    });
  } catch (error) {
    console.error("Budget fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget data" },
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
    const { budgets, dailyGoal, monthlyGoal } = body;

    const userData = await getUserData(user.id);
    if (!userData?.financial) {
      return NextResponse.json(
        { error: "No financial data found" },
        { status: 404 }
      );
    }

    // Validate budgets
    if (budgets) {
      for (const budget of budgets) {
        if (!SPENDING_CATEGORIES.includes(budget.category as any)) {
          return NextResponse.json(
            { error: `Invalid category: ${budget.category}` },
            { status: 400 }
          );
        }
        if (typeof budget.monthlyBudget !== "number" || budget.monthlyBudget < 0) {
          return NextResponse.json(
            { error: "Monthly budget must be a non-negative number" },
            { status: 400 }
          );
        }
      }
    }

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      ...(budgets && { budgets }),
      ...(dailyGoal !== undefined && { dailyGoal: Number(dailyGoal) }),
      ...(monthlyGoal !== undefined && { monthlyGoal: Number(monthlyGoal) }),
    };

    await updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({
      message: "Budget updated successfully",
      budgets: updatedFinancial.budgets,
      dailyGoal: updatedFinancial.dailyGoal,
      monthlyGoal: updatedFinancial.monthlyGoal,
    });
  } catch (error) {
    console.error("Budget update error:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

