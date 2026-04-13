import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { QrCode } from "lucide-react";
import { buildCustomerPath } from "../../common/utils/routes";
const BYPASS_CUSTOMER_SESSION_GUARD =
  import.meta.env.DEV &&
  import.meta.env.VITE_BYPASS_CUSTOMER_SESSION_GUARD === "true";
function SessionRequiredRoute({ children, hasSession, isHydrating }) {
  const location = useLocation();
  if (BYPASS_CUSTOMER_SESSION_GUARD) {
    return children;
  }
  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (!hasSession) {
    return (
      <Navigate
        to={buildCustomerPath("/")}
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }
  return children;
}
export function ScanRequiredState() {
  if (BYPASS_CUSTOMER_SESSION_GUARD) {
    return null;
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <QrCode className="h-7 w-7 text-slate-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Scan Table QR To Continue
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You need a valid QR scan and an active dining session before accessing
          the app.
        </p>
      </div>
    </div>
  );
}
export default SessionRequiredRoute;
