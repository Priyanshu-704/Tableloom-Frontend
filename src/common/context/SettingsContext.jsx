import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { settingsService } from "../services";
import { extractTenantFromPath, stripAppBasePath } from "../utils/routes.js";
const defaultSettings = {
  restaurant: {
    name: "Tableloom Restaurant",
    address: "123 Food Street, Culinary District, 10001",
    phone: "+1 (555) 123-4567",
    email: "hello@tableloom.app",
    website: "www.tableloom.app",
    description:
      "Tableloom turns table-side ordering into a polished dining flow with live menus, staff coordination, and smoother guest service.",
    logo: "/tableloom-mark.svg",
    logoThumbnail: "/tableloom-mark.svg",
    theme: "light",
  },
  businessHours: {
    Monday: {
      open: "11:00",
      close: "22:00",
      closed: false,
    },
    Tuesday: {
      open: "11:00",
      close: "22:00",
      closed: false,
    },
    Wednesday: {
      open: "11:00",
      close: "22:00",
      closed: false,
    },
    Thursday: {
      open: "11:00",
      close: "23:00",
      closed: false,
    },
    Friday: {
      open: "11:00",
      close: "23:00",
      closed: false,
    },
    Saturday: {
      open: "10:00",
      close: "23:00",
      closed: false,
    },
    Sunday: {
      open: "10:00",
      close: "21:00",
      closed: false,
    },
  },
  taxSettings: {
    taxRate: 9,
    serviceCharge: 10,
    taxInclusive: false,
    currency: "INR",
    currencySymbol: "₹",
  },
  paymentMethods: {
    cash: true,
    online: false,
    card: false,
    upi: false,
    digitalWallet: false,
    splitBill: true,
  },
  paymentGateway: {
    provider: "none",
    status: "inactive",
    enabled: false,
    credentialsConfigured: false,
    keyIdMask: "",
    configuredAt: null,
    updatedAt: null,
  },
};
const SettingsContext = createContext(null);
const mergeSettings = (current = defaultSettings, incoming = {}) => ({
  ...current,
  ...(incoming || {}),
  restaurant: {
    ...current.restaurant,
    ...(incoming?.restaurant || {}),
  },
  businessHours: {
    ...current.businessHours,
    ...(incoming?.businessHours || {}),
  },
  taxSettings: {
    ...current.taxSettings,
    ...(incoming?.taxSettings || {}),
  },
  paymentMethods: {
    ...current.paymentMethods,
    ...(incoming?.paymentMethods || {}),
  },
  paymentGateway: {
    ...current.paymentGateway,
    ...(incoming?.paymentGateway || {}),
  },
});
export function SettingsProvider({ children }) {
  const location = useLocation();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);
  const settingsScope = useMemo(() => {
    const tenant = extractTenantFromPath(location.pathname);
    if (tenant?.tenantSlug && tenant?.tenantKey) {
      return `tenant:${tenant.tenantSlug}:${tenant.tenantKey}`;
    }
    return `path:${stripAppBasePath(location.pathname)}`;
  }, [location.pathname]);
  const refreshSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getPublicSettings();
      const nextSettings = response?.data || {};
      setSettings((current) => mergeSettings(current, nextSettings || {}));
    } catch {
      setSettings((current) => current);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (hasFetchedRef.current && settingsScope === hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = settingsScope;
    refreshSettings();
  }, [settingsScope]);
  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
      applySettings: (nextSettings) =>
        setSettings((current) => mergeSettings(current, nextSettings)),
    }),
    [loading, settings],
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
