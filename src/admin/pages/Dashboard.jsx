import React, { useEffect, useMemo, useState } from "react";
import { ShoppingCart, IndianRupee, Users, Clock, Loader2, ConciergeBell, Utensils, ChefHat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { customerAdminService, dashboardService, feedbackService, orderService, waiterCallService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { useAdminNotificationCenter } from "../context/AdminNotificationCenterContext";
import { StatsCard } from "../components/layout/StatsCard";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import { buildAdminPath } from "../../common/utils/routes";
const defaultDashboard = {
  stats: {
    todayOrders: 0,
    todayRevenue: 0,
    activeTables: 0,
    activeSessions: 0,
    avgPreparationTime: 0
  },
  recentActivity: []
};
const defaultOrderStats = {
  totalOrders: 0,
  pendingOrders: 0,
  preparingOrders: 0,
  todayOrders: 0,
  todayRevenue: 0,
  popularItems: []
};
const defaultCustomerAnalytics = {
  totalSessions: 0,
  activeSessions: 0,
  completedSessions: 0,
  revenue: 0
};
const defaultFeedbackDashboard = {
  nps: {
    score: 0
  },
  trendingTopics: [],
  recentFeedback: []
};
const defaultWaiterDashboard = {
  statistics: {}
};
const chartPalette = ["#f97316", "#0f766e", "#2563eb", "#7c3aed", "#dc2626"];
const DASHBOARD_BOOTSTRAP_TTL = 15000;
let dashboardBootstrapCache = null;
let dashboardBootstrapTimestamp = 0;
let dashboardBootstrapPromise = null;
const formatCurrency = value => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(Number(value || 0));
const formatRelativeTime = timestamp => {
  if (!timestamp) {
    return "Just now";
  }
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds || 1}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${Math.floor(diffHours / 24)}d ago`;
};
const getReadableActivityMessage = activity => {
  const message = activity?.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (message && typeof message === "object") {
    if (typeof message.callId === "string") {
      return `Waiter call ${message.callId} received`;
    }
    if (typeof message.orderNumber === "string" || typeof message.orderNumber === "number") {
      return `Order #${message.orderNumber} received`;
    }
  }
  if (activity?.type === "waiter") {
    return "New waiter call received";
  }
  if (activity?.type === "order") {
    return "New order received";
  }
  return "New activity";
};
const getCountValue = value => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    return 1;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeWaiterDashboard = (payload = {}) => {
  const statistics = payload?.statistics && typeof payload.statistics === "object" ? payload.statistics : {};
  return {
    ...payload,
    statistics: {
      ...statistics,
      pendingCalls: getCountValue(statistics?.pendingCalls ?? payload?.pendingCalls),
      activeCalls: getCountValue(statistics?.activeCalls ?? payload?.activeCalls),
      totalCalls: getCountValue(statistics?.totalCalls)
    },
    pendingCalls: getCountValue(payload?.pendingCalls),
    activeCalls: getCountValue(payload?.activeCalls)
  };
};
const getDashboardBootstrapData = async () => {
  const now = Date.now();
  if (dashboardBootstrapCache && now - dashboardBootstrapTimestamp < DASHBOARD_BOOTSTRAP_TTL) {
    return dashboardBootstrapCache;
  }
  if (!dashboardBootstrapPromise) {
    dashboardBootstrapPromise = Promise.all([dashboardService.getOverview(), orderService.getOrderStatistics(), customerAdminService.getAnalytics("today"), feedbackService.getDashboard(), waiterCallService.getDashboard()]).then(([overviewResponse, orderStatsResponse, customerAnalyticsResponse, feedbackDashboardResponse, waiterDashboardResponse]) => {
      dashboardBootstrapCache = {
        overviewResponse,
        orderStatsResponse,
        customerAnalyticsResponse,
        feedbackDashboardResponse,
        waiterDashboardResponse
      };
      dashboardBootstrapTimestamp = Date.now();
      return dashboardBootstrapCache;
    }).finally(() => {
      dashboardBootstrapPromise = null;
    });
  }
  return dashboardBootstrapPromise;
};
export function Dashboard() {
  const navigate = useNavigate();
  const {
    addNotification
  } = useAdmin();
  const {
    activityVersion
  } = useAdminNotificationCenter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [orderStats, setOrderStats] = useState(defaultOrderStats);
  const [customerAnalytics, setCustomerAnalytics] = useState(defaultCustomerAnalytics);
  const [feedbackDashboard, setFeedbackDashboard] = useState(defaultFeedbackDashboard);
  const [waiterDashboard, setWaiterDashboard] = useState(defaultWaiterDashboard);
  useEffect(() => {
    let mounted = true;
    const loadDashboard = async (silent = false) => {
      try {
        if (!silent && mounted) {
          setLoading(true);
        }
        const {
          overviewResponse,
          orderStatsResponse,
          customerAnalyticsResponse,
          feedbackDashboardResponse,
          waiterDashboardResponse
        } = silent ? await Promise.all([dashboardService.getOverview(), orderService.getOrderStatistics(), customerAdminService.getAnalytics("today"), feedbackService.getDashboard(), waiterCallService.getDashboard()]).then(([overviewResponse, orderStatsResponse, customerAnalyticsResponse, feedbackDashboardResponse, waiterDashboardResponse]) => ({
          overviewResponse,
          orderStatsResponse,
          customerAnalyticsResponse,
          feedbackDashboardResponse,
          waiterDashboardResponse
        })) : await getDashboardBootstrapData();
        if (!mounted) {
          return;
        }
        setDashboard({
          stats: {
            ...defaultDashboard.stats,
            ...(overviewResponse?.data?.stats || {})
          },
          recentActivity: overviewResponse?.data?.recentActivity || []
        });
        setOrderStats({
          ...defaultOrderStats,
          ...(orderStatsResponse?.data || {})
        });
        setCustomerAnalytics({
          ...defaultCustomerAnalytics,
          ...(customerAnalyticsResponse?.data || {})
        });
        setFeedbackDashboard({
          ...defaultFeedbackDashboard,
          ...(feedbackDashboardResponse?.data || {})
        });
        setWaiterDashboard({
          ...defaultWaiterDashboard,
          ...normalizeWaiterDashboard(waiterDashboardResponse?.data || {})
        });
      } catch {
        if (!silent) {
          addNotification("Failed to load dashboard data", "error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadDashboard();
    const intervalId = setInterval(() => {
      loadDashboard(true);
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [addNotification]);
  useEffect(() => {
    let mounted = true;
    const refreshLiveData = async () => {
      if (!activityVersion) {
        return;
      }
      try {
        const [overviewResponse, orderStatsResponse, waiterDashboardResponse] = await Promise.all([dashboardService.getOverview(), orderService.getOrderStatistics(), waiterCallService.getDashboard()]);
        if (!mounted) {
          return;
        }
        setDashboard({
          stats: {
            ...defaultDashboard.stats,
            ...(overviewResponse?.data?.stats || {})
          },
          recentActivity: overviewResponse?.data?.recentActivity || []
        });
        setOrderStats({
          ...defaultOrderStats,
          ...(orderStatsResponse?.data || {})
        });
        setWaiterDashboard({
          ...defaultWaiterDashboard,
          ...normalizeWaiterDashboard(waiterDashboardResponse?.data || {})
        });
      } catch {
        return;
      }
    };
    refreshLiveData();
    return () => {
      mounted = false;
    };
  }, [activityVersion]);
  const stats = dashboard?.stats || defaultDashboard.stats;
  const recentActivity = dashboard?.recentActivity || [];
  const orderBreakdownData = useMemo(() => [{
    name: "Pending",
    value: orderStats?.pendingOrders || 0
  }, {
    name: "Preparing",
    value: orderStats?.preparingOrders || 0
  }, {
    name: "Today",
    value: orderStats?.todayOrders || 0
  }], [orderStats]);
  const popularItemsData = useMemo(() => {
    const items = orderStats?.popularItems || [];
    if (items.length) {
      return items.slice(0, 5).map(item => ({
        name: item?.name || "Unknown",
        orders: item?.totalQuantity || 0
      }));
    }
    return [{
      name: "No data",
      orders: 0
    }, {
      name: "No data",
      orders: 0
    }, {
      name: "No data",
      orders: 0
    }];
  }, [orderStats]);
  const operationsPieData = useMemo(() => [{
    name: "Active Tables",
    value: stats?.activeTables || 0
  }, {
    name: "Active Sessions",
    value: customerAnalytics?.activeSessions || 0
  }, {
    name: "Pending Calls",
    value: waiterDashboard?.statistics?.pendingCalls || waiterDashboard?.pendingCalls || 0
  }], [customerAnalytics?.activeSessions, stats?.activeTables, waiterDashboard]);
  const performanceCards = [{
    title: "Today Orders",
    value: stats?.todayOrders ?? 0,
    icon: ShoppingCart,
    trend: `${orderStats?.pendingOrders || 0} pending`,
    trendPositive: true
  }, {
    title: "Today Revenue",
    value: formatCurrency(stats?.todayRevenue),
    icon: IndianRupee,
    trend: `${customerAnalytics?.completedSessions || 0} completed sessions`,
    trendPositive: true
  }, {
    title: "Active Tables",
    value: stats?.activeTables ?? 0,
    icon: Users,
    trend: `${stats?.activeSessions ?? 0} live sessions`,
    trendPositive: true
  }, {
    title: "Avg Prep Time",
    value: `${stats?.avgPreparationTime ?? 0}m`,
    icon: Clock,
    trend: `${Math.round(feedbackDashboard?.nps?.score || 0)} NPS`,
    trendPositive: true
  }];
  if (loading) {
    return <AdminPageSkeleton stats={4} filters={0} cards={4} cardHeight="h-72" headerActions={0} columns="xl:grid-cols-2" />;
  }
  return <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {performanceCards.map(card => <StatsCard key={card.title} {...card} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Order Flow</h2>
              <p className="text-sm text-gray-500">
                Live status snapshot from backend order metrics
              </p>
            </div>
            <ChefHat className="h-5 w-5 text-primary-600" />
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
              <BarChart data={orderBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Popular Items</h2>
              <p className="text-sm text-gray-500">
                Top ordered menu items from live order history
              </p>
            </div>
            <Utensils className="h-5 w-5 text-primary-600" />
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
              <BarChart data={popularItemsData} layout="vertical" margin={{
              left: 20
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
                <Tooltip />
                <Bar dataKey="orders" radius={[0, 10, 10, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-sm text-gray-500">
                Orders and guest assistance events arriving in real time
              </p>
            </div>
            <ConciergeBell className="h-5 w-5 text-primary-600" />
          </div>

          <div className="space-y-4">
            {recentActivity.length ? recentActivity.map(activity => {
            const isWaiter = activity?.type === "waiter";
            return <div key={activity?.id || `${activity?.type}-${activity?.timestamp}`} className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isWaiter ? "bg-orange-100 text-orange-600" : "bg-primary-100 text-primary-600"}`}>
                      {isWaiter ? <ConciergeBell className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getReadableActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(activity?.timestamp)}
                      </p>
                    </div>
                  </div>;
          }) : <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No recent activity yet.
              </div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Operations Mix</h2>
              <p className="text-sm text-gray-500">
                Snapshot of tables, sessions, and pending waiter workload
              </p>
            </div>
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
                <PieChart>
                  <Pie data={operationsPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
                    {operationsPieData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={chartPalette[index % chartPalette.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {operationsPieData.map((entry, index) => <div key={entry.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{
                  backgroundColor: chartPalette[index % chartPalette.length]
                }} />
                    <span className="text-sm text-gray-700">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                </div>)}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button type="button" onClick={() => navigate(buildAdminPath("/orders"))} className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-left transition-colors hover:bg-primary-100">
                <ShoppingCart className="mb-3 h-6 w-6 text-primary-600" />
                <p className="text-sm font-medium text-primary-700">View Orders</p>
              </button>
              <button type="button" onClick={() => navigate(buildAdminPath("/kitchen/dashboard"))} className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left transition-colors hover:bg-orange-100">
                <ChefHat className="mb-3 h-6 w-6 text-orange-600" />
                <p className="text-sm font-medium text-orange-700">Kitchen Board</p>
              </button>
              <button type="button" onClick={() => navigate(buildAdminPath("/tables/list"))} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100">
                <Users className="mb-3 h-6 w-6 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Table Status</p>
              </button>
              <button type="button" onClick={() => navigate(buildAdminPath("/customers/waiter-calls"))} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition-colors hover:bg-emerald-100">
                <ConciergeBell className="mb-3 h-6 w-6 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">Waiter Calls</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
