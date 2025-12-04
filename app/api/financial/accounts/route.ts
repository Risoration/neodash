import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserData,
  updateFinancialData,
  FinancialAccount,
  FinancialData,
} from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userData = await getUserData(user.id);
  const accounts = userData?.financial?.accounts || [];

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      type,
      institution,
      balance,
      currency = "USD",
      linkedVia = "manual",
      plaidAccountId,
    } = body;

    if (!name || !type || balance === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    const newAccount: FinancialAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      institution,
      balance: Number(balance),
      currency,
      lastSynced: linkedVia === "plaid" ? new Date().toISOString() : undefined,
      linkedVia,
      plaidAccountId,
    };

    const updatedAccounts = [...existingFinancial.accounts, newAccount];
    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const updatedFinancial: FinancialData = {
      ...existingFinancial,
      accounts: updatedAccounts,
      totalBalance,
    };

    await updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({ account: newAccount, message: "Account added" });
  } catch (error) {
    console.error("Account creation error", error);
    return NextResponse.json(
      { error: "Failed to create account" },
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
    const { id, name, balance, institution } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Account ID required" },
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

    const updatedAccounts = userData.financial.accounts.map((acc) =>
      acc.id === id
        ? {
            ...acc,
            ...(name && { name }),
            ...(balance !== undefined && { balance: Number(balance) }),
            ...(institution && { institution }),
          }
        : acc
    );

    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      accounts: updatedAccounts,
      totalBalance,
    };

    await updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({ message: "Account updated" });
  } catch (error) {
    console.error("Account update error", error);
    return NextResponse.json(
      { error: "Failed to update account" },
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
        { error: "Account ID required" },
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

    const updatedAccounts = userData.financial.accounts.filter(
      (acc) => acc.id !== id
    );
    const updatedTransactions = userData.financial.transactions.filter(
      (tx) => tx.accountId !== id
    );

    const totalBalance = updatedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const updatedFinancial: FinancialData = {
      ...userData.financial,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      totalBalance,
    };

    await updateFinancialData(user.id, updatedFinancial);

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Account deletion error", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

