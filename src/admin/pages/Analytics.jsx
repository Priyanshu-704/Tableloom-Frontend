import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  IndianRupee,
  Loader2,
  PieChart,
  ShoppingCart,
  TrendingUp,
  Users
} from "lucide-react";
import {
  customerAdminService,
  dashboardService,
  feedbackService,
  kitchenService,
  menuService,
  orderService,
  reportService,
  waiterCallService
} from "../../common/services";
import tableService from "../../common/services/TableService";
import { useAdmin } from "../context/AdminContext";
import { AdminModal } from "../components/common/AdminModal";
import { AdminPageSkeleton } from "../components/common/AdminSkeleton";
import { useSettings } from "../../common/context/SettingsContext";

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

const getDownloadFilename = (headers = {}, fallback = "report.pdf") => {
  const contentDisposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return simpleMatch?.[1] || fallback;
};

const escapeHtml = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

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

const buildCustomDateFilters = ({ startDate, endDate }) => ({
  startDate,
  endDate
});

const buildRangeLabel = (startDate, endDate) => {
  if (!startDate && !endDate) {
    return "Live snapshot";
  }
  return `${startDate || "Beginning"} to ${endDate || "Today"}`;
};

const buildReportRows = (report = {}, currency = "INR", dateLabel = "") => {
  const summaryRows = [{
    section: "Summary",
    metric: "Report period",
    value: dateLabel
  }, {
    section: "Summary",
    metric: "Revenue",
    value: formatCurrency(report?.orders?.todayRevenue || report?.sessions?.revenue || 0, currency)
  }, {
    section: "Summary",
    metric: "Orders",
    value: Number(report?.orders?.todayOrders || 0).toLocaleString()
  }, {
    section: "Summary",
    metric: "Pending orders",
    value: Number(report?.orders?.pendingOrders || 0).toLocaleString()
  }, {
    section: "Summary",
    metric: "Active sessions",
    value: Number(report?.sessions?.activeSessions || 0).toLocaleString()
  }, {
    section: "Summary",
    metric: "Completed sessions",
    value: Number(report?.sessions?.completedSessions || 0).toLocaleString()
  }, {
    section: "Summary",
    metric: "Average session time",
    value: formatMinutes(report?.sessions?.averageSessionTime || 0)
  }, {
    section: "Summary",
    metric: "NPS",
    value: Math.round(report?.feedback?.nps?.nps || 0)
  }, {
    section: "Summary",
    metric: "Kitchen prep time",
    value: formatMinutes(report?.kitchen?.overallStats?.avgPreparationTime || 0)
  }, {
    section: "Summary",
    metric: "Waiter calls",
    value: Number(report?.waiterCalls?.totalCalls || 0).toLocaleString()
  }];

  const orderStatusRows = Object.entries(report?.orders?.statusCounts || {}).map(([status, count]) => ({
    section: "Order status",
    metric: status,
    value: count
  }));

  const salesRows = (report?.orders?.popularItems || []).map(item => ({
    section: "Popular items",
    metric: `${item?.name || "Menu item"}${item?.size ? ` (${item.size})` : ""}`,
    value: `${item?.totalQuantity || 0} items | ${formatCurrency(item?.totalRevenue || 0, currency)}`
  }));

  const serviceRows = [{
    section: "Service",
    metric: "Pending waiter calls",
    value: Number(report?.waiterCalls?.pendingCalls || 0).toLocaleString()
  }, {
    section: "Service",
    metric: "Active waiter calls",
    value: Number(report?.waiterCalls?.activeCalls || 0).toLocaleString()
  }, {
    section: "Service",
    metric: "Avg response time",
    value: formatMinutes(report?.waiterCalls?.avgResponseTime || 0)
  }, {
    section: "Service",
    metric: "Avg resolution time",
    value: formatMinutes(report?.waiterCalls?.avgResolutionTime || 0)
  }];

  return [...summaryRows, ...orderStatusRows, ...salesRows, ...serviceRows];
};

