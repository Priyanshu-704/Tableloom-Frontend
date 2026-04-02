import React, { useEffect, useMemo, useState } from "react";
import { Layers, QrCode, Search } from "lucide-react";
import { Input } from "../../common/components/ui/input";
import { Button } from "../../common/components/ui/button";
import tableService from "../../common/services/TableService";
import { QRBatchOperations } from "./QRBatchOperations";
import { useAdmin } from "../context/AdminContext";
import { AdminCardGridSkeleton } from "../components/common/AdminSkeleton";
import { QrManagementOverlay } from "../components/tables/QrManagementOverlay";
import { AdminModal } from "../components/common/AdminModal";
import { withTenantQueryParams } from "../../common/utils/qrImage";
export function TableQrManagement() {
  const { addNotification } = useAdmin();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [showBatch, setShowBatch] = useState(false);
  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true);
        const response = await tableService.getTables();
        const rows = (response?.data?.data || []).map((table) => ({
          id: table._id,
          number: table.tableNumber,
          tableName: table.tableName,
          capacity: table.capacity,
          location: table.location,
          qrCode: withTenantQueryParams(table.qrCode),
          qrUrl: table.qrUrl,
          tokenExpiry: table.tokenExpiry,
          tokenDaysRemaining: table.tokenDaysRemaining,
        }));
        setTables(rows);
      } catch {
        addNotification("Failed to load tables for QR management", "error");
      } finally {
        setLoading(false);
      }
    };
    loadTables();
  }, [addNotification]);
  const filteredTables = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return tables;
    }
    return tables.filter((table) => {
      return (
        String(table.number || "")
          .toLowerCase()
          .includes(keyword) ||
        String(table.tableName || "")
          .toLowerCase()
          .includes(keyword) ||
        String(table.location || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [search, tables]);
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Update</h1>
          <p className="text-sm leading-6 text-gray-600">
            Regenerate, print, refresh, and batch-manage table QR codes.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowBatch(true)}
          className="w-full sm:w-auto"
        >
          <Layers className="h-4 w-4" />
          Batch QR Operations
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table number, name, or location"
            className="h-11 pl-10"
          />
        </div>
      </div>

      {loading ? (
        <AdminCardGridSkeleton count={6} cardHeight="h-48" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Table {table.number}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {table.tableName || "No table name"} •{" "}
                    {table.location || "N/A"}
                  </p>
                </div>
                <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  {table.capacity || 0} seats
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Token expiry:{" "}
                  {table.tokenExpiry
                    ? new Date(table.tokenExpiry).toLocaleDateString()
                    : "Not available"}
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Route:{" "}
                  <span className="font-medium text-slate-900">QR linked</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setSelectedTable(table)}
                  className="w-full sm:w-auto"
                >
                  <QrCode className="h-4 w-4" />
                  Manage QR
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTable ? (
        <QrManagementOverlay
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onSuccess={(message) => {
            addNotification(message, "success");
            setSelectedTable(null);
            tableService
              .getTables()
              .then((response) => {
                const rows = (response?.data?.data || []).map((table) => ({
                  id: table._id,
                  number: table.tableNumber,
                  tableName: table.tableName,
                  capacity: table.capacity,
                  location: table.location,
                  qrCode: withTenantQueryParams(table.qrCode),
                  qrUrl: table.qrUrl,
                  tokenExpiry: table.tokenExpiry,
                  tokenDaysRemaining: table.tokenDaysRemaining,
                }));
                setTables(rows);
              })
              .catch(() => {});
          }}
        />
      ) : null}

      <AdminModal
        isOpen={showBatch}
        title="Batch QR Operations"
        subtitle="Perform operations on multiple QR codes."
        onClose={() => setShowBatch(false)}
        maxWidth="max-w-2xl"
      >
        <QRBatchOperations
          tables={tables}
          onClose={() => setShowBatch(false)}
          onSuccess={(message) => {
            addNotification(message, "success");
            setShowBatch(false);
          }}
        />
      </AdminModal>
    </div>
  );
}
