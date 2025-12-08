"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SPENDING_CATEGORIES } from "@/lib/db";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  essentials: "#ef4444",
  food: "#f59e0b",
  entertainment: "#8b5cf6",
  transportation: "#3b82f6",
  utilities: "#10b981",
  healthcare: "#ec4899",
  shopping: "#06b6d4",
  other: "#6b7280",
};

const CATEGORY_LABELS: Record<string, string> = {
  essentials: "Essentials",
  food: "Food",
  entertainment: "Entertainment",
  transportation: "Transportation",
  utilities: "Utilities",
  healthcare: "Healthcare",
  shopping: "Shopping",
  other: "Other",
};

export default function AccountUpdatePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    category: "other",
    description: "",
    updateBalance: false,
    newBalance: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch accounts
      const accountsRes = await fetch("/api/financial/accounts");
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        const manualAccounts = accountsData.accounts.filter(
          (acc: any) => acc.linkedVia === "manual"
        );
        setAccounts(manualAccounts);
        if (manualAccounts.length > 0 && !selectedAccount) {
          setSelectedAccount(manualAccounts[0].id);
        }
      }

      // Fetch budget data
      const budgetRes = await fetch("/api/financial/budget");
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudgetData(budgetData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !formData.amount || !formData.description) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/financial/daily-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          amount: formData.amount,
          category: formData.category,
          description: formData.description,
          updateBalance: formData.updateBalance,
          newBalance: formData.updateBalance ? formData.newBalance : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to record update");
        return;
      }

      // Reset form
      setFormData({
        amount: "",
        category: "other",
        description: "",
        updateBalance: false,
        newBalance: "",
      });

      // Reload data
      await loadData();
      alert("Daily update recorded successfully!");
    } catch (error) {
      console.error("Error submitting update:", error);
      alert("Failed to record update");
    } finally {
      setSubmitting(false);
    }
  };

  const currentAccount = accounts.find((acc) => acc.id === selectedAccount);
  const todaySpending = budgetData?.todaySpending || 0;
  const monthlySpending = budgetData?.monthlySpending || 0;
  const dailyGoal = budgetData?.dailyGoal || 0;
  const monthlyGoal = budgetData?.monthlyGoal || 0;

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen gradient-bg">
        <Sidebar />
        <MobileNav />
        <div className="md:ml-64 pb-20 md:pb-0 p-4 md:p-8">
          <Card className="glass-card border-0 max-w-2xl mx-auto mt-8">
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No Manual Accounts</h2>
              <p className="text-muted-foreground mb-6">
                You don't have any manually linked accounts. Add one in settings
                to start tracking your daily spending.
              </p>
              <Link href="/settings">
                <Button>Go to Settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <MobileNav />
      <div className="md:ml-64 pb-20 md:pb-0 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Daily Account Update</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form and Account Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Selection */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>Select Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Current Balance */}
              {currentAccount && (
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle>Current Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(currentAccount.balance)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentAccount.institution || "Personal Account"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Daily Spending Form */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>Record Daily Spending</CardTitle>
                  <CardDescription>
                    Add your expenses for today with categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                      >
                        {SPENDING_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_LABELS[cat] || cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="What did you spend on?"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="updateBalance"
                        checked={formData.updateBalance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            updateBalance: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="updateBalance" className="cursor-pointer">
                        Update balance manually
                      </Label>
                    </div>

                    {formData.updateBalance && (
                      <div>
                        <Label>New Balance</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.newBalance}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              newBalance: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        "Record Spending"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Budget Status */}
            <div className="space-y-6">
              {/* Daily Summary */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>Today's Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatCurrency(todaySpending)}
                  </div>
                  {dailyGoal > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Goal:</span>
                        <span>{formatCurrency(dailyGoal)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            todaySpending > dailyGoal
                              ? "bg-red-500"
                              : todaySpending > dailyGoal * 0.8
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (todaySpending / dailyGoal) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {todaySpending > dailyGoal ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-500">
                              Over budget by{" "}
                              {formatCurrency(todaySpending - dailyGoal)}
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500">
                              Under budget by{" "}
                              {formatCurrency(dailyGoal - todaySpending)}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Summary */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>Monthly Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatCurrency(monthlySpending)}
                  </div>
                  {monthlyGoal > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Goal:</span>
                        <span>{formatCurrency(monthlyGoal)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            monthlySpending > monthlyGoal
                              ? "bg-red-500"
                              : monthlySpending > monthlyGoal * 0.8
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (monthlySpending / monthlyGoal) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Budget by Category */}
              {budgetData?.budgetStatus && budgetData.budgetStatus.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle>Budget by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {budgetData.budgetStatus.map((budget: any) => (
                        <div key={budget.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {CATEGORY_LABELS[budget.category] ||
                                budget.category}
                            </span>
                            <span className="text-sm">
                              {formatCurrency(budget.spent)} /{" "}
                              {formatCurrency(budget.monthlyBudget)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                budget.status === "over"
                                  ? "bg-red-500"
                                  : budget.status === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(budget.percentage, 100)}%`,
                              }}
                            />
                          </div>
                          {budget.remaining < 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              Over by {formatCurrency(Math.abs(budget.remaining))}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

