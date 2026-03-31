import React, { useEffect, useState } from "react";
import { Bell, Loader2, Save, Activity, Clock3 } from "lucide-react";
import { Button } from "../../common/components/ui/button";
import { Checkbox } from "../../common/components/ui/checkbox";
import { kitchenService, settingsService } from "../../common/services";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../../common/context/SettingsContext";
import { useAuth } from "../../common/context/AuthContext";
import { AdminFormSkeleton } from "../components/common/AdminSkeleton";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
const defaultNotifications = {
  newOrders: true,
  orderUpdates: true,
  lowStock: true,
  tableCalls: true,
  reservationReminders: true,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false
};
const defaultDelayMonitor = {
  enabled: true,
  intervalMinutes: 5,
  notifyOnDelay: true,
  criticalThresholdMinutes: 15
};
const labels = {
  newOrders: "New orders",
  orderUpdates: "Order updates",
  lowStock: "Low stock alerts",
  tableCalls: "Table and waiter calls",
  reservationReminders: "Reservation reminders",
  emailNotifications: "Email notifications",
  pushNotifications: "Push notifications",
  smsNotifications: "SMS notifications"
};
export function NotificationSettings() {
  const {
    addNotification
  } = useAdmin();
  const {
    applySettings
  } = useSettings();
  const {
    hasPermission
  } = useAuth();
  const isMonitoringMode = useMonitoringMode();
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [delayMonitor, setDelayMonitor] = useState(defaultDelayMonitor);
  const [delayMonitorStatus, setDelayMonitorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const canRunManualCheck = hasPermission("view_statistics");
  const canManageNotificationSettings = !isMonitoringMode && hasPermission("system_settings");
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsService.getAdminSettings();
        setNotifications({
          ...defaultNotifications,
          ...(response?.data?.notifications || {})
        });
        setDelayMonitor({
          ...defaultDelayMonitor,
          ...(response?.data?.operations?.delayMonitor || {})
        });
        setDelayMonitorStatus(response?.meta?.delayMonitorStatus || null);
      } catch {
        setNotifications(defaultNotifications);
        setDelayMonitor(defaultDelayMonitor);
        setDelayMonitorStatus(null);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);
  const refreshDelayStatus = async () => {
    try {
      const response = await kitchenService.getDelayMonitorStatus();
      setDelayMonitorStatus(response?.data || null);
    } catch {
      setDelayMonitorStatus(null);
    }
  };
  const handleSave = async () => {
    if (!canManageNotificationSettings) {
      addNotification("You do not have permission to update notification settings", "error");
      return;
    }
    try {
      setSaving(true);
      const response = await settingsService.updateSettings({
        notifications,
        operations: {
          delayMonitor
        }
      });
      if (!response?.success) {
        addNotification(response?.message || "Failed to update notification settings", "error");
        return;
      }
      applySettings(response?.publicSettings || response?.data || {});
      setDelayMonitorStatus(response?.meta?.delayMonitorStatus || null);
      addNotification("Notification settings updated successfully", "success");
    } catch {
      addNotification("Failed to update notification settings", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleManualCheck = async () => {
    try {
      setRunningCheck(true);
      const response = await kitchenService.runDelayMonitorCheck();
      setDelayMonitorStatus(response?.meta?.delayMonitorStatus || delayMonitorStatus);
      addNotification(response?.message || "Delay monitor check completed successfully", "success");
      await refreshDelayStatus();
    } catch {
      addNotification("Failed to run delay monitor check", "error");
    } finally {
      setRunningCheck(false);
    }
  };
  return <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600">
          Control which operational alerts stay active across the restaurant.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          These notification preferences are saved only for the current tenant workspace.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? <AdminFormSkeleton fields={6} /> : <>
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Monitor Status</p>
                    <p className="text-base font-semibold text-gray-900">
                      {delayMonitorStatus?.isRunning ? "Running" : "Stopped"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Last Check</p>
                    <p className="text-base font-semibold text-gray-900">
                      {delayMonitorStatus?.lastCheck ? new Date(delayMonitorStatus.lastCheck).toLocaleString() : "Not checked yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Last Result</p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  {delayMonitorStatus?.lastRunSummary?.delayedOrdersFound ?? 0} delayed orders
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(labels).map(([field, label]) => <label key={field} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <Checkbox checked={Boolean(notifications?.[field])} disabled={!canManageNotificationSettings} onCheckedChange={checked => setNotifications(current => ({
              ...current,
              [field]: Boolean(checked)
            }))} />
                  <Bell className="h-4 w-4 text-primary-600" />
                  {label}
                </label>)}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Delay Monitor</h2>
                <p className="text-sm text-gray-600">
                  Control automated delayed-order scans and alert cadence.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <Checkbox checked={Boolean(delayMonitor?.enabled)} disabled={!canManageNotificationSettings} onCheckedChange={checked => setDelayMonitor(current => ({
                ...current,
                enabled: Boolean(checked)
              }))} />
                  Enable automatic delay monitoring
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <Checkbox checked={Boolean(delayMonitor?.notifyOnDelay)} disabled={!canManageNotificationSettings} onCheckedChange={checked => setDelayMonitor(current => ({
                ...current,
                notifyOnDelay: Boolean(checked)
              }))} />
                  Send delayed-order alerts
                </label>

                <label className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Check Interval
                  </span>
                  <input type="number" min="1" max="59" value={delayMonitor?.intervalMinutes ?? 5} onChange={event => setDelayMonitor(current => ({
                ...current,
                intervalMinutes: Number(event.target.value || 5)
              }))} disabled={!canManageNotificationSettings} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </label>

                <label className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Critical Delay Threshold
                  </span>
                  <input type="number" min="1" max="240" value={delayMonitor?.criticalThresholdMinutes ?? 15} onChange={event => setDelayMonitor(current => ({
                ...current,
                criticalThresholdMinutes: Number(event.target.value || 15)
              }))} disabled={!canManageNotificationSettings} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {canRunManualCheck ? <Button type="button" variant="outline" onClick={handleManualCheck} disabled={isMonitoringMode || runningCheck}>
                  {runningCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  Run Delay Check
                </Button> : null}

              <Button type="button" onClick={handleSave} disabled={!canManageNotificationSettings || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notification Settings
              </Button>
            </div>
          </>}
      </div>
    </div>;
}
