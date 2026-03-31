import { logger } from "../../common/utils/logger.js";
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { Users, Plus, Search, Edit, Trash2, Clock, CheckCircle, XCircle, Utensils, RefreshCw, Layers, QrCode } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { TableForm } from "../components/tables/TableForm";
import tableService from "../../common/services/TableService";
import Select from "../components/common/Select";
import { AdminModal } from "../components/common/AdminModal";
import AdminPagination from "../components/common/AdminPagination";
import { AdminCardGridSkeleton } from "../components/common/AdminSkeleton";
import { QRBatchOperations } from "./QRBatchOperations";
import { QRManagement } from "./QRManagement";
import { ToastContainer } from "../../user/components/common/Toast";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import { MonitoringBanner } from "../components/common/MonitoringBanner";
const STATUS_CONFIG = {
  available: {
    label: "Available",
    color: "green",
    icon: CheckCircle,
    description: "Ready for customers"
  },
  occupied: {
    label: "Occupied",
    color: "orange",
    icon: Utensils,
    description: "Currently serving customers"
  },
  reserved: {
    label: "Reserved",
    color: "blue",
    icon: Clock,
    description: "Reserved for future booking"
  },
  maintenance: {
    label: "Maintenance",
    color: "red",
    icon: XCircle,
    description: "Under maintenance"
  },
  cleaning: {
    label: "Cleaning",
    color: "yellow",
    icon: RefreshCw,
    description: "Being cleaned"
  },
  billing: {
    label: "Billing",
    color: "purple",
    icon: Clock,
    description: "Processing payment"
  }
};
const LOCATIONS = ["All", "Main Hall", "Private Room", "Outdoor", "Bar Area", "Terrace"];
const CAPACITIES = ["All", "2", "4", "6", "8+"];
export function TableManagement() {
  const PAGE_SIZE = 12;
  const {
    tables,
    dispatch,
    user,
    confirmAction
  } = useAdmin();
  const isMonitoringMode = useMonitoringMode();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const handleManageQR = table => {
    if (isMonitoringMode) {
      return;
    }
    setSelectedTableForQR(table);
    setShowQRManagement(true);
  };
  const showToast = (message, type = "info", duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, {
      id,
      message,
      type,
      duration
    }]);
  };
  const removeToast = id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
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
        const transformedTables = response.data.map(table => ({
          id: table._id,
          number: table.tableNumber,
          tableName: table.tableName,
          capacity: table.capacity,
          status: table.status,
          location: formatLocationForDisplay(table.location),
          currentOrder: table.currentOrder,
          lastOccupied: table.lastOccupied,
          qrCode: table.qrCode,
          qrUrl: table.qrUrl,
          tokenExpiry: table.tokenExpiry,
          tokenDaysRemaining: table.tokenDaysRemaining,
          tokenExpired: table.tokenExpired,
          notes: table.notes,
          isActive: table.isActive
        }));
        dispatch({
          type: "SET_TABLES",
          payload: transformedTables
        });
        setPagination({
          page: response.pagination?.page || currentPage,
          pages: response.pagination?.pages || 1,
          total: response.total || 0
        });
      }
    } catch (error) {
      logger.error("Failed to load tables:", error);
    } finally {
      setLoading(false);
    }
  }, [capacityFilter, currentPage, dispatch, locationFilter, searchTerm, statusFilter, user?.role]);
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
  const formatLocationForDisplay = location => {
    const locationMap = {
      "main hall": "Main Hall",
      "private-room": "Private Room",
      outdoor: "Outdoor",
      bar: "Bar Area",
      terrace: "Terrace",
      indoor: "Indoor"
    };
    return locationMap[location] || location;
  };
  const formatLocationForApi = location => {
    const locationMap = {
      "Main Hall": "main hall",
      "Private Room": "private-room",
      Outdoor: "outdoor",
      "Bar Area": "bar",
      Terrace: "terrace",
      Indoor: "indoor"
    };
    return locationMap[location] || location;
  };
  const displayStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.totalTables || tables.length,
        available: stats.available || tables.filter(t => t.status === "available").length,
        occupied: stats.occupied || tables.filter(t => t.status === "occupied").length,
        reserved: stats.reserved || tables.filter(t => t.status === "reserved").length,
        maintenance: stats.maintenance || tables.filter(t => t.status === "maintenance").length,
        cleaning: tables.filter(t => t.status === "cleaning").length,
        billing: tables.filter(t => t.status === "billing").length
      };
    }
    return {
      total: tables.length,
      available: tables.filter(t => t.status === "available").length,
      occupied: tables.filter(t => t.status === "occupied").length,
      reserved: tables.filter(t => t.status === "reserved").length,
      maintenance: tables.filter(t => t.status === "maintenance").length,
      cleaning: tables.filter(t => t.status === "cleaning").length,
      billing: tables.filter(t => t.status === "billing").length
    };
  }, [tables, stats]);
  const handleAddTable = () => {
    if (isMonitoringMode) {
      return;
    }
    setEditingTable(null);
    setShowTableForm(true);
  };
  const handleEditTable = table => {
    if (isMonitoringMode) {
      return;
    }
    setEditingTable(table);
    setShowTableForm(true);
  };
  const handleDeleteTable = async tableId => {
    if (isMonitoringMode) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete Table",
      message: "Are you sure you want to delete this table?",
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!confirmed) return;
    try {
      await tableService.deleteTable(tableId);
      const updatedTables = tables.filter(t => t.id !== tableId);
      dispatch({
        type: "SET_TABLES",
        payload: updatedTables
      });
      loadTableStats();
      showToast("Table deleted successfully", "success");
    } catch (error) {
      let errorMessage = "Failed to delete table.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    }
  };
  const handleStatusChange = async (tableId, newStatus) => {
    if (isMonitoringMode) {
      return;
    }
    try {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;
      if (newStatus === "maintenance" && table.currentOrder) {
        const confirmed = await confirmAction({
          title: "Mark Table As Maintenance",
          message: "This table has an active order. Are you sure you want to mark it as maintenance?",
          confirmLabel: "Mark Maintenance",
          tone: "warning"
        });
        if (!confirmed) {
          return;
        }
      }
      await tableService.updateTableStatus(tableId, newStatus, `Status changed to ${newStatus} by ${user?.name || "staff"}`);
      const updatedTables = tables.map(table => table.id === tableId ? {
        ...table,
        status: newStatus
      } : table);
      dispatch({
        type: "SET_TABLES",
        payload: updatedTables
      });
      loadTableStats();
    } catch (error) {
      logger.error("Failed to update table status:", error);
      let errorMessage = "Failed to update table status.";
      if (error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
      }
      showToast(errorMessage, "error");
    }
  };
  const handleClearTable = async tableId => {
    if (isMonitoringMode) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Clear Table",
      message: "Are you sure you want to clear this table?",
      confirmLabel: "Clear Table",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }
    try {
      await tableService.updateTableStatus(tableId, "available", `Table cleared by ${user?.name || "staff"}`);
      const updatedTables = tables.map(table => table.id === tableId ? {
        ...table,
        status: "available",
        currentOrder: null,
        lastOccupied: new Date().toISOString()
      } : table);
      dispatch({
        type: "SET_TABLES",
        payload: updatedTables
      });
      loadTableStats();
    } catch (error) {
      logger.error("Failed to clear table:", error);
      let errorMessage = "Failed to clear table.";
      if (error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
      }
      showToast(errorMessage, "error");
    }
  };
  const handleDownloadQR = async (tableId, tableNumber) => {
    try {
      await tableService.downloadQRCode(tableId);
    } catch (error) {
      logger.error("Failed to download QR code:", error);
      showToast(error.response?.data?.message || "Failed to download QR code. Please try again.", "error");
    }
  };
  const handleRefresh = () => {
    loadTables();
    loadTableStats();
  };
  const getOccupancyTime = table => {
    if (!table.currentOrder?.startedAt) return null;
    const started = new Date(table.currentOrder.startedAt);
    const now = new Date();
    const diffMs = now - started;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };
  const handleTableSave = async () => {
    setShowTableForm(false);
    setEditingTable(null);
    await loadTables();
    await loadTableStats();
  };
  return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-600">
            Manage restaurant tables and monitor occupancy
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {!isMonitoringMode && <button onClick={() => setShowQRBatchOps(true)} className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Batch QR Operations">
              <Layers className="h-4 w-4" />
              <span>Batch QR</span>
            </button>}
          <button onClick={handleRefresh} disabled={loading} className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {}
          <div className="flex min-w-0 flex-1 rounded-lg bg-gray-100 p-1 sm:min-w-[220px] sm:flex-none">
            <button onClick={() => setView("grid")} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              Grid View
            </button>
            <button onClick={() => setView("map")} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${view === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              Floor Plan
            </button>
          </div>

          {!isMonitoringMode && <button onClick={handleAddTable} className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
              <Plus className="h-4 w-4" />
              <span>Add Table</span>
            </button>}
        </div>
      </div>
      {isMonitoringMode && <MonitoringBanner message="Table layouts, occupancy, and QR status are visible in monitoring mode, but table edits, status updates, QR management, and destructive actions are disabled." />}
      {}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const Icon = config.icon;
        const count = displayStats[status] || 0;
        return <div key={status} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600">{config.label}</p>
                </div>
                <div className={`p-2 bg-${config.color}-50 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${config.color}-600`} />
                </div>
              </div>
            </div>;
      })}
      </div>
      {}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input type="text" placeholder="Search tables..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>

          {}
          <Select value={statusFilter} onChange={setStatusFilter} options={[{
          value: "all",
          label: "All Status"
        }, ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
          value,
          label: config.label
        }))]} placeholder="Select status" size="md" variant="outlined" />

          {}
          <Select value={locationFilter} onChange={setLocationFilter} options={LOCATIONS.map(loc => ({
          value: loc,
          label: loc
        }))} placeholder="Select location" searchable />

          {}
          <Select value={capacityFilter} onChange={setCapacityFilter} options={CAPACITIES.map(cap => ({
          value: cap,
          label: cap === "All" ? "All Capacity" : `${cap} People`
        }))} placeholder="Select capacity" />

          {}
          <Select value="number" onChange={() => {}} options={[{
          value: "number",
          label: "Table Number"
        }, {
          value: "capacity",
          label: "Capacity"
        }, {
          value: "location",
          label: "Location"
        }]} placeholder="Sort by" />
        </div>
      </div>
      {}
      {loading ? <AdminCardGridSkeleton count={6} cardHeight="h-56" columns="md:grid-cols-2 lg:grid-cols-3" /> : view === "grid" ? <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tables.map(table => <TableCard key={table.id} table={table} onEdit={handleEditTable} onDelete={handleDeleteTable} onStatusChange={handleStatusChange} onClearTable={handleClearTable} onDownloadQR={handleDownloadQR} onManageQR={handleManageQR} getOccupancyTime={getOccupancyTime} isReadOnly={isMonitoringMode} />)}
        </div> : <FloorPlanView tables={tables} onTableClick={handleEditTable} onStatusChange={handleStatusChange} isReadOnly={isMonitoringMode} />}
      <AdminPagination page={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={PAGE_SIZE} itemLabel="tables" onPageChange={setCurrentPage} />
      {!loading && tables.length === 0 && <div className="text-center py-12">
          <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tables found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or filter criteria
          </p>
        </div>}
      {!isMonitoringMode && showTableForm && <TableForm table={editingTable} onSave={handleTableSave} onCancel={() => {
      setShowTableForm(false);
      setEditingTable(null);
    }} showToast={showToast} />}{" "}
      {!isMonitoringMode && showQRManagement && selectedTableForQR && <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <QRManagement table={selectedTableForQR} onClose={() => {
        setShowQRManagement(false);
        setSelectedTableForQR(null);
      }} onSuccess={message => {
        loadTables();
        loadTableStats();
        showToast(message, "success");
      }} />
        </div>}
      {!isMonitoringMode && <AdminModal isOpen={showQRBatchOps} title="Batch QR Operations" subtitle="Perform bulk download, regenerate, and print actions for table QR codes." onClose={() => setShowQRBatchOps(false)} maxWidth="max-w-2xl">
        <QRBatchOperations tables={tables} onClose={() => setShowQRBatchOps(false)} onSuccess={message => {
        loadTables();
        loadTableStats();
        showToast(message, "success");
      }} />
      </AdminModal>}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>;
}
function TableCard({
  table,
  onEdit,
  onDelete,
  onStatusChange,
  onClearTable,
  onManageQR,
  getOccupancyTime,
  isReadOnly = false
}) {
  const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const StatusIcon = statusConfig.icon;
  const occupancyTime = getOccupancyTime(table);
  const getTokenStatus = () => {
    if (!table.tokenExpiry) return null;
    const daysRemaining = table.tokenDaysRemaining;
    if (daysRemaining <= 0) {
      return {
        label: "Token Expired",
        color: "red"
      };
    } else if (daysRemaining <= 7) {
      return {
        label: "Token Expiring Soon",
        color: "orange"
      };
    }
    return null;
  };
  const tokenStatus = getTokenStatus();
  const getStatusStyles = () => {
    const styles = {
      available: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: "text-green-600",
        badge: "bg-green-100"
      },
      occupied: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        icon: "text-orange-600",
        badge: "bg-orange-100"
      },
      reserved: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: "text-blue-600",
        badge: "bg-blue-100"
      },
      maintenance: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: "text-red-600",
        badge: "bg-red-100"
      },
      cleaning: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        icon: "text-yellow-600",
        badge: "bg-yellow-100"
      },
      billing: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        icon: "text-purple-600",
        badge: "bg-purple-100"
      }
    };
    return styles[table.status] || styles.available;
  };
  const statusStyles = getStatusStyles();
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full">
      {}
      <div className={`${statusStyles.bg} ${statusStyles.border} border-b px-4 py-3`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg ${statusStyles.badge} flex-shrink-0`}>
              <StatusIcon className={`h-5 w-5 ${statusStyles.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  Table {table.number}
                </h3>
                {table.tableName && <span className="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 truncate max-w-[150px]">
                    {table.tableName}
                  </span>}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{table.location}</p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
              <Users className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {table.capacity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="p-4 flex-1 flex flex-col">
        {}
        {tokenStatus && <div className={`mb-3 p-2 bg-${tokenStatus.color}-50 border border-${tokenStatus.color}-200 rounded-lg flex items-center justify-center`}>
            <span className={`text-xs font-medium text-${tokenStatus.color}-700`}>
              ⚠️ {tokenStatus.label}
            </span>
          </div>}

        {}
        {table.currentOrder && <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-orange-900 text-sm truncate">
                    Order #
                    {table.currentOrder.orderNumber || table.currentOrder.id}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      {table.currentOrder.items?.length || 0} items
                    </span>
                    <span className="text-xs font-medium text-orange-700">
                      $
                      {(table.currentOrder.totalAmount || table.currentOrder.total)?.toFixed(2)}
                    </span>
                  </div>
                </div>
                {occupancyTime && <div className="flex-shrink-0 ml-2">
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-lg whitespace-nowrap">
                      ⏱️ {occupancyTime}
                    </span>
                  </div>}
              </div>
              {!isReadOnly && <button onClick={() => onClearTable(table.id)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                  Clear Table
                </button>}
            </div>
          </div>}

        {}
        {table.reservation && <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Reserved
              </span>
            </div>
            <p className="font-medium text-blue-900 text-sm truncate">
              {table.reservation.customerName}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-blue-700">
                👥 {table.reservation.partySize} people
              </p>
              <p className="text-xs text-blue-700">
                🕐{" "}
                {new Date(table.reservation.time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
              </p>
            </div>
          </div>}

        {}
        {table.maintenanceReason && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                Maintenance
              </span>
            </div>
            <p className="text-xs text-red-700 line-clamp-2">
              {table.maintenanceReason}
            </p>
          </div>}

        {}
        <div className="mt-auto space-y-2">
          {table.lastOccupied && !table.currentOrder && <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">
                Last occupied:{" "}
                {new Date(table.lastOccupied).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            })}
              </span>
            </div>}

          {table.notes && <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="font-medium text-gray-700">📝 Note:</span>{" "}
              <span className="text-gray-600 line-clamp-2">{table.notes}</span>
            </div>}
        </div>

        {}
        <div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
          {}
          <div className="flex items-center justify-between gap-3">
            {}
            <div className="relative flex-1">
              <Select value={table.status} onChange={newStatus => onStatusChange(table.id, newStatus)} options={Object.entries(STATUS_CONFIG).map(([value, config]) => ({
              value,
              label: config.label
            }))} size="sm" variant="filled" className="flex-1" disabled={isReadOnly} />

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {}
            {table.qrCode && !isReadOnly && <button onClick={() => onManageQR(table)} className="flex items-center justify-center space-x-1 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors px-3 py-2 rounded-lg border border-purple-200 hover:bg-purple-50 whitespace-nowrap" title="Manage QR code">
                <QrCode className="h-4 w-4" />
                <span>Manage QR</span>
              </button>}
          </div>

          {}
          {!isReadOnly && <div className="flex items-center justify-end space-x-3">
              <button onClick={() => onEdit(table)} className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>

              <button onClick={() => onDelete(table.id)} className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>}
        </div>
      </div>
    </div>;
}
function FloorPlanView({
  tables,
  onTableClick,
  onStatusChange,
  isReadOnly = false
}) {
  const locations = [...new Set(tables.map(t => t.location))];
  const handleQuickStatusChange = (tableId, newStatus, e) => {
    e.stopPropagation();
    onStatusChange(tableId, newStatus);
  };
  return <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Restaurant Floor Plan
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => <div key={status} className="flex items-center space-x-2">
              <div className={`w-3 h-3 bg-${config.color}-500 rounded-full`}></div>
              <span>{config.label}</span>
            </div>)}
        </div>
      </div>

      <div className="space-y-6">
        {locations.map(location => {
        const locationTables = tables.filter(t => t.location === location);
        return <div key={location} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">{location}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {locationTables.map(table => <FloorPlanTable key={table.id} table={table} onClick={onTableClick} onStatusChange={handleQuickStatusChange} isReadOnly={isReadOnly} />)}
              </div>
            </div>;
      })}
      </div>
    </div>;
}
function FloorPlanTable({
  table,
  onClick,
  onStatusChange,
  isReadOnly = false
}) {
  const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const getStatusColor = () => {
    const colors = {
      available: "green",
      occupied: "orange",
      reserved: "blue",
      maintenance: "red",
      cleaning: "yellow",
      billing: "purple"
    };
    return colors[table.status] || "gray";
  };
  const color = getStatusColor();
  return <div className="relative group">
      <button onClick={() => {
      if (!isReadOnly) {
        onClick(table);
      }
    }} className={`w-full p-3 rounded-lg border-2 text-center transition-all hover:scale-105 bg-${color}-50 border-${color}-300`}>
        <div className="font-semibold text-gray-900">Table {table.number}</div>
        <div className="text-sm text-gray-600">{table.capacity} people</div>
        <div className={`text-xs mt-1 text-${color}-700`}>
          {statusConfig.label}
        </div>
        {table.currentOrder && <div className="absolute -top-2 -right-2">
            <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
            </span>
          </div>}
      </button>

      {}
      {!isReadOnly && <div className="absolute top-full left-0 right-0 mt-1 hidden group-hover:block z-10">
          <Select value={table.status} onChange={newStatus => onStatusChange(table.id, newStatus)} options={Object.entries(STATUS_CONFIG).map(([value, config]) => ({
        value,
        label: config.label
      }))} size="sm" className="absolute top-full left-0 right-0 mt-1 hidden group-hover:block z-10" />
        </div>}
    </div>;
}
