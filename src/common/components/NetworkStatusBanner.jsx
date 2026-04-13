import React, { useEffect, useState } from "react";
import { CloudOff, Wifi, WifiOff, X } from "lucide-react";
import { useNetwork } from "../context/NetworkContext";
export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetwork();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
  }, [isOnline, isSlowConnection]);
  if ((isOnline && !isSlowConnection) || dismissed) {
    return null;
  }
  const toneClassName = isOnline
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-rose-200 bg-rose-50 text-rose-900";
  const Icon = isOnline ? Wifi : WifiOff;
  const message = isOnline
    ? "Slow connection detected. Showing lighter experience where possible."
    : "You are offline. Previously opened screens can still use cached data.";
  return (
    <div className={`sticky top-0 z-60 border-b px-4 py-2 ${toneClassName}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 font-medium">{message}</span>
        {!isOnline ? (
          <CloudOff className="ml-auto h-4 w-4 shrink-0 opacity-70" />
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
          aria-label="Dismiss network status banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
export default NetworkStatusBanner;
