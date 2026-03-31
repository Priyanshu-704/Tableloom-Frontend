import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Clock, IndianRupee, Download, Loader2, PieChart, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { customerAdminService, dashboardService, feedbackService, kitchenService, menuService, orderService, waiterCallService } from "../../common/services";
import tableService from "../../common/services/TableService";
import { useAdmin } from "../context/AdminContext";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
const buildCsv = (rows = []) => {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const values = rows.map(row => headers.map(header => {
    const value = row?.[header] ?? "";
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  }).join(","));
  return [headers.join(","), ...values].join("\n");
};
const downloadCsv = (filename, rows) => {
  const content = buildCsv(rows);
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
const formatCurrency = value => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(Number(value) || 0);
const formatMinutes = secondsOrMinutes => {
  const value = Number(secondsOrMinutes) || 0;
  const minutes = value > 60 ? value / 60 : value;
  return `${Math.round(minutes)} min`;
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
export function Analytics() {
  const {
    addNotification
  } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30days");
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState({
    dashboard: {},
    orders: {},
    sessions: {},
    kitchen: {},
    menu: {},
    tables: {},
    feedback: {},
    waiterCalls: {}
  });
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [dashboard, orders, sessions, kitchen, menu, tables, feedback, waiterCalls] = await Promise.all([dashboardService.getOverview(), orderService.getOrderStatistics(), customerAdminService.getAnalytics(timeRange === "today" ? "today" : "month"), kitchenService.getAnalytics(), menuService.getMenuStatistics(), tableService.getTableStats(), feedbackService.getDashboard(), waiterCallService.getDashboard()]);
        setAnalytics({
          dashboard: dashboard?.data || {},
          orders: orders?.data || {},
          sessions: sessions?.data || {},
          kitchen: kitchen?.data || {},
          menu: menu?.data || {},
          tables: tables?.data || {},
          feedback: feedback?.data || {},
          waiterCalls: normalizeWaiterDashboard(waiterCalls?.data || {})
        });
      } catch {
        addNotification("Failed to load analytics reports", "error");
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [addNotification, timeRange]);
  const overviewCards = useMemo(() => {
    const dashboardStats = analytics?.dashboard?.stats || {};
    const orderStats = analytics?.orders || {};
    const sessionStats = analytics?.sessions || {};
    const feedbackStats = analytics?.feedback?.statistics || {};
    return [{
      title: "Revenue",
      value: formatCurrency(orderStats?.todayRevenue || dashboardStats?.todayRevenue || sessionStats?.revenue),
      subtitle: "Live paid revenue",
      icon: IndianRupee,
      color: "text-green-600 bg-green-50"
    }, {
      title: "Orders",
      value: Number(orderStats?.todayOrders || dashboardStats?.todayOrders || 0).toLocaleString(),
      subtitle: "Orders placed today",
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50"
    }, {
      title: "Active Sessions",
      value: Number(sessionStats?.activeSessions || dashboardStats?.activeSessions || 0).toLocaleString(),
      subtitle: "Customers dining now",
      icon: Users,
      color: "text-orange-600 bg-orange-50"
    }, {
      title: "NPS",
      value: `${Math.round(analytics?.feedback?.nps?.score || 0)}`,
      subtitle: feedbackStats?.totalFeedback ? `${feedbackStats.totalFeedback} feedback records` : "Customer satisfaction score",
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50"
    }];
  }, [analytics]);
  const salesRows = useMemo(() => {
    const popularItems = analytics?.orders?.popularItems || [];
    return popularItems.map(item => ({
      item: `${item?.name || "Menu item"}${item?.size ? ` (${item.size})` : ""}`,
      quantity: item?.totalQuantity || 0,
      revenue: formatCurrency(item?.totalRevenue || 0)
    }));
  }, [analytics]);
  const operationsRows = useMemo(() => {
    const overallKitchen = analytics?.kitchen?.overallStats || {};
    const tableStats = analytics?.tables || {};
    const waiterStats = analytics?.waiterCalls || {};
    const waiterStatistics = waiterStats?.statistics || {};
    return [{
      metric: "Average preparation time",
      value: formatMinutes(overallKitchen?.avgPreparationTime)
    }, {
      metric: "Average total kitchen time",
      value: formatMinutes(overallKitchen?.avgTotalTime)
    }, {
      metric: "Occupancy rate",
      value: `${Number(tableStats?.occupancyRate || 0).toFixed(1)}%`
    }, {
      metric: "Pending waiter calls",
      value: Number(waiterStatistics?.pendingCalls ?? waiterStats?.pendingCalls ?? 0).toLocaleString()
    }];
  }, [analytics]);
  const exportReport = () => {
    const rows = [{
      revenue: analytics?.orders?.todayRevenue || 0,
      todayOrders: analytics?.orders?.todayOrders || 0,
      pendingOrders: analytics?.orders?.pendingOrders || 0,
      preparingOrders: analytics?.orders?.preparingOrders || 0,
      activeSessions: analytics?.sessions?.activeSessions || 0,
      totalSessions: analytics?.sessions?.totalSessions || 0,
      occupancyRate: analytics?.tables?.occupancyRate || 0,
      avgPreparationTime: analytics?.kitchen?.overallStats?.avgPreparationTime || 0,
      nps: analytics?.feedback?.nps?.score || 0
    }, ...salesRows];
    downloadCsv(`analytics-report-${Date.now()}.csv`, rows);
    addNotification("Analytics report exported successfully", "success");
  };
  if (loading) {
    return <AdminPageSkeleton stats={4} filters={2} cards={4} cardHeight="h-72" columns="md:grid-cols-2" />;
  }
  return <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">
            Live performance data from orders, sessions, kitchen, tables, and feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select value={timeRange} onChange={event => setTimeRange(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="today">Today</option>
            <option value="30days">Last 30 Days</option>
          </select>
          <button type="button" onClick={exportReport} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map(card => {
        const Icon = card.icon;
        const iconElement = React.createElement(Icon, {
          className: "h-6 w-6"
        });
        return <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="mt-2 text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`rounded-2xl p-3 ${card.color}`}>{iconElement}</div>
              </div>
            </div>;
      })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex flex-wrap gap-8">
            {[{
            id: "overview",
            label: "Overview",
            icon: BarChart3
          }, {
            id: "sales",
            label: "Sales",
            icon: IndianRupee
          }, {
            id: "menu",
            label: "Menu",
            icon: PieChart
          }, {
            id: "operations",
            label: "Operations",
            icon: Clock
          }].map(tab => {
            const Icon = tab.icon;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>;
          })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Sessions" icon={Users} items={[["Total sessions", analytics?.sessions?.totalSessions || 0], ["Active sessions", analytics?.sessions?.activeSessions || 0], ["Completed sessions", analytics?.sessions?.completedSessions || 0], ["Average session time", formatMinutes(analytics?.sessions?.averageSessionTime || 0)]]} />
              <MetricCard title="Tables & Feedback" icon={Calendar} items={[["Available tables", analytics?.tables?.available || 0], ["Occupied tables", analytics?.tables?.occupied || 0], ["Occupancy rate", `${Number(analytics?.tables?.occupancyRate || 0).toFixed(1)}%`], ["NPS score", Math.round(analytics?.feedback?.nps?.score || 0)]]} />
            </div> : null}

          {activeTab === "sales" ? <div className="space-y-6">
              <MetricCard title="Order Snapshot" icon={ShoppingCart} items={[["Total orders", analytics?.orders?.totalOrders || 0], ["Pending orders", analytics?.orders?.pendingOrders || 0], ["Preparing orders", analytics?.orders?.preparingOrders || 0], ["Today's revenue", formatCurrency(analytics?.orders?.todayRevenue || 0)]]} />
              <DataTable title="Popular Items" columns={["Item", "Quantity", "Revenue"]} rows={salesRows.map(row => [row.item, row.quantity, row.revenue])} />
            </div> : null}

          {activeTab === "menu" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Menu Inventory" icon={PieChart} items={[["Total items", analytics?.menu?.totalItems || 0], ["Available items", analytics?.menu?.availableItems || 0], ["Unavailable items", analytics?.menu?.unavailableItems || 0], ["Categories", analytics?.menu?.categoriesCount || 0]]} />
              <MetricCard title="Dietary Distribution" icon={TrendingUp} items={[["Vegetarian", analytics?.menu?.dietary?.vegetarian || 0], ["Non vegetarian", analytics?.menu?.dietary?.nonVegetarian || 0], ["Vegan", analytics?.menu?.dietary?.vegan || 0], ["Gluten free", analytics?.menu?.dietary?.glutenFree || 0]]} />
            </div> : null}

          {activeTab === "operations" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Kitchen & Tables" icon={Clock} items={operationsRows.map(row => [row.metric, row.value])} />
              <MetricCard title="Service & Feedback" icon={BarChart3} items={[["Recent feedback", analytics?.feedback?.recentFeedback?.length || 0], ["Trending topics", analytics?.feedback?.trendingTopics?.length || 0], ["Pending waiter calls", analytics?.waiterCalls?.pendingCalls || 0], ["Average response time", formatMinutes(analytics?.waiterCalls?.avgResponseTime || 0)]]} />
            </div> : null}
        </div>
      </div>
    </div>;
}
function MetricCard({
  title,
  icon: Icon,
  items = []
}) {
  const iconElement = React.createElement(Icon, {
    className: "mr-2 h-5 w-5 text-primary-600"
  });
  return <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
        {iconElement}
        {title}
      </h3>
      <div className="space-y-3">
        {items.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="font-semibold text-gray-900">{value}</span>
          </div>)}
      </div>
    </div>;
}
function DataTable({
  title,
  columns = [],
  rows = []
}) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map(column => <th key={column} className="py-3 text-left text-sm font-medium text-gray-600">
                  {column}
                </th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`} className="border-b border-gray-100 last:border-b-0">
                  {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`} className="py-3 text-sm text-gray-900">
                      {cell}
                    </td>)}
                </tr>) : <tr>
                <td colSpan={columns.length || 1} className="py-8 text-center text-sm text-gray-500">
                  No report data available
                </td>
              </tr>}
          </tbody>
        </table>
      </div>
    </div>;
}
