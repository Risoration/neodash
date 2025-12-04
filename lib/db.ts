import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_DATA_FILE = path.join(DATA_DIR, 'user-data.json');
const USER_CONFIG_FILE = path.join(DATA_DIR, 'user-config.json');
const FOCUS_SESSIONS_FILE = path.join(DATA_DIR, 'focus-sessions.json');

type UserDataSection = 'crypto' | 'productivity' | 'weather' | 'financial';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(USER_DATA_FILE)) {
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(USER_CONFIG_FILE)) {
  fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(FOCUS_SESSIONS_FILE)) {
  fs.writeFileSync(FOCUS_SESSIONS_FILE, JSON.stringify([], null, 2));
}

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
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
  hourly: Array<{
    hour: number;
    temp: number;
    condition: string;
  }>;
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
}

export interface UserData {
  userId: string;
  crypto: CryptoData | null;
  productivity: ProductivityData | null;
  weather: WeatherData | null;
  financial: FinancialData | null;
}

export interface ProductivityGoals {
  dailyTaskGoal: number;
  dailyFocusGoal: number; // in minutes
  dailyBreaksGoal: number;
  productivityTarget: number; // 0-100
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

function readUsers(): User[] {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readUserData(): Record<string, UserData> {
  try {
    const data = fs.readFileSync(USER_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeUserData(userData: Record<string, UserData>): void {
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2));
}

export function readUserConfigs(): Record<string, UserConfig> {
  try {
    const data = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeUserConfigs(configs: Record<string, UserConfig>): void {
  fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(configs, null, 2));
}

function initUserRecords(userId: string): void {
  const data = readUserData();
  if (!data[userId]) {
    data[userId] = {
      userId,
      crypto: null,
      productivity: null,
      weather: null,
      financial: null,
    };
    writeUserData(data);
  }

  const configs = readUserConfigs();
  if (!configs[userId]) {
    configs[userId] = {
      userId,
      setupCompleted: false,
      sections: {
        crypto: false,
        productivity: false,
        weather: false,
        financial: false,
      },
    };
    writeUserConfigs(configs);
  }
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const users = readUsers();

  if (users.find((u) => u.email === email)) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    password: hashedPassword,
    name,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);
  initUserRecords(user.id);

  return user;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const users = readUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return user;
}

export function getUserById(id: string): User | null {
  const users = readUsers();
  return users.find((u) => u.id === id) || null;
}

export function getUserByEmail(email: string): User | null {
  const users = readUsers();
  return users.find((u) => u.email === email) || null;
}

export function getUserData(userId: string): UserData | null {
  const data = readUserData();
  return data[userId] || null;
}

// Check if crypto data looks like placeholder/default data
export function isPlaceholderCryptoData(
  crypto: CryptoData | null | undefined
): boolean {
  if (!crypto) return true;

  // Check for placeholder patterns - look for the exact placeholder coin symbols and holdings
  const placeholderCoins = [
    { symbol: 'BTC', holdings: 0.5 },
    { symbol: 'ETH', holdings: 5.2 },
    { symbol: 'SOL', holdings: 50 },
    { symbol: 'ADA', holdings: 2000 },
  ];

  // If coins match placeholder pattern exactly (same symbols in same order with same holdings), it's placeholder data
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

  // Also check if totalValue matches placeholder (~45230.50)
  if (Math.abs(crypto.totalValue - 45230.5) < 1 && crypto.coins.length === 4) {
    return true;
  }

  return false;
}

// Check if weather data looks like placeholder/default data
export function isPlaceholderWeatherData(
  weather: WeatherData | null | undefined
): boolean {
  if (!weather) return true;

  // Check for placeholder location
  if (weather.location === 'San Francisco, CA' && weather.temperature === 72) {
    return true;
  }

  return false;
}

// Check if productivity data looks like placeholder/default data
export function isPlaceholderProductivityData(
  productivity: ProductivityData | null | undefined
): boolean {
  if (!productivity) return true;

  // Check for placeholder values
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

export function getUserConfig(userId: string): UserConfig | null {
  const configs = readUserConfigs();
  return configs[userId] || null;
}

export function updateUserConfig(
  userId: string,
  updates: Partial<UserConfig>
): void {
  const configs = readUserConfigs();
  if (!configs[userId]) {
    initUserRecords(userId);
  }
  configs[userId] = {
    ...configs[userId],
    ...updates,
    sections: {
      ...(configs[userId]?.sections || {
        crypto: false,
        productivity: false,
        weather: false,
        financial: false,
      }),
      ...(updates.sections || {}),
    },
    preferences: {
      ...(configs[userId]?.preferences || {}),
      ...(updates.preferences || {}),
    },
  };
  writeUserConfigs(configs);
}

export function updateUserData(userId: string, data: Partial<UserData>): void {
  const allData = readUserData();
  if (!allData[userId]) {
    initUserRecords(userId);
  }

  allData[userId] = {
    ...allData[userId],
    ...data,
  };

  writeUserData(allData);
}

export function updateUserDataSection<T extends UserDataSection>(
  userId: string,
  section: T,
  payload: UserData[T]
): void {
  const data = readUserData();
  if (!data[userId]) {
    initUserRecords(userId);
  }

  (data[userId] as UserData)[section] = payload;
  writeUserData(data);

  const configs = readUserConfigs();
  if (!configs[userId]) {
    initUserRecords(userId);
  }

  configs[userId].sections[section] = payload !== null;
  configs[userId].setupCompleted = Object.values(
    configs[userId].sections
  ).every(Boolean);
  writeUserConfigs(configs);
}

export function userNeedsSetup(userId: string): boolean {
  const data = getUserData(userId);
  if (!data) {
    return true;
  }
  return !data.crypto && !data.productivity && !data.weather && !data.financial;
}

// Check if financial data looks like placeholder/default data
export function isPlaceholderFinancialData(
  financial: FinancialData | null | undefined
): boolean {
  if (!financial) return true;
  // If no accounts, it's placeholder/missing
  if (!financial.accounts || financial.accounts.length === 0) {
    return true;
  }
  return false;
}

// Helper function to get user's financial data
export function getUserFinancialData(userId: string): FinancialData | null {
  const data = getUserData(userId);
  return data?.financial || null;
}

// Helper function to update financial data
export function updateFinancialData(
  userId: string,
  financialData: FinancialData
): void {
  updateUserDataSection(userId, 'financial', financialData);
}

export function sectionNeedsSetup(
  userId: string,
  section: UserDataSection
): boolean {
  const data = getUserData(userId);
  if (!data) return true;
  return data[section] === null;
}

// Focus Session Management
function readFocusSessions(): FocusSession[] {
  try {
    const data = fs.readFileSync(FOCUS_SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeFocusSessions(sessions: FocusSession[]): void {
  fs.writeFileSync(FOCUS_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export function getActiveFocusSession(userId: string): FocusSession | null {
  const sessions = readFocusSessions();
  return (
    sessions.find(
      (s) =>
        s.userId === userId &&
        (s.status === 'active' || s.status === 'on_break')
    ) || null
  );
}

export function createFocusSession(userId: string): FocusSession {
  const sessions = readFocusSessions();

  // End any existing active session
  const existing = sessions.find(
    (s) =>
      s.userId === userId && (s.status === 'active' || s.status === 'on_break')
  );
  if (existing) {
    existing.status = 'completed';
    existing.endedAt = new Date().toISOString();
    existing.lastUpdatedAt = new Date().toISOString();
  }

  const newSession: FocusSession = {
    id: `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    startedAt: new Date().toISOString(),
    totalFocusSeconds: 0,
    totalBreakSeconds: 0,
    breaksTaken: 0,
    status: 'active',
    lastUpdatedAt: new Date().toISOString(),
  };

  sessions.push(newSession);
  writeFocusSessions(sessions);
  return newSession;
}

export function updateFocusSession(
  sessionId: string,
  updates: Partial<FocusSession>
): FocusSession | null {
  const sessions = readFocusSessions();
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    ...updates,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeFocusSessions(sessions);
  return sessions[index];
}

export function startBreak(
  sessionId: string,
  breakDurationMinutes: number
): FocusSession | null {
  const session = readFocusSessions().find((s) => s.id === sessionId);
  if (!session || session.status !== 'active') return null;

  const now = new Date().toISOString();
  const breakEndsAt = new Date(
    Date.now() + breakDurationMinutes * 60 * 1000
  ).toISOString();

  return updateFocusSession(sessionId, {
    status: 'on_break',
    breakEndsAt,
    breakStartedAt: now,
    breaksTaken: session.breaksTaken + 1,
  });
}

export function resumeFocus(sessionId: string): FocusSession | null {
  const session = readFocusSessions().find((s) => s.id === sessionId);
  if (!session || session.status !== 'on_break') return null;

  // Calculate break time elapsed using breakStartedAt
  let breakSeconds = 0;
  if (session.breakStartedAt) {
    const breakStartTime = new Date(session.breakStartedAt).getTime();
    const now = Date.now();
    breakSeconds = Math.max(0, Math.floor((now - breakStartTime) / 1000));
  }
  const totalBreakSeconds = (session.totalBreakSeconds || 0) + breakSeconds;

  return updateFocusSession(sessionId, {
    status: 'active',
    breakEndsAt: undefined,
    breakStartedAt: undefined,
    totalBreakSeconds,
    lastUpdatedAt: new Date().toISOString(),
  });
}

export function endFocusSession(sessionId: string): FocusSession | null {
  const session = readFocusSessions().find((s) => s.id === sessionId);
  if (!session) return null;

  // Calculate final focus time
  const now = Date.now();
  const startTime = new Date(session.startedAt).getTime();
  const totalElapsed = Math.floor((now - startTime) / 1000);
  const breakTime = session.totalBreakSeconds || 0;

  // Final focus time = total elapsed - break time
  const totalFocusSeconds = Math.max(0, totalElapsed - breakTime);

  return updateFocusSession(sessionId, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    totalFocusSeconds,
  });
}

export function getFocusSessionStats(
  userId: string,
  date?: string
): {
  totalFocusSeconds: number;
  breaksTaken: number;
  sessionsCount: number;
} {
  const sessions = readFocusSessions();
  const targetDate = date
    ? new Date(date).toDateString()
    : new Date().toDateString();

  const daySessions = sessions.filter((s) => {
    if (s.userId !== userId) return false;
    const sessionDate = new Date(s.startedAt).toDateString();
    return sessionDate === targetDate;
  });

  const totalFocusSeconds = daySessions.reduce(
    (sum, s) => sum + (s.totalFocusSeconds || 0),
    0
  );
  const breaksTaken = daySessions.reduce((sum, s) => sum + s.breaksTaken, 0);

  return {
    totalFocusSeconds,
    breaksTaken,
    sessionsCount: daySessions.length,
  };
}

export function generateExtensionApiKey(userId: string): string {
  const key = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  updateUserConfig(userId, {
    preferences: {
      ...getUserConfig(userId)?.preferences,
      extensionApiKey: key,
    },
  });
  return key;
}

// Sync focus session data with productivity data
export function syncFocusSessionToProductivity(userId: string): void {
  const userData = getUserData(userId);
  if (!userData || !userData.productivity) {
    return; // No productivity data to sync
  }

  const today = new Date().toDateString();
  const sessions = readFocusSessions();

  // Get all sessions for today
  const todaySessions = sessions.filter((s) => {
    if (s.userId !== userId) return false;
    const sessionDate = new Date(s.startedAt).toDateString();
    return sessionDate === today;
  });

  // Calculate totals for today
  const totalFocusSeconds = todaySessions.reduce(
    (sum, s) => sum + (s.totalFocusSeconds || 0),
    0
  );
  const totalBreaks = todaySessions.reduce((sum, s) => sum + s.breaksTaken, 0);

  // Update productivity data
  const productivity = { ...userData.productivity };
  productivity.today = {
    ...productivity.today,
    focusTime: Math.floor(totalFocusSeconds / 60), // Convert to minutes
    breaks: totalBreaks,
  };

  // Update this week's totals
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  const weekSessions = sessions.filter((s) => {
    if (s.userId !== userId) return false;
    const sessionDate = new Date(s.startedAt);
    return sessionDate >= weekStart;
  });

  const weekFocusSeconds = weekSessions.reduce(
    (sum, s) => sum + (s.totalFocusSeconds || 0),
    0
  );
  const weekBreaks = weekSessions.reduce((sum, s) => sum + s.breaksTaken, 0);

  productivity.thisWeek = {
    ...productivity.thisWeek,
    focusTime: Math.floor(weekFocusSeconds / 60),
    breaks: weekBreaks,
  };

  // Recalculate productivity score (simple calculation based on goals)
  const config = getUserConfig(userId);
  const goals = config?.productivityGoals;
  if (goals) {
    const focusProgress = Math.min(
      100,
      (productivity.today.focusTime / goals.dailyFocusGoal) * 100
    );
    const breaksProgress = Math.min(
      100,
      (goals.dailyBreaksGoal / (productivity.today.breaks || 1)) * 100
    );
    const tasksProgress =
      productivity.today.tasksTotal > 0
        ? (productivity.today.tasksCompleted / productivity.today.tasksTotal) *
          100
        : 0;

    // Weighted average: 50% focus, 30% tasks, 20% breaks
    productivity.today.productivityScore = Math.round(
      focusProgress * 0.5 + tasksProgress * 0.3 + breaksProgress * 0.2
    );
    productivity.thisWeek.productivityScore = Math.round(
      (productivity.today.productivityScore +
        productivity.thisWeek.productivityScore) /
        2
    );
  }

  updateUserDataSection(userId, 'productivity', productivity);
}
