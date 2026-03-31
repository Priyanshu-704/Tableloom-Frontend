import { logger } from "../../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarRange, IndianRupee, RefreshCw, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { menuService } from "../../../common/services";
const PERIOD_OPTIONS = [{
  value: "7d",
  label: "Last 7 days"
}, {
  value: "30d",
  label: "Last 30 days"
}, {
  value: "90d",
  label: "Last 90 days"
}, {
  value: "1y",
  label: "Last year"
}, {
  value: "all",
  label: "All time"
}];
const CHANGE_TYPE_OPTIONS = [{
  value: "all",
  label: "All changes"
}, {
  value: "increase",
  label: "Price increases"
}, {
  value: "decrease",
  label: "Price decreases"
}];
const CHANGE_COLORS = ["#2563eb", "#16a34a", "#dc2626"];
const buildDateRange = period => {
  if (period === "all") {
    return {};
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  if (period === "7d") {
    startDate.setDate(endDate.getDate() - 7);
  } else if (period === "30d") {
    startDate.setDate(endDate.getDate() - 30);
  } else if (period === "90d") {
    startDate.setDate(endDate.getDate() - 90);
  } else if (period === "1y") {
    startDate.setFullYear(endDate.getFullYear() - 1);
  }
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};
const formatDate = (value, options = {}) => new Date(value).toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  ...options
});
const formatPercent = (value = 0) => `${Number(value || 0).toFixed(1)}%`;
const formatSignedCurrency = (value = 0) => {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${menuService.formatPrice(Math.abs(amount))}`;
};
export function PriceHistory() {
  const [priceChanges, setPriceChanges] = useState([]);
  const [period, setPeriod] = useState("30d");
  const [changeType, setChangeType] = useState("all");
  const [loading, setLoading] = useState(false);
  const loadPriceChanges = useCallback(async () => {
    setLoading(true);
    try {
      const response = await menuService.getAllPriceChanges({
        ...buildDateRange(period),
        changeType: changeType === "all" ? undefined : changeType,
        page: 1,
        limit: 250
      });
      setPriceChanges(response?.data || []);
    } catch (error) {
      logger.error("Failed to load price changes:", error);
      setPriceChanges([]);
    } finally {
      setLoading(false);
    }
  }, [changeType, period]);
  useEffect(() => {
    loadPriceChanges();
  }, [loadPriceChanges]);
  const stats = useMemo(() => {
    const totalChanges = priceChanges.length;
    const increases = priceChanges.filter(item => item.changeType === "increase");
    const decreases = priceChanges.filter(item => item.changeType === "decrease");
    const uniqueItems = new Set(priceChanges.map(item => item.menuItem?.id).filter(Boolean)).size;
    const averageChange = totalChanges === 0 ? 0 : priceChanges.reduce((sum, item) => sum + Math.abs(Number(item.changePercentage || 0)), 0) / totalChanges;
    const largestChange = priceChanges.reduce((largest, item) => Math.abs(Number(item.changePercentage || 0)) > Math.abs(Number(largest.changePercentage || 0)) ? item : largest, priceChanges[0] || null);
    return {
      totalChanges,
      increaseCount: increases.length,
      decreaseCount: decreases.length,
      uniqueItems,
      averageChange,
      largestChange
    };
  }, [priceChanges]);
  const trendData = useMemo(() => {
    const grouped = priceChanges.reduce((accumulator, item) => {
      const key = formatDate(item.changedAt, {
        month: "short",
        day: "numeric"
      });
      const current = accumulator.get(key) || {
        label: key,
        changes: 0,
        avgChange: 0,
        sum: 0
      };
      current.changes += 1;
      current.sum += Math.abs(Number(item.changePercentage || 0));
      current.avgChange = current.sum / current.changes;
      accumulator.set(key, current);
      return accumulator;
    }, new Map());
    return Array.from(grouped.values()).slice(-10);
  }, [priceChanges]);
  const breakdownData = useMemo(() => [{
    name: "Increases",
    value: stats.increaseCount
  }, {
    name: "Decreases",
    value: stats.decreaseCount
  }].filter(item => item.value > 0), [stats.decreaseCount, stats.increaseCount]);
  const topItems = useMemo(() => {
    const grouped = priceChanges.reduce((accumulator, item) => {
      const key = item.menuItem?.name || "Unknown item";
      const current = accumulator.get(key) || {
        itemName: key,
        updates: 0,
        latestPrice: Number(item.newPrice || 0)
      };
      current.updates += 1;
      current.latestPrice = Number(item.newPrice || current.latestPrice || 0);
      accumulator.set(key, current);
      return accumulator;
    }, new Map());
    return Array.from(grouped.values()).sort((left, right) => right.updates - left.updates).slice(0, 6);
  }, [priceChanges]);
  return <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price History</h1>
          <p className="text-gray-600">
            Track menu price changes, recent movements, and affected items.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={period} onChange={event => setPeriod(event.target.value)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            {PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <select value={changeType} onChange={event => setChangeType(event.target.value)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            {CHANGE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <button type="button" onClick={loadPriceChanges} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Price Updates</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalChanges}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Items Impacted</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.uniqueItems}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Average Change</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatPercent(stats.averageChange)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Largest Movement</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {stats.largestChange ? `${stats.largestChange.menuItem?.name || "Unknown item"}` : "No changes yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {stats.largestChange ? formatPercent(stats.largestChange.changePercentage) : "-"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-3 text-primary-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Trend</h2>
              <p className="text-sm text-gray-500">
                Volume and average movement across recent price updates.
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="priceHistoryChanges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="changes" stroke="#2563eb" fill="url(#priceHistoryChanges)" strokeWidth={2} name="Updates" />
                <Area type="monotone" dataKey="avgChange" stroke="#f97316" fillOpacity={0} strokeWidth={2} name="Avg % change" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Mix</h2>
              <p className="text-sm text-gray-500">
                Increases versus decreases in the selected period.
              </p>
            </div>
          </div>

          <div className="h-80">
            {breakdownData.length ? <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={4}>
                    {breakdownData.map((entry, index) => <Cell key={entry.name} fill={CHANGE_COLORS[index % CHANGE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No price changes found for this filter.
              </div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1.4fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Most Updated Items</h2>
          <p className="mt-1 text-sm text-gray-500">
            Items with the highest number of price revisions.
          </p>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{
              left: 12,
              right: 12
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="itemName" type="category" stroke="#94a3b8" width={110} tick={{
                fontSize: 12
              }} />
                <Tooltip />
                <Bar dataKey="updates" fill="#0f766e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Recent Changes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Latest adjustments with size, reason, and percentage movement.
          </p>

          <div className="mt-5 space-y-3">
            {loading ? <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                Loading price history...
              </div> : priceChanges.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                No price changes available for the selected filters.
              </div> : priceChanges.slice(0, 8).map(change => {
            const isIncrease = change.changeType === "increase";
            const amountDelta = Number(change.newPrice || 0) - Number(change.oldPrice || 0);
            return <div key={change.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {change.menuItem?.name || "Unknown item"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {change.size?.name ? `${change.size.name}${change.size.code ? ` (${change.size.code})` : ""}` : "Default price"}
                        </p>
                      </div>

                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${isIncrease ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {isIncrease ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {formatPercent(change.changePercentage)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 px-3 py-3">
                        <span className="block text-xs uppercase tracking-wide text-gray-400">
                          Previous
                        </span>
                        <span className="mt-1 block font-semibold text-gray-900">
                          {menuService.formatPrice(change.oldPrice)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-3">
                        <span className="block text-xs uppercase tracking-wide text-gray-400">
                          New Price
                        </span>
                        <span className="mt-1 block font-semibold text-gray-900">
                          {menuService.formatPrice(change.newPrice)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-3">
                        <span className="block text-xs uppercase tracking-wide text-gray-400">
                          Delta
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900">
                          <IndianRupee className="h-4 w-4 text-primary-600" />
                          {formatSignedCurrency(amountDelta)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                      <span>{formatDate(change.changedAt, {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}</span>
                      <span>By {change.changedBy?.name || "System"}</span>
                      <span>{change.reason || "No reason provided"}</span>
                    </div>
                  </div>;
          })}
          </div>
        </div>
      </div>
    </div>;
}
