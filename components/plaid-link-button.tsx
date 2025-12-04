"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, CheckCircle2 } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess?: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
  className?: string;
}

export function PlaidLinkButton({
  onSuccess,
  onExit,
  className,
}: PlaidLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Load Plaid Link script
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Get link token from API
      const response = await fetch("/api/financial/plaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_link_token" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create link token");
      }

      const data = await response.json();
      const token = data.link_token;

      if (!token) {
        throw new Error("No link token received");
      }

      setLinkToken(token);

      // Initialize Plaid Link
      if (window.Plaid) {
        const handler = window.Plaid.create({
          token,
          onSuccess: (publicToken: string, metadata: any) => {
            setConnected(true);
            setLoading(false);
            if (onSuccess) {
              onSuccess(publicToken, metadata);
            }
          },
          onExit: (err: any, metadata: any) => {
            setLoading(false);
            if (onExit) {
              onExit();
            }
          },
          onEvent: (eventName: string, metadata: any) => {
            console.log("Plaid event:", eventName, metadata);
          },
        });

        handler.open();
      } else {
        throw new Error("Plaid library not loaded");
      }
    } catch (error: any) {
      console.error("Plaid Link error:", error);
      alert(
        error.message ||
          "Failed to initialize Plaid Link. Please check your Plaid configuration."
      );
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-green-500">
        <CheckCircle2 className="w-4 h-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={className}
      variant="outline"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4 mr-2" />
          Link Account with Plaid
        </>
      )}
    </Button>
  );
}

// Extend Window interface for Plaid
declare global {
  interface Window {
    Plaid: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: any) => void;
        onExit: (err: any, metadata: any) => void;
        onEvent?: (eventName: string, metadata: any) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

