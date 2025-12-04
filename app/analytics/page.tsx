"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Activity, CreditCard, TrendingUp, TrendingDown } from "lucide-react";

const COLORS = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];

type SectionStatus = "loading" | "ready" | "empty" | "error";

export default function AnalyticsPage() {
  const router = useRouter();
  const [cryptoData, setCryptoData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [cryptoStatus, setCryptoStatus] = useState<SectionStatus>("loading");
  const [productivityStatus, setProductivityStatus] =
    useState<SectionStatus>("loading");
  const [financialStatus, setFinancialStatus] =
    useState<SectionStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSection(
      path: string,
      setData: (value: any) => void,
      setStatus: (value: SectionStatus) => void
    ) {
      try {
        const res = await fetch(path, { signal: controller.signal });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          setStatus("error");
          setData(null);
          return;
        }

        const payload = await res.json();
        if (payload?.needsSetup) {
          setStatus("empty");
          setData(null);
        } else {
          setStatus("ready");
          setData(payload?.data ?? payload);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Analytics fetch error:", error);
          setStatus("error");
          setData(null);
        }
      }
    }

    fetchSection("/api/crypto", setCryptoData, setCryptoStatus);
    fetchSection("/api/financial", setFinancialData, setFinancialStatus);
    fetchSection("/api/productivity", setProductivityData, setProductivityStatus);

    return () => controller.abort();
  }, [router]);

  const loadingCard = (
    <div className="glass-card h-full flex items-center justify-center text-muted-foreground animate-pulse">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <MobileNav />
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Deep dive into your data trends
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6">
            {financialStatus === "ready" ? (
              <>
                <ChartCard
                  title="Financial Overview"
                  description="Balance trends and spending analysis"
                  delay={0.1}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium mb-4">Balance History</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={financialData?.balanceHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                            className="text-xs"
                          />
                          <YAxis
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            className="text-xs"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {financialData?.spendingByCategory?.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-medium mb-4">Spending by Category</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={financialData.spendingByCategory}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="amount"
                            >
                              {financialData.spendingByCategory.map((entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => formatCurrency(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null}
                  </div>
                </ChartCard>

                {financialData?.monthlyTrends?.length > 0 && (
                  <ChartCard
                    title="Income vs Expenses"
                    description="Monthly comparison over time"
                    delay={0.15}
                  >
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={financialData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" />
                        <YAxis
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#10b981" name="Income" />
                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </>
            ) : financialStatus === "loading" ? (
              loadingCard
            ) : financialStatus === "empty" ? (
              <EmptyState
                icon={CreditCard}
                title="No financial data"
                description="Link your accounts to see detailed financial analytics."
                actionLabel="Set up accounts"
                href="/onboarding?step=financial"
              />
            ) : null}

            {cryptoStatus === "ready" ? (
              <ChartCard
                title="Portfolio Performance"
                description="30-day value trend"
                delay={0.1}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={cryptoData?.history || []}>
                    <defs>
                      <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#a855f7"
                      fillOpacity={1}
                      fill="url(#colorPortfolio)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : cryptoStatus === "loading" ? (
              loadingCard
            ) : (
              <EmptyState
                icon={DollarSign}
                title="No portfolio data"
                description="Add holdings to unlock deep-dive analytics."
                actionLabel="Set up crypto"
                href="/onboarding?step=crypto"
              />
            )}

            {productivityStatus === "ready" ? (
              <ChartCard
                title="Focus Sessions"
                description="Daily focus time and task completion"
                delay={0.2}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={productivityData?.focusSessions || []}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="#a855f7"
                      strokeWidth={2}
                      name="Duration (min)"
                    />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      stroke="#ec4899"
                      strokeWidth={2}
                      name="Tasks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : productivityStatus === "loading" ? (
              loadingCard
            ) : (
              <EmptyState
                icon={Activity}
                title="No focus data yet"
                description="Enter productivity details to visualize trends."
                actionLabel="Set up productivity"
                href="/onboarding?step=productivity"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

