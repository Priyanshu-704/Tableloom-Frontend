/* eslint-disable no-unused-vars */
import { logger } from "../../../common/utils/logger.js";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChefHat, RefreshCw, Flame, Clock3, AlertTriangle } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  kitchenService,
  kitchenStationService,
} from "../../../common/services";
import { useAuth } from "../../../common/context/AuthContext";
import { useMonitoringMode } from "../../hooks/useMonitoringMode";
import { useAdminLiveSync } from "../../hooks/useAdminLiveSync";

const ORDER_LIVE_EVENTS = [
  "order:new",
  "new-order",
  "new_order",
  "order:updated",
  "order-updated",
  "order_updated",
  "order:status-updated",
  "order-status-updated",
  "order:delayed",
  "order_delayed",
  "item_preparing",
  "item_ready",
  "item_served",
  "items_updated",
  "stations_updated",
  "order_priority_updated",
  "delay_acknowledged",
];

const ORDER_STATUS_OPTIONS = [
  {
    value: "accepted",
    label: "Accepted",
  },
  {
    value: "preparing",
    label: "Preparing",
  },
  {
    value: "ready",
    label: "Ready",
  },
];
const SORT_OPTIONS = [
  {
    value: "preparationTime",
    label: "Preparation Time",
  },
  {
    value: "estimatedCompletion",
    label: "Estimated Completion",
  },
  {
    value: "priority",
    label: "Priority",
  },
  {
    value: "createdAt",
    label: "Created At",
  },
  {
    value: "quantity",
    label: "Quantity",
  },
];
const priorityBadge = {
  vip: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-700",
};
const hexToRgba = (hexColor, alpha = 1) => {
  const normalizedHex = String(hexColor || "")
    .replace("#", "")
    .trim();
  const fullHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalizedHex;
  if (fullHex.length !== 6) {
    return `rgba(14, 116, 144, ${alpha})`;
  }
  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
const calculateDelayMeta = (item) => {
  if (!item?.estimatedCompletion) {
    return {
      isDelayed: false,
      delayMinutes: 0,
      severity: "none",
    };
  }
  const estimatedCompletion = new Date(item.estimatedCompletion);
  const delayMinutes = Math.floor(
    (Date.now() - estimatedCompletion.getTime()) / 60000,
  );
  const normalizedDelay = Math.max(delayMinutes, 0);
  return {
    isDelayed: delayMinutes > 0,
    delayMinutes: normalizedDelay,
    severity:
      normalizedDelay >= 15 ? "critical" : delayMinutes > 0 ? "high" : "none",
  };
};
const getOrderDelayMeta = (order) => {
  const delayedItems = (order.stationItems || [])
    .map((item) => ({
      item,
      delay: calculateDelayMeta(item),
    }))
    .filter(({ delay }) => delay.isDelayed);
  if (!delayedItems.length) {
    return {
      isDelayed: false,
      isCritical: false,
      maxDelayMinutes: 0,
      delayedItemsCount: 0,
    };
  }
  const maxDelayMinutes = Math.max(
    ...delayedItems.map(({ delay }) => delay.delayMinutes || 0),
  );
  return {
    isDelayed: true,
    isCritical: delayedItems.some(({ delay }) => delay.severity === "critical"),
    maxDelayMinutes,
    delayedItemsCount: delayedItems.length,
  };
};
export default function KitchenDisplay({
  onRefreshOrders,
  isReadOnly = false,
}) {
  const { addNotification } = useAdmin();
  const { hasPermission, user } = useAuth();
  const isMonitoringMode = useMonitoringMode() || isReadOnly;
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [stationStats, setStationStats] = useState(null);
  const [delayMonitorStatus, setDelayMonitorStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningMonitorCheck, setRunningMonitorCheck] = useState(false);
  const [filters, setFilters] = useState({
    status: "accepted",
    sortBy: "preparationTime",
  });
  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  const applyStationsSnapshot = useCallback((stationList = []) => {
    const activeStations = (stationList || []).filter(
      (station) => station.status === "active",
    );
    setStations(activeStations);
    setSelectedStation((current) => {
      if (activeStations.some((station) => station._id === current)) {
        return current;
      }
      return activeStations[0]?._id || "";
    });
  }, []);
  const loadStations = useCallback(async () => {
    try {
      const response = await kitchenStationService.getKitchenStations();
      applyStationsSnapshot(response.data || []);
    } catch (error) {
      logger.error("Failed to load kitchen stations:", error);
      addNotificationRef.current("Failed to load kitchen stations", "error");
    }
  }, [applyStationsSnapshot]);
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
  const loadKitchenData = useCallback(async ({ silent = false } = {}) => {
    if (!selectedStation) {
      setOrders([]);
      setStationStats(null);
      return;
    }
    try {
      if (!silent) {
        setLoading(true);
      }
      const [ordersResponse, statsResponse] = await Promise.allSettled([
        kitchenService.getStationOrders(selectedStation, {
          status: filters.status,
          sortBy: filters.sortBy,
        }),
        kitchenService.getStationStatistics(selectedStation),
      ]);
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
      addNotificationRef.current(
        error.response?.data?.message || "Failed to load kitchen dashboard",
        "error",
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [filters.sortBy, filters.status, selectedStation]);
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      await loadStations();
      await loadKitchenData({ silent: true });
      await loadDelayMonitorStatus();
      if (onRefreshOrders) {
        await onRefreshOrders();
      }
      addNotificationRef.current("Kitchen dashboard refreshed", "success");
    } catch (error) {
      logger.error("Failed to refresh kitchen data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadStations, loadKitchenData, loadDelayMonitorStatus, onRefreshOrders]);

  useEffect(() => {
    loadKitchenData();
  }, [loadKitchenData]);
  useEffect(() => {
    const pollTimer = window.setInterval(() => {
      loadKitchenData({
        silent: true,
      });
      loadDelayMonitorStatus();
    }, 5000);
    return () => {
      window.clearInterval(pollTimer);
    };
  }, [loadDelayMonitorStatus, loadKitchenData]);
  useEffect(() => {
    loadDelayMonitorStatus();
  }, [loadDelayMonitorStatus]);
  useAdminLiveSync({
    events: ORDER_LIVE_EVENTS,
    joinRooms: (socket) => {
      const normalizedRole = String(user?.role || "").toLowerCase();
      socket.emit("join-kitchen-room");
      socket.emit("join-staff-room");
      if (normalizedRole) {
        socket.emit("join-role-room", normalizedRole);
      }
      if (["admin", "manager"].includes(normalizedRole)) {
        socket.emit("join-management-room");
      }
    },
    onEvent: ({ eventName, payload }) => {
      if (eventName === "stations_updated" && Array.isArray(payload)) {
        applyStationsSnapshot(payload);
      }
      loadKitchenData({
        silent: true,
      });
      loadDelayMonitorStatus();
    },
  });
  const activeStation = useMemo(
    () => stations.find((station) => station._id === selectedStation),
    [selectedStation, stations],
  );
  const stationTheme = useMemo(() => {
    const baseColor = activeStation?.colorCode || "#f97316";
    return {
      baseColor,
      panelBackground: `linear-gradient(135deg, ${hexToRgba(baseColor, 0.28)} 0%, rgba(15, 23, 42, 0.96) 38%, rgba(2, 6, 23, 0.98) 100%)`,
      cardBackground: `linear-gradient(160deg, ${hexToRgba(baseColor, 0.16)} 0%, rgba(15, 23, 42, 0.94) 55%, rgba(2, 6, 23, 0.98) 100%)`,
      softBackground: `linear-gradient(160deg, ${hexToRgba(baseColor, 0.12)} 0%, rgba(15, 23, 42, 0.88) 100%)`,
      badgeBackground: hexToRgba(baseColor, 0.18),
      badgeBorder: hexToRgba(baseColor, 0.42),
      border: hexToRgba(baseColor, 0.34),
      glow: hexToRgba(baseColor, 0.2),
    };
  }, [activeStation]);
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
      return (
        new Date(secondOrder.createdAt || 0) -
        new Date(firstOrder.createdAt || 0)
      );
    });
  }, [orders]);
  const completeItemAction = async (kitchenOrderId, itemId, itemStatus) => {
    if (isMonitoringMode) {
      addNotificationRef.current(
        "Kitchen actions are disabled in monitoring mode.",
        "error",
      );
      return;
    }
    try {
      let successMessage = "";
      if (itemStatus === "accepted") {
        await kitchenService.startPreparingItem(kitchenOrderId, itemId);
        successMessage = "Kitchen item moved to preparing.";
      } else if (itemStatus === "preparing") {
        await kitchenService.markItemReady(kitchenOrderId, itemId);
        successMessage = "Kitchen item marked ready.";
      } else if (itemStatus === "ready") {
        await kitchenService.markItemServed(kitchenOrderId, itemId);
        successMessage = "Kitchen item marked served.";
      } else {
        return;
      }
      await loadKitchenData();
      await onRefreshOrders?.();
      addNotificationRef.current(successMessage, "success");
    } catch (error) {
      logger.error("Failed to update kitchen item:", error);
      addNotificationRef.current(
        error.response?.data?.message || "Failed to update kitchen item",
        "error",
      );
    }
  };
  const getItemActionLabel = (itemStatus) => {
    if (itemStatus === "pending") {
      return "Awaiting Confirmation";
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
    if (isMonitoringMode) {
      addNotificationRef.current(
        "Delay monitor execution is disabled in monitoring mode.",
        "error",
      );
      return;
    }
    try {
      setRunningMonitorCheck(true);
      const response = await kitchenService.runDelayMonitorCheck();
      setDelayMonitorStatus(response?.meta?.delayMonitorStatus || null);
      addNotificationRef.current(
        response?.message || "Delay monitor check completed",
        "success",
      );
      await Promise.all([loadKitchenData(), loadDelayMonitorStatus()]);
    } catch (error) {
      logger.error("Failed to run delay monitor check:", error);
      addNotificationRef.current(
        error.response?.data?.message || "Failed to run delay monitor check",
        "error",
      );
    } finally {
      setRunningMonitorCheck(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
            <select
              value={selectedStation}
              onChange={(event) => setSelectedStation(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {stations.length === 0 ? (
                <option value="" disabled>
                  No items available
                </option>
              ) : (
                stations.map((station) => (
                  <option key={station._id} value={station._id}>
                    {station.name}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            {!isMonitoringMode && hasPermission("view_statistics") ? (
              <button
                type="button"
                onClick={runDelayMonitorCheck}
                disabled={runningMonitorCheck}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-orange-100 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Flame
                  className={`h-4 w-4 ${runningMonitorCheck ? "animate-pulse" : ""}`}
                />
                Run Delay Check
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{
              borderColor: stationTheme.border,
              background: stationTheme.panelBackground,
              boxShadow: `0 18px 40px ${stationTheme.glow}`,
            }}
          >
            <p className="text-sm text-slate-400">Active Station</p>
            <p className="mt-2 text-xl font-semibold">
              {activeStation?.name || "None"}
            </p>
            <p className="mt-2 text-sm text-slate-300 capitalize">
              {activeStation?.stationType || "No station selected"}
            </p>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: stationTheme.border,
              background: stationTheme.softBackground,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Queued Orders</p>
                <p className="mt-2 text-xl font-semibold">{orders.length}</p>
              </div>
              <ChefHat className="h-6 w-6 text-orange-400" />
            </div>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: stationTheme.border,
              background: stationTheme.softBackground,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Prep Time</p>
                <p className="mt-2 text-xl font-semibold">
                  {Math.round(
                    (stationStats?.overallStats?.avgPreparationTime || 0) / 60,
                  )}{" "}
                  min
                </p>
              </div>
              <Clock3 className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: stationTheme.border,
              background: stationTheme.softBackground,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delay Rate</p>
                <p className="mt-2 text-xl font-semibold">
                  {Number(stationStats?.overallStats?.delayedRate || 0).toFixed(
                    1,
                  )}
                  %
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: stationTheme.border,
              background: stationTheme.softBackground,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delay Monitor</p>
                <p className="mt-2 text-xl font-semibold">
                  {delayMonitorStatus?.isRunning ? "Running" : "Stopped"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Last check:{" "}
                  {delayMonitorStatus?.lastCheck
                    ? new Date(
                        delayMonitorStatus.lastCheck,
                      ).toLocaleTimeString()
                    : "pending"}
                </p>
              </div>
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-4 rounded-xl border p-4 lg:grid-cols-4"
          style={{
            borderColor: stationTheme.border,
            background: stationTheme.cardBackground,
          }}
        >
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortBy: event.target.value || "preparationTime",
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">--</option>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            Status API:{" "}
            <span className="font-medium text-white">{filters.status}</span>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            Sort API:{" "}
            <span className="font-medium text-white">{filters.sortBy}</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div
                  key={`stat-skeleton-${index}`}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                  <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-700" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {[...Array(4)].map((_, orderIndex) => (
                <div
                  key={`order-skeleton-${orderIndex}`}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </div>
                    <div className="h-7 w-16 animate-pulse rounded-full bg-slate-800" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {[...Array(3)].map((_, itemIndex) => (
                      <div
                        key={`item-skeleton-${orderIndex}-${itemIndex}`}
                        className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-full space-y-2">
                            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-800" />
                            <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
                          </div>
                          <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-800" />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                          {[...Array(4)].map((_, metaIndex) => (
                            <div
                              key={`meta-skeleton-${orderIndex}-${itemIndex}-${metaIndex}`}
                              className="h-4 animate-pulse rounded bg-slate-800"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <Flame className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold">
              No kitchen items match these filters
            </h3>
            <p className="mt-2 text-slate-400">
              Change the station or queue filters to inspect another workload.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {prioritizedOrders.map((order) => {
              const orderDelayMeta = getOrderDelayMeta(order);
              return (
                <div
                  key={order._id}
                  className="flex h-full flex-col rounded-xl border p-5 shadow-sm"
                  style={
                    orderDelayMeta.isCritical
                      ? {
                          borderColor: "rgb(239 68 68)",
                          background:
                            "linear-gradient(160deg, rgba(127, 29, 29, 0.55) 0%, rgba(15, 23, 42, 0.94) 56%, rgba(2, 6, 23, 0.98) 100%)",
                          boxShadow: "0 18px 40px rgba(127, 29, 29, 0.35)",
                        }
                      : orderDelayMeta.isDelayed
                        ? {
                            borderColor: "rgba(185, 28, 28, 0.7)",
                            background:
                              "linear-gradient(160deg, rgba(69, 10, 10, 0.4) 0%, rgba(15, 23, 42, 0.94) 100%)",
                          }
                        : {
                            borderColor: stationTheme.border,
                            background: stationTheme.cardBackground,
                            boxShadow: `0 18px 40px ${stationTheme.glow}`,
                          }
                  }
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Order #{order.orderNumber || order._id?.slice(-6)}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Table {order.table?.tableNumber || "N/A"}
                      </p>
                      {orderDelayMeta.isDelayed ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${orderDelayMeta.isCritical ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}
                          >
                            {orderDelayMeta.isCritical
                              ? "Critical Delay"
                              : "Delayed"}
                          </span>
                          <span className="text-xs font-medium text-red-200">
                            {orderDelayMeta.delayedItemsCount} item(s),{" "}
                            {orderDelayMeta.maxDelayMinutes} min late
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium capitalize ${orderDelayMeta.isDelayed ? "border-red-200 bg-red-100 text-red-700" : "text-white"}`}
                      style={
                        orderDelayMeta.isDelayed
                          ? undefined
                          : {
                              backgroundColor: stationTheme.badgeBackground,
                              borderColor: stationTheme.badgeBorder,
                            }
                      }
                    >
                      {orderDelayMeta.isDelayed
                        ? "high priority"
                        : order.priority || "normal"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(order.stationItems || []).map((item) => {
                      const itemDelayMeta = calculateDelayMeta(item);
                      return (
                        <div
                          key={item._id}
                          className="rounded-lg border p-4"
                          style={
                            itemDelayMeta.severity === "critical"
                              ? {
                                  borderColor: "rgba(239, 68, 68, 0.8)",
                                  background: "rgba(127, 29, 29, 0.35)",
                                }
                              : itemDelayMeta.isDelayed
                                ? {
                                    borderColor: "rgba(153, 27, 27, 0.75)",
                                    background: "rgba(69, 10, 10, 0.22)",
                                  }
                                : {
                                    borderColor: stationTheme.border,
                                    background: `linear-gradient(160deg, ${hexToRgba(stationTheme.baseColor, 0.08)} 0%, rgba(2, 6, 23, 0.9) 100%)`,
                                  }
                          }
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">
                                {item.quantity}x{" "}
                                {item.menuItemName || item.menuItem?.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Status:{" "}
                                <span className="capitalize">
                                  {item.status}
                                </span>
                              </p>
                              {itemDelayMeta.isDelayed ? (
                                <p className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  Delay {itemDelayMeta.delayMinutes} min
                                </p>
                              ) : null}
                              {item.notes ? (
                                <p className="mt-2 text-xs text-sky-300">
                                  {item.notes}
                                </p>
                              ) : null}
                            </div>
                            {!isMonitoringMode ? (
                              <button
                                type="button"
                                onClick={() =>
                                  completeItemAction(
                                    order._id,
                                    item._id,
                                    item.status,
                                  )
                                }
                                disabled={item.status === "pending"}
                                className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors lg:w-auto ${item.status === "pending" ? "cursor-not-allowed bg-slate-700 text-slate-300" : "bg-orange-600 hover:bg-orange-700"}`}
                              >
                                {getItemActionLabel(item.status)}
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
                            <p
                              className="rounded-md border px-2 py-2 text-slate-400"
                              style={{
                                borderColor: stationTheme.border,
                                backgroundColor: hexToRgba(
                                  stationTheme.baseColor,
                                  0.08,
                                ),
                              }}
                            >
                              Prep:{" "}
                              <span className="text-slate-200">
                                {item.preparationTime || 0} min
                              </span>
                            </p>
                            <p
                              className="rounded-md border px-2 py-2 text-slate-400"
                              style={{
                                borderColor: stationTheme.border,
                                backgroundColor: hexToRgba(
                                  stationTheme.baseColor,
                                  0.08,
                                ),
                              }}
                            >
                              ETA:{" "}
                              <span className="text-slate-200">
                                {item.estimatedCompletion
                                  ? new Date(
                                      item.estimatedCompletion,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "N/A"}
                              </span>
                            </p>
                            <p
                              className="rounded-md border px-2 py-2 text-slate-400"
                              style={{
                                borderColor: stationTheme.border,
                                backgroundColor: hexToRgba(
                                  stationTheme.baseColor,
                                  0.08,
                                ),
                              }}
                            >
                              Qty:{" "}
                              <span className="text-slate-200">
                                {item.quantity || 0}
                              </span>
                            </p>
                            <p
                              className="rounded-md border px-2 py-2 text-slate-400"
                              style={{
                                borderColor: stationTheme.border,
                                backgroundColor: hexToRgba(
                                  stationTheme.baseColor,
                                  0.08,
                                ),
                              }}
                            >
                              Delay:{" "}
                              <span
                                className={
                                  itemDelayMeta.isDelayed
                                    ? "font-semibold text-red-300"
                                    : "text-slate-200"
                                }
                              >
                                {itemDelayMeta.delayMinutes || 0} min
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
