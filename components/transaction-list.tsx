"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  category?: string;
  description: string;
  type: "income" | "expense" | "transfer";
}

interface TransactionListProps {
  accountId?: string;
  limit?: number;
  showActions?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export function TransactionList({
  accountId,
  limit,
  showActions = false,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const params = new URLSearchParams();
        if (accountId) params.append("accountId", accountId);
        if (limit) params.append("limit", limit.toString());

        const response = await fetch(`/api/financial/transactions?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [accountId, limit]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`p-2 rounded-lg ${
                transaction.type === "income"
                  ? "bg-green-500/10 text-green-500"
                  : transaction.type === "expense"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-blue-500/10 text-blue-500"
              }`}
            >
              {transaction.type === "income" ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {transaction.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
                {transaction.category && (
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${
                  transaction.type === "income"
                    ? "text-green-500"
                    : "text-foreground"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
          {showActions && (onEdit || onDelete) && (
            <div className="flex items-center gap-2 ml-4">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(transaction.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

