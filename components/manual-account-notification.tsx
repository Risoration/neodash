'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface ManualAccountNotificationProps {
  accounts: Array<{
    id: string;
    name: string;
    linkedVia?: 'manual' | 'plaid';
    lastSynced?: string;
  }>;
  lastUpdated?: string;
}

export function ManualAccountNotification({
  accounts,
  lastUpdated,
}: ManualAccountNotificationProps) {
  const [dismissed, setDismissed] = useState(false);

  // Check if user has manual accounts
  const manualAccounts = accounts.filter((acc) => acc.linkedVia === 'manual');

  // Check if balance was updated today
  const today = new Date().toISOString().split('T')[0];
  const wasUpdatedToday = lastUpdated && lastUpdated.split('T')[0] === today;

  // Calculate days since last update
  const daysSinceUpdate = lastUpdated
    ? Math.floor(
        (new Date().getTime() - new Date(lastUpdated).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Don't show if no manual accounts or already updated today or dismissed
  if (manualAccounts.length === 0 || wasUpdatedToday || dismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='mb-6'
    >
      <Card className='glass-card border-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20'>
        <CardContent className='p-4'>
          <div className='flex items-start gap-3'>
            <div className='p-2 rounded-lg bg-purple-500/20'>
              <Wallet className='w-5 h-5 text-purple-400' />
            </div>
            <div className='flex-1'>
              <div className='flex items-center justify-between mb-1'>
                <h3 className='font-semibold text-sm'>
                  Update Your Account Balance
                </h3>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={() => setDismissed(true)}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
              <p className='text-sm text-muted-foreground mb-3'>
                You have {manualAccounts.length} manually linked account
                {manualAccounts.length > 1 ? 's' : ''}.
                {daysSinceUpdate !== null && daysSinceUpdate > 0 && (
                  <>
                    {' '}
                    It's been{' '}
                    <span className='font-semibold text-foreground'>
                      {daysSinceUpdate} day{daysSinceUpdate !== 1 ? 's' : ''}
                    </span>{' '}
                    since your last update.
                  </>
                )}{' '}
                Update your balance and track your daily spending to stay on
                budget.
              </p>
              <Link href='/account-update'>
                <Button
                  size='sm'
                  className='w-full sm:w-auto'
                >
                  Update Balance
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