const buildStatusTableRows = rows => {
  if (!rows.length) {
    return "<tr><td colspan=\"3\">No status data available</td></tr>";
  }

  return rows.map(row => `
    <tr>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.count)}</td>
      <td>${escapeHtml(formatMinutes(row.avgResponseTime || row.avgResolutionTime || 0))}</td>
    </tr>
  `).join("");
};

const buildPopularItemsChart = (items = [], currency = "INR") => {
  if (!items.length) {
    return "<p class=\"muted\">No popular items found for the selected period.</p>";
  }

  const maxQuantity = Math.max(...items.map(item => Number(item?.totalQuantity || 0)), 1);
  return items.map(item => {
    const width = Math.max(12, Math.round(Number(item?.totalQuantity || 0) / maxQuantity * 100));
    return `
      <div class="chart-row">
        <div class="chart-label">${escapeHtml(item?.name || "Menu item")}${item?.size ? ` <span class="muted">(${escapeHtml(item.size)})</span>` : ""}</div>
        <div class="chart-bar-track">
          <div class="chart-bar" style="width:${width}%"></div>
        </div>
        <div class="chart-value">${escapeHtml(item?.totalQuantity || 0)} | ${escapeHtml(formatCurrency(item?.totalRevenue || 0, currency))}</div>
      </div>
    `;
  }).join("");
};

