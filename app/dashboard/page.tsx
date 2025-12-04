'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '@/components/stat-card';
import { ChartCard } from '@/components/chart-card';
import { MetricRow } from '@/components/metric-row';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { EmptyState } from '@/components/empty-state';
import {
  Cloud,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Activity,
  Clock,
  CreditCard,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Play,
  Pause,
  Coffee,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  fetchSection,
  fetchFocusSession,
  fetchBlockedSites,
  fetchProductivity,
  startFocusSession,
  endFocusSession as endFocusSessionAPI,
  takeBreak,
  resumeFocus,
  type SectionStatus,
} from '@/lib/dashboard-api';

const COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981'];

export default function DashboardPage() {
  const router = useRouter();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [cryptoData, setCryptoData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [cryptoStatus, setCryptoStatus] = useState<SectionStatus>('loading');
  const [weatherStatus, setWeatherStatus] = useState<SectionStatus>('loading');
  const [productivityStatus, setProductivityStatus] =
    useState<SectionStatus>('loading');
  const [financialStatus, setFinancialStatus] =
    useState<SectionStatus>('loading');
  const [focusSession, setFocusSession] = useState<any>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [blockedSitesCount, setBlockedSitesCount] = useState(0);
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [showBlockedSitesList, setShowBlockedSitesList] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // Fetch all sections
    async function loadSections() {
      const cryptoResult = await fetchSection('/api/crypto', controller.signal);
      // Only redirect on 401 unauthorized errors
      if (cryptoResult.isUnauthorized) {
        router.push('/login');
        return;
      }
      setCryptoStatus(cryptoResult.status);
      setCryptoData(cryptoResult.data);

      const financialResult = await fetchSection(
        '/api/financial',
        controller.signal
      );
      setFinancialStatus(financialResult.status);
      setFinancialData(financialResult.data);

      const weatherResult = await fetchSection(
        '/api/weather',
        controller.signal
      );
      setWeatherStatus(weatherResult.status);
      setWeatherData(weatherResult.data);

      const productivityResult = await fetchSection(
        '/api/productivity',
        controller.signal
      );
      setProductivityStatus(productivityResult.status);
      setProductivityData(productivityResult.data);
    }

    // Fetch focus session
    async function loadFocusSession() {
      const result = await fetchFocusSession();
      setFocusSession(result.session);
    }

    // Fetch blocked sites
    async function loadBlockedSites() {
      const result = await fetchBlockedSites();
      setBlockedSites(result.blockedSites);
      setBlockedSitesCount(result.blockedSitesCount);
    }

    loadSections();
    loadFocusSession();
    loadBlockedSites();

    return () => {
      controller.abort();
    };
  }, [router]);

  const cryptoPieData =
    cryptoData?.coins.map((coin: any) => ({
      name: coin.symbol,
      value: coin.value,
    })) || [];

  const financialSpendingData =
    financialData?.spendingByCategory?.map((cat: any) => ({
      name: cat.category || 'Uncategorized',
      value: cat.amount,
    })) || [];

  const financialMonthlyData =
    financialData?.monthlyTrends?.map((trend: any) => ({
      month: trend.month,
      income: trend.income,
      expenses: trend.expenses,
    })) || [];

  const onboardingLink = '/onboarding';
  const loadingCard = (
    <div className='glass-card h-full flex items-center justify-center text-muted-foreground animate-pulse'>
      Loading...
    </div>
  );

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // State for client-side timer updates (only for UI display, no API calls)
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second only for UI display (no API calls)
  useEffect(() => {
    if (
      focusSession?.status === 'active' ||
      focusSession?.status === 'on_break'
    ) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [focusSession?.status]);

  // Calculate real-time focus time client-side
  const calculateCurrentFocusTime = (session: any): number => {
    if (!session) return 0;

    if (session.status === 'active') {
      const startTime = new Date(session.startedAt).getTime();
      const now = currentTime;
      const totalElapsed = Math.floor((now - startTime) / 1000);
      const breakTime = session.totalBreakSeconds || 0;
      return Math.max(0, totalElapsed - breakTime);
    } else if (session.status === 'on_break') {
      // During break, return the stored focus time
      return session.totalFocusSeconds || 0;
    }

    return session.totalFocusSeconds || 0;
  };

  // Calculate remaining break time client-side
  const calculateRemainingBreakTime = (session: any): number => {
    if (!session || session.status !== 'on_break' || !session.breakEndsAt) {
      return 0;
    }
    const breakEnd = new Date(session.breakEndsAt).getTime();
    return Math.max(0, Math.floor((breakEnd - currentTime) / 1000));
  };

  const handleStartFocus = async () => {
    setFocusLoading(true);
    try {
      const result = await startFocusSession();
      setFocusSession(result.session);
      // Refresh productivity data to update Today's Focus section
      const prodData = await fetchProductivity();
      if (prodData) {
        setProductivityData(prodData);
      }
    } catch (error) {
      console.error('Error starting focus:', error);
      alert('Failed to start focus mode');
    } finally {
      setFocusLoading(false);
    }
  };

  const handleConfigureFocus = () => {
    router.push('/settings?focus=1');
  };

  const handleEndFocus = async () => {
    setFocusLoading(true);
    try {
      await endFocusSessionAPI();
      setFocusSession(null);
      // Refresh productivity data to update Today's Focus section
      const prodData = await fetchProductivity();
      if (prodData) {
        setProductivityData(prodData);
      }
    } catch (error) {
      console.error('Error ending focus:', error);
      alert('Failed to end focus mode');
    } finally {
      setFocusLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!breakDuration || breakDuration <= 0) {
      alert('Please enter a valid break duration');
      return;
    }
    setFocusLoading(true);
    try {
      const result = await takeBreak(breakDuration);
      setFocusSession(result.session);
      setShowBreakDialog(false);
      // Refresh productivity data to update Today's Focus section
      const prodData = await fetchProductivity();
      if (prodData) {
        setProductivityData(prodData);
      }
    } catch (error) {
      console.error('Error taking break:', error);
      alert('Failed to start break');
    } finally {
      setFocusLoading(false);
    }
  };

  const handleResumeFocus = async () => {
    setFocusLoading(true);
    try {
      const result = await resumeFocus();
      setFocusSession(result.session);
      // Refresh productivity data to update Today's Focus section
      const prodData = await fetchProductivity();
      if (prodData) {
        setProductivityData(prodData);
      }
    } catch (error) {
      console.error('Error resuming focus:', error);
      alert('Failed to resume focus');
    } finally {
      setFocusLoading(false);
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
            <h1 className='text-4xl font-bold mb-2'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Your personal analytics at a glance
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {financialStatus === 'ready' ? (
              <StatCard
                title='Total Balance'
                value={formatCurrency(financialData?.totalBalance || 0)}
                change={financialData?.netChange}
                icon={DollarSign}
                gradient='from-green-500/20 to-emerald-500/20'
                delay={0.1}
              />
            ) : financialStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={CreditCard}
                title='Link your accounts'
                description='Connect your bank accounts to track your finances.'
                actionLabel='Set up accounts'
                href={`${onboardingLink}?step=financial`}
              />
            )}
            {cryptoStatus === 'ready' ? (
              <StatCard
                title='Crypto Portfolio'
                value={formatCurrency(cryptoData?.totalValue || 0)}
                change={cryptoData?.change24h}
                icon={TrendingUp}
                gradient='from-purple-500/20 to-pink-500/20'
                delay={0.15}
              />
            ) : cryptoStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={DollarSign}
                title='Connect your portfolio'
                description='Add your holdings to unlock real-time analytics.'
                actionLabel='Set up crypto'
                href={`${onboardingLink}?step=crypto`}
              />
            )}
            {weatherStatus === 'ready' ? (
              <StatCard
                title='Temperature'
                value={`${weatherData?.temperature ?? '--'}°`}
                icon={Cloud}
                gradient='from-blue-500/20 to-cyan-500/20'
                delay={0.2}
              />
            ) : weatherStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={Cloud}
                title='Add a location'
                description='Provide a city so we can pull local conditions.'
                actionLabel='Set up weather'
                href={`${onboardingLink}?step=weather`}
              />
            )}
            {productivityStatus === 'ready' ? (
              <StatCard
                title='Tasks Completed'
                value={`${productivityData?.today.tasksCompleted || 0}/${
                  productivityData?.today.tasksTotal || 0
                }`}
                icon={CheckCircle2}
                gradient='from-purple-500/20 to-pink-500/20'
                delay={0.3}
              />
            ) : productivityStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title='Track your work'
                description='Log your daily productivity metrics to generate insights.'
                actionLabel='Set up productivity'
                href={`${onboardingLink}?step=productivity`}
              />
            )}
            {productivityStatus === 'ready' ? (
              <StatCard
                title='Productivity Score'
                value={`${productivityData?.today.productivityScore || 0}%`}
                icon={Activity}
                gradient='from-orange-500/20 to-red-500/20'
                delay={0.4}
              />
            ) : productivityStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={Activity}
                title='Score unavailable'
                description='Enter productivity data to see your score.'
                actionLabel='Complete setup'
                href={onboardingLink}
              />
            )}
          </div>

          {/* Focus Mode Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className='mb-8'
          >
            <div className='glass-card border-0 p-6'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center'>
                    <Lock className='w-6 h-6 text-purple-500' />
                  </div>
                  <div>
                    <h3 className='text-xl font-semibold'>Focus Mode</h3>
                    <p className='text-sm text-muted-foreground'>
                      {focusSession?.status === 'active'
                        ? `Blocking ${blockedSitesCount} sites`
                        : focusSession?.status === 'on_break'
                        ? 'On break'
                        : 'Lock in and block distractions'}
                    </p>
                  </div>
                </div>
              </div>

              {!focusSession ? (
                <div className='space-y-4'>
                  <div className='text-center py-8'>
                    <p className='text-muted-foreground mb-4'>
                      Ready to focus? Start a session to block distracting
                      websites.
                    </p>
                    <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                      <Button
                        onClick={handleStartFocus}
                        disabled={focusLoading}
                        size='lg'
                        className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      >
                        <Play className='w-5 h-5 mr-2' />
                        Start Focus Mode
                      </Button>
                      <Button
                        onClick={handleConfigureFocus}
                        variant='outline'
                        size='lg'
                      >
                        Configure Focus Mode
                      </Button>
                    </div>
                  </div>
                </div>
              ) : focusSession.status === 'active' ? (
                <div className='space-y-4'>
                  <div
                    className={`${
                      showBlockedSitesList
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                        : ''
                    }`}
                  >
                    <div className='text-center py-4'>
                      <div className='text-4xl font-bold mb-2 text-purple-500'>
                        {formatTime(calculateCurrentFocusTime(focusSession))}
                      </div>
                      <p className='text-sm text-muted-foreground mb-4'>
                        Focus time
                      </p>
                      <div className='flex gap-2 justify-center'>
                        <Button
                          onClick={() => setShowBreakDialog(true)}
                          variant='outline'
                          size='lg'
                        >
                          <Coffee className='w-4 h-4 mr-2' />
                          Take Break
                        </Button>
                        <Button
                          onClick={handleEndFocus}
                          variant='outline'
                          size='lg'
                          disabled={focusLoading}
                        >
                          <Pause className='w-4 h-4 mr-2' />
                          End Session
                        </Button>
                      </div>
                    </div>
                    {showBlockedSitesList && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className='py-4'
                      >
                        <div className='flex items-center justify-between mb-3'>
                          <h4 className='text-sm font-semibold'>
                            Blocked Sites
                          </h4>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setShowBlockedSitesList(false)}
                            className='h-6 w-6 p-0'
                          >
                            <X className='w-4 h-4' />
                          </Button>
                        </div>
                        {blockedSites.length === 0 ? (
                          <p className='text-sm text-muted-foreground text-center py-4'>
                            No sites blocked
                          </p>
                        ) : (
                          <div className='space-y-2 max-h-64 overflow-y-auto'>
                            {blockedSites.map((site, index) => (
                              <div
                                key={index}
                                className='flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm'
                              >
                                <span className='truncate'>{site}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  {showBreakDialog && (
                    <div className='mt-4 p-4 border rounded-lg bg-muted/50'>
                      <Label className='text-sm mb-2 block'>
                        Break Duration (minutes)
                      </Label>
                      <div className='flex gap-2'>
                        <input
                          type='number'
                          min='1'
                          max='60'
                          value={breakDuration}
                          onChange={(e) =>
                            setBreakDuration(parseInt(e.target.value) || 5)
                          }
                          className='flex-1 px-3 py-2 border rounded-lg bg-background'
                        />
                        <Button
                          onClick={handleTakeBreak}
                          disabled={focusLoading}
                        >
                          Start Break
                        </Button>
                        <Button
                          variant='outline'
                          onClick={() => setShowBreakDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : focusSession.status === 'on_break' ? (
                <div className='space-y-4'>
                  <div className='text-center py-4'>
                    <div className='text-4xl font-bold mb-2 text-orange-500'>
                      {formatTime(calculateRemainingBreakTime(focusSession))}
                    </div>
                    <p className='text-sm text-muted-foreground mb-4'>
                      Break time remaining
                    </p>
                    <Button
                      onClick={handleResumeFocus}
                      size='lg'
                      className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      disabled={focusLoading}
                    >
                      <Play className='w-5 h-5 mr-2' />
                      Resume Focus
                    </Button>
                  </div>
                </div>
              ) : null}

              {focusSession &&
                (() => {
                  // Calculate real-time total focus time
                  let realTimeTotalFocus =
                    calculateCurrentFocusTime(focusSession);
                  return (
                    <div className='mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center'>
                      <div>
                        <div className='text-2xl font-semibold'>
                          {focusSession.breaksTaken || 0}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Breaks Taken
                        </div>
                      </div>
                      <div>
                        <div className='text-2xl font-semibold'>
                          {formatTime(realTimeTotalFocus)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Total Focus
                        </div>
                      </div>
                      <div
                        className='cursor-pointer hover:opacity-80 transition-opacity'
                        onClick={() => {
                          if (
                            focusSession?.status === 'active' &&
                            blockedSitesCount > 0
                          ) {
                            setShowBlockedSitesList(!showBlockedSitesList);
                          }
                        }}
                        title={
                          focusSession?.status === 'active' &&
                          blockedSitesCount > 0
                            ? 'Click to view blocked sites'
                            : ''
                        }
                      >
                        <div className='text-2xl font-semibold'>
                          {blockedSitesCount}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Sites Blocked
                          {focusSession?.status === 'active' &&
                            blockedSitesCount > 0 && (
                              <span className='ml-1 text-purple-500'>•</span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </motion.div>

          {/* Charts Row */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            {financialStatus === 'ready' &&
            financialData?.balanceHistory?.length > 0 ? (
              <ChartCard
                title='Balance Trend'
                description='30-day balance history'
                delay={0.5}
              >
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={financialData.balanceHistory}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      className='opacity-30'
                    />
                    <XAxis
                      dataKey='date'
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                      className='text-xs'
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      className='text-xs'
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line
                      type='monotone'
                      dataKey='balance'
                      stroke='#10b981'
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : null}
            {financialStatus === 'ready' && financialSpendingData.length > 0 ? (
              <ChartCard
                title='Spending by Category'
                description='Expense breakdown'
                delay={0.6}
              >
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={financialSpendingData}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill='#8884d8'
                      dataKey='value'
                    >
                      {financialSpendingData.map(
                        (entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : financialStatus === 'ready' &&
              financialMonthlyData.length > 0 ? (
              <ChartCard
                title='Income vs Expenses'
                description='Monthly comparison'
                delay={0.6}
              >
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={financialMonthlyData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      className='opacity-30'
                    />
                    <XAxis dataKey='month' className='text-xs' />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      className='text-xs'
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey='income' fill='#10b981' />
                    <Bar dataKey='expenses' fill='#ef4444' />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : null}
            {cryptoStatus === 'ready' ? (
              <>
                <ChartCard
                  title='Crypto Portfolio History'
                  description='30-day portfolio value trend'
                  delay={0.5}
                >
                  <ResponsiveContainer width='100%' height={300}>
                    <AreaChart data={cryptoData?.history || []}>
                      <defs>
                        <linearGradient
                          id='colorValue'
                          x1='0'
                          y1='0'
                          x2='0'
                          y2='1'
                        >
                          <stop
                            offset='5%'
                            stopColor='#a855f7'
                            stopOpacity={0.3}
                          />
                          <stop
                            offset='95%'
                            stopColor='#a855f7'
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray='3 3'
                        className='opacity-30'
                      />
                      <XAxis
                        dataKey='date'
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        }
                        className='text-xs'
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${(value / 1000).toFixed(0)}k`
                        }
                        className='text-xs'
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area
                        type='monotone'
                        dataKey='value'
                        stroke='#a855f7'
                        fillOpacity={1}
                        fill='url(#colorValue)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title='Portfolio Distribution'
                  description='Current asset allocation'
                  delay={0.6}
                >
                  <ResponsiveContainer width='100%' height={300}>
                    <PieChart>
                      <Pie
                        data={cryptoPieData}
                        cx='50%'
                        cy='50%'
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill='#8884d8'
                        dataKey='value'
                      >
                        {cryptoPieData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            ) : cryptoStatus === 'loading' ? (
              <div className='lg:col-span-2'>{loadingCard}</div>
            ) : (
              <div className='lg:col-span-2'>
                <EmptyState
                  icon={DollarSign}
                  title='Connect a data source'
                  description='Link your exchange account or enter holdings to unlock portfolio analytics.'
                  actionLabel='Go to onboarding'
                  href={onboardingLink}
                  className='h-full'
                />
              </div>
            )}
          </div>

          {/* Productivity Chart */}
          {productivityStatus === 'ready' ? (
            <ChartCard
              title='Weekly Productivity'
              description='Tasks completed and focus hours'
              delay={0.7}
              className='mb-8'
            >
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={productivityData?.weeklyStats || []}>
                  <CartesianGrid strokeDasharray='3 3' className='opacity-30' />
                  <XAxis dataKey='day' className='text-xs' />
                  <YAxis className='text-xs' />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey='tasks' fill='#a855f7' radius={[8, 8, 0, 0]} />
                  <Bar dataKey='hours' fill='#ec4899' radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : productivityStatus === 'loading' ? (
            loadingCard
          ) : (
            <EmptyState
              icon={Activity}
              title='Productivity data missing'
              description='Connect a task tracker or enter your daily stats.'
              actionLabel='Add productivity data'
              href={`${onboardingLink}?step=productivity`}
            />
          )}

          {/* Metrics Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {cryptoStatus === 'ready' ? (
              <div className='glass-card'>
                <h3 className='text-xl font-semibold mb-4'>Crypto Holdings</h3>
                <div className='space-y-2'>
                  {cryptoData?.coins.map((coin: any, index: number) => (
                    <MetricRow
                      key={coin.symbol}
                      label={`${coin.name} (${coin.symbol})`}
                      value={`${formatCurrency(coin.value)} (${formatPercentage(
                        coin.change24h
                      )})`}
                      trend={coin.change24h >= 0 ? 'up' : 'down'}
                      delay={0.8 + index * 0.1}
                    />
                  ))}
                </div>
              </div>
            ) : cryptoStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={DollarSign}
                title='No holdings yet'
                description='Add at least one asset to see holdings here.'
                actionLabel='Add holdings'
                href={`${onboardingLink}?step=crypto`}
              />
            )}

            {productivityStatus === 'ready' ? (
              <div className='glass-card'>
                <h3 className='text-xl font-semibold mb-4'>
                  Today&apos;s Focus
                </h3>
                <div className='space-y-2'>
                  <MetricRow
                    label='Focus Time'
                    value={`${Math.floor(
                      (productivityData?.today.focusTime || 0) / 60
                    )}h ${(productivityData?.today.focusTime || 0) % 60}m`}
                    icon={Clock}
                    delay={0.8}
                  />
                  <MetricRow
                    label='Tasks Completed'
                    value={`${productivityData?.today.tasksCompleted || 0} / ${
                      productivityData?.today.tasksTotal || 0
                    }`}
                    icon={CheckCircle2}
                    delay={0.9}
                  />
                  <MetricRow
                    label='Breaks Taken'
                    value={`${productivityData?.today.breaks || 0}`}
                    icon={Activity}
                    delay={1.0}
                  />
                  <MetricRow
                    label='Productivity Score'
                    value={`${productivityData?.today.productivityScore || 0}%`}
                    icon={TrendingUp}
                    trend='up'
                    delay={1.1}
                  />
                </div>
              </div>
            ) : productivityStatus === 'loading' ? (
              loadingCard
            ) : (
              <EmptyState
                icon={TrendingUp}
                title='Productivity insights pending'
                description='Complete setup to see focus and task metrics.'
                actionLabel='Complete setup'
                href={onboardingLink}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
