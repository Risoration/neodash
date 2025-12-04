import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  updateUserDataSection,
  updateUserConfig,
  getUserData,
  getUserConfig,
  CryptoData,
  WeatherData,
  ProductivityData,
  FinancialAccount,
  type FinancialData,
} from '@/lib/db';

const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  ada: 'cardano',
  matic: 'matic-network',
  avax: 'avalanche-2',
  dot: 'polkadot',
  link: 'chainlink',
};

interface CryptoHoldingInput {
  symbol: string;
  name?: string;
  amount: number;
}

interface SetupPayload {
  crypto?: {
    method?: 'manual' | 'exchange' | 'wallet' | 'browser-wallet';
    holdings?: CryptoHoldingInput[];
    exchange?: 'binance' | 'coinbase' | 'kraken';
    apiKey?: string;
    apiSecret?: string;
    wallets?: Array<{
      chain: 'ethereum' | 'bitcoin' | 'solana';
      address: string;
    }>;
  };
  weather?: {
    location: string;
    unit?: 'fahrenheit' | 'celsius';
    coordinates?: { lat: number; lng: number };
  };
  productivity?: {
    goals?: {
      dailyTaskGoal: number;
      dailyFocusGoal: number;
      dailyBreaksGoal: number;
      productivityTarget: number;
    };
  };
  financial?: {
    accounts?: Array<{
      name: string;
      type: 'checking' | 'savings' | 'credit_card' | 'investment';
      institution?: string;
      balance: number;
      currency?: string;
      linkedVia?: 'manual' | 'plaid';
    }>;
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = getUserData(user.id);
  return NextResponse.json({
    cryptoComplete: Boolean(data?.crypto),
    weatherComplete: Boolean(data?.weather),
    productivityComplete: Boolean(data?.productivity),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SetupPayload = await request.json();
    const updates: Array<Promise<void>> = [];

    if (body.crypto) {
      updates.push(saveCryptoData(user.id, body.crypto));
    }

    if (body.financial) {
      updates.push(saveFinancialData(user.id, body.financial));
    }

    if (body.weather) {
      // Get user's temperature preference, default to fahrenheit
      const userConfig = getUserConfig(user.id);
      const temperatureUnit =
        userConfig?.preferences?.temperatureUnit || 'fahrenheit';

      updates.push(
        saveWeatherData(
          user.id,
          body.weather.location,
          body.weather.unit || temperatureUnit,
          body.weather.coordinates
        )
      );
    }

    if (body.productivity) {
      updates.push(
        saveProductivityGoals(
          user.id,
          body.productivity.goals as SetupPayload['productivity'] extends {
            goals?: infer G;
          }
            ? G
            : never
        )
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ message: 'Setup saved' });
  } catch (error) {
    console.error('Setup error', error);
    return NextResponse.json(
      { error: 'Failed to save setup' },
      { status: 500 }
    );
  }
}

async function saveCryptoData(
  userId: string,
  cryptoData: SetupPayload['crypto']
) {
  if (!cryptoData) {
    updateUserDataSection(userId, 'crypto', null);
    return;
  }

  const method = cryptoData.method || 'manual';
  let holdings: CryptoHoldingInput[] = [];

  // Handle different connection methods
  if (method === 'manual' && cryptoData.holdings) {
    holdings = cryptoData.holdings;
  } else if (
    method === 'exchange' &&
    cryptoData.apiKey &&
    cryptoData.apiSecret
  ) {
    // TODO: Fetch from exchange API (should be done server-side)
    // For now, return empty - requires server-side implementation
    updateUserDataSection(userId, 'crypto', null);
    return;
  } else if (method === 'wallet' && cryptoData.wallets) {
    // Fetch wallet balances
    const { fetchWalletBalances } = await import('@/lib/crypto-connectors');
    const walletHoldings = await fetchWalletBalances(cryptoData.wallets);
    holdings = walletHoldings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      amount: h.holdings,
    }));
  } else if (method === 'browser-wallet') {
    // Browser wallet connection handled client-side, holdings should be in payload
    if (cryptoData.holdings) {
      holdings = cryptoData.holdings;
    } else {
      updateUserDataSection(userId, 'crypto', null);
      return;
    }
  }

  if (!holdings?.length) {
    updateUserDataSection(userId, 'crypto', null);
    return;
  }

  const normalizedHoldings = holdings
    .filter((holding) => holding.symbol && holding.amount > 0)
    .map((holding) => ({
      ...holding,
      symbol: holding.symbol.trim(),
    }));

  if (!normalizedHoldings.length) {
    updateUserDataSection(userId, 'crypto', null);
    return;
  }

  const ids = Array.from(
    new Set(
      normalizedHoldings
        .map((holding) => COINGECKO_IDS[holding.symbol.toLowerCase()])
        .filter(Boolean)
    )
  );

  let priceResponse: Record<string, any> = {};
  if (ids.length) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
          ','
        )}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 0 } }
      );
      priceResponse = await res.json();
    } catch (error) {
      console.error('Failed to fetch crypto prices', error);
    }
  }

  const coins = normalizedHoldings.map((holding) => {
    const id = COINGECKO_IDS[holding.symbol.toLowerCase()];
    const priceInfo = id ? priceResponse[id] : null;
    const price = priceInfo?.usd ?? 0;
    const change24h = priceInfo?.usd_24h_change ?? 0;
    const value = price * holding.amount;

    return {
      symbol: holding.symbol.toUpperCase(),
      name: holding.name || holding.symbol.toUpperCase(),
      holdings: holding.amount,
      price,
      value,
      change24h,
    };
  });

  const totalValue = coins.reduce((acc, coin) => acc + coin.value, 0);
  const change24h =
    coins.length > 0
      ? coins.reduce((acc, coin) => acc + (coin.change24h || 0), 0) /
        coins.length
      : 0;

  const history = generateHistory(totalValue);

  const payload: CryptoData = {
    totalValue,
    change24h,
    coins,
    history,
  };

  updateUserDataSection(userId, 'crypto', payload);
}

