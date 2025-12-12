import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';

// Re-export all interfaces from the original db.ts
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

export interface CryptoCoin {
  symbol: string;
  name: string;
  holdings: number;
  price: number;
  value: number;
  change24h?: number;
}

export interface CryptoData {
  totalValue: number;
  change24h: number;
  coins: CryptoCoin[];
  history: Array<{ date: string; value: number }>;
}

export interface ProductivityData {
  today: {
    tasksCompleted: number;
    tasksTotal: number;
    focusTime: number;
    breaks: number;
    productivityScore: number;
  };
  thisWeek: {
    tasksCompleted: number;
    tasksTotal: number;
    focusTime: number;
    breaks: number;
    productivityScore: number;
  };
  tasks: Array<{
    id: number;
    title: string;
    completed: boolean;
    priority: string;
  }>;
  focusSessions: Array<{
    date: string;
    duration: number;
    tasks: number;
  }>;
  weeklyStats: Array<{
    day: string;
    tasks: number;
    hours: number;
  }>;
}

export interface WeatherData {
  location: string;
  temperature: number; // Keep for backward compatibility, will be temperatureF
  temperatureF?: number; // Fahrenheit temperature
  temperatureC?: number; // Celsius temperature
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    day: string;
    high: number; // Keep for backward compatibility
    highF?: number; // Fahrenheit high
    highC?: number; // Celsius high
    low: number; // Keep for backward compatibility
    lowF?: number; // Fahrenheit low
    lowC?: number; // Celsius low
    condition: string;
  }>;
  hourly: Array<{
    hour: number;
    temp: number; // Keep for backward compatibility
    tempF?: number; // Fahrenheit temp
    tempC?: number; // Celsius temp
    condition: string;
  }>;
  unit?: 'fahrenheit' | 'celsius'; // Keep for backward compatibility
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment';
  institution?: string;
  balance: number;
  currency: string;
  lastSynced?: string;
  linkedVia?: 'manual' | 'plaid';
  plaidAccountId?: string;
}

export interface FinancialData {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  accounts: FinancialAccount[];
  transactions: Array<{
    id: string;
    accountId: string;
    date: string;
    amount: number;
    category?: string;
    description: string;
    type: 'income' | 'expense' | 'transfer';
  }>;
  balanceHistory: Array<{ date: string; balance: number }>;
  spendingByCategory: Array<{ category: string; amount: number }>;
  monthlyTrends: Array<{ month: string; income: number; expenses: number }>;
  // Budget and goal tracking
  budgets?: Array<{ category: string; monthlyBudget: number }>;
  dailyGoal?: number;
  monthlyGoal?: number;
  lastUpdated?: string; // Last time manual accounts were updated
}

// Standard spending categories
export const SPENDING_CATEGORIES = [
  'essentials',
  'food',
  'entertainment',
  'transportation',
  'utilities',
  'healthcare',
  'shopping',
  'other',
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

export interface UserData {
  userId: string;
  crypto: CryptoData | null;
  productivity: ProductivityData | null;
  weather: WeatherData | null;
  financial: FinancialData | null;
}

export interface ProductivityGoals {
  dailyTaskGoal: number;
  dailyFocusGoal: number;
  dailyBreaksGoal: number;
  productivityTarget: number;
}

export interface UserConfig {
  userId: string;
  setupCompleted: boolean;
  sections: {
    crypto: boolean;
    productivity: boolean;
    weather: boolean;
    financial: boolean;
  };
  productivityGoals?: ProductivityGoals;
  preferences?: {
    temperatureUnit?: 'fahrenheit' | 'celsius';
    blockedSites?: string[];
    extensionApiKey?: string;
  };
}

export interface FocusSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  totalFocusSeconds: number;
  totalBreakSeconds: number;
  breaksTaken: number;
  status: 'active' | 'on_break' | 'completed';
  breakEndsAt?: string;
  breakStartedAt?: string;
  lastUpdatedAt: string;
}

