import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Utensils,
  RefreshCw,
  Layers,
  QrCode,
  MapPin,
  X,
  Sparkles,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { TableForm } from "../components/tables/TableForm";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { AdminModal } from "../components/common/AdminModal";
import AdminPagination from "../components/common/AdminPagination";
import { AdminCardGridSkeleton } from "../components/common/AdminSkeleton";
import { QrManagementOverlay } from "../components/tables/QrManagementOverlay";
import { QRBatchOperations } from "./QRBatchOperations";
import { ToastContainer } from "../../user/components/common/Toast";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { withTenantQueryParams } from "../../common/utils/qrImage";
import { useAuth } from "../../common/context/AuthContext";

const STATUS_CONFIG = {
  available: {
    label: "Available",
    color: "emerald",
    icon: CheckCircle,
    description: "Table is clean and ready for seating guests",
    bg: "bg-emerald-50/70",
    border: "border-emerald-200/80",
    text: "text-emerald-700",
    iconBg: "bg-emerald-100/80 text-emerald-600",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-100/80 text-emerald-800 border-emerald-300/60",
  },
  occupied: {
    label: "Occupied",
    color: "amber",
    icon: Utensils,
    description: "Guests are currently seated and dining",
    bg: "bg-amber-50/70",
    border: "border-amber-200/80",
    text: "text-amber-700",
    iconBg: "bg-amber-100/80 text-amber-600",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-100/80 text-amber-800 border-amber-300/60",
  },
  reserved: {
    label: "Reserved",
    color: "sky",
    icon: Clock,
    description: "Set aside for an upcoming booking",
    bg: "bg-sky-50/70",
    border: "border-sky-200/80",
    text: "text-sky-700",
    iconBg: "bg-sky-100/80 text-sky-600",
    dot: "bg-sky-500",
    badgeBg: "bg-sky-100/80 text-sky-800 border-sky-300/60",
  },
  cleaning: {
    label: "Cleaning",
    color: "yellow",
    icon: RefreshCw,
    description: "Table is being sanitized and reset",
    bg: "bg-yellow-50/70",
    border: "border-yellow-200/80",
    text: "text-yellow-700",
    iconBg: "bg-yellow-100/80 text-yellow-600",
    dot: "bg-yellow-500",
    badgeBg: "bg-yellow-100/80 text-yellow-800 border-yellow-300/60",
  },
  maintenance: {
    label: "Maintenance",
    color: "rose",
    icon: XCircle,
    description: "Out of order or undergoing repairs",
    bg: "bg-rose-50/70",
    border: "border-rose-200/80",
    text: "text-rose-700",
    iconBg: "bg-rose-100/80 text-rose-600",
    dot: "bg-rose-500",
    badgeBg: "bg-rose-100/80 text-rose-800 border-rose-300/60",
  },
  billing: {
    label: "Billing",
    color: "purple",
    icon: Clock,
    description: "Order finished, payment pending",
    bg: "bg-purple-50/70",
    border: "border-purple-200/80",
    text: "text-purple-700",
    iconBg: "bg-purple-100/80 text-purple-600",
    dot: "bg-purple-500",
    badgeBg: "bg-purple-100/80 text-purple-800 border-purple-300/60",
  },
};

const LOCATIONS = [
  "All",
  "Main Hall",
  "Private Room",
  "Outdoor",
  "Bar Area",
  "Terrace",
];

const CAPACITIES = ["All", "2", "4", "6", "8+"];

