import { logger } from "../../../common/utils/logger.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, RefreshCw, Flame, Clock3, AlertTriangle } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { kitchenService, kitchenStationService } from "../../../common/services";
import { useAuth } from "../../../common/context/AuthContext";
const ORDER_STATUS_OPTIONS = [{
  value: "pending",
  label: "Pending"
}, {
  value: "accepted",
  label: "Accepted"
}, {
  value: "preparing",
  label: "Preparing"
}, {
  value: "ready",
  label: "Ready"
}];
const SORT_OPTIONS = [{
  value: "preparationTime",
  label: "Preparation Time"
}, {
  value: "estimatedCompletion",
  label: "Estimated Completion"
}, {
  value: "priority",
  label: "Priority"
}, {
  value: "createdAt",
  label: "Created At"
}, {
  value: "quantity",
  label: "Quantity"
}];
const priorityBadge = {
  vip: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-700"
};
const calculateDelayMeta = item => {
  if (!item?.estimatedCompletion) {
    return {
      isDelayed: false,
      delayMinutes: 0,
      severity: "none"
    };
  }
  const estimatedCompletion = new Date(item.estimatedCompletion);
  const delayMinutes = Math.floor((Date.now() - estimatedCompletion.getTime()) / 60000);
  const normalizedDelay = Math.max(delayMinutes, 0);
  return {
    isDelayed: delayMinutes > 0,
    delayMinutes: normalizedDelay,
    severity: normalizedDelay >= 15 ? "critical" : delayMinutes > 0 ? "high" : "none"
  };
};
const getOrderDelayMeta = order => {
  const delayedItems = (order.stationItems || []).map(item => ({
    item,
    delay: calculateDelayMeta(item)
  })).filter(({
    delay
  }) => delay.isDelayed);
  if (!delayedItems.length) {
    return {
      isDelayed: false,
      isCritical: false,
      maxDelayMinutes: 0,
      delayedItemsCount: 0
    };
  }
  const maxDelayMinutes = Math.max(...delayedItems.map(({
    delay
  }) => delay.delayMinutes || 0));
  return {
    isDelayed: true,
    isCritical: delayedItems.some(({
      delay
    }) => delay.severity === "critical"),
    maxDelayMinutes,
    delayedItemsCount: delayedItems.length
  };
};
export function KitchenDisplay({
  onRefreshOrders
}) {
  const {
    addNotification
  } = useAdmin();
  const {
    hasPermission
  } = useAuth();
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [stationStats, setStationStats] = useState(null);
  const [delayMonitorStatus, setDelayMonitorStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningMonitorCheck, setRunningMonitorCheck] = useState(false);
  const [filters, setFilters] = useState({
    status: "accepted",
    sortBy: "preparationTime"
  });
  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  const loadStations = useCallback(async () => {
    try {
      const response = await kitchenStationService.getKitchenStations();
      const activeStations = (response.data || []).filter(station => station.status === "active");
      setStations(activeStations);
      setSelectedStation(current => current || activeStations[0]?._id || "");
    } catch (error) {
      logger.error("Failed to load kitchen stations:", error);
      addNotificationRef.current("Failed to load kitchen stations", "error");
    }
  }, []);
  useEffect(() => {
    loadStations();
  }, [loadStations]);
  const loadDelayMonitorStatus = useCallback(async () => {
    try {
      const response = await kitchenService.getDelayMonitorStatus();
      setDelayMonitorStatus(response?.data || null);
    } catch (error) {
      logger.error("Failed to load delay monitor status:", error);
      setDelayMonitorStatus(null);
    }
  }, []);
  const loadKitchenData = useCallback(async () => {
    if (!selectedStation) {
      setOrders([]);
      setStationStats(null);
      return;
    }
    try {
      setLoading(true);
      const [ordersResponse, statsResponse] = await Promise.allSettled([kitchenService.getStationOrders(selectedStation, {
        status: filters.status,
        sortBy: filters.sortBy
      }), kitchenService.getStationStatistics(selectedStation)]);
      if (ordersResponse.status === "fulfilled") {
        setOrders(ordersResponse.value?.data || []);
      } else {
        throw ordersResponse.reason;
      }
      if (statsResponse.status === "fulfilled") {
        setStationStats(statsResponse.value?.data || null);
      } else {
        setStationStats(null);
      }
    } catch (error) {
      logger.error("Failed to load kitchen data:", error);
      addNotificationRef.current(error.response?.data?.message || "Failed to load kitchen dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [filters.sortBy, filters.status, selectedStation]);
  useEffect(() => {
    loadKitchenData();
  }, [loadKitchenData]);
  useEffect(() => {
    loadDelayMonitorStatus();
  }, [loadDelayMonitorStatus]);
  const activeStation = useMemo(() => stations.find(station => station._id === selectedStation), [selectedStation, stations]);
  const prioritizedOrders = useMemo(() => {
    return [...orders].sort((firstOrder, secondOrder) => {
      const firstDelayMeta = getOrderDelayMeta(firstOrder);
      const secondDelayMeta = getOrderDelayMeta(secondOrder);
      if (firstDelayMeta.isCritical !== secondDelayMeta.isCritical) {
        return firstDelayMeta.isCritical ? -1 : 1;
      }
      if (firstDelayMeta.isDelayed !== secondDelayMeta.isDelayed) {
        return firstDelayMeta.isDelayed ? -1 : 1;
      }
      if (firstDelayMeta.maxDelayMinutes !== secondDelayMeta.maxDelayMinutes) {
        return secondDelayMeta.maxDelayMinutes - firstDelayMeta.maxDelayMinutes;
      }
      return new Date(secondOrder.createdAt || 0) - new Date(firstOrder.createdAt || 0);
    });
  }, [orders]);
  const completeItemAction = async (kitchenOrderId, itemId, itemStatus) => {
    try {
      if (itemStatus === "accepted") {
        await kitchenService.startPreparingItem(kitchenOrderId, itemId);
      } else if (itemStatus === "preparing") {
        await kitchenService.markItemReady(kitchenOrderId, itemId);
      } else if (itemStatus === "ready") {
        await kitchenService.markItemServed(kitchenOrderId, itemId);
      } else {
        return;
      }
      await loadKitchenData();
      await onRefreshOrders?.();
    } catch (error) {
      logger.error("Failed to update kitchen item:", error);
      addNotificationRef.current(error.response?.data?.message || "Failed to update kitchen item", "error");
    }
  };
  const getItemActionLabel = itemStatus => {
    if (itemStatus === "pending") {
      return "Awaiting Accept";
    }
    if (itemStatus === "accepted") {
      return "Start";
    }
    if (itemStatus === "preparing") {
      return "Mark Ready";
    }
    if (itemStatus === "ready") {
      return "Mark Served";
    }
    return "No Action";
  };
  const runDelayMonitorCheck = async () => {
    try {
      setRunningMonitorCheck(true);
      const response = await kitchenService.runDelayMonitorCheck();
      setDelayMonitorStatus(response?.meta?.delayMonitorStatus || null);
      addNotificationRef.current(response?.message || "Delay monitor check completed", "success");
      await Promise.all([loadKitchenData(), loadDelayMonitorStatus()]);
    } catch (error) {
      logger.error("Failed to run delay monitor check:", error);
      addNotificationRef.current(error.response?.data?.message || "Failed to run delay monitor check", "error");
    } finally {
      setRunningMonitorCheck(false);
    }
  };
  return <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
              <p className="text-sm text-slate-400">
                Station-level queue, preparation flow, and delay tracking.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedStation} onChange={event => setSelectedStation(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              {stations.map(station => <option key={station._id} value={station._id}>
                  {station.name}
                </option>)}
            </select>

            <button type="button" onClick={loadKitchenData} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {hasPermission("view_statistics") ? <button type="button" onClick={runDelayMonitorCheck} disabled={runningMonitorCheck} className="inline-flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-orange-100 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                <Flame className={`h-4 w-4 ${runningMonitorCheck ? "animate-pulse" : ""}`} />
                Run Delay Check
              </button> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active Station</p>
            <p className="mt-2 text-xl font-semibold">{activeStation?.name || "None"}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Queued Orders</p>
                <p className="mt-2 text-xl font-semibold">{orders.length}</p>
              </div>
              <ChefHat className="h-6 w-6 text-orange-400" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Prep Time</p>
                <p className="mt-2 text-xl font-semibold">
                  {Math.round((stationStats?.overallStats?.avgPreparationTime || 0) / 60)} min
                </p>
              </div>
              <Clock3 className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delay Rate</p>
                <p className="mt-2 text-xl font-semibold">
                  {Number(stationStats?.overallStats?.delayedRate || 0).toFixed(1)}%
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delay Monitor</p>
                <p className="mt-2 text-xl font-semibold">
                  {delayMonitorStatus?.isRunning ? "Running" : "Stopped"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Last check:{" "}
                  {delayMonitorStatus?.lastCheck ? new Date(delayMonitorStatus.lastCheck).toLocaleTimeString() : "pending"}
                </p>
              </div>
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-4">
          <select value={filters.status} onChange={event => setFilters(current => ({
          ...current,
          status: event.target.value
        }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
            {ORDER_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <select value={filters.sortBy} onChange={event => setFilters(current => ({
          ...current,
          sortBy: event.target.value || "preparationTime"
        }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">--</option>
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            Status API: <span className="font-medium text-white">{filters.status}</span>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            Sort API: <span className="font-medium text-white">{filters.sortBy}</span>
          </div>
        </div>

        {loading ? <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, index) => <div key={`stat-skeleton-${index}`} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                  <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-700" />
                </div>)}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {[...Array(4)].map((_, orderIndex) => <div key={`order-skeleton-${orderIndex}`} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </div>
                    <div className="h-7 w-16 animate-pulse rounded-full bg-slate-800" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {[...Array(3)].map((_, itemIndex) => <div key={`item-skeleton-${orderIndex}-${itemIndex}`} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-full space-y-2">
                            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" />
                            <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
                          </div>
                          <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-800" />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                          {[...Array(4)].map((_, metaIndex) => <div key={`meta-skeleton-${orderIndex}-${itemIndex}-${metaIndex}`} className="h-4 animate-pulse rounded bg-slate-800" />)}
                        </div>
                      </div>)}
                  </div>
                </div>)}
            </div>
          </div> : orders.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Flame className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold">No kitchen items match these filters</h3>
            <p className="mt-2 text-slate-400">
              Change the station or queue filters to inspect another workload.
            </p>
          </div> : <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {prioritizedOrders.map(order => {
          const orderDelayMeta = getOrderDelayMeta(order);
          return <div key={order._id} className={`rounded-xl border p-5 shadow-sm ${orderDelayMeta.isCritical ? "border-red-500 bg-red-950/40 shadow-red-950/40" : orderDelayMeta.isDelayed ? "border-red-700 bg-slate-900 shadow-sm" : "border-slate-800 bg-slate-900"}`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Order #{order.orderNumber || order._id?.slice(-6)}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Table {order.table?.tableNumber || "N/A"}
                    </p>
                    {orderDelayMeta.isDelayed ? <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${orderDelayMeta.isCritical ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}>
                          {orderDelayMeta.isCritical ? "Critical Delay" : "Delayed"}
                        </span>
                        <span className="text-xs font-medium text-red-200">
                          {orderDelayMeta.delayedItemsCount} item(s), {orderDelayMeta.maxDelayMinutes} min late
                        </span>
                      </div> : null}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${orderDelayMeta.isDelayed ? "bg-red-100 text-red-700" : priorityBadge[order.priority] || priorityBadge.normal}`}>
                    {orderDelayMeta.isDelayed ? "high priority" : order.priority || "normal"}
                  </span>
                </div>

                <div className="space-y-3">
                  {(order.stationItems || []).map(item => {
                const itemDelayMeta = calculateDelayMeta(item);
                return <div key={item._id} className={`rounded-lg border p-4 ${itemDelayMeta.severity === "critical" ? "border-red-500 bg-red-950/40" : itemDelayMeta.isDelayed ? "border-red-800 bg-red-950/20" : "border-slate-800 bg-slate-950"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {item.quantity}x {item.menuItemName || item.menuItem?.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Status: <span className="capitalize">{item.status}</span>
                          </p>
                          {itemDelayMeta.isDelayed ? <p className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                              Delay {itemDelayMeta.delayMinutes} min
                            </p> : null}
                          {item.notes ? <p className="mt-2 text-xs text-sky-300">{item.notes}</p> : null}
                        </div>
                        <button type="button" onClick={() => completeItemAction(order._id, item._id, item.status)} disabled={item.status === "pending"} className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${item.status === "pending" ? "cursor-not-allowed bg-slate-700 text-slate-300" : "bg-orange-600 hover:bg-orange-700"}`}>
                          {getItemActionLabel(item.status)}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 lg:grid-cols-4">
                        <p>
                          Prep:{" "}
                          <span className="text-slate-200">
                            {item.preparationTime || 0} min
                          </span>
                        </p>
                        <p>
                          ETA:{" "}
                          <span className="text-slate-200">
                            {item.estimatedCompletion ? new Date(item.estimatedCompletion).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        }) : "N/A"}
                          </span>
                        </p>
                        <p>
                          Qty:{" "}
                          <span className="text-slate-200">{item.quantity || 0}</span>
                        </p>
                        <p>
                          Delay:{" "}
                          <span className={itemDelayMeta.isDelayed ? "font-semibold text-red-300" : "text-slate-200"}>
                            {itemDelayMeta.delayMinutes || 0} min
                          </span>
                        </p>
                      </div>
                    </div>;
              })}
                </div>
              </div>;
        })}
          </div>}
      </div>
    </div>;
}
