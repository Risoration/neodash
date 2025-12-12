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
import { PlaidAccountManager } from '@/components/plaid-account-manager';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SPENDING_CATEGORIES, type SpendingCategory } from '@/lib/db';
import { DollarSign, Target } from 'lucide-react';
import { LocationInput } from '@/components/location-input';
import { MapPin } from 'lucide-react';
import type {
  UserData,
  UserProfile,
  FinancialAccount,
  BudgetData,
  UserConfig,
} from '@/types';

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
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [userDataFull, setUserDataFull] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<{
    temperatureUnit: 'fahrenheit' | 'celsius';
  }>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedUnit = localStorage.getItem('temperatureUnit') as
        | 'fahrenheit'
        | 'celsius'
        | null;
      return {
        temperatureUnit: savedUnit || 'fahrenheit',
      };
    }
    return {
      temperatureUnit: 'fahrenheit',
    };
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [financialAccounts, setFinancialAccounts] = useState<
    FinancialAccount[]
  >([]);
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
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const loadFinancialAccounts = async () => {
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
  };

  const [budgetForm, setBudgetForm] = useState<{
    budgets: Record<string, number>;
    dailyGoal: number;
    monthlyGoal: number;
  }>({
    budgets: {},
    dailyGoal: 0,
    monthlyGoal: 0,
  });
  const [location, setLocation] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [geolocationTrigger, setGeolocationTrigger] = useState<
    (() => void) | null
  >(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = (await response.json()) as UserProfile;
          setUserData(data);
        }
        // Fetch weather data separately for location
        const weatherResponse = await fetch('/api/weather');
        if (weatherResponse.ok) {
          const weatherData = (await weatherResponse.json()) as {
            data?: { location: string };
          };
          if (weatherData.data?.location) {
            setLocation(weatherData.data.location);
          }
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
          setBlockedSites(data.preferences.blockedSites || []);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
      // Load temperature unit from localStorage
      const savedUnit = localStorage.getItem('temperatureUnit') as
        | 'fahrenheit'
        | 'celsius'
        | null;
      if (savedUnit) {
        setPreferences({ temperatureUnit: savedUnit });
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
      await loadFinancialAccounts();
    }
    async function fetchBudgetData() {
      try {
        const response = await fetch('/api/financial/budget');
        if (response.ok) {
          const data = await response.json();
          setBudgetData(data);
          // Initialize form with existing data
          const budgetsObj: Record<string, number> = {};
          if (data.budgets) {
            data.budgets.forEach(
              (b: { category: string; monthlyBudget: number }) => {
                budgetsObj[b.category] = b.monthlyBudget;
              }
            );
          }
          setBudgetForm({
            budgets: budgetsObj,
            dailyGoal: data.dailyGoal || 0,
            monthlyGoal: data.monthlyGoal || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching budget data:', error);
      }
    }
    if (session) {
      fetchUserData();
      fetchPreferences();
      loadFinancialAccounts();
      fetchExtensionStatus();
      fetchBudgetData();
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

  const handleTemperatureUnitChange = (unit: 'fahrenheit' | 'celsius') => {
    // Update state immediately
    setPreferences({ temperatureUnit: unit });
    // Save to localStorage for persistence
    localStorage.setItem('temperatureUnit', unit);
    // Trigger a custom event so dashboard can update instantly
    window.dispatchEvent(
      new CustomEvent('temperatureUnitChanged', { detail: unit })
    );
  };

  const handleSaveLocation = async () => {
    if (!location.trim()) {
      return;
    }

    setSavingLocation(true);
    try {
      const response = await fetch('/api/user/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather: {
            location: location.trim(),
            coordinates: locationCoordinates
              ? { lat: locationCoordinates.lat, lng: locationCoordinates.lng }
              : undefined,
          },
        }),
      });

      if (response.ok) {
        // Refresh user data to get updated location
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
          const data = await userResponse.json();
          setUserData(data);
        }
      }
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setSavingLocation(false);
    }
  };

  const handleRequestLocation = () => {
    if (geolocationTrigger) {
      // Use the LocationInput's geolocation trigger
      geolocationTrigger();
    } else if (navigator.geolocation) {
      // Fallback: direct geolocation if trigger not available
      setSavingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();

            if (data.address) {
              const locationName =
                data.address.city ||
                data.address.town ||
                data.address.village ||
                data.address.county ||
                data.display_name.split(',')[0];

              const fullLocation = `${locationName}, ${
                data.address.country ?? ''
              }`.trim();

              setLocation(fullLocation);
              setLocationCoordinates({ lat: latitude, lng: longitude });
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
          } finally {
            setSavingLocation(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setSavingLocation(false);
        },
        { timeout: 5000 }
      );
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
                    <CardTitle>Temperature Unit</CardTitle>
                  </div>
                  <CardDescription>
                    Choose your preferred temperature unit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant={
                        preferences.temperatureUnit === 'fahrenheit'
                          ? 'default'
                          : 'outline'
                      }
                      size='sm'
                      onClick={() => handleTemperatureUnitChange('fahrenheit')}
                      className='h-8 px-3 text-xs'
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
                      className='h-8 px-3 text-xs'
                    >
                      °C
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.275 }}
              className='md:col-span-2'
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <MapPin className='w-5 h-5' />
                    <CardTitle>Location</CardTitle>
                  </div>
                  <CardDescription>
                    Update your weather location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div>
                      <LocationInput
                        value={location}
                        onChange={(loc, coordinates) => {
                          setLocation(loc);
                          if (coordinates) {
                            setLocationCoordinates({
                              lat: coordinates.latitude,
                              lng: coordinates.longitude,
                            });
                          }
                        }}
                        label='Weather Location'
                        placeholder='City, Country'
                        onGeolocationTrigger={(triggerFn) => {
                          setGeolocationTrigger(() => triggerFn);
                        }}
                      />
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleRequestLocation}
                        disabled={savingLocation}
                        className='flex-1'
                      >
                        {savingLocation ? (
                          <>
                            <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <MapPin className='w-4 h-4 mr-2' />
                            Use Current Location
                          </>
                        )}
                      </Button>
                      <Button
                        size='sm'
                        onClick={handleSaveLocation}
                        disabled={savingLocation || !location.trim()}
                        className='flex-1'
                      >
                        Save Location
                      </Button>
                    </div>
                    {location && (
                      <p className='text-xs text-muted-foreground'>
                        Current location: {location}
                      </p>
                    )}
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
                        onSuccess={async (itemId, institutionName) => {
                          // Account is already linked and synced by PlaidLinkButton
                          // Just refresh the accounts list
                          await loadFinancialAccounts();
                          if (institutionName) {
                            alert(`Successfully linked ${institutionName}!`);
                          } else {
                            alert('Account linked successfully!');
                          }
                        }}
                        onError={(error) => {
                          alert('Failed to link account: ' + error);
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
                  <div className='space-y-6'>
                    {/* Plaid Account Manager */}
                    <PlaidAccountManager
                      onSyncComplete={async () => {
                        await loadFinancialAccounts();
                      }}
                    />

                    {/* Accounts List */}
                    {loadingAccounts ? (
                      <div className='text-sm text-muted-foreground'>
                        Loading accounts...
                      </div>
                    ) : financialAccounts.length === 0 ? (
                      <div className='text-sm text-muted-foreground text-center py-4'>
                        No accounts linked yet. Add accounts manually or link
                        via Plaid.
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
                                <Badge
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {account.type.replace('_', ' ')}
                                </Badge>
                                {account.linkedVia === 'plaid' && (
                                  <Badge
                                    variant='outline'
                                    className='text-xs'
                                  >
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
                                  {new Date(
                                    account.lastSynced
                                  ).toLocaleString()}
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
                                    <Badge
                                      variant='outline'
                                      className='text-xs'
                                      title='This account is synced via Plaid'
                                    >
                                      Auto-synced
                                    </Badge>
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Budget Management Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='md:col-span-2'
            >
              <Card className='glass-card border-0'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <Target className='w-5 h-5' />
                    <CardTitle>Budget & Goals</CardTitle>
                  </div>
                  <CardDescription>
                    Set monthly budgets by category and daily/monthly spending
                    goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    {/* Monthly Budgets by Category */}
                    <div>
                      <Label className='text-base font-semibold mb-4 block'>
                        Monthly Budgets by Category
                      </Label>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {SPENDING_CATEGORIES.map((category) => (
                          <div
                            key={category}
                            className='space-y-2'
                          >
                            <Label className='capitalize'>
                              {category === 'essentials'
                                ? 'Essentials'
                                : category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                            </Label>
                            <Input
                              type='number'
                              step='0.01'
                              placeholder='0.00'
                              value={budgetForm.budgets[category] || ''}
                              onChange={(e) =>
                                setBudgetForm({
                                  ...budgetForm,
                                  budgets: {
                                    ...budgetForm.budgets,
                                    [category]: e.target.value
                                      ? parseFloat(e.target.value)
                                      : 0,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Daily and Monthly Goals */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t'>
                      <div className='space-y-2'>
                        <Label>Daily Spending Goal</Label>
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='0.00'
                          value={budgetForm.dailyGoal || ''}
                          onChange={(e) =>
                            setBudgetForm({
                              ...budgetForm,
                              dailyGoal: e.target.value
                                ? parseFloat(e.target.value)
                                : 0,
                            })
                          }
                        />
                        <p className='text-xs text-muted-foreground'>
                          Target spending per day
                        </p>
                      </div>
                      <div className='space-y-2'>
                        <Label>Monthly Spending Goal</Label>
                        <Input
                          type='number'
                          step='0.01'
                          placeholder='0.00'
                          value={budgetForm.monthlyGoal || ''}
                          onChange={(e) =>
                            setBudgetForm({
                              ...budgetForm,
                              monthlyGoal: e.target.value
                                ? parseFloat(e.target.value)
                                : 0,
                            })
                          }
                        />
                        <p className='text-xs text-muted-foreground'>
                          Target spending per month
                        </p>
                      </div>
                    </div>

                    {/* Current Month Summary */}
                    {budgetData && (
                      <div className='pt-4 border-t'>
                        <Label className='text-base font-semibold mb-4 block'>
                          Current Month Summary
                        </Label>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div className='p-3 rounded-lg bg-muted/50'>
                            <div className='text-sm text-muted-foreground'>
                              Today's Spending
                            </div>
                            <div className='text-2xl font-bold'>
                              {formatCurrency(budgetData.todaySpending || 0)}
                            </div>
                            {budgetData.dailyGoal > 0 && (
                              <div className='text-xs text-muted-foreground mt-1'>
                                Goal: {formatCurrency(budgetData.dailyGoal)}
                              </div>
                            )}
                          </div>
                          <div className='p-3 rounded-lg bg-muted/50'>
                            <div className='text-sm text-muted-foreground'>
                              Monthly Spending
                            </div>
                            <div className='text-2xl font-bold'>
                              {formatCurrency(budgetData.monthlySpending || 0)}
                            </div>
                            {budgetData.monthlyGoal > 0 && (
                              <div className='text-xs text-muted-foreground mt-1'>
                                Goal: {formatCurrency(budgetData.monthlyGoal)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <Button
                      onClick={async () => {
                        setSavingBudget(true);
                        try {
                          const budgetsArray = Object.entries(
                            budgetForm.budgets
                          )
                            .filter(([_, amount]) => amount > 0)
                            .map(([category, monthlyBudget]) => ({
                              category,
                              monthlyBudget,
                            }));

                          const response = await fetch(
                            '/api/financial/budget',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                budgets: budgetsArray,
                                dailyGoal: budgetForm.dailyGoal,
                                monthlyGoal: budgetForm.monthlyGoal,
                              }),
                            }
                          );

                          if (!response.ok) {
                            const error = await response.json();
                            alert(error.error || 'Failed to save budget');
                            return;
                          }

                          await fetch('/api/financial/budget');
                          alert('Budget saved successfully!');
                        } catch (error) {
                          console.error('Error saving budget:', error);
                          alert('Failed to save budget');
                        } finally {
                          setSavingBudget(false);
                        }
                      }}
                      disabled={savingBudget}
                      className='w-full'
                    >
                      {savingBudget ? (
                        <>
                          <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        <>
                          <DollarSign className='w-4 h-4 mr-2' />
                          Save Budget
                        </>
                      )}
                    </Button>
                  </div>
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
                        <Button
                          onClick={handleAddBlockedSite}
                          size='sm'
                        >
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