const openPdfReport = ({
  report,
  currency,
  dateLabel
}) => {
  if (typeof window === "undefined") {
    return false;
  }

  const popularItems = buildPopularItemsChart(report?.orders?.popularItems || [], currency);
  const waiterStatusRows = buildStatusTableRows(report?.waiterCalls?.byStatus || []);
  const orderStatusRows = Object.entries(report?.orders?.statusCounts || {}).map(([status, count]) => `
    <tr>
      <td>${escapeHtml(status)}</td>
      <td>${escapeHtml(count)}</td>
    </tr>
  `).join("") || "<tr><td colspan=\"2\">No order status data available</td></tr>";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1, h2, h3 { margin: 0; }
          .header { margin-bottom: 24px; padding: 24px; border: 1px solid #d1d5db; border-radius: 18px; background: linear-gradient(135deg, #eff6ff, #ffffff); }
          .subtitle { margin-top: 8px; color: #4b5563; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; background: #f8fafc; }
          .metric { font-size: 24px; font-weight: 700; margin-top: 8px; }
          .muted { color: #6b7280; font-size: 12px; }
          .section { margin-top: 26px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 13px; }
          th { background: #f3f4f6; font-weight: 700; }
          .chart-row { display: grid; grid-template-columns: 220px 1fr 170px; gap: 12px; align-items: center; margin-top: 12px; }
          .chart-label { font-size: 13px; }
          .chart-bar-track { height: 12px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
          .chart-bar { height: 100%; background: linear-gradient(90deg, #0f766e, #14b8a6); border-radius: 999px; }
          .chart-value { text-align: right; font-size: 12px; color: #374151; }
          @media print { body { margin: 16px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Analytics & Finance Report</h1>
          <p class="subtitle">Report period: ${escapeHtml(dateLabel)}</p>
          <p class="subtitle">Generated on: ${escapeHtml(new Date().toLocaleString())}</p>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Revenue</h3>
            <div class="metric">${escapeHtml(formatCurrency(report?.orders?.todayRevenue || report?.sessions?.revenue || 0, currency))}</div>
            <div class="muted">Paid revenue for the selected range</div>
          </div>
          <div class="card">
            <h3>Orders</h3>
            <div class="metric">${escapeHtml(report?.orders?.todayOrders || 0)}</div>
            <div class="muted">Orders placed in the selected range</div>
          </div>
          <div class="card">
            <h3>Sessions</h3>
            <div class="metric">${escapeHtml(report?.sessions?.completedSessions || 0)}</div>
            <div class="muted">Completed customer sessions</div>
          </div>
          <div class="card">
            <h3>NPS</h3>
            <div class="metric">${escapeHtml(Math.round(report?.feedback?.nps?.nps || 0))}</div>
            <div class="muted">Customer recommendation score</div>
          </div>
        </div>

        <div class="section">
          <h2>Popular Items</h2>
          ${popularItems}
        </div>

        <div class="section">
          <h2>Order Status Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              ${orderStatusRows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Operations Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Average session time</td><td>${escapeHtml(formatMinutes(report?.sessions?.averageSessionTime || 0))}</td></tr>
              <tr><td>Average kitchen preparation time</td><td>${escapeHtml(formatMinutes(report?.kitchen?.overallStats?.avgPreparationTime || 0))}</td></tr>
              <tr><td>Average total kitchen time</td><td>${escapeHtml(formatMinutes(report?.kitchen?.overallStats?.avgTotalTime || 0))}</td></tr>
              <tr><td>Occupancy rate</td><td>${escapeHtml(`${Number(report?.tables?.occupancyRate || 0).toFixed(1)}%`)}</td></tr>
              <tr><td>Waiter calls</td><td>${escapeHtml(report?.waiterCalls?.totalCalls || 0)}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Waiter Call Status</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Average Time</th>
              </tr>
            </thead>
            <tbody>
              ${waiterStatusRows}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};

export function Analytics() {
  const { settings } = useSettings();
  const currency = settings?.taxSettings?.currency || "INR";
  const { addNotification } = useAdmin();
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
    waiterCalls: {}
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

        const [
          dashboard,
          orders,
          sessions,
          kitchen,
          menu,
          tables,
          feedback,
          waiterCalls
        ] = await Promise.all([
          dashboardService.getOverview(),
          orderService.getOrderStatistics(orderFilters),
          customerAdminService.getAnalytics(sessionFilters),
          kitchenService.getAnalytics(kitchenFilters),
          menuService.getMenuStatistics(),
          tableService.getTableStats(),
          feedbackService.getDashboard(),
          waiterCallService.getDashboard()
        ]);

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

  const reportDateLabel = useMemo(() => buildRangeLabel(reportForm.startDate, reportForm.endDate), [reportForm.endDate, reportForm.startDate]);

  const applyCurrentFinancialYear = () => {
    setReportForm(current => ({
      ...current,
      ...getCurrentFinancialYearRange()
    }));
  };

  const handleGenerateReport = async () => {
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
        reportTitle: reportForm.title.trim() || getDefaultReportTitle(reportForm.reportType),
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
      link.download = getDownloadFilename(response?.headers, `${reportForm.reportType}-report.${reportForm.format === "excel" ? "xls" : "pdf"}`);
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
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600">
              Live performance data from orders, sessions, kitchen, tables, and feedback.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <select value={timeRange} onChange={event => setTimeRange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto">
              <option value="today">Today</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Backend Generated Reports</p>
              <p className="mt-1 text-sm text-gray-500">
                Download polished PDF or Excel reports with restaurant details, summary cards, tables, and charts. Current range: {reportDateLabel}.
              </p>
            </div>
            <button type="button" onClick={() => setShowReportDialog(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
              <Download className="h-4 w-4" />
              Generate Report
            </button>
          </div>
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
            id: "menu",
            label: "Menu",
            icon: PieChart
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

      <AdminModal isOpen={showReportDialog} title={reportForm.reportType === "finance" ? "Generate Finance Report" : "Generate Analytics Report"} subtitle="Choose the report type, period, and format. One backend request will generate and download the file for you." onClose={() => {
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
            <span className="text-sm font-medium text-gray-700">Report Type</span>
            <select value={reportForm.reportType} onChange={event => setReportForm(current => {
            const nextType = event.target.value;
            const currentDefaultTitle = getDefaultReportTitle(current.reportType);
            return {
              ...current,
              reportType: nextType,
              title: !current.title.trim() || current.title === currentDefaultTitle ? getDefaultReportTitle(nextType) : current.title
            };
          })} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="analytics">Analytics Report</option>
              <option value="finance">Finance Report</option>
            </select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Report Title</span>
            <input type="text" value={reportForm.title} onChange={event => setReportForm(current => ({
            ...current,
            title: event.target.value
          }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Analytics Report" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Start Date</span>
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
            <span className="text-sm font-medium text-gray-700">Download Format</span>
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
      </AdminModal>
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