async function saveWeatherData(
  userId: string,
  location: string,
  unit: 'fahrenheit' | 'celsius' = 'fahrenheit',
  coordinates?: { lat: number; lng: number }
) {
  if (!location) {
    updateUserDataSection(userId, 'weather', null);
    return;
  }

  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();

    const current = data?.current_condition?.[0];
    const daily = data?.weather?.slice(0, 5) ?? [];

    if (!current) {
      updateUserDataSection(userId, 'weather', null);
      return;
    }

    const convertTemp = (value: string) =>
      unit === 'fahrenheit'
        ? Number(value)
        : Math.round(((Number(value) - 32) * 5) / 9);

    const forecast = daily.map((day: any) => ({
      day: new Date(day.date).toLocaleDateString(undefined, {
        weekday: 'short',
      }),
      high: convertTemp(day.maxtempF),
      low: convertTemp(day.mintempF),
      condition: day.hourly?.[4]?.weatherDesc?.[0]?.value ?? '—',
    }));

    const hourly = (daily[0]?.hourly ?? []).map((slot: any, index: number) => ({
      hour: index * 3,
      temp: convertTemp(slot.tempF),
      condition: slot.weatherDesc?.[0]?.value ?? '—',
    }));

    const payload: WeatherData = {
      location,
      temperature: convertTemp(current.temp_F),
      condition: current.weatherDesc?.[0]?.value ?? '—',
      humidity: Number(current.humidity ?? 0),
      windSpeed: Number(current.windspeedMiles ?? 0),
      forecast,
      hourly: hourly.slice(0, 8),
    };

    updateUserDataSection(userId, 'weather', payload);
  } catch (error) {
    console.error('Weather fetch error', error);
    updateUserDataSection(userId, 'weather', null);
  }
}

async function saveFinancialData(
  userId: string,
  financialData: SetupPayload['financial']
) {
  if (!financialData?.accounts || financialData.accounts.length === 0) {
    updateUserDataSection(userId, 'financial', null);
    return;
  }

  const accounts: FinancialAccount[] = financialData.accounts.map((acc) => ({
    id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: acc.name,
    type: acc.type,
    institution: acc.institution,
    balance: acc.balance,
    currency: acc.currency || 'USD',
    linkedVia: acc.linkedVia || 'manual',
    lastSynced:
      acc.linkedVia === 'plaid' ? new Date().toISOString() : undefined,
  }));

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Generate initial balance history (last 30 days)
  const balanceHistory = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      balance: totalBalance, // Start with current balance, will be updated with transactions
    };
  });

  const payload: FinancialData = {
    totalBalance,
    totalIncome: 0,
    totalExpenses: 0,
    netChange: 0,
    accounts,
    transactions: [],
    balanceHistory,
    spendingByCategory: [],
    monthlyTrends: [],
  };

  updateUserDataSection(userId, 'financial', payload);
}

async function saveProductivityGoals(
  userId: string,
  productivity?: SetupPayload['productivity']
) {
  const goals = productivity?.goals;
  if (!goals) {
    updateUserDataSection(userId, 'productivity', null);
    return;
  }

  // Initialize productivity data with zeros, goals stored in config
  const data: ProductivityData = {
    today: {
      tasksCompleted: 0,
      tasksTotal: goals.dailyTaskGoal,
      focusTime: 0,
      breaks: 0,
      productivityScore: 0,
    },
    thisWeek: {
      tasksCompleted: 0,
      tasksTotal: goals.dailyTaskGoal * 7,
      focusTime: 0,
      breaks: 0,
      productivityScore: 0,
    },
    tasks: [],
    focusSessions: [],
    weeklyStats: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      tasks: 0,
      hours: 0,
    })),
  };

  updateUserDataSection(userId, 'productivity', data);

  // Store goals in user config
  updateUserConfig(userId, {
    productivityGoals: goals,
  });
}

function generateHistory(totalValue: number) {
  const points = 14;
  return Array.from({ length: points }, (_, i) => {
    const variance = Math.sin(i / points) * 0.03;
    const value = totalValue * (1 + variance);
    return {
      date: new Date(
        Date.now() - (points - i) * 24 * 60 * 60 * 1000
      ).toISOString(),
      value,
    };
  });
}