export function TableManagement() {
  const PAGE_SIZE = 12;
  const { tables, dispatch, user, confirmAction } = useAdmin();
  const { hasPermission } = useAuth();
  const isMonitoringMode = useMonitoringMode();

  const canCreateTable = !isMonitoringMode && hasPermission("table_create");
  const canEditTable = !isMonitoringMode && hasPermission("table_edit");
  const canDeleteTable = !isMonitoringMode && hasPermission("table_delete");
  const canUpdateTableStatus =
    !isMonitoringMode && hasPermission("table_update_status");
  const canViewQr = !isMonitoringMode && hasPermission("table.qr_view");
  const canDownloadQr = !isMonitoringMode && hasPermission("table.qr_download");
  const canRegenerateQr =
    !isMonitoringMode && hasPermission("table.qr_regenerate");
  const canRefreshQrToken =
    !isMonitoringMode && hasPermission("table.qr_refresh_token");

  const canManageQr =
    canViewQr || canDownloadQr || canRegenerateQr || canRefreshQrToken;
  const canUseBatchQr = canDownloadQr || canRegenerateQr;

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("All");
  const [capacityFilter, setCapacityFilter] = useState("All");
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showQRManagement, setShowQRManagement] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState(null);
  const [showQRBatchOps, setShowQRBatchOps] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTableForStatus, setSelectedTableForStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("number");
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const handleManageQR = (table) => {
    if (!canManageQr) return;
    setSelectedTableForQR(table);
    setShowQRManagement(true);
  };

  const handleOpenStatusModal = (table) => {
    if (!canUpdateTableStatus) return;
    setSelectedTableForStatus(table);
    setShowStatusModal(true);
  };

  const showToast = (message, type = "info", duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [
      ...prev,
      { id, message, type, duration },
    ]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const formatLocationForDisplay = (location) => {
    const locationMap = {
      "main hall": "Main Hall",
      "private-room": "Private Room",
      outdoor: "Outdoor",
      bar: "Bar Area",
      terrace: "Terrace",
      indoor: "Indoor",
    };
    return locationMap[location] || location;
  };

  const formatLocationForApi = (location) => {
    const locationMap = {
      "Main Hall": "main hall",
      "Private Room": "private-room",
      Outdoor: "outdoor",
      "Bar Area": "bar",
      Terrace: "terrace",
      Indoor: "indoor",
    };
    return locationMap[location] || location;
  };

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      let queryParams = {};
      if (user?.role === "waiter" || user?.role === "chef") {
        queryParams.activeOnly = "true";
      }
      if (searchTerm.trim()) {
        queryParams.search = searchTerm.trim();
      }
      if (statusFilter !== "all") {
        queryParams.status = statusFilter;
      }
      if (locationFilter !== "All") {
        queryParams.location = formatLocationForApi(locationFilter);
      }
      if (capacityFilter !== "All") {
        queryParams.capacity = capacityFilter;
      }
      queryParams.page = currentPage;
      queryParams.limit = PAGE_SIZE;

      const response = await tableService.getTables(queryParams);
      if (response.success) {
        const transformedTables = response.data.map((table) => ({
          id: table._id,
          number: table.tableNumber,
          tableName: table.tableName,
          capacity: table.capacity,
          status: table.status,
          location: formatLocationForDisplay(table.location),
          currentOrder: table.currentOrder,
          lastOccupied: table.lastOccupied,
          qrCode: withTenantQueryParams(table.qrCode),
          qrUrl: table.qrUrl,
          tokenExpiry: table.tokenExpiry,
          tokenDaysRemaining: table.tokenDaysRemaining,
          tokenExpired: table.tokenExpired,
          notes: table.notes,
          isActive: table.isActive,
        }));
        dispatch({
          type: "SET_TABLES",
          payload: transformedTables,
        });
        setPagination({
          page: response.pagination?.page || currentPage,
          pages: response.pagination?.pages || 1,
          total: response.total || 0,
        });
      }
    } catch (error) {
      logger.error("Failed to load tables:", error);
    } finally {
      setLoading(false);
    }
  }, [
    capacityFilter,
    currentPage,
    dispatch,
    locationFilter,
    searchTerm,
    statusFilter,
    user?.role,
  ]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    setCurrentPage(1);
  }, [capacityFilter, locationFilter, searchTerm, statusFilter]);

  useEffect(() => {
    loadTableStats();
  }, []);

  const loadTableStats = async () => {
    try {
      const response = await tableService.getTableStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error("Failed to load table stats:", error);
    }
  };

  const displayStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.totalTables || tables.length,
        available:
          stats.available ||
          tables.filter((t) => t.status === "available").length,
        occupied:
          stats.occupied ||
          tables.filter((t) => t.status === "occupied").length,
        reserved:
          stats.reserved ||
          tables.filter((t) => t.status === "reserved").length,
        cleaning:
          stats.cleaning ||
          tables.filter((t) => t.status === "cleaning").length,
        maintenance:
          stats.maintenance ||
          tables.filter((t) => t.status === "maintenance").length,
        billing:
          stats.billing ||
          tables.filter((t) => t.status === "billing").length,
      };
    }
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === "available").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      reserved: tables.filter((t) => t.status === "reserved").length,
      cleaning: tables.filter((t) => t.status === "cleaning").length,
      maintenance: tables.filter((t) => t.status === "maintenance").length,
      billing: tables.filter((t) => t.status === "billing").length,
    };
  }, [stats, tables]);

  const handleEditTable = (table) => {
    if (!canEditTable) return;
    setEditingTable(table);
    setShowTableForm(true);
  };

  const handleDeleteTable = async (tableId) => {
    if (!canDeleteTable) return;

    const confirmed = await confirmAction({
      title: "Delete Table",
      message:
        "Are you sure you want to delete this table? This action cannot be undone.",
      confirmLabel: "Delete Table",
      tone: "destructive",
    });

    if (!confirmed) {
      return;
    }

    try {
      await tableService.deleteTable(tableId);
      dispatch({
        type: "DELETE_TABLE",
        payload: tableId,
      });
      loadTableStats();
      showToast("Table deleted successfully.", "success");
    } catch (error) {
      logger.error("Failed to delete table:", error);
      let errorMessage = "Failed to delete table.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleStatusChange = async (tableId, newStatus, customNotes) => {
    if (!canUpdateTableStatus) return;
    try {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;
      if (newStatus === "maintenance" && table.currentOrder) {
        const confirmed = await confirmAction({
          title: "Mark Table As Maintenance",
          message:
            "This table has an active order. Are you sure you want to mark it as maintenance?",
          confirmLabel: "Mark Maintenance",
          tone: "warning",
        });
        if (!confirmed) return;
      }

      const noteMessage = customNotes
        ? customNotes
        : `Status changed to ${newStatus} by ${user?.name || "staff"}`;

      await tableService.updateTableStatus(
        tableId,
        newStatus,
        noteMessage,
      );
      const updatedTables = tables.map((t) =>
        t.id === tableId ? { ...t, status: newStatus, notes: customNotes || t.notes } : t,
      );
      dispatch({
        type: "SET_TABLES",
        payload: updatedTables,
      });
      loadTableStats();
      showToast(`Table status updated to ${newStatus}.`, "success");
    } catch (error) {
      logger.error("Failed to update table status:", error);
      let errorMessage = "Failed to update table status.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleClearTable = async (tableId) => {
    if (!canUpdateTableStatus) return;

    const confirmed = await confirmAction({
      title: "Clear Table",
      message:
        "Are you sure you want to clear this table? This will mark it as available and clear the current order.",
      confirmLabel: "Clear Table",
      tone: "neutral",
    });

    if (!confirmed) {
      return;
    }

    try {
      await tableService.clearTable(tableId);
      const updatedTables = tables.map((t) =>
        t.id === tableId
          ? { ...t, status: "available", currentOrder: null }
          : t,
      );
      dispatch({
        type: "SET_TABLES",
        payload: updatedTables,
      });
      loadTableStats();
      showToast("Table cleared successfully.", "success");
    } catch (error) {
      logger.error("Failed to clear table:", error);
      let errorMessage = "Failed to clear table.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const handleDownloadQR = async (tableId) => {
    if (!canDownloadQr) return;
    try {
      await tableService.downloadQRCode(tableId);
      showToast("QR code downloaded successfully.", "success");
    } catch (error) {
      logger.error("Failed to download QR code:", error);
      let errorMessage = "Failed to download QR code.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    }
  };

  const getOccupancyTime = (table) => {
    if (!table.lastOccupied || table.status !== "occupied") return null;
    const occupiedTime = new Date(table.lastOccupied);
    const now = new Date();
    const diffMinutes = Math.floor((now - occupiedTime) / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleTableSave = async () => {
    setShowTableForm(false);
    setEditingTable(null);
    await loadTables();
    await loadTableStats();
  };

  const sortedTables = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return [];
    const list = [...tables];
    list.sort((a, b) => {
      if (sortBy === "capacity") {
        const capA = Number(a.capacity) || 0;
        const capB = Number(b.capacity) || 0;
        return capA - capB;
      }
      if (sortBy === "location") {
        const locA = String(a.location || "").toLowerCase();
        const locB = String(b.location || "").toLowerCase();
        return locA.localeCompare(locB);
      }
      if (sortBy === "status") {
        const statA = String(a.status || "").toLowerCase();
        const statB = String(b.status || "").toLowerCase();
        return statA.localeCompare(statB);
      }
      const numA = parseInt(String(a.number).replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.number).replace(/\D/g, ""), 10) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.number).localeCompare(String(b.number));
    });
    return list;
  }, [tables, sortBy]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    locationFilter !== "All" ||
    capacityFilter !== "All" ||
    sortBy !== "number";

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setLocationFilter("All");
    setCapacityFilter("All");
    setSortBy("number");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Table Management
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {pagination.total} Tables
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage restaurant tables, monitor occupancy flow, and configure QR codes.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
          {canUseBatchQr && (
            <button
              onClick={() => setShowQRBatchOps(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              title="Batch QR Operations"
              type="button"
            >
              <Layers className="h-4 w-4 text-slate-500" />
              <span>Batch QR</span>
            </button>
          )}

          <button
            onClick={() => {
              loadTables();
              loadTableStats();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            title="Refresh tables"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              onClick={() => setView("grid")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                view === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
            >
              Grid View
            </button>
            <button
              onClick={() => setView("floor")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                view === "floor"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
            >
              Floor Plan
            </button>
          </div>

          {canCreateTable && (
            <button
              onClick={() => {
                setEditingTable(null);
                setShowTableForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800"
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Add Table</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
          const Icon = config.icon;
          const count = displayStats[statusKey] || 0;
          const isSelected = statusFilter === statusKey;

          return (
            <button
              key={statusKey}
              onClick={() =>
                setStatusFilter((current) =>
                  current === statusKey ? "all" : statusKey,
                )
              }
              className={`group flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${config.bg} ${config.border} ${
                isSelected ? "ring-2 ring-slate-900/20 shadow-md" : "hover:shadow-2xs"
              }`}
              type="button"
            >
              <div>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {count}
                </span>
                <p className={`mt-0.5 text-xs font-semibold ${config.text}`}>
                  {config.label}
                </p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.iconBg} shadow-2xs`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Box */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tables..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Status" },
              ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
                value,
                label: config.label,
              })),
            ]}
            placeholder="Select status"
          />

          {/* Location Filter */}
          <Select
            value={locationFilter}
            onChange={setLocationFilter}
            options={LOCATIONS.map((loc) => ({
              value: loc,
              label: loc === "All" ? "All Locations" : loc,
            }))}
            placeholder="Select location"
          />

          {/* Capacity Filter */}
          <Select
            value={capacityFilter}
            onChange={setCapacityFilter}
            options={CAPACITIES.map((cap) => ({
              value: cap,
              label: cap === "All" ? "All Capacities" : `${cap} People`,
            }))}
            placeholder="Select capacity"
          />

          {/* Sort By Filter */}
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "number", label: "Sort: Table Number" },
              { value: "capacity", label: "Sort: Capacity" },
              { value: "location", label: "Sort: Location" },
              { value: "status", label: "Sort: Status" },
            ]}
            placeholder="Sort by"
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content (Grid / Floor Plan) */}
      {loading ? (
        <AdminCardGridSkeleton
          count={6}
          cardHeight="h-56"
          columns="md:grid-cols-2 lg:grid-cols-3"
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sortedTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={handleEditTable}
              onDelete={handleDeleteTable}
              onOpenStatusModal={handleOpenStatusModal}
              onClearTable={handleClearTable}
              onDownloadQR={handleDownloadQR}
              onManageQR={handleManageQR}
              getOccupancyTime={getOccupancyTime}
              isReadOnly={isMonitoringMode}
              canEdit={canEditTable}
              canDelete={canDeleteTable}
              canManageQr={canManageQr}
              canUpdateStatus={canUpdateTableStatus}
            />
          ))}
        </div>
      ) : (
        <FloorPlanView
          tables={sortedTables}
          onTableClick={handleEditTable}
          onOpenStatusModal={handleOpenStatusModal}
          isReadOnly={isMonitoringMode}
          canEdit={canEditTable}
          canUpdateStatus={canUpdateTableStatus}
        />
      )}

      {/* Pagination */}
      <AdminPagination
        page={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        pageSize={PAGE_SIZE}
        itemLabel="tables"
        onPageChange={setCurrentPage}
      />

      {/* Empty State */}
      {!loading && tables.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-16 text-center shadow-2xs">
          <Utensils className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">
            No tables match your criteria
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search terms or filter selections.
          </p>

          {hasActiveFilters ? (
            <button
              onClick={clearAllFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          ) : null}
        </div>
      )}

      {/* Modals & Overlays */}
      {(canCreateTable || canEditTable) && showTableForm && (
        <TableForm
          table={editingTable}
          onSave={handleTableSave}
          onCancel={() => {
            setShowTableForm(false);
            setEditingTable(null);
          }}
          showToast={showToast}
        />
      )}

      {canManageQr && showQRManagement && selectedTableForQR && (
        <QrManagementOverlay
          table={selectedTableForQR}
          onClose={() => {
            setShowQRManagement(false);
            setSelectedTableForQR(null);
          }}
          onSuccess={(message) => {
            loadTables();
            loadTableStats();
            showToast(message, "success");
          }}
        />
      )}

      {canUseBatchQr && (
        <AdminModal
          isOpen={showQRBatchOps}
          title="Batch QR Operations"
          subtitle="Perform bulk download, regenerate, and print actions for table QR codes."
          onClose={() => setShowQRBatchOps(false)}
          maxWidth="max-w-2xl"
        >
          <QRBatchOperations
            tables={tables}
            onClose={() => setShowQRBatchOps(false)}
            onSuccess={(message) => {
              loadTables();
              loadTableStats();
              showToast(message, "success");
            }}
          />
        </AdminModal>
      )}

      {/* Table Status Update Modal */}
      {canUpdateTableStatus && showStatusModal && selectedTableForStatus && (
        <TableStatusModal
          table={selectedTableForStatus}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedTableForStatus(null);
          }}
          onSaveStatus={async (tableId, newStatus, notes) => {
            await handleStatusChange(tableId, newStatus, notes);
            setShowStatusModal(false);
            setSelectedTableForStatus(null);
          }}
        />
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}

function TableStatusModal({ table, onClose, onSaveStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(table.status || "available");
  const [notes, setNotes] = useState(table.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await onSaveStatus(table.id, selectedStatus, notes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={true}
      title={`Update Status — Table ${table.number}`}
      subtitle={`${table.tableName ? table.tableName + " • " : ""}${table.location || "Main Hall"}`}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Select Table Status
          </label>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
              const Icon = config.icon;
              const isSelected = selectedStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setSelectedStatus(statusKey)}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                    isSelected
                      ? `border-slate-900 ${config.bg} shadow-2xs ring-2 ring-slate-900/20`
                      : "border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900">
                        {config.label}
                      </span>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Status Notes & Reason (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add status notes (e.g. maintenance reason, party reservation notes...)"
            className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Save Status</span>
              </>
            )}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function TableCard({
  table,
  onEdit,
  onDelete,
  onOpenStatusModal,
  onClearTable,
  onManageQR,
  getOccupancyTime,
  isReadOnly = false,
  canEdit = false,
  canDelete = false,
  canManageQr = false,
  canUpdateStatus = false,
}) {
  const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const StatusIcon = statusConfig.icon;
  const occupancyTime = getOccupancyTime(table);

  const getTokenStatus = () => {
    if (!table.tokenExpiry) return null;
    const daysRemaining = table.tokenDaysRemaining;
    if (daysRemaining <= 0) {
      return { label: "Token Expired", color: "rose" };
    } else if (daysRemaining <= 7) {
      return { label: "Expiring Soon", color: "amber" };
    }
    return null;
  };
  const tokenStatus = getTokenStatus();

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all duration-200 hover:shadow-md hover:border-slate-300">
      {/* Card Header */}
      <div className={`border-b px-4 py-3.5 ${statusConfig.bg} ${statusConfig.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${statusConfig.iconBg} shadow-2xs`}>
              <StatusIcon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Table {table.number}
                </h3>
                {table.tableName && (
                  <span className="truncate max-w-[130px] rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {table.tableName}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{table.location}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>{table.capacity}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col space-y-3">
        {tokenStatus && (
          <div
            className={`rounded-xl border p-2 text-center text-xs font-semibold ${
              tokenStatus.color === "rose"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}
          >
            {tokenStatus.label}
          </div>
        )}

        {/* Active Order Card */}
        {table.currentOrder && (
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-3 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-900 text-xs truncate">
                  Order #{table.currentOrder.orderNumber || table.currentOrder.id}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {table.currentOrder.items?.length || 0} items
                  </span>
                  <span className="text-xs font-bold text-amber-900">
                    ${(table.currentOrder.totalAmount || table.currentOrder.total)?.toFixed(2)}
                  </span>
                </div>
              </div>
              {occupancyTime && (
                <span className="shrink-0 rounded-lg bg-amber-200/80 px-2 py-1 text-[10px] font-bold text-amber-900">
                  {occupancyTime}
                </span>
              )}
            </div>

            {!isReadOnly && canUpdateStatus && (
              <button
                onClick={() => onClearTable(table.id)}
                className="mt-2.5 w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700 shadow-2xs"
                type="button"
              >
                Clear Table
              </button>
            )}
          </div>
        )}

        {/* Reservation Card */}
        {table.reservation && (
          <div className="rounded-xl border border-sky-200/90 bg-sky-50/60 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
              Reserved
            </span>
            <p className="mt-0.5 text-xs font-bold text-sky-900 truncate">
              {table.reservation.customerName}
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-sky-700">
              <span>{table.reservation.partySize} guests</span>
              <span>
                {new Date(table.reservation.time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        )}

        {/* Maintenance Warning */}
        {table.maintenanceReason && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
            <span className="font-bold text-rose-800 uppercase tracking-wider text-[10px]">
              Maintenance
            </span>
            <p className="mt-0.5 text-rose-700 line-clamp-2">
              {table.maintenanceReason}
            </p>
          </div>
        )}

        {/* Notes & Last Occupied */}
        <div className="mt-auto space-y-2 pt-1">
          {table.lastOccupied && !table.currentOrder && (
            <div className="flex items-center text-[11px] text-slate-500">
              <Clock className="mr-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">
                Last occupied:{" "}
                {new Date(table.lastOccupied).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          )}

          {table.notes && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Note:</span>{" "}
              <span className="line-clamp-2">{table.notes}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200/80 pt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenStatusModal(table)}
              disabled={isReadOnly || !canUpdateStatus}
              className={`inline-flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-2xs ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} hover:opacity-90 disabled:opacity-60`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{statusConfig.label}</span>
              </div>
              {!isReadOnly && canUpdateStatus && (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
            </button>

            {!isReadOnly && canManageQr && (
              <button
                onClick={() => onManageQR(table)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 shadow-2xs"
                title="Manage QR Code"
                type="button"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Manage QR</span>
              </button>
            )}
          </div>

          {!isReadOnly && (canEdit || canDelete) && (
            <div className="flex items-center justify-end gap-2">
              {canEdit && (
                <button
                  onClick={() => onEdit(table)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  type="button"
                >
                  <Edit className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(table.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FloorPlanView({
  tables,
  onTableClick,
  onOpenStatusModal,
  isReadOnly = false,
  canEdit = false,
  canUpdateStatus = false,
}) {
  const locations = [...new Set(tables.map((t) => t.location))];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Restaurant Floor Plan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual table arrangement grouped by restaurant zones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
            <div key={statusKey} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {locations.map((location) => {
          const locationTables = tables.filter((t) => t.location === location);
          return (
            <div
              key={location}
              className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h4 className="font-bold text-slate-900 text-sm">{location}</h4>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {locationTables.length}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {locationTables.map((table) => (
                  <FloorPlanTable
                    key={table.id}
                    table={table}
                    onClick={onTableClick}
                    onOpenStatusModal={onOpenStatusModal}
                    isReadOnly={isReadOnly}
                    canEdit={canEdit}
                    canUpdateStatus={canUpdateStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FloorPlanTable({
  table,
  onClick,
  onOpenStatusModal,
  isReadOnly = false,
  canEdit = false,
  canUpdateStatus = false,
}) {
  const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;

  return (
    <div className="group relative">
      <button
        onClick={() => {
          if (!isReadOnly && canUpdateStatus) {
            onOpenStatusModal(table);
          } else if (!isReadOnly && canEdit) {
            onClick(table);
          }
        }}
        className={`w-full rounded-2xl border p-3.5 text-center transition-all duration-200 hover:scale-105 shadow-2xs ${statusConfig.bg} ${statusConfig.border}`}
        type="button"
      >
        <div className="font-bold text-slate-900 text-sm">Table {table.number}</div>
        <div className="mt-0.5 text-xs text-slate-500">{table.capacity} Seats</div>
        <div className={`mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold ${statusConfig.text}`}>
          <span>{statusConfig.label}</span>
          {!isReadOnly && canUpdateStatus && <ChevronDown className="h-3 w-3 opacity-70" />}
        </div>
        {table.currentOrder && (
          <div className="absolute -top-1 -right-1">
            <span className="flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500" />
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
