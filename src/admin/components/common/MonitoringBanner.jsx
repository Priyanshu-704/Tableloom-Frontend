import React from "react";
import { Eye } from "lucide-react";
export function MonitoringBanner({
  message = "Read-only monitoring mode is active. Super Admin can view tenant data but cannot perform operational actions."
}) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Monitoring Mode</p>
          <p className="mt-1 text-sm text-amber-800">{message}</p>
        </div>
      </div>
    </div>;
}
