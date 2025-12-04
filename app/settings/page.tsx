'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef, Suspense } from 'react';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { useDashboardStore } from '@/stores/dashboard-store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Moon,
  Sun,
  RefreshCw,
  Layout,
  User,
  Mail,
  Calendar,
  Thermometer,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  RefreshCcw,
  Lock,
  X,
  ExternalLink,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function SettingsContent() {
  const { data: session } = useSession();
  const {
    theme,
    toggleTheme,
    compactMode,
    setCompactMode,
    refreshInterval,
    setRefreshInterval,
  } = useDashboardStore();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<{
    temperatureUnit: 'fahrenheit' | 'celsius';
  }>({
    temperatureUnit: 'fahrenheit',
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', balance: '' });
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState('');
  const [extensionApiKey, setExtensionApiKey] = useState<string | null>(null);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [loadingExtension, setLoadingExtension] = useState(false);
  const searchParams = useSearchParams();
  const [highlightFocusCard, setHighlightFocusCard] = useState(false);
  const focusCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
          setBlockedSites(data.preferences.blockedSites || []);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    }
    async function fetchExtensionStatus() {
      setLoadingExtension(true);
      try {
        const response = await fetch(
          '/api/productivity/focus/extension-status'
        );
        if (response.ok) {
          const data = await response.json();
          setExtensionConnected(data.connected);
          setExtensionApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching extension status:', error);
      } finally {
        setLoadingExtension(false);
      }
    }
    async function fetchFinancialAccounts() {
      setLoadingAccounts(true);
      try {
        const response = await fetch('/api/financial/accounts');
        if (response.ok) {
          const data = await response.json();
          setFinancialAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    }
    if (session) {
      fetchUserData();
      fetchPreferences();
      fetchFinancialAccounts();
      fetchExtensionStatus();
    }
  }, [session]);

  useEffect(() => {
    if (searchParams?.get('focus') === '1') {
      // Scroll the Focus & Blocking card into view and highlight it
      setTimeout(() => {
        focusCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 200);

      setHighlightFocusCard(true);
      const timer = setTimeout(() => setHighlightFocusCard(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleTemperatureUnitChange = async (
    unit: 'fahrenheit' | 'celsius'
  ) => {
    setSavingPreferences(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatureUnit: unit }),
      });
      if (response.ok) {
        setPreferences({ temperatureUnit: unit });
        // Weather data is automatically refreshed by the API
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/financial/accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setFinancialAccounts((accounts) =>
          accounts.filter((acc) => acc.id !== accountId)
        );
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const handleAddBlockedSite = async () => {
    if (!newSite.trim()) return;

    const site = newSite.trim().toLowerCase();
    // Normalize: remove protocol, www, trailing slashes
    const normalized = site
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0]; // Just the domain

    if (blockedSites.includes(normalized)) {
      alert('This site is already blocked');
      return;
    }

    const updated = [...blockedSites, normalized];
    setBlockedSites(updated);
    setNewSite('');

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedSites: updated }),
      });
      if (!response.ok) {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating blocked sites:', error);
      setBlockedSites(blockedSites); // Revert on error
      alert('Failed to add blocked site');
    }
  };

  const handleRemoveBlockedSite = async (site: string) => {
    const updated = blockedSites.filter((s) => s !== site);
    setBlockedSites(updated);

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedSites: updated }),
      });
      if (!response.ok) {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating blocked sites:', error);
      setBlockedSites(blockedSites); // Revert on error
      alert('Failed to remove blocked site');
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const response = await fetch('/api/productivity/focus/extension-status', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setExtensionApiKey(data.apiKey);
        setExtensionConnected(true);
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      alert('Failed to generate API key');
    }
  };

  const handleUpdateAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/financial/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accountId,
          name: editForm.name,
          balance: editForm.balance,
        }),
      });
      if (response.ok) {
        setEditingAccount(null);
        setEditForm({ name: '', balance: '' });
        // Refresh accounts
        const accountsResponse = await fetch('/api/financial/accounts');
        if (accountsResponse.ok) {
          const data = await accountsResponse.json();
          setFinancialAccounts(data.accounts || []);
        }
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
    }
  };

  return (
    <div className='min-h-screen gradient-bg'>
      <Sidebar />
      <MobileNav />
      <main className='md:ml-64 pb-20 md:pb-0'>
        <div className='container mx-auto px-4 py-8'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-8'
          >
            <h1 className='text-4xl font-bold mb-2'>Settings</h1>
            <p className='text-muted-foreground'>
              Customize your dashboard experience
            </p>
          </motion.div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl'>
            {/* User Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className='md:col-span-2'
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <User className='w-5 h-5' />
                    <CardTitle>Profile</CardTitle>
                  </div>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className='text-sm text-muted-foreground'>
                      Loading...
                    </div>
                  ) : userData ? (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center'>
                          <User className='w-6 h-6 text-white' />
                        </div>
                        <div>
                          <p className='font-semibold'>{userData.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            {userData.email}
                          </p>
                        </div>
                      </div>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t'>
                        <div className='flex items-center gap-2 text-sm'>
                          <Mail className='w-4 h-4 text-muted-foreground' />
                          <span className='text-muted-foreground'>Email:</span>
                          <span>{userData.email}</span>
                        </div>
                        <div className='flex items-center gap-2 text-sm'>
                          <Calendar className='w-4 h-4 text-muted-foreground' />
                          <span className='text-muted-foreground'>
                            Member since:
                          </span>
                          <span>
                            {new Date(userData.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='text-sm text-muted-foreground'>
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    {theme === 'dark' ? (
                      <Moon className='w-5 h-5' />
                    ) : (
                      <Sun className='w-5 h-5' />
                    )}
                    <CardTitle>Appearance</CardTitle>
                  </div>
                  <CardDescription>Choose your preferred theme</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={toggleTheme}
                    variant='outline'
                    className='w-full'
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className='mr-2 w-4 h-4' />
                        Switch to Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className='mr-2 w-4 h-4' />
                        Switch to Dark Mode
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Layout className='w-5 h-5' />
                    <CardTitle>Layout</CardTitle>
                  </div>
                  <CardDescription>
                    Adjust dashboard layout preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setCompactMode(!compactMode)}
                    variant='outline'
                    className='w-full'
                  >
                    {compactMode ? 'Disable' : 'Enable'} Compact Mode
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Thermometer className='w-5 h-5' />
                    <CardTitle>Preferences</CardTitle>
                  </div>
                  <CardDescription>
                    Customize your display preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div>
                      <Label className='text-sm mb-2 block'>
                        Temperature Unit
                      </Label>
                      <div className='flex gap-2'>
                        <Button
                          variant={
                            preferences.temperatureUnit === 'fahrenheit'
                              ? 'default'
                              : 'outline'
                          }
                          size='sm'
                          onClick={() =>
                            handleTemperatureUnitChange('fahrenheit')
                          }
                          disabled={savingPreferences}
                          className='flex-1'
                        >
                          °F
                        </Button>
                        <Button
                          variant={
                            preferences.temperatureUnit === 'celsius'
                              ? 'default'
                              : 'outline'
                          }
                          size='sm'
                          onClick={() => handleTemperatureUnitChange('celsius')}
                          disabled={savingPreferences}
                          className='flex-1'
                        >
                          °C
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='md:col-span-2'
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <RefreshCw className='w-5 h-5' />
                    <CardTitle>Data Refresh</CardTitle>
                  </div>
                  <CardDescription>
                    Configure automatic data refresh interval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-col gap-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Refresh Interval</span>
                      <span className='text-sm font-medium'>
                        {refreshInterval / 1000}s
                      </span>
                    </div>
                    <div className='flex gap-2'>
                      {[10, 30, 60].map((seconds) => (
                        <Button
                          key={seconds}
                          variant={
                            refreshInterval === seconds * 1000
                              ? 'default'
                              : 'outline'
                          }
                          size='sm'
                          onClick={() => setRefreshInterval(seconds * 1000)}
                        >
                          {seconds}s
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className='md:col-span-2'
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <CreditCard className='w-5 h-5' />
                      <CardTitle>Financial Accounts</CardTitle>
                    </div>
                    <div className='flex gap-2'>
                      <PlaidLinkButton
                        onSuccess={async (publicToken, metadata) => {
                          try {
                            const exchangeResponse = await fetch(
                              '/api/financial/plaid',
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'exchange_token',
                                  public_token: publicToken,
                                }),
                              }
                            );

                            if (!exchangeResponse.ok) {
                              throw new Error('Failed to exchange token');
                            }

                            const exchangeData = await exchangeResponse.json();

                            const syncResponse = await fetch(
                              '/api/financial/plaid',
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'sync',
                                  access_token: exchangeData.access_token,
                                }),
                              }
                            );

                            if (!syncResponse.ok) {
                              throw new Error('Failed to sync accounts');
                            }

                            // Refresh accounts list
                            const accountsResponse = await fetch(
                              '/api/financial/accounts'
                            );
                            if (accountsResponse.ok) {
                              const data = await accountsResponse.json();
                              setFinancialAccounts(data.accounts || []);
                            }

                            alert('Accounts linked successfully!');
                          } catch (error: any) {
                            console.error('Plaid sync error:', error);
                            alert('Failed to sync accounts: ' + error.message);
                          }
                        }}
                      />
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          window.location.href = '/onboarding?step=financial';
                        }}
                      >
                        <Plus className='w-4 h-4 mr-2' />
                        Add Manual
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Manage your linked financial accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAccounts ? (
                    <div className='text-sm text-muted-foreground'>
                      Loading accounts...
                    </div>
                  ) : financialAccounts.length === 0 ? (
                    <div className='text-sm text-muted-foreground text-center py-4'>
                      No accounts linked yet. Add accounts manually or link via
                      Plaid.
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {financialAccounts.map((account) => (
                        <div
                          key={account.id}
                          className='flex items-center justify-between p-3 border rounded-lg'
                        >
                          <div className='flex-1'>
                            <div className='flex items-center gap-2'>
                              <p className='font-medium'>{account.name}</p>
                              {account.institution && (
                                <span className='text-xs text-muted-foreground'>
                                  ({account.institution})
                                </span>
                              )}
                              <Badge variant='secondary' className='text-xs'>
                                {account.type.replace('_', ' ')}
                              </Badge>
                              {account.linkedVia === 'plaid' && (
                                <Badge variant='outline' className='text-xs'>
                                  Plaid
                                </Badge>
                              )}
                            </div>
                            <p className='text-sm font-semibold mt-1'>
                              {formatCurrency(account.balance)}{' '}
                              {account.currency}
                            </p>
                            {account.lastSynced && (
                              <p className='text-xs text-muted-foreground mt-1'>
                                Last synced:{' '}
                                {new Date(account.lastSynced).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className='flex items-center gap-2'>
                            {editingAccount === account.id ? (
                              <>
                                <Input
                                  placeholder='Name'
                                  value={editForm.name}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      name: e.target.value,
                                    })
                                  }
                                  className='w-32'
                                />
                                <Input
                                  type='number'
                                  placeholder='Balance'
                                  value={editForm.balance}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      balance: e.target.value,
                                    })
                                  }
                                  className='w-32'
                                />
                                <Button
                                  size='sm'
                                  onClick={() =>
                                    handleUpdateAccount(account.id)
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => {
                                    setEditingAccount(null);
                                    setEditForm({ name: '', balance: '' });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    setEditingAccount(account.id);
                                    setEditForm({
                                      name: account.name,
                                      balance: account.balance.toString(),
                                    });
                                  }}
                                >
                                  <Edit2 className='w-4 h-4' />
                                </Button>
                                {account.linkedVia === 'plaid' && (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => {
                                      alert(
                                        'Plaid sync requires access token. Please reconnect via Plaid Link.'
                                      );
                                    }}
                                    title='Sync with Plaid'
                                  >
                                    <RefreshCcw className='w-4 h-4' />
                                  </Button>
                                )}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    handleDeleteAccount(account.id)
                                  }
                                  className='text-red-500 hover:text-red-600'
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              ref={focusCardRef}
              initial={{ opacity: 0, y: 20 }}
              animate={
                highlightFocusCard
                  ? {
                      opacity: 1,
                      y: 0,
                      scale: [1, 1.03, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(168,85,247,0.6)',
                        '0 0 0 8px rgba(168,85,247,0)',
                      ],
                    }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={
                highlightFocusCard
                  ? { duration: 0.8, repeat: 3, repeatType: 'mirror' }
                  : { delay: 0.4 }
              }
              className='md:col-span-2'
            >
              <Card
                className={`glass-card border-0 ${
                  highlightFocusCard ? 'ring-2 ring-purple-500 shadow-lg' : ''
                }`}
              >
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Lock className='w-5 h-5' />
                    <CardTitle>Focus & Blocking</CardTitle>
                  </div>
                  <CardDescription>
                    Manage blocked websites and browser extension
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    {/* Blocked Sites Section */}
                    <div>
                      <Label className='text-sm mb-2 block'>
                        Blocked Websites
                      </Label>
                      <p className='text-xs text-muted-foreground mb-3'>
                        Add domains or websites to block during focus mode
                      </p>
                      <div className='flex gap-2 mb-3'>
                        <Input
                          placeholder='example.com or youtube.com'
                          value={newSite}
                          onChange={(e) => setNewSite(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddBlockedSite();
                            }
                          }}
                          className='flex-1'
                        />
                        <Button onClick={handleAddBlockedSite} size='sm'>
                          <Plus className='w-4 h-4 mr-2' />
                          Add
                        </Button>
                      </div>
                      {blockedSites.length === 0 ? (
                        <div className='text-sm text-muted-foreground text-center py-4 border rounded-lg'>
                          No blocked sites yet. Add sites to block during focus
                          mode.
                        </div>
                      ) : (
                        <div className='space-y-2'>
                          {blockedSites.map((site) => (
                            <div
                              key={site}
                              className='flex items-center justify-between p-2 border rounded-lg'
                            >
                              <span className='text-sm'>{site}</span>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleRemoveBlockedSite(site)}
                                className='text-red-500 hover:text-red-600'
                              >
                                <X className='w-4 h-4' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Extension Section */}
                    <div className='pt-4 border-t'>
                      <Label className='text-sm mb-2 block'>
                        Browser Extension
                      </Label>
                      <p className='text-xs text-muted-foreground mb-3'>
                        Connect the browser extension to enable automatic
                        website blocking
                      </p>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between p-3 border rounded-lg'>
                          <div className='flex items-center gap-2'>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                extensionConnected
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                            <span className='text-sm'>
                              {extensionConnected
                                ? 'Extension Connected'
                                : 'Extension Not Connected'}
                            </span>
                          </div>
                          {!extensionApiKey && (
                            <Button
                              onClick={handleGenerateApiKey}
                              size='sm'
                              variant='outline'
                            >
                              Generate API Key
                            </Button>
                          )}
                        </div>
                        {extensionApiKey && (
                          <div className='p-3 bg-muted rounded-lg'>
                            <Label className='text-xs text-muted-foreground mb-1 block'>
                              API Key (use this in the extension)
                            </Label>
                            <div className='flex items-center gap-2'>
                              <code className='text-xs bg-background px-2 py-1 rounded flex-1 font-mono'>
                                {extensionApiKey}
                              </code>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    extensionApiKey
                                  );
                                  alert('API key copied to clipboard');
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                            <p className='text-xs text-muted-foreground mt-2'>
                              Install the browser extension and enter this API
                              key to connect it to your account.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
