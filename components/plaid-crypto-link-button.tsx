'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, CheckCircle2, AlertCircle } from 'lucide-react';

interface PlaidCryptoLinkButtonProps {
  onSuccess?: (itemId: string, institutionName?: string) => void;
  onExit?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function PlaidCryptoLinkButton({
  onSuccess,
  onExit,
  onError,
  className,
}: PlaidCryptoLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Plaid Link script
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get link token from API (for crypto exchanges)
      const response = await fetch('/api/financial/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_link_token' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            'Failed to create link token. Please check your Plaid configuration.'
        );
      }

      const data = await response.json();
      const token = data.link_token;

      if (!token) {
        throw new Error('No link token received from server');
      }

      setLinkToken(token);

      // Initialize Plaid Link
      if (window.Plaid) {
        const handler = window.Plaid.create({
          token,
          onSuccess: async (publicToken: string, metadata: any) => {
            setLoading(false);
            setExchanging(true);

            try {
              // Exchange public token for access token (stored in DB)
              const exchangeResponse = await fetch('/api/financial/plaid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'exchange_token',
                  public_token: publicToken,
                }),
              });

              if (!exchangeResponse.ok) {
                const errorData = await exchangeResponse
                  .json()
                  .catch(() => ({}));
                throw new Error(
                  errorData.error ||
                    'Failed to connect your crypto exchange. Please try again.'
                );
              }

              const exchangeData = await exchangeResponse.json();
              const itemId = exchangeData.item_id;
              const institutionName = exchangeData.institution_name;

              // Sync crypto holdings
              setExchanging(true);
              try {
                const syncResponse = await fetch('/api/crypto/plaid', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'sync',
                    item_id: itemId,
                  }),
                });

                if (!syncResponse.ok) {
                  const syncErrorData = await syncResponse
                    .json()
                    .catch(() => ({}));
                  console.warn('Crypto sync failed:', syncErrorData.error);
                }
              } catch (syncError) {
                console.error('Crypto sync error:', syncError);
              } finally {
                setExchanging(false);
              }

              setConnected(true);
              setExchanging(false);

              if (onSuccess) {
                onSuccess(itemId, institutionName);
              }
            } catch (error: any) {
              console.error('Token exchange error:', error);
              const errorMessage =
                error.message ||
                'Failed to connect your crypto exchange. Please try again.';
              setError(errorMessage);
              setExchanging(false);
              if (onError) {
                onError(errorMessage);
              } else {
                alert(errorMessage);
              }
            }
          },
          onExit: (err: any, metadata: any) => {
            setLoading(false);
            setExchanging(false);

            if (err) {
              let errorMessage: string;
              if (err.error_code === 'UNAUTHORIZED_INSTITUTION') {
                const institutionName =
                  err.institution_name || 'This crypto exchange';
                errorMessage = `${institutionName} requires business registration in Plaid Dashboard. Try selecting a different exchange (many exchanges don't require registration).`;
              } else {
                errorMessage =
                  err.display_message ||
                  err.error_message ||
                  'Connection was cancelled or failed.';
              }
              setError(errorMessage);
              if (onError) {
                onError(errorMessage);
              }
            }

            if (onExit) {
              onExit();
            }
          },
          onEvent: (eventName: string, metadata: any) => {
            console.log('Plaid crypto event:', eventName, metadata);
            if (eventName === 'ERROR') {
              if (metadata?.error_code === 'UNAUTHORIZED_INSTITUTION') {
                const institutionName =
                  metadata?.institution_name || 'This crypto exchange';
                const errorMessage = `${institutionName} requires business registration in Plaid Dashboard. Try selecting a different exchange.`;
                setError(errorMessage);
              } else {
                const errorMessage =
                  metadata?.error_message ||
                  metadata?.error_code ||
                  'An error occurred during connection.';
                setError(errorMessage);
              }
            }
          },
        });

        handler.open();
      } else {
        throw new Error(
          'Plaid library not loaded. Please refresh the page and try again.'
        );
      }
    } catch (error: any) {
      console.error('Plaid Link error:', error);
      const errorMessage =
        error.message ||
        'Failed to initialize Plaid Link. Please check your Plaid configuration.';
      setError(errorMessage);
      setLoading(false);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  if (connected) {
    return (
      <div className='flex items-center gap-2 text-green-500'>
        <CheckCircle2 className='w-4 h-4' />
        <span>Connected</span>
      </div>
    );
  }

  const isLoading = loading || exchanging;
  const statusText = exchanging
    ? 'Connecting...'
    : loading
      ? 'Loading...'
      : null;

  return (
    <div className='flex flex-col gap-2'>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className={className}
        variant='outline'
      >
        {isLoading ? (
          <>
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            {statusText || 'Connecting...'}
          </>
        ) : (
          <>
            <Coins className='w-4 h-4 mr-2' />
            Link Crypto Exchange with Plaid
          </>
        )}
      </Button>
      {error && (
        <div className='flex items-start gap-2 text-sm text-destructive'>
          <AlertCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
          <span>{error}</span>
        </div>
      )}
    </div>
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

