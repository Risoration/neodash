'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaidItem {
  id: string;
  itemId: string;
  institutionId?: string;
  institutionName?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaidAccountManagerProps {
  onSyncComplete?: () => void;
  className?: string;
}

export function PlaidAccountManager({
  onSyncComplete,
  className,
}: PlaidAccountManagerProps) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingItems, setSyncingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/financial/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_items' }),
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      } else {
        console.error('Failed to load Plaid items');
      }
    } catch (error) {
      console.error('Error loading Plaid items:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncItem = async (itemId: string) => {
    try {
      setSyncingItems((prev) => new Set(prev).add(itemId));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });

      const response = await fetch('/api/financial/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh_item',
          item_id: itemId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          [itemId]: data.error || 'Failed to sync account',
        }));

        // If requires relink, show that message
        if (data.requiresRelink) {
          setErrors((prev) => ({
            ...prev,
            [itemId]: data.error || 'Account requires reconnection',
          }));
        }
      } else {
        // Reload items to get updated lastSyncedAt
        await loadItems();
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [itemId]: error.message || 'Failed to sync account',
      }));
    } finally {
      setSyncingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this account? This will remove all associated accounts and transactions.'
      )
    ) {
      return;
    }

    try {
      setRemovingItems((prev) => new Set(prev).add(itemId));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });

      const response = await fetch('/api/financial/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          item_id: itemId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors((prev) => ({
          ...prev,
          [itemId]: data.error || 'Failed to remove account',
        }));
      } else {
        // Remove from local state
        setItems((prev) => prev.filter((item) => item.itemId !== itemId));
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [itemId]: error.message || 'Failed to remove account',
      }));
    } finally {
      setRemovingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const syncAll = async () => {
    try {
      setSyncingAll(true);
      setErrors({});

      const response = await fetch('/api/financial/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reload items
        await loadItems();
        if (onSyncComplete) {
          onSyncComplete();
        }
        // Show success message
        alert(`Successfully synced ${data.synced} of ${items.length} accounts`);
      } else {
        alert('Failed to sync all accounts: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error syncing accounts: ' + error.message);
    } finally {
      setSyncingAll(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading linked accounts...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Linked Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No bank accounts linked yet.</p>
            <p className="text-xs mt-2">
              Use the "Link Account with Plaid" button to connect your bank.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Linked Bank Accounts</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={syncAll}
            disabled={syncingAll}
          >
            {syncingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => {
            const isSyncing = syncingItems.has(item.itemId);
            const isRemoving = removingItems.has(item.itemId);
            const error = errors[item.itemId];
            const needsRelink = error?.includes('reconnect') || error?.includes('re-authentication');

            return (
              <motion.div
                key={item.itemId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium text-sm truncate">
                        {item.institutionName || 'Unknown Institution'}
                      </h4>
                      {needsRelink && (
                        <Badge variant="destructive" className="text-xs">
                          Needs Reconnection
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Last synced: {formatDate(item.lastSyncedAt)}</span>
                      </div>
                    </div>
                    {error && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncItem(item.itemId)}
                      disabled={isSyncing || isRemoving}
                      title="Sync this account"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.itemId)}
                      disabled={isSyncing || isRemoving}
                      title="Disconnect this account"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

