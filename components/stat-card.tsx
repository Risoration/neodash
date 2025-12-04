"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  gradient?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  gradient = "from-purple-500/20 to-pink-500/20",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card group hover:scale-[1.02] transition-transform duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold mb-2">{value}</p>
          {change !== undefined && (
            <p
              className={cn(
                "text-sm font-medium",
                change >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            gradient,
            "group-hover:scale-110 transition-transform duration-300"
          )}
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}

