'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Wallet2,
  Cloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Link2,
  Key,
  Wallet,
  Loader2,
  CreditCard,
  Building2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { LocationInput } from '@/components/location-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { PlaidCryptoLinkButton } from '@/components/plaid-crypto-link-button';

type Step =
  | 'intro'
  | 'crypto'
  | 'financial'
  | 'weather'
  | 'productivity'
  | 'review';

interface HoldingState {
  symbol: string;
  name: string;
  amount: string;
}

interface FinancialAccountState {
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment';
  institution: string;
  balance: string;
}

const steps: Step[] = [
  'intro',
  'crypto',
  'financial',
  'weather',
  'productivity',
  'review',
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [holdings, setHoldings] = useState<HoldingState[]>([
    { symbol: '', name: '', amount: '' },
  ]);
  const [cryptoEnabled, setCryptoEnabled] = useState(true);
  const [cryptoMethod, setCryptoMethod] = useState<
    'manual' | 'exchange' | 'wallet' | 'browser-wallet' | 'plaid'
  >('manual');
  const [exchangeCredentials, setExchangeCredentials] = useState({
    exchange: 'binance' as 'binance' | 'coinbase' | 'kraken',
    apiKey: '',
    apiSecret: '',
  });
  const [walletAddresses, setWalletAddresses] = useState<
    Array<{ chain: 'ethereum' | 'bitcoin' | 'solana'; address: string }>
  >([{ chain: 'ethereum', address: '' }]);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [weatherLocation, setWeatherLocation] = useState('');
  const [weatherCoordinates, setWeatherCoordinates] = useState<
    { lat: number; lng: number } | undefined
  >();
  const [productivityEnabled, setProductivityEnabled] = useState(true);
  const [productivityGoals, setProductivityGoals] = useState({
    dailyTaskGoal: 5,
    dailyFocusGoal: 240, // minutes (4 hours)
    dailyBreaksGoal: 4,
    productivityTarget: 75, // percentage
  });
  const [financialEnabled, setFinancialEnabled] = useState(true);
  const [financialAccounts, setFinancialAccounts] = useState<
    FinancialAccountState[]
  >([{ name: '', type: 'checking', institution: '', balance: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[currentStepIndex];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const initial = searchParams.get('step');
    if (initial) {
      const index = steps.indexOf(initial as Step);
      if (index >= 0) {
        setCurrentStepIndex(index);
      }
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className='min-h-screen gradient-bg flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    );
  }

  const canGoNext = () => {
    if (step === 'crypto' && cryptoEnabled) {
      if (cryptoMethod === 'manual') {
        return holdings.some(
          (holding) =>
            holding.symbol && holding.amount && Number(holding.amount) > 0
        );
      }
      if (cryptoMethod === 'exchange') {
        return exchangeCredentials.apiKey && exchangeCredentials.apiSecret;
      }
      if (cryptoMethod === 'wallet') {
        return walletAddresses.some((w) => w.address.trim());
      }
      if (cryptoMethod === 'browser-wallet') {
        return true; // Connection happens on click
      }
      if (cryptoMethod === 'plaid') {
        return true; // Connection happens via Plaid, holdings synced automatically
      }
    }
    if (step === 'weather' && weatherEnabled) {
      return Boolean(weatherLocation.trim());
    }
    if (step === 'productivity' && productivityEnabled) {
      return (
        productivityGoals.dailyTaskGoal > 0 &&
        productivityGoals.dailyFocusGoal > 0 &&
        productivityGoals.dailyBreaksGoal > 0 &&
        productivityGoals.productivityTarget > 0
      );
    }
    return true;
  };

  const nextStep = () => {
    if (!canGoNext()) return;
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => setCurrentStepIndex((prev) => Math.max(prev - 1, 0));

  const addHolding = () =>
    setHoldings((prev) => [...prev, { symbol: '', name: '', amount: '' }]);

  const updateHolding = (
    index: number,
    field: keyof HoldingState,
    value: string
  ) =>
    setHoldings((prev) =>
      prev.map((holding, i) =>
        i === index ? { ...holding, [field]: value } : holding
      )
    );

  const removeHolding = (index: number) =>
    setHoldings((prev) => prev.filter((_, i) => i !== index));

  const handleComplete = async () => {
    setSaving(true);
    setError(null);

    const payload: Record<string, any> = {};

    if (cryptoEnabled) {
      if (cryptoMethod === 'manual') {
        const filtered = holdings.filter(
          (holding) => holding.symbol && holding.amount
        );
        if (filtered.length) {
          payload.crypto = {
            method: 'manual',
            holdings: filtered.map((holding) => ({
              symbol: holding.symbol.trim(),
              name: holding.name.trim() || holding.symbol.trim(),
              amount: Number(holding.amount),
            })),
          };
        }
      } else if (cryptoMethod === 'exchange') {
        payload.crypto = {
          method: 'exchange',
          exchange: exchangeCredentials.exchange,
          apiKey: exchangeCredentials.apiKey,
          apiSecret: exchangeCredentials.apiSecret,
        };
      } else if (cryptoMethod === 'wallet') {
        payload.crypto = {
          method: 'wallet',
          wallets: walletAddresses.filter((w) => w.address.trim()),
        };
      } else if (cryptoMethod === 'browser-wallet') {
        // Browser wallet holdings are stored in holdings state after connection
        const filtered = holdings.filter(
          (holding) => holding.symbol && holding.amount
        );
        if (filtered.length) {
          payload.crypto = {
            method: 'browser-wallet',
            holdings: filtered.map((holding) => ({
              symbol: holding.symbol.trim(),
              name: holding.name.trim() || holding.symbol.trim(),
              amount: Number(holding.amount),
            })),
          };
        }
      } else if (cryptoMethod === 'plaid') {
        // Plaid crypto holdings are synced automatically via API
        // No need to include in payload - they're already stored
        // Just mark crypto as enabled
        payload.crypto = {
          method: 'plaid',
        };
      }
    }

    if (financialEnabled) {
      const validAccounts = financialAccounts.filter(
        (acc) => acc.name.trim() && acc.balance
      );
      if (validAccounts.length > 0) {
        payload.financial = {
          accounts: validAccounts.map((acc) => ({
            name: acc.name.trim(),
            type: acc.type,
            institution: acc.institution.trim() || undefined,
            balance: Number(acc.balance),
            currency: 'USD',
            linkedVia: 'manual' as const,
          })),
        };
      }
    }

    if (weatherEnabled && weatherLocation.trim()) {
      payload.weather = {
        location: weatherLocation.trim(),
        coordinates: weatherCoordinates,
      };
    }

    if (productivityEnabled) {
      payload.productivity = {
        goals: productivityGoals,
      };
    }

    try {
      const response = await fetch('/api/user/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save setup');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className='text-center space-y-6'>
            <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500'>
              <Sparkles className='w-8 h-8 text-white' />
            </div>
            <div>
              <h2 className='text-3xl font-bold mb-2'>
                Let&apos;s personalize NeoDash
              </h2>
              <p className='text-muted-foreground text-lg'>
                Connect the data sources you want to see on your dashboard. You
                can update these anytime.
              </p>
            </div>
            <Button
              onClick={nextStep}
              className='px-8'
            >
              Get started <ArrowRight className='w-4 h-4 ml-2' />
            </Button>
          </div>
        );
      case 'crypto':
        return (
          <div className='space-y-6'>
            <header>
              <h3 className='text-2xl font-semibold mb-2 flex items-center gap-2'>
                <Wallet2 className='w-5 h-5 text-primary' />
                Crypto Portfolio
              </h3>
              <p className='text-muted-foreground'>
                Add the assets you hold so we can keep your portfolio up to
                date.
              </p>
            </header>

            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={cryptoEnabled}
                onChange={(event) => setCryptoEnabled(event.target.checked)}
              />
              Track my crypto portfolio
            </label>

            {cryptoEnabled && (
              <div className='space-y-6'>
                {/* Connection Method Selector */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                  <button
                    type='button'
                    onClick={() => setCryptoMethod('manual')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      cryptoMethod === 'manual'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Key className='w-4 h-4' />
                      <span className='font-medium'>Manual Entry</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Enter holdings manually
                    </p>
                  </button>
                  <button
                    type='button'
                    onClick={() => setCryptoMethod('plaid')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      cryptoMethod === 'plaid'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Link2 className='w-4 h-4' />
                      <span className='font-medium'>Plaid (Recommended)</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Link crypto exchanges via Plaid
                    </p>
                  </button>
                  <button
                    type='button'
                    onClick={() => setCryptoMethod('exchange')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      cryptoMethod === 'exchange'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Link2 className='w-4 h-4' />
                      <span className='font-medium'>Exchange API</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Connect via Binance, Coinbase, etc.
                    </p>
                  </button>
                  <button
                    type='button'
                    onClick={() => setCryptoMethod('wallet')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      cryptoMethod === 'wallet'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Wallet className='w-4 h-4' />
                      <span className='font-medium'>Wallet Addresses</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Enter Ethereum, Bitcoin, Solana addresses
                    </p>
                  </button>
                  <button
                    type='button'
                    onClick={() => setCryptoMethod('browser-wallet')}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      cryptoMethod === 'browser-wallet'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-1'>
                      <Wallet2 className='w-4 h-4' />
                      <span className='font-medium'>Browser Wallet</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Connect MetaMask or other wallet
                    </p>
                  </button>
                </div>

                {/* Manual Entry */}
                {cryptoMethod === 'manual' && (
                  <div className='space-y-4'>
                    {holdings.map((holding, index) => (
                      <div
                        key={index}
                        className='grid grid-cols-1 md:grid-cols-3 gap-3 items-end'
                      >
                        <div>
                          <Label>Symbol</Label>
                          <Input
                            placeholder='BTC'
                            value={holding.symbol}
                            onChange={(event) =>
                              updateHolding(
                                index,
                                'symbol',
                                event.target.value.toUpperCase()
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Name</Label>
                          <Input
                            placeholder='Bitcoin'
                            value={holding.name}
                            onChange={(event) =>
                              updateHolding(index, 'name', event.target.value)
                            }
                          />
                        </div>
                        <div className='flex gap-3'>
                          <div className='flex-1'>
                            <Label>Amount</Label>
                            <Input
                              type='number'
                              placeholder='0.5'
                              value={holding.amount}
                              onChange={(event) =>
                                updateHolding(
                                  index,
                                  'amount',
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          {holdings.length > 1 && (
                            <Button
                              type='button'
                              variant='ghost'
                              className='text-red-500'
                              onClick={() => removeHolding(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type='button'
                      variant='outline'
                      onClick={addHolding}
                    >
                      Add another asset
                    </Button>
                  </div>
                )}

                {/* Exchange API */}
                {cryptoMethod === 'exchange' && (
                  <div className='space-y-4'>
                    <div>
                      <Label>Exchange</Label>
                      <select
                        className='w-full mt-2 p-2 border rounded-md bg-background'
                        value={exchangeCredentials.exchange}
                        onChange={(e) =>
                          setExchangeCredentials({
                            ...exchangeCredentials,
                            exchange: e.target.value as
                              | 'binance'
                              | 'coinbase'
                              | 'kraken',
                          })
                        }
                      >
                        <option value='binance'>Binance</option>
                        <option value='coinbase'>Coinbase</option>
                        <option value='kraken'>Kraken</option>
                      </select>
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type='password'
                        placeholder='Enter your API key'
                        value={exchangeCredentials.apiKey}
                        onChange={(e) =>
                          setExchangeCredentials({
                            ...exchangeCredentials,
                            apiKey: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <Input
                        type='password'
                        placeholder='Enter your API secret'
                        value={exchangeCredentials.apiSecret}
                        onChange={(e) =>
                          setExchangeCredentials({
                            ...exchangeCredentials,
                            apiSecret: e.target.value,
                          })
                        }
                      />
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Your API keys are encrypted and stored securely. Only read
                      permissions are required.
                    </p>
                  </div>
                )}

                {/* Wallet Addresses */}
                {cryptoMethod === 'wallet' && (
                  <div className='space-y-4'>
                    {walletAddresses.map((wallet, index) => (
                      <div
                        key={index}
                        className='flex gap-3 items-end'
                      >
                        <div className='flex-1'>
                          <Label>Chain</Label>
                          <select
                            className='w-full mt-2 p-2 border rounded-md bg-background'
                            value={wallet.chain}
                            onChange={(e) =>
                              setWalletAddresses(
                                walletAddresses.map((w, i) =>
                                  i === index
                                    ? {
                                        ...w,
                                        chain: e.target.value as
                                          | 'ethereum'
                                          | 'bitcoin'
                                          | 'solana',
                                      }
                                    : w
                                )
                              )
                            }
                          >
                            <option value='ethereum'>Ethereum</option>
                            <option value='bitcoin'>Bitcoin</option>
                            <option value='solana'>Solana</option>
                          </select>
                        </div>
                        <div className='flex-1'>
                          <Label>Address</Label>
                          <Input
                            placeholder='0x...'
                            value={wallet.address}
                            onChange={(e) =>
                              setWalletAddresses(
                                walletAddresses.map((w, i) =>
                                  i === index
                                    ? { ...w, address: e.target.value }
                                    : w
                                )
                              )
                            }
                          />
                        </div>
                        {walletAddresses.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            className='text-red-500'
                            onClick={() =>
                              setWalletAddresses(
                                walletAddresses.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() =>
                        setWalletAddresses([
                          ...walletAddresses,
                          { chain: 'ethereum', address: '' },
                        ])
                      }
                    >
                      Add another wallet
                    </Button>
                  </div>
                )}

                {/* Plaid Crypto Exchange */}
                {cryptoMethod === 'plaid' && (
                  <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>
                      Link your crypto exchange account via Plaid. This will
                      automatically sync your crypto holdings.
                    </p>
                    <PlaidCryptoLinkButton
                      onSuccess={async (itemId, institutionName) => {
                        setConnectionStatus(
                          `Successfully linked ${institutionName || 'crypto exchange'}! Holdings will be synced automatically.`
                        );
                        // Holdings are synced automatically via the API
                        // No need to manually set holdings here
                      }}
                      onError={(error) => {
                        setConnectionStatus(`Error: ${error}`);
                      }}
                    />
                    {connectionStatus && (
                      <p className='text-sm text-muted-foreground'>
                        {connectionStatus}
                      </p>
                    )}
                  </div>
                )}

                {/* Browser Wallet */}
                {cryptoMethod === 'browser-wallet' && (
                  <div className='space-y-4'>
                    <Button
                      type='button'
                      onClick={async () => {
                        setConnecting(true);
                        setConnectionStatus(null);
                        try {
                          const { connectBrowserWallet } =
                            await import('@/lib/crypto-connectors');
                          const detectedHoldings = await connectBrowserWallet();
                          setConnectionStatus(
                            `Connected! Found ${detectedHoldings.length} asset(s).`
                          );
                          // Store detected holdings for submission
                          const browserWalletHoldings = detectedHoldings.map(
                            (h) => ({
                              symbol: h.symbol,
                              name: h.name,
                              amount: h.holdings.toString(),
                            })
                          );
                          setHoldings(browserWalletHoldings);
                        } catch (error: any) {
                          setConnectionStatus(`Error: ${error.message}`);
                        } finally {
                          setConnecting(false);
                        }
                      }}
                      disabled={connecting}
                      className='w-full'
                    >
                      {connecting ? (
                        <>
                          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet2 className='w-4 h-4 mr-2' />
                          Connect Wallet
                        </>
                      )}
                    </Button>
                    {connectionStatus && (
                      <p
                        className={`text-sm ${
                          connectionStatus.startsWith('Error')
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {connectionStatus}
                      </p>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      Click to connect your MetaMask or other browser wallet
                      extension.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'financial':
        return (
          <div className='space-y-6'>
            <header>
              <h3 className='text-2xl font-semibold mb-2 flex items-center gap-2'>
                <CreditCard className='w-5 h-5 text-primary' />
                Financial Accounts
              </h3>
              <p className='text-muted-foreground'>
                Link your bank accounts, credit cards, and investment accounts
                to track your finances.
              </p>
            </header>

            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={financialEnabled}
                onChange={(event) => setFinancialEnabled(event.target.checked)}
              />
              Track my financial accounts
            </label>

            {financialEnabled && (
              <div className='space-y-4'>
                <div className='flex flex-col sm:flex-row gap-3 items-start'>
                  <div className='flex-1'>
                    <p className='text-sm text-muted-foreground mb-2'>
                      Add your accounts manually or link them via Plaid for
                      automatic syncing.
                    </p>
                  </div>
                  <PlaidLinkButton
                    onSuccess={async (itemId, institutionName) => {
                      // Account is already linked and synced by PlaidLinkButton
                      if (institutionName) {
                        alert(`Successfully linked ${institutionName}!`);
                      } else {
                        alert('Account linked successfully!');
                      }
                    }}
                    onError={(error) => {
                      alert('Failed to link account: ' + error);
                    }}
                    autoSync={true}
                  />
                </div>
                <div className='border-t pt-4'>
                  <p className='text-sm font-medium mb-3'>
                    Or add accounts manually:
                  </p>
                  {financialAccounts.map((account, index) => (
                    <Card
                      key={index}
                      className='border'
                    >
                      <CardContent className='pt-6'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <Label>Account Name</Label>
                            <Input
                              placeholder='e.g., Chase Checking'
                              value={account.name}
                              onChange={(e) => {
                                const updated = [...financialAccounts];
                                updated[index].name = e.target.value;
                                setFinancialAccounts(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label>Account Type</Label>
                            <select
                              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                              value={account.type}
                              onChange={(e) => {
                                const updated = [...financialAccounts];
                                updated[index].type = e.target
                                  .value as FinancialAccountState['type'];
                                setFinancialAccounts(updated);
                              }}
                            >
                              <option value='checking'>Checking</option>
                              <option value='savings'>Savings</option>
                              <option value='credit_card'>Credit Card</option>
                              <option value='investment'>Investment</option>
                            </select>
                          </div>
                          <div>
                            <Label>Institution (Optional)</Label>
                            <Input
                              placeholder='e.g., Chase Bank'
                              value={account.institution}
                              onChange={(e) => {
                                const updated = [...financialAccounts];
                                updated[index].institution = e.target.value;
                                setFinancialAccounts(updated);
                              }}
                            />
                          </div>
                          <div>
                            <Label>Current Balance</Label>
                            <Input
                              type='number'
                              step='0.01'
                              placeholder='0.00'
                              value={account.balance}
                              onChange={(e) => {
                                const updated = [...financialAccounts];
                                updated[index].balance = e.target.value;
                                setFinancialAccounts(updated);
                              }}
                            />
                          </div>
                        </div>
                        {financialAccounts.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            className='mt-4 text-red-500'
                            onClick={() => {
                              setFinancialAccounts(
                                financialAccounts.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            <Trash2 className='w-4 h-4 mr-2' />
                            Remove Account
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setFinancialAccounts([
                        ...financialAccounts,
                        {
                          name: '',
                          type: 'checking',
                          institution: '',
                          balance: '',
                        },
                      ]);
                    }}
                    className='w-full'
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    Add Another Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      case 'weather':
        return (
          <div className='space-y-6'>
            <LocationInput
              value={weatherLocation}
              onChange={(location, coordinates) => {
                setWeatherLocation(location);
                setWeatherCoordinates(
                  coordinates
                    ? { lat: coordinates.latitude, lng: coordinates.longitude }
                    : undefined
                );
              }}
              label='Primary location'
              placeholder='City, Country'
            />
          </div>
        );
      case 'productivity':
        return (
          <div className='space-y-6'>
            <header>
              <h3 className='text-2xl font-semibold mb-2 flex items-center gap-2'>
                <CheckCircle2 className='w-5 h-5 text-primary' />
                Productivity Goals
              </h3>
              <p className='text-muted-foreground'>
                Set your daily productivity goals. We&apos;ll track your
                progress against these milestones.
              </p>
            </header>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={productivityEnabled}
                onChange={(event) =>
                  setProductivityEnabled(event.target.checked)
                }
              />
              Track my productivity
            </label>
            {productivityEnabled && (
              <div className='space-y-6'>
                <Slider
                  label='Daily Tasks Goal'
                  value={productivityGoals.dailyTaskGoal}
                  valueLabel={`${productivityGoals.dailyTaskGoal} tasks`}
                  onChange={(e) =>
                    setProductivityGoals({
                      ...productivityGoals,
                      dailyTaskGoal: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={20}
                  step={1}
                />
                <Slider
                  label='Daily Focus Time Goal'
                  value={productivityGoals.dailyFocusGoal}
                  valueLabel={`${Math.floor(
                    productivityGoals.dailyFocusGoal / 60
                  )}h ${productivityGoals.dailyFocusGoal % 60}m`}
                  onChange={(e) =>
                    setProductivityGoals({
                      ...productivityGoals,
                      dailyFocusGoal: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={480}
                  step={15}
                />
                <Slider
                  label='Daily Breaks Goal'
                  value={productivityGoals.dailyBreaksGoal}
                  valueLabel={`${productivityGoals.dailyBreaksGoal} breaks`}
                  onChange={(e) =>
                    setProductivityGoals({
                      ...productivityGoals,
                      dailyBreaksGoal: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={10}
                  step={1}
                />
                <Slider
                  label='Productivity Score Target'
                  value={productivityGoals.productivityTarget}
                  valueLabel={`${productivityGoals.productivityTarget}%`}
                  onChange={(e) =>
                    setProductivityGoals({
                      ...productivityGoals,
                      productivityTarget: Number(e.target.value),
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>
        );
      case 'review':
        return (
          <div className='space-y-6'>
            <h3 className='text-2xl font-semibold text-center'>
              You&apos;re all set!
            </h3>
            <p className='text-muted-foreground text-center max-w-lg mx-auto'>
              We&apos;ll pull in your data using the sources you provided. You
              can return to this setup from settings at any time.
            </p>
            {error && (
              <p className='text-sm text-red-500 text-center'>{error}</p>
            )}
            <Button
              className='w-full'
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Go to dashboard'}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className='min-h-screen gradient-bg flex items-center justify-center px-4 py-10'>
      <Card className='glass-card border-0 w-full max-w-4xl'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>NeoDash Setup</span>
            <span className='text-sm text-muted-foreground'>
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </CardTitle>
          <CardDescription>
            Customize the data sources that power your personal analytics
            dashboard.
          </CardDescription>
          <div className='w-full bg-muted rounded-full h-2 mt-4'>
            <motion.div
              className='bg-primary h-2 rounded-full'
              initial={{ width: 0 }}
              animate={{
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
          {step !== 'intro' && (
            <div className='flex justify-between mt-8'>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Back
                </Button>
                {step !== 'review' && (
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={nextStep}
                    className='text-muted-foreground'
                  >
                    Skip for now
                  </Button>
                )}
              </div>
              {step !== 'review' ? (
                <Button
                  type='button'
                  onClick={nextStep}
                  disabled={!canGoNext()}
                >
                  Next
                  <ArrowRight className='w-4 h-4 ml-2' />
                </Button>
              ) : (
                <Button
                  type='button'
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Finish'}
                  <ArrowRight className='w-4 h-4 ml-2' />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen gradient-bg flex items-center justify-center'>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