type UserDataSection = 'crypto' | 'productivity' | 'weather' | 'financial';

// Helper function to ensure user records exist
async function ensureUserRecords(userId: string): Promise<void> {
  // Check if user_data exists
  const { data: userData } = await supabase
    .from('user_data')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (!userData) {
    await supabase.from('user_data').insert({
      user_id: userId,
      crypto: null,
      productivity: null,
      weather: null,
      financial: null,
    });
  }

  // Check if user_config exists
  const { data: userConfig } = await supabase
    .from('user_config')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (!userConfig) {
    await supabase.from('user_config').insert({
      user_id: userId,
      setup_completed: false,
      sections: {
        crypto: false,
        productivity: false,
        weather: false,
        financial: false,
      },
      productivity_goals: null,
      preferences: {},
    });
  }
}

// User functions
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      name,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Initialize user records
  await ensureUserRecords(user.id);

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    createdAt: user.created_at,
  };
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    createdAt: user.created_at,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    createdAt: user.created_at,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    createdAt: user.created_at,
  };
}

// Password reset functions
export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  // Generate a secure random token
  const token = randomUUID() + '-' + randomUUID();

  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const { error } = await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
    used: false,
  });

  if (error) {
    throw new Error(`Failed to create reset token: ${error.message}`);
  }

  return token;
}

export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string } | null> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('user_id, expires_at, used')
    .eq('token', token)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token is expired or already used
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date() || data.used) {
    return null;
  }

  return { userId: data.user_id };
}

export async function markTokenAsUsed(token: string): Promise<void> {
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('token', token);

  if (error) {
    throw new Error(`Failed to mark token as used: ${error.message}`);
  }
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const { error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

// User Data functions
export async function getUserData(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    crypto: data.crypto as CryptoData | null,
    productivity: data.productivity as ProductivityData | null,
    weather: data.weather as WeatherData | null,
    financial: data.financial as FinancialData | null,
  };
}

export function isPlaceholderCryptoData(
  crypto: CryptoData | null | undefined
): boolean {
  if (!crypto) return true;

  const placeholderCoins = [
    { symbol: 'BTC', holdings: 0.5 },
    { symbol: 'ETH', holdings: 5.2 },
    { symbol: 'SOL', holdings: 50 },
    { symbol: 'ADA', holdings: 2000 },
  ];

  if (crypto.coins.length === placeholderCoins.length) {
    const matches = placeholderCoins.every((placeholder, index) => {
      const coin = crypto.coins[index];
      return (
        coin?.symbol === placeholder.symbol &&
        Math.abs((coin?.holdings || 0) - placeholder.holdings) < 0.01
      );
    });
    if (matches) return true;
  }

  if (Math.abs(crypto.totalValue - 45230.5) < 1 && crypto.coins.length === 4) {
    return true;
  }

  return false;
}

export function isPlaceholderWeatherData(
  weather: WeatherData | null | undefined
): boolean {
  if (!weather) return true;
  if (weather.location === 'San Francisco, CA' && weather.temperature === 72) {
    return true;
  }
  return false;
}

export function isPlaceholderProductivityData(
  productivity: ProductivityData | null | undefined
): boolean {
  if (!productivity) return true;
  if (
    productivity.today.tasksCompleted === 12 &&
    productivity.today.tasksTotal === 15 &&
    productivity.today.focusTime === 240 &&
    productivity.today.productivityScore === 85
  ) {
    return true;
  }
  return false;
}

// User Config functions
export async function getUserConfig(
  userId: string
): Promise<UserConfig | null> {
  const { data, error } = await supabase
    .from('user_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    setupCompleted: data.setup_completed,
    sections: data.sections as UserConfig['sections'],
    productivityGoals:
      (data.productivity_goals as ProductivityGoals | null) || undefined,
    preferences: data.preferences as UserConfig['preferences'],
  };
}

export async function updateUserConfig(
  userId: string,
  updates: Partial<UserConfig>
): Promise<void> {
  await ensureUserRecords(userId);

  const updateData: any = {};
  if (updates.setupCompleted !== undefined) {
    updateData.setup_completed = updates.setupCompleted;
  }
  if (updates.sections) {
    updateData.sections = updates.sections;
  }
  if (updates.productivityGoals !== undefined) {
    updateData.productivity_goals = updates.productivityGoals;
  }
  if (updates.preferences) {
    // Merge preferences
    const { data: current } = await supabase
      .from('user_config')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    updateData.preferences = {
      ...(current?.preferences || {}),
      ...updates.preferences,
    };
  }

  const { error } = await supabase
    .from('user_config')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update user config: ${error.message}`);
  }
}

export async function updateUserData(
  userId: string,
  data: Partial<UserData>
): Promise<void> {
  await ensureUserRecords(userId);

  const updateData: any = {};
  if (data.crypto !== undefined) updateData.crypto = data.crypto;
  if (data.productivity !== undefined)
    updateData.productivity = data.productivity;
  if (data.weather !== undefined) updateData.weather = data.weather;
  if (data.financial !== undefined) updateData.financial = data.financial;

  const { error } = await supabase
    .from('user_data')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update user data: ${error.message}`);
  }
}

