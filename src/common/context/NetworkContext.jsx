import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
const NetworkContext = createContext({
  isOnline: true,
  isSlowConnection: false
});
const getConnectionState = () => {
  if (typeof navigator === "undefined") {
    return {
      isOnline: true,
      isSlowConnection: false
    };
  }
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  const downlink = Number(connection?.downlink || 0);
  return {
    isOnline: navigator.onLine !== false,
    isSlowConnection: effectiveType.includes("2g") || effectiveType === "slow-2g" || downlink > 0 && downlink < 1
  };
};
export function NetworkProvider({
  children
}) {
  const [networkState, setNetworkState] = useState(getConnectionState);
  useEffect(() => {
    const updateNetworkState = () => {
      setNetworkState(getConnectionState());
    };
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    connection?.addEventListener?.("change", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
      connection?.removeEventListener?.("change", updateNetworkState);
    };
  }, []);
  const value = useMemo(() => ({
    ...networkState
  }), [networkState]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
export const useNetwork = () => useContext(NetworkContext);
