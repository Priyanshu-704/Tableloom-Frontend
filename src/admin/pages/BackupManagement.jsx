import React, { useState } from "react";
import {
  CopyPlus,
  DatabaseBackup,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../common/components/ui/button";
import { backupAdminService } from "../../common/services";
import { useAuth } from "../../common/context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
export function BackupManagement() {
  const { addNotification } = useAdmin();
  const { hasPermission, user } = useAuth();
  const isMonitoringMode = useMonitoringMode();
  const isSuperAdmin = user?.role === "super_admin";
  const canManageBackups =
    hasPermission("backup_restore") && (!isMonitoringMode || isSuperAdmin);
  const [exporting, setExporting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [lastExportAt, setLastExportAt] = useState("");
  const [lastExportScope, setLastExportScope] = useState("");
  const [cloneSummary, setCloneSummary] = useState(null);
  const [targetConfig, setTargetConfig] = useState({
    targetUri: "",
    targetDbName: "",
    mode: "replace",
  });
  const handleExport = async () => {
    if (!canManageBackups) {
      addNotification("You do not have permission to export backups", "error");
      return;
    }
    try {
      setExporting(true);
      const response = await backupAdminService.exportBackup();
      if (!response?.success) {
        addNotification(
          response?.message || "Failed to export backup",
          "error",
        );
        return;
      }
      setLastExportAt(new Date().toLocaleString());
      setLastExportScope(response?.scope || "");
      addNotification(`Backup exported as ${response.filename}`, "success");
    } catch {
      addNotification("Failed to export backup", "error");
    } finally {
      setExporting(false);
    }
  };
  const handleClone = async () => {
    if (!canManageBackups) {
      addNotification("You do not have permission to clone backups", "error");
      return;
    }
    if (!targetConfig.targetUri.trim()) {
      addNotification("Target MongoDB URI is required", "error");
      return;
    }
    try {
      setCloning(true);
      const response = await backupAdminService.cloneBackup(targetConfig);
      if (!response?.success) {
        addNotification(response?.message || "Failed to clone backup", "error");
        return;
      }
      setCloneSummary(response?.data || null);
      addNotification(
        response?.message || "Backup cloned successfully",
        "success",
      );
    } catch (error) {
      addNotification(error?.message || "Failed to clone backup", "error");
    } finally {
      setCloning(false);
    }
  };
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Backup Management</h1>
        <p className="text-gray-600">
          Export and clone backup data with scope based on the signed-in role.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Super admins can export or clone the complete database. Restaurant
          admins are limited to their current tenant workspace only.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-primary-50 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-sm">
            <DatabaseBackup className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Backup
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {isSuperAdmin
                ? "Your export contains the full database snapshot across tenants."
                : "Your export contains only the current tenant workspace, with sensitive auth fields removed from staff records."}
            </p>
            {lastExportAt ? (
              <p className="mt-3 text-sm text-primary-700">
                Last export: {lastExportAt}
              </p>
            ) : null}
            {lastExportScope ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary-700">
                Scope: {lastExportScope.replace(/_/g, " ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            onClick={handleExport}
            disabled={!canManageBackups || exporting}
            className="w-full justify-center sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download Backup
          </Button>
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:justify-start">
            <ShieldCheck className="h-4 w-4" />
            {isSuperAdmin ? "Full database access" : "Tenant-only export"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            <CopyPlus className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Clone To Another Database
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {isSuperAdmin
                ? "Clone the full application database into another MongoDB cluster or database."
                : "Clone only this tenant's operational data into another MongoDB cluster or database."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 lg:col-span-2">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Target MongoDB URI
            </span>
            <input
              type="password"
              value={targetConfig.targetUri}
              onChange={(event) =>
                setTargetConfig((current) => ({
                  ...current,
                  targetUri: event.target.value,
                }))
              }
              placeholder="mongodb+srv://user:password@cluster.mongodb.net/"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </label>

          <label className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Target Database Name
            </span>
            <input
              type="text"
              value={targetConfig.targetDbName}
              onChange={(event) =>
                setTargetConfig((current) => ({
                  ...current,
                  targetDbName: event.target.value,
                }))
              }
              placeholder="tableloom_backup"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </label>

          <label className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Clone Mode
            </span>
            <select
              value={targetConfig.mode}
              onChange={(event) =>
                setTargetConfig((current) => ({
                  ...current,
                  mode: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="replace">Replace target collections</option>
              <option value="append">Append into target collections</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            onClick={handleClone}
            disabled={!canManageBackups || cloning}
            className="w-full justify-center sm:w-auto"
          >
            {cloning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CopyPlus className="h-4 w-4" />
            )}
            Clone Backup
          </Button>
          <p className="text-sm text-gray-500 sm:max-w-xl">
            The target database is written server-side using the URI you provide
            here. Scope enforcement happens in the backend before any data is
            copied.
          </p>
        </div>

        {cloneSummary?.collections ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Last clone target:{" "}
              {cloneSummary.targetDbName || "Unknown database"}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Scope:{" "}
              {String(cloneSummary.accessScope || "tenant_only").replace(
                /_/g,
                " ",
              )}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(cloneSummary.collections).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {key}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {value.count} records
                  </p>
                  <p className="text-sm text-gray-500">{value.collection}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
