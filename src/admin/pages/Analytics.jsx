import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Clock, Download, IndianRupee, Loader2, PieChart as PieChartIcon, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import { customerAdminService, dashboardService, feedbackService, kitchenService, menuService, orderService, reportService, waiterCallService } from "../../common/services";
import tableService from "../../common/services/TableService";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import { useSettings } from "../../common/context/SettingsContext";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
const formatCurrency = (value, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 2
}).format(Number(value) || 0);
const formatMinutes = secondsOrMinutes => {
  const value = Number(secondsOrMinutes) || 0;
  const minutes = value > 60 ? value / 60 : value;
  return `${Math.round(minutes)} min`;
};
const formatDateInputValue = value => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
};
const getCurrentFinancialYearRange = (baseDate = new Date()) => {
  const today = new Date(baseDate);
  const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    startDate: `${year}-04-01`,
    endDate: formatDateInputValue(today)
  };
};
const getDefaultReportTitle = reportType => reportType === "finance" ? "Finance Report" : "Analytics Report";
const analyticsChartPalette = ["#0f766e", "#2563eb", "#f97316", "#dc2626", "#7c3aed", "#0891b2"];
const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeReportTitle = (title, reportType) => {
  const fallbackTitle = getDefaultReportTitle(reportType);
  const normalizedTitle = String(title || "").trim().replace(/\s+/g, " ");
  if (!normalizedTitle) {
    return fallbackTitle;
  }
  const duplicateSuffixPattern = new RegExp(`^${escapeRegExp(fallbackTitle)}\\s+[0-9\\u00B9\\u00B2\\u00B3\\u2070-\\u2079]+$`, "i");
  return duplicateSuffixPattern.test(normalizedTitle) ? fallbackTitle : normalizedTitle;
};
const getDownloadFilename = (headers = {}, fallback = "report.pdf") => {
  const contentDisposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return simpleMatch?.[1] || fallback;
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
const buildPeriodFilters = timeRange => {
  if (timeRange === "today") {
    return {
      orderFilters: {},
      sessionFilters: "today",
      kitchenFilters: {}
    };
  }
  return {
    orderFilters: {},
    sessionFilters: "month",
    kitchenFilters: {}
  };
};
const buildRangeLabel = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return "Live snapshot";
  }
  return `${startDate || "Beginning"} to ${endDate || "Today"}`;
};
const getTimeRangeDateRange = (timeRange, baseDate = new Date()) => {
  const startDate = new Date(baseDate);
  const endDate = new Date(baseDate);
  endDate.setHours(23, 59, 59, 999);
  if (timeRange === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  }
  return {
    startDate: formatDateInputValue(startDate),
    endDate: formatDateInputValue(endDate)
  };
};
export function Analytics() {
  const isMonitoringMode = useMonitoringMode();
  const {
    settings
  } = useSettings();
  const currency = settings?.taxSettings?.currency || "INR";
  const {
    addNotification
  } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30days");
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportForm, setReportForm] = useState(() => ({
    reportType: "analytics",
    title: getDefaultReportTitle("analytics"),
    format: "pdf",
    ...getCurrentFinancialYearRange()
  }));
  const [analytics, setAnalytics] = useState({
    dashboard: {},
    orders: {},
    sessions: {},
    kitchen: {},
    menu: {},
    tables: {},
    feedback: {},
    waiterCalls: {},
    finance: {
      summary: {},
      paymentMethods: [],
      orderTypes: []
    }
  });
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const {
          orderFilters,
          sessionFilters,
          kitchenFilters
        } = buildPeriodFilters(timeRange);
        const financeDateRange = getTimeRangeDateRange(timeRange);
        const [dashboard, orders, sessions, kitchen, menu, tables, feedback, waiterCalls, finance] = await Promise.all([dashboardService.getOverview(), orderService.getOrderStatistics(orderFilters), customerAdminService.getAnalytics(sessionFilters), kitchenService.getAnalytics(kitchenFilters), menuService.getMenuStatistics(), tableService.getTableStats(), feedbackService.getDashboard(), waiterCallService.getDashboard(), reportService.getReportDataset({
          reportType: "finance",
          startDate: financeDateRange.startDate,
          endDate: financeDateRange.endDate
        })]);
        setAnalytics({
          dashboard: dashboard?.data || {},
          orders: orders?.data || {},
          sessions: sessions?.data || {},
          kitchen: kitchen?.data || {},
          menu: menu?.data || {},
          tables: tables?.data || {},
          feedback: feedback?.data || {},
          waiterCalls: normalizeWaiterDashboard(waiterCalls?.data || {}),
          finance: finance?.data || {
            summary: {},
            paymentMethods: [],
            orderTypes: []
          }
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
      value: formatCurrency(orderStats?.todayRevenue || dashboardStats?.todayRevenue || sessionStats?.revenue, currency),
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
  }, [analytics, currency]);
  const salesRows = useMemo(() => {
    const popularItems = analytics?.orders?.popularItems || [];
    return popularItems.map(item => ({
      item: `${item?.name || "Menu item"}${item?.size ? ` (${item.size})` : ""}`,
      quantity: item?.totalQuantity || 0,
      revenue: formatCurrency(item?.totalRevenue || 0, currency)
    }));
  }, [analytics, currency]);
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
  const financePaymentMethodData = useMemo(() => (analytics?.finance?.paymentMethods || []).map((row, index) => ({
    name: row?.method ? String(row.method).replace(/_/g, " ") : "Unknown",
    value: Number(row?.revenue || 0),
    orders: Number(row?.orders || 0),
    color: analyticsChartPalette[index % analyticsChartPalette.length]
  })).filter(row => row.value > 0), [analytics?.finance?.paymentMethods]);
  const financeOrderTypeData = useMemo(() => (analytics?.finance?.orderTypes || []).map((row, index) => ({
    name: row?.orderType ? String(row.orderType).replace(/_/g, " ") : "Unknown",
    value: Number(row?.revenue || 0),
    orders: Number(row?.orders || 0),
    color: analyticsChartPalette[index % analyticsChartPalette.length]
  })).filter(row => row.value > 0), [analytics?.finance?.orderTypes]);
  const financeBreakdownRows = useMemo(() => [["Subtotal", formatCurrency(analytics?.finance?.summary?.subtotal || 0, currency)], ["Tax Collected", formatCurrency(analytics?.finance?.summary?.taxAmount || 0, currency)], ["Service Charge", formatCurrency(analytics?.finance?.summary?.serviceCharge || 0, currency)], ["Discounts", formatCurrency(analytics?.finance?.summary?.discountAmount || 0, currency)], ["Session Revenue", formatCurrency(analytics?.finance?.summary?.totalSessionRevenue || 0, currency)], ["Avg Session Revenue", formatCurrency(analytics?.finance?.summary?.averageSessionRevenue || 0, currency)]], [analytics?.finance?.summary, currency]);
  const reportDateLabel = useMemo(() => buildRangeLabel(reportForm.startDate, reportForm.endDate), [reportForm.endDate, reportForm.startDate]);
  const applyCurrentFinancialYear = () => {
    setReportForm(current => ({
      ...current,
      ...getCurrentFinancialYearRange()
    }));
  };
  const handleGenerateReport = async () => {
    if (isMonitoringMode) {
      addNotification("Report generation is disabled in monitoring mode.", "error");
      return;
    }
    if (!reportForm.startDate || !reportForm.endDate) {
      addNotification("Select both start date and end date to export the report", "error");
      return;
    }
    if (new Date(reportForm.startDate) > new Date(reportForm.endDate)) {
      addNotification("Start date cannot be after end date", "error");
      return;
    }
    try {
      setExporting(true);
      const response = await reportService.generateAnalyticsReport({
        reportType: reportForm.reportType,
        format: reportForm.format,
        reportTitle: normalizeReportTitle(reportForm.title, reportForm.reportType),
        restaurantName: settings?.restaurant?.name || "Restaurant",
        dateRange: {
          startDate: reportForm.startDate,
          endDate: reportForm.endDate
        },
        dateRangeLabel: reportDateLabel,
        currency,
        download: true
      }, {
        responseType: "blob"
      });
      const blob = response?.data;
      if (!blob) {
        throw new Error("Report generation failed");
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(response?.headers, `${reportForm.reportType}-report.${reportForm.format === "excel" ? "xlsx" : "pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowReportDialog(false);
      addNotification(`${reportForm.reportType === "finance" ? "Finance" : "Analytics"} report generated successfully`, "success");
    } catch (error) {
      addNotification(error?.message || "Failed to export analytics report", "error");
    } finally {
      setExporting(false);
    }
  };
  if (loading) {
    return <AdminPageSkeleton stats={4} filters={2} cards={4} cardHeight="h-72" columns="md:grid-cols-2" />;
  }
  return <div className="space-y-6 p-4 sm:p-6">
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics & Reports
            </h1>
            <p className="text-gray-600">
              Live performance data from orders, sessions, kitchen, tables, and
              feedback.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <select value={timeRange} onChange={event => setTimeRange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm sm:w-auto">
              <option value="today">Today</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
          {!isMonitoringMode ? <div>
            <button type="button" onClick={() => setShowReportDialog(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
              <Download className="h-4 w-4" />
              Generate Report
            </button>
          </div> : null}
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
                  <p className="text-sm font-medium text-gray-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`rounded-2xl p-3 ${card.color}`}>
                  {iconElement}
                </div>
              </div>
            </div>;
      })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 sm:px-6">
          <nav className="grid grid-cols-2 gap-2 py-3 sm:flex sm:flex-wrap sm:gap-8 sm:py-0">
            {[{
            id: "overview",
            label: "Overview",
            icon: BarChart3
          }, {
            id: "sales",
            label: "Sales",
            icon: IndianRupee
          }, {
            id: "finance",
            label: "Finance",
            icon: PieChartIcon
          }, {
            id: "menu",
            label: "Menu",
            icon: PieChartIcon
          }, {
            id: "operations",
            label: "Operations",
            icon: Clock
          }].map(tab => {
            const Icon = tab.icon;
            return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors sm:justify-start sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:px-1 sm:py-4 ${activeTab === tab.id ? "border-primary-500 bg-primary-50 text-primary-600 sm:bg-transparent" : "border-gray-200 text-gray-500 hover:text-gray-700 sm:border-transparent"}`}>
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>;
          })}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "overview" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Sessions" icon={Users} items={[["Total sessions", analytics?.sessions?.totalSessions || 0], ["Active sessions", analytics?.sessions?.activeSessions || 0], ["Completed sessions", analytics?.sessions?.completedSessions || 0], ["Average session time", formatMinutes(analytics?.sessions?.averageSessionTime || 0)]]} />
              <MetricCard title="Tables & Feedback" icon={Calendar} items={[["Available tables", analytics?.tables?.available || 0], ["Occupied tables", analytics?.tables?.occupied || 0], ["Occupancy rate", `${Number(analytics?.tables?.occupancyRate || 0).toFixed(1)}%`], ["NPS score", Math.round(analytics?.feedback?.nps?.score || 0)]]} />
            </div> : null}

          {activeTab === "sales" ? <div className="space-y-6">
              <MetricCard title="Order Snapshot" icon={ShoppingCart} items={[["Total orders", analytics?.orders?.totalOrders || 0], ["Pending orders", analytics?.orders?.pendingOrders || 0], ["Preparing orders", analytics?.orders?.preparingOrders || 0], ["Today's revenue", formatCurrency(analytics?.orders?.todayRevenue || 0, currency)]]} />
              <DataTable title="Popular Items" columns={["Item", "Quantity", "Revenue"]} rows={salesRows.map(row => [row.item, row.quantity, row.revenue])} />
            </div> : null}

          {activeTab === "finance" ? <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MetricCard title="Finance Snapshot" icon={IndianRupee} items={[["Total revenue", formatCurrency(analytics?.finance?.summary?.totalRevenue || 0, currency)], ["Paid orders", Number(analytics?.finance?.summary?.totalPaidOrders || 0).toLocaleString()], ["Average order value", formatCurrency(analytics?.finance?.summary?.averageOrderValue || 0, currency)], ["Completed sessions", Number(analytics?.finance?.summary?.completedSessions || 0).toLocaleString()]]} />
                <MetricCard title="Revenue Breakdown" icon={TrendingUp} items={financeBreakdownRows} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DistributionChartCard title="Payment Method Mix" subtitle="Revenue split by payment method instead of a very long day-by-day series." data={financePaymentMethodData} currency={currency} />
                <DistributionChartCard title="Order Type Mix" subtitle="Revenue split by dine-in, takeaway, and delivery." data={financeOrderTypeData} currency={currency} />
              </div>
            </div> : null}

          {activeTab === "menu" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Menu Inventory" icon={PieChartIcon} items={[["Total items", analytics?.menu?.totalItems || 0], ["Available items", analytics?.menu?.availableItems || 0], ["Unavailable items", analytics?.menu?.unavailableItems || 0], ["Categories", analytics?.menu?.categoriesCount || 0]]} />
              <MetricCard title="Dietary Distribution" icon={TrendingUp} items={[["Vegetarian", analytics?.menu?.dietary?.vegetarian || 0], ["Non vegetarian", analytics?.menu?.dietary?.nonVegetarian || 0], ["Vegan", analytics?.menu?.dietary?.vegan || 0], ["Gluten free", analytics?.menu?.dietary?.glutenFree || 0]]} />
            </div> : null}

          {activeTab === "operations" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MetricCard title="Kitchen & Tables" icon={Clock} items={operationsRows.map(row => [row.metric, row.value])} />
              <MetricCard title="Service & Feedback" icon={BarChart3} items={[["Recent feedback", analytics?.feedback?.recentFeedback?.length || 0], ["Trending topics", analytics?.feedback?.trendingTopics?.length || 0], ["Pending waiter calls", analytics?.waiterCalls?.pendingCalls || 0], ["Average response time", formatMinutes(analytics?.waiterCalls?.avgResponseTime || 0)]]} />
            </div> : null}
        </div>
      </div>

      {!isMonitoringMode ? <AdminModal isOpen={showReportDialog} title={reportForm.reportType === "finance" ? "Generate Finance Report" : "Generate Analytics Report"} subtitle="Choose the report type, period, and format. One backend request will generate and download the file for you." onClose={() => {
      if (!exporting) {
        setShowReportDialog(false);
      }
    }} maxWidth="max-w-2xl" footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowReportDialog(false)} disabled={exporting} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 sm:w-auto">
              Cancel
            </button>
            <button type="button" onClick={handleGenerateReport} disabled={exporting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Generating..." : "Generate & Download"}
            </button>
          </div>}>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Report Type
            </span>
            <select value={reportForm.reportType} onChange={event => setReportForm(current => {
            const nextType = event.target.value;
            const currentDefaultTitle = getDefaultReportTitle(current.reportType);
            return {
              ...current,
              reportType: nextType,
              title: !current.title.trim() || current.title === currentDefaultTitle ? getDefaultReportTitle(nextType) : normalizeReportTitle(current.title, current.reportType)
            };
          })} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="analytics">Analytics Report</option>
              <option value="finance">Finance Report</option>
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              Report Title
            </span>
            <input type="text" value={reportForm.title} onChange={event => setReportForm(current => ({
            ...current,
            title: normalizeReportTitle(event.target.value, current.reportType)
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Analytics Report" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Start Date
            </span>
            <input type="date" value={reportForm.startDate} onChange={event => setReportForm(current => ({
            ...current,
            startDate: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">End Date</span>
            <input type="date" value={reportForm.endDate} onChange={event => setReportForm(current => ({
            ...current,
            endDate: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Download Format
            </span>
            <select value={reportForm.format} onChange={event => setReportForm(current => ({
            ...current,
            format: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={applyCurrentFinancialYear} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Use Current FY
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
            {reportForm.reportType === "finance" ? "Finance report will include only income and revenue related cards, charts, and tables for the selected range." : "Analytics report will include restaurant name, generation date, summary cards, charts, and operational tables for the selected range."}
          </div>
        </div>
      </AdminModal> : null}
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
  return <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
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
function DistributionChartCard({
  title,
  subtitle,
  data = [],
  currency = "INR"
}) {
  const total = data.reduce((sum, item) => sum + Number(item?.value || 0), 0);
  return <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      {data.length ? <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={96} paddingAngle={3}>
                  {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={value => formatCurrency(value, currency)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.map(entry => {
          const percentage = total > 0 ? Math.round(entry.value / total * 100) : 0;
          return <div key={`${title}-${entry.name}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{
                backgroundColor: entry.color
              }} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {entry.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.orders} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(entry.value, currency)}
                    </p>
                    <p className="text-xs text-slate-500">{percentage}%</p>
                  </div>
                </div>;
        })}
          </div>
        </> : <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
          No finance distribution data available for this range.
        </div>}
    </div>;
}
function DataTable({
  title,
  columns = [],
  rows = []
}) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>

      <div className="space-y-3 md:hidden">
        {rows.length ? rows.map((row, rowIndex) => <div key={`${title}-mobile-${rowIndex}`} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <div className="space-y-2">
                {columns.map((column, cellIndex) => <div key={`${title}-mobile-${rowIndex}-${cellIndex}`} className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {column}
                    </span>
                    <span className="break-words text-sm text-slate-900">
                      {row[cellIndex] ?? "-"}
                    </span>
                  </div>)}
              </div>
            </div>) : <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            No report data available
          </div>}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
