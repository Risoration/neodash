"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SPENDING_CATEGORIES, type SpendingCategory } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

interface TransactionFormProps {
  accountId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    date?: string;
    amount?: number;
    category?: string;
    description?: string;
    type?: "income" | "expense" | "transfer";
  };
}

export function TransactionForm({
  accountId,
  onSuccess,
  onCancel,
  initialData,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split("T")[0],
    amount: initialData?.amount?.toString() || "",
    category: initialData?.category || "other",
    description: initialData?.description || "",
    type: initialData?.type || "expense",
  });

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

  useEffect(() => {
    // Fetch budget status when category changes
    if (formData.category && formData.type === "expense") {
      fetchBudgetStatus();
    }
  }, [formData.category, formData.type]);

  const fetchBudgetStatus = async () => {
    try {
      const response = await fetch("/api/financial/budget");
      if (response.ok) {
        const data = await response.json();
        const categoryBudget = data.budgetStatus?.find(
          (b: any) => b.category === formData.category
        );
        setBudgetStatus(categoryBudget);
      }
    } catch (error) {
      console.error("Error fetching budget status:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData?.id
        ? `/api/financial/transactions?id=${initialData.id}`
        : "/api/financial/transactions";

      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(initialData?.id && { id: initialData.id }),
          accountId,
          ...formData,
          amount: Number(formData.amount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Transaction save error:", error);
      alert("Failed to save transaction: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Type</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as any })
          }
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <div>
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Transaction description"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          <Label>Date</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
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
        {formData.type === "expense" && budgetStatus && (
          <div className="mt-2 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Budget: {formatCurrency(budgetStatus.monthlyBudget)}
              </span>
              <span className="text-muted-foreground">
                Spent: {formatCurrency(budgetStatus.spent)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  budgetStatus.status === "over"
                    ? "bg-red-500"
                    : budgetStatus.status === "warning"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${Math.min(budgetStatus.percentage, 100)}%`,
                }}
              />
            </div>
            {budgetStatus.remaining >= 0 ? (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  {formatCurrency(budgetStatus.remaining)} remaining
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                <span>
                  Over by {formatCurrency(Math.abs(budgetStatus.remaining))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            initialData?.id ? "Update" : "Add"
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

