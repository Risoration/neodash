"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  className?: string;
  status?: "idle" | "connecting" | "connected" | "error";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  href,
  className,
  status = "idle",
}: EmptyStateProps) {
  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "connecting":
        return "text-blue-500";
      default:
        return "text-primary";
    }
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-card flex flex-col items-center justify-center text-center space-y-4 py-10",
        className
      )}
    >
      <div className={cn("w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center", status !== "idle" && getStatusColor().replace("text-", "bg-").replace("-500", "-500/10"))}>
        <Icon className={cn("w-6 h-6 text-primary", status !== "idle" && getStatusColor())} />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm">{description}</p>
      </div>
      {actionLabel && status === "idle" && (
        <div className="mt-2">
          {href ? (
            <Link href={href}>
              <Button>{actionLabel}</Button>
            </Link>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
      {status === "connecting" && (
        <p className="text-sm text-muted-foreground">Connecting...</p>
      )}
      {status === "connected" && (
        <p className="text-sm text-green-500">Connected successfully!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500">Connection failed. Please try again.</p>
      )}
    </motion.div>
  );

  return content;
}