export async function updateUserDataSection<T extends UserDataSection>(
  userId: string,
  section: T,
  data: T extends 'crypto'
    ? CryptoData | null
    : T extends 'productivity'
      ? ProductivityData | null
      : T extends 'weather'
        ? WeatherData | null
        : T extends 'financial'
          ? FinancialData | null
          : never
): Promise<void> {
  await ensureUserRecords(userId);

  const updateData: any = {};
  updateData[section] = data;

  const { error } = await supabase
    .from('user_data')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update ${section} data: ${error.message}`);
  }
}

export async function userNeedsSetup(userId: string): Promise<boolean> {
  const config = await getUserConfig(userId);
  return !config?.setupCompleted;
}

export function isPlaceholderFinancialData(
  financial: FinancialData | null | undefined
): boolean {
  if (!financial) return true;
  if (
    financial.totalBalance === 0 &&
    financial.accounts.length === 0 &&
    financial.transactions.length === 0
  ) {
    return true;
  }
  return false;
}

export async function getUserFinancialData(
  userId: string
): Promise<FinancialData | null> {
  const userData = await getUserData(userId);
  return userData?.financial || null;
}

export async function updateFinancialData(
  userId: string,
  financialData: FinancialData
): Promise<void> {
  await updateUserDataSection(userId, 'financial', financialData);
}

export async function sectionNeedsSetup(
  userId: string,
  section: UserDataSection
): Promise<boolean> {
  const config = await getUserConfig(userId);
  if (!config) return true;

  const sectionKey = section as keyof typeof config.sections;
  if (!config.sections[sectionKey]) {
    return true;
  }

  const userData = await getUserData(userId);
  if (!userData) return true;

  switch (section) {
    case 'crypto':
      return !userData.crypto || isPlaceholderCryptoData(userData.crypto);
    case 'weather':
      return !userData.weather || isPlaceholderWeatherData(userData.weather);
    case 'productivity':
      return (
        !userData.productivity ||
        isPlaceholderProductivityData(userData.productivity)
      );
    case 'financial':
      return (
        !userData.financial || isPlaceholderFinancialData(userData.financial)
      );
    default:
      return true;
  }
}

// Focus Session functions
export async function getActiveFocusSession(
  userId: string
): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'on_break'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    totalFocusSeconds: data.total_focus_seconds,
    totalBreakSeconds: data.total_break_seconds,
    breaksTaken: data.breaks_taken,
    status: data.status,
    breakEndsAt: data.break_ends_at,
    breakStartedAt: data.break_started_at,
    lastUpdatedAt: data.last_updated_at,
  };
}

export async function createFocusSession(
  userId: string
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      total_focus_seconds: 0,
      total_break_seconds: 0,
      breaks_taken: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create focus session: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    totalFocusSeconds: data.total_focus_seconds,
    totalBreakSeconds: data.total_break_seconds,
    breaksTaken: data.breaks_taken,
    status: data.status,
    breakEndsAt: data.break_ends_at,
    breakStartedAt: data.break_started_at,
    lastUpdatedAt: data.last_updated_at,
  };
}

export async function updateFocusSession(
  sessionId: string,
  updates: Partial<FocusSession>
): Promise<FocusSession | null> {
  const updateData: any = {};
  if (updates.endedAt !== undefined) updateData.ended_at = updates.endedAt;
  if (updates.totalFocusSeconds !== undefined)
    updateData.total_focus_seconds = updates.totalFocusSeconds;
  if (updates.totalBreakSeconds !== undefined)
    updateData.total_break_seconds = updates.totalBreakSeconds;
  if (updates.breaksTaken !== undefined)
    updateData.breaks_taken = updates.breaksTaken;
  if (updates.status) updateData.status = updates.status;
  if (updates.breakEndsAt !== undefined)
    updateData.break_ends_at = updates.breakEndsAt;
  if (updates.breakStartedAt !== undefined)
    updateData.break_started_at = updates.breakStartedAt;

  const { data, error } = await supabase
    .from('focus_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update focus session: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    totalFocusSeconds: data.total_focus_seconds,
    totalBreakSeconds: data.total_break_seconds,
    breaksTaken: data.breaks_taken,
    status: data.status,
    breakEndsAt: data.break_ends_at,
    breakStartedAt: data.break_started_at,
    lastUpdatedAt: data.last_updated_at,
  };
}

export async function startBreak(
  sessionId: string,
  breakDurationMinutes: number
): Promise<FocusSession | null> {
  // Get current session to find userId and current breaksTaken
  const { data: sessionData } = await supabase
    .from('focus_sessions')
    .select('user_id, breaks_taken')
    .eq('id', sessionId)
    .single();

  if (!sessionData) return null;

  const breakEndsAt = new Date();
  breakEndsAt.setMinutes(breakEndsAt.getMinutes() + breakDurationMinutes);

  return updateFocusSession(sessionId, {
    status: 'on_break',
    breakStartedAt: new Date().toISOString(),
    breakEndsAt: breakEndsAt.toISOString(),
    breaksTaken: (sessionData.breaks_taken || 0) + 1,
  });
}

export async function resumeFocus(
  sessionId: string
): Promise<FocusSession | null> {
  // Get current session
  const { data: sessionData } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!sessionData || sessionData.status !== 'on_break') return null;

  const breakStartTime = sessionData.break_started_at
    ? new Date(sessionData.break_started_at).getTime()
    : Date.now();
  const breakDuration = Math.floor((Date.now() - breakStartTime) / 1000);

  return updateFocusSession(sessionId, {
    status: 'active',
    totalBreakSeconds: (sessionData.total_break_seconds || 0) + breakDuration,
    breakStartedAt: undefined,
    breakEndsAt: undefined,
  });
}

export async function endFocusSession(
  sessionId: string
): Promise<FocusSession | null> {
  // Get current session
  const { data: sessionData } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!sessionData) return null;

  const now = Date.now();
  const startTime = new Date(sessionData.started_at).getTime();
  let totalFocusSeconds = Math.floor((now - startTime) / 1000);

  // Subtract break time
  if (sessionData.total_break_seconds) {
    totalFocusSeconds -= sessionData.total_break_seconds;
  }

  return updateFocusSession(sessionId, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    totalFocusSeconds: Math.max(0, totalFocusSeconds),
  });
}

export async function getFocusSessionStats(userId: string): Promise<{
  totalFocusSeconds: number;
  totalBreakSeconds: number;
  breaksTaken: number;
}> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('total_focus_seconds, total_break_seconds, breaks_taken')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error || !data) {
    return { totalFocusSeconds: 0, totalBreakSeconds: 0, breaksTaken: 0 };
  }

  const initial = {
    totalFocusSeconds: 0,
    totalBreakSeconds: 0,
    breaksTaken: 0,
  };
  return data.reduce(
    (
      acc: typeof initial,
      session: {
        total_focus_seconds?: number;
        total_break_seconds?: number;
        breaks_taken?: number;
      }
    ) => ({
      totalFocusSeconds:
        acc.totalFocusSeconds + (session.total_focus_seconds || 0),
      totalBreakSeconds:
        acc.totalBreakSeconds + (session.total_break_seconds || 0),
      breaksTaken: acc.breaksTaken + (session.breaks_taken || 0),
    }),
    initial
  );
}

export function generateExtensionApiKey(userId: string): string {
  return `ext_${userId}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

export async function syncFocusSessionToProductivity(
  userId: string
): Promise<void> {
  const stats = await getFocusSessionStats(userId);
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Get all completed sessions for today and this week
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', weekStartStr);

  const todaySessions =
    sessions?.filter(
      (s: { started_at: string }) => s.started_at.split('T')[0] === today
    ) || [];
  const weekSessions = sessions || [];

  const todayFocusSeconds = todaySessions.reduce(
    (sum: number, s: { total_focus_seconds?: number }) =>
      sum + (s.total_focus_seconds || 0),
    0
  );
  const weekFocusSeconds = weekSessions.reduce(
    (sum: number, s: { total_focus_seconds?: number }) =>
      sum + (s.total_focus_seconds || 0),
    0
  );

  const todayBreaks = todaySessions.reduce(
    (sum: number, s: { breaks_taken?: number }) => sum + (s.breaks_taken || 0),
    0
  );
  const weekBreaks = weekSessions.reduce(
    (sum: number, s: { breaks_taken?: number }) => sum + (s.breaks_taken || 0),
    0
  );

  // Get current productivity data
  const userData = await getUserData(userId);
  const productivity = userData?.productivity || {
    today: {
      tasksCompleted: 0,
      tasksTotal: 0,
      focusTime: 0,
      breaks: 0,
      productivityScore: 0,
    },
    thisWeek: {
      tasksCompleted: 0,
      tasksTotal: 0,
      focusTime: 0,
      breaks: 0,
      productivityScore: 0,
    },
    tasks: [],
    focusSessions: [],
    weeklyStats: [],
  };

  productivity.today.focusTime = Math.floor(todayFocusSeconds / 60);
  productivity.today.breaks = todayBreaks;
  productivity.thisWeek.focusTime = Math.floor(weekFocusSeconds / 60);
  productivity.thisWeek.breaks = weekBreaks;

  // Calculate productivity score
  const config = await getUserConfig(userId);
  const goals = config?.productivityGoals;
  if (goals) {
    const focusProgress = Math.min(
      100,
      (productivity.today.focusTime / goals.dailyFocusGoal) * 100
    );
    const breaksProgress = Math.min(
      100,
      (productivity.today.breaks / goals.dailyBreaksGoal) * 100
    );
    const tasksProgress =
      productivity.today.tasksTotal > 0
        ? (productivity.today.tasksCompleted / productivity.today.tasksTotal) *
          100
        : 0;

    productivity.today.productivityScore = Math.round(
      focusProgress * 0.5 + tasksProgress * 0.3 + breaksProgress * 0.2
    );
    productivity.thisWeek.productivityScore = Math.round(
      (productivity.today.productivityScore +
        productivity.thisWeek.productivityScore) /
        2
    );
  }

  await updateUserDataSection(userId, 'productivity', productivity);
}

// Legacy function for backward compatibility
export async function readUserConfigs(): Promise<Record<string, UserConfig>> {
  // This function is not commonly used, but if needed, fetch all configs
  const { data, error } = await supabase.from('user_config').select('*');
  if (error || !data) return {};

  const result: Record<string, UserConfig> = {};
  for (const config of data) {
    result[config.user_id] = {
      userId: config.user_id,
      setupCompleted: config.setup_completed,
      sections: config.sections,
      productivityGoals: config.productivity_goals,
      preferences: config.preferences,
    };
  }
  return result;
}

// Plaid Item interfaces
export interface PlaidItem {
  id: string;
  userId: string;
  itemId: string;
  accessToken: string; // Decrypted
  institutionId?: string;
  institutionName?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Plaid Item functions
export async function storePlaidItem(
  userId: string,
  itemId: string,
  accessToken: string,
  institutionId?: string,
  institutionName?: string
): Promise<PlaidItem> {
  const { encrypt } = await import('./encryption');
  const encryptedToken = encrypt(accessToken);

  // Check if item already exists
  const existing = await getPlaidItemByItemId(userId, itemId);
  if (existing) {
    // Update existing item
    const { data, error } = await supabase
      .from('plaid_items')
      .update({
        access_token: encryptedToken,
        institution_id: institutionId || existing.institutionId,
        institution_name: institutionName || existing.institutionName,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update Plaid item: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      itemId: data.item_id,
      accessToken, // Return decrypted
      institutionId: data.institution_id || undefined,
      institutionName: data.institution_name || undefined,
      lastSyncedAt: data.last_synced_at || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Create new item
  const { data, error } = await supabase
    .from('plaid_items')
    .insert({
      user_id: userId,
      item_id: itemId,
      access_token: encryptedToken,
      institution_id: institutionId,
      institution_name: institutionName,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store Plaid item: ${error.message}`);
  }

  return {
    id: data.id,
    userId: data.user_id,
    itemId: data.item_id,
    accessToken, // Return decrypted
    institutionId: data.institution_id || undefined,
    institutionName: data.institution_name || undefined,
    lastSyncedAt: data.last_synced_at || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getPlaidItems(userId: string): Promise<PlaidItem[]> {
  const { decrypt } = await import('./encryption');
  const { data, error } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(
    (item: {
      id: string;
      user_id: string;
      item_id: string;
      access_token: string;
      institution_id: string | undefined;
      institution_name: string | undefined;
      last_synced_at: string | undefined;
      created_at: string;
      updated_at: string;
    }) => {
      let accessToken = '';
      try {
        accessToken = decrypt(item.access_token);
      } catch (err) {
        console.error('Failed to decrypt access token for item:', item.item_id);
        // Return empty token - caller should handle this
      }

      return {
        id: item.id,
        userId: item.user_id,
        itemId: item.item_id,
        accessToken,
        institutionId: item.institution_id || undefined,
        institutionName: item.institution_name || undefined,
        lastSyncedAt: item.last_synced_at || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }
  );
}

export async function getPlaidItemByItemId(
  userId: string,
  itemId: string
): Promise<PlaidItem | null> {
  const { decrypt } = await import('./encryption');
  const { data, error } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .single();

  if (error || !data) {
    return null;
  }

  let accessToken = '';
  try {
    accessToken = decrypt(data.access_token);
  } catch (err) {
    console.error('Failed to decrypt access token for item:', itemId);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    itemId: data.item_id,
    accessToken,
    institutionId: data.institution_id || undefined,
    institutionName: data.institution_name || undefined,
    lastSyncedAt: data.last_synced_at || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deletePlaidItem(
  userId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from('plaid_items')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId);

  if (error) {
    throw new Error(`Failed to delete Plaid item: ${error.message}`);
  }
}

export async function updatePlaidItemLastSynced(
  userId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from('plaid_items')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('item_id', itemId);

  if (error) {
    throw new Error(
      `Failed to update Plaid item last synced: ${error.message}`
    );
  }
}

export async function updatePlaidItemInstitution(
  userId: string,
  itemId: string,
  institutionId: string,
  institutionName: string
): Promise<void> {
  const { error } = await supabase
    .from('plaid_items')
    .update({
      institution_id: institutionId,
      institution_name: institutionName,
    })
    .eq('user_id', userId)
    .eq('item_id', itemId);

  if (error) {
    throw new Error(
      `Failed to update Plaid item institution: ${error.message}`
    );
  }
}
