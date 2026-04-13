import React, { useEffect, useMemo, useState } from "react";
import {
  Building,
  Clock,
  CreditCard,
  IndianRupee,
  Loader2,
  Bell,
  Shield,
  UserCircle2,
  Save,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../common/context/AuthContext";
import { useSettings } from "../../common/context/SettingsContext";
import { settingsService, userService } from "../../common/services";
import {
  buildAdminPath,
  stripAdminRoutePrefix,
} from "../../common/utils/routes.js";
import { useAdmin } from "../context/AdminContext";
import { Button } from "../../common/components/ui/button";
import { Input } from "../../common/components/ui/input";
import { Checkbox } from "../../common/components/ui/checkbox";
import { useMonitoringMode } from "../hooks/useMonitoringMode";
import {
  createImagePreview,
  IMAGE_UPLOAD_ACCEPT,
  revokeImagePreview,
  validateImageFile,
} from "../../common/utils/imageUpload";
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const CURRENCIES = [
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
  },
  {
    code: "EUR",
    symbol: "EUR",
    name: "Euro",
  },
  {
    code: "GBP",
    symbol: "GBP",
    name: "British Pound",
  },
  {
    code: "CAD",
    symbol: "CAD",
    name: "Canadian Dollar",
  },
  {
    code: "AUD",
    symbol: "AUD",
    name: "Australian Dollar",
  },
];
const DEFAULT_SETTINGS = {
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
    card: true,
    upi: true,
    digitalWallet: false,
    splitBill: true,
  },
  notifications: {
    newOrders: true,
    orderUpdates: true,
    lowStock: true,
    tableCalls: true,
    reservationReminders: true,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  },
};
const mergeSettings = (incoming = {}) => ({
  ...DEFAULT_SETTINGS,
  ...(incoming || {}),
  restaurant: {
    ...DEFAULT_SETTINGS.restaurant,
    ...(incoming?.restaurant || {}),
  },
  businessHours: {
    ...DEFAULT_SETTINGS.businessHours,
    ...(incoming?.businessHours || {}),
  },
  taxSettings: {
    ...DEFAULT_SETTINGS.taxSettings,
    ...(incoming?.taxSettings || {}),
  },
  paymentMethods: {
    ...DEFAULT_SETTINGS.paymentMethods,
    ...(incoming?.paymentMethods || {}),
  },
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(incoming?.notifications || {}),
  },
});
const getCurrencySymbol = (currencyCode) =>
  CURRENCIES.find((currency) => currency.code === currencyCode)?.symbol || "₹";
const baseInputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400";
const textareaClass = `${baseInputClass} min-h-[120px]`;
export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshProfile, hasPermission } = useAuth();
  const { addNotification } = useAdmin();
  const { applySettings } = useSettings();
  const isMonitoringMode = useMonitoringMode();
  const canManageSettings = hasPermission("system_settings");
  const isProfileRoute =
    stripAdminRoutePrefix(location.pathname) === "/profile";
  const [isLoadingSettings, setIsLoadingSettings] = useState(canManageSettings);
  const [isSavingSection, setIsSavingSection] = useState("");
  const [adminSettings, setAdminSettings] = useState(DEFAULT_SETTINGS);
  const [logoFile, setLogoFile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const tabs = useMemo(() => {
    if (isProfileRoute) {
      return [
        {
          id: "profile",
          label: "Profile",
          icon: UserCircle2,
        },
        {
          id: "security",
          label: "Security",
          icon: Shield,
        },
      ];
    }
    if (!canManageSettings) {
      return [];
    }
    return [
      {
        id: "restaurant",
        label: "Restaurant Info",
        icon: Building,
      },
      {
        id: "hours",
        label: "Business Hours",
        icon: Clock,
      },
      {
        id: "tax",
        label: "Tax & Pricing",
        icon: IndianRupee,
      },
      {
        id: "payment",
        label: "Payment Methods",
        icon: CreditCard,
      },
    ];
  }, [canManageSettings, isProfileRoute]);
  const activeTab =
    searchParams.get("tab") || (isProfileRoute ? "profile" : "restaurant");
  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user?.email, user?.name]);
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab) && tabs[0]?.id) {
      setSearchParams({
        tab: tabs[0].id,
      });
    }
  }, [activeTab, setSearchParams, tabs]);
  useEffect(() => {
    const loadSettings = async () => {
      if (!canManageSettings) {
        setIsLoadingSettings(false);
        return;
      }
      try {
        setIsLoadingSettings(true);
        const response = await settingsService.getAdminSettings();
        const nextSettings = mergeSettings(response?.data || {});
        setAdminSettings(nextSettings);
        setLogoFile(null);
      } catch {
        setAdminSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [canManageSettings]);
  useEffect(
    () => () => {
      revokeImagePreview(adminSettings?.restaurant?.logo);
    },
    [adminSettings?.restaurant?.logo],
  );
  const setActiveTab = (tabId) => {
    setSearchParams({
      tab: tabId,
    });
  };
  const updateSettingsSection = (section, value) => {
    setAdminSettings((current) => ({
      ...current,
      [section]: value,
    }));
  };
  const updateNestedSettings = (section, field, value) => {
    setAdminSettings((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [field]: value,
      },
    }));
  };
  const saveProfile = async () => {
    if (isMonitoringMode) {
      return;
    }
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      addNotification("Name and email are required", "error");
      return;
    }
    try {
      setIsSavingSection("profile");
      const response = await userService.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      if (!response?.success) {
        addNotification(
          response?.message || "Failed to update profile",
          "error",
        );
        return;
      }
      await refreshProfile?.();
      addNotification("Profile updated successfully", "success");
    } catch (error) {
      addNotification(error, "error", "Failed to update profile");
    } finally {
      setIsSavingSection("");
    }
  };
  const savePassword = async () => {
    if (isMonitoringMode) {
      return;
    }
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      addNotification("Please fill all password fields", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      addNotification("New password must be at least 6 characters", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification(
        "New password and confirm password do not match",
        "error",
      );
      return;
    }
    try {
      setIsSavingSection("security");
      const response = await userService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      if (!response?.success) {
        addNotification(
          response?.message || "Failed to update password",
          "error",
        );
        return;
      }
      if (response?.logoutRequired === false) {
        await refreshProfile?.();
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        addNotification("Password updated successfully", "success");
        return;
      }
      addNotification("Password updated. Please sign in again.", "success");
      setTimeout(() => {
        window.location.href = buildAdminPath("/login");
      }, 400);
    } catch (error) {
      addNotification(error, "error", "Failed to update password");
    } finally {
      setIsSavingSection("");
    }
  };
  const saveSettings = async (section) => {
    if (isMonitoringMode) {
      addNotification("Monitoring mode is read-only", "error");
      return;
    }
    if (!canManageSettings) {
      addNotification("You do not have permission to update settings", "error");
      return;
    }
    try {
      setIsSavingSection(section);
      const response = await settingsService.updateSettings(
        adminSettings,
        logoFile,
      );
      if (!response?.success) {
        addNotification(
          response?.message || "Failed to update settings",
          "error",
        );
        return;
      }
      const mergedSettings = mergeSettings(response?.data || adminSettings);
      setAdminSettings(mergedSettings);
      setLogoFile(null);
      applySettings(response?.publicSettings || mergedSettings);
      addNotification("Settings updated successfully", "success");
    } catch (error) {
      addNotification(error, "error", "Failed to update settings");
    } finally {
      setIsSavingSection("");
    }
  };
  const renderSectionHeader = (title, description) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  );
  const renderProfileTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Profile",
        "Update the name and email shown across the admin interface.",
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <Input
            value={profileForm.name}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Enter your full name"
            disabled={isMonitoringMode}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            type="email"
            value={profileForm.email}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="Enter your email address"
            disabled={isMonitoringMode}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Current Role</p>
          <p className="text-sm text-gray-600 capitalize">
            {user?.role || "Staff"}
          </p>
        </div>
        <Button
          type="button"
          onClick={saveProfile}
          disabled={isMonitoringMode || isSavingSection === "profile"}
        >
          {isSavingSection === "profile" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
  const renderSecurityTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Password & Security",
        "Changing your password signs you out so you can continue with a fresh session.",
      )}

      <div className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <Input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            placeholder="Enter current password"
            disabled={isMonitoringMode}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <Input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
            placeholder="Enter new password"
            disabled={isMonitoringMode}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <Input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="Confirm new password"
            disabled={isMonitoringMode}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={savePassword}
          disabled={isMonitoringMode || isSavingSection === "security"}
        >
          {isSavingSection === "security" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          Update Password
        </Button>
      </div>
    </div>
  );
  const renderRestaurantTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Restaurant Information",
        "These details update the branding and public information shown throughout the app.",
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Restaurant Name
          </label>
          <Input
            value={adminSettings?.restaurant?.name || ""}
            onChange={(event) =>
              updateNestedSettings("restaurant", "name", event.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email
          </label>
          <Input
            type="email"
            value={adminSettings?.restaurant?.email || ""}
            onChange={(event) =>
              updateNestedSettings("restaurant", "email", event.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <Input
            value={adminSettings?.restaurant?.phone || ""}
            onChange={(event) =>
              updateNestedSettings("restaurant", "phone", event.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <Input
            value={adminSettings?.restaurant?.website || ""}
            onChange={(event) =>
              updateNestedSettings("restaurant", "website", event.target.value)
            }
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <textarea
          value={adminSettings?.restaurant?.address || ""}
          onChange={(event) =>
            updateNestedSettings("restaurant", "address", event.target.value)
          }
          className={textareaClass}
          placeholder="Enter restaurant address"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={adminSettings?.restaurant?.description || ""}
          onChange={(event) =>
            updateNestedSettings(
              "restaurant",
              "description",
              event.target.value,
            )
          }
          className={textareaClass}
          placeholder="Describe the restaurant"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tenant Logo
        </label>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {adminSettings?.restaurant?.logo ? (
              <img
                src={adminSettings.restaurant.logo}
                alt={`${adminSettings?.restaurant?.name || "Restaurant"} logo`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                const imageError = validateImageFile(file);
                if (imageError) {
                  addNotification(imageError, "error");
                  event.target.value = "";
                  return;
                }
                setLogoFile(file);
                const previewUrl = createImagePreview(file);
                setAdminSettings((current) => ({
                  ...current,
                  restaurant: {
                    ...(current?.restaurant || {}),
                    logo: previewUrl,
                    logoThumbnail: previewUrl,
                  },
                }));
              }}
              className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700"
            />
            <p className="mt-2 text-xs text-gray-500">
              Upload a JPG or PNG logo up to 2MB. A thumbnail will be generated
              automatically for lightweight header and sidebar previews.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => saveSettings("restaurant")}
          disabled={isMonitoringMode || isSavingSection === "restaurant"}
        >
          {isSavingSection === "restaurant" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Restaurant Info
        </Button>
      </div>
    </div>
  );
  const renderBusinessHoursTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Business Hours",
        "Control the operating schedule shown to customers.",
      )}

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayConfig = adminSettings?.businessHours?.[day] || {};
          return (
            <div
              key={day}
              className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_120px] gap-3 items-center rounded-xl border border-gray-200 p-4"
            >
              <div className="font-medium text-gray-900">{day}</div>
              <Input
                type="time"
                value={dayConfig?.open || "11:00"}
                onChange={(event) =>
                  updateSettingsSection("businessHours", {
                    ...(adminSettings?.businessHours || {}),
                    [day]: {
                      ...(dayConfig || {}),
                      open: event.target.value,
                    },
                  })
                }
                disabled={Boolean(dayConfig?.closed)}
              />
              <Input
                type="time"
                value={dayConfig?.close || "22:00"}
                onChange={(event) =>
                  updateSettingsSection("businessHours", {
                    ...(adminSettings?.businessHours || {}),
                    [day]: {
                      ...(dayConfig || {}),
                      close: event.target.value,
                    },
                  })
                }
                disabled={Boolean(dayConfig?.closed)}
              />
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <Checkbox
                  checked={Boolean(dayConfig?.closed)}
                  onCheckedChange={(checked) =>
                    updateSettingsSection("businessHours", {
                      ...(adminSettings?.businessHours || {}),
                      [day]: {
                        ...(dayConfig || {}),
                        closed: Boolean(checked),
                      },
                    })
                  }
                />
                Closed
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => saveSettings("hours")}
          disabled={isMonitoringMode || isSavingSection === "hours"}
        >
          {isSavingSection === "hours" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Business Hours
        </Button>
      </div>
    </div>
  );
  const renderTaxTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Tax & Pricing",
        "Update billing defaults used across the ordering experience.",
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Rate (%)
          </label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={adminSettings?.taxSettings?.taxRate ?? 0}
            onChange={(event) =>
              updateNestedSettings(
                "taxSettings",
                "taxRate",
                Number(event.target.value || 0),
              )
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Charge (%)
          </label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={adminSettings?.taxSettings?.serviceCharge ?? 0}
            onChange={(event) =>
              updateNestedSettings(
                "taxSettings",
                "serviceCharge",
                Number(event.target.value || 0),
              )
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={adminSettings?.taxSettings?.currency || "USD"}
            onChange={(event) => {
              const nextCurrency = event.target.value;
              updateSettingsSection("taxSettings", {
                ...(adminSettings?.taxSettings || {}),
                currency: nextCurrency,
                currencySymbol: getCurrencySymbol(nextCurrency),
              });
            }}
            className={baseInputClass}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.symbol})
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <Checkbox
            checked={Boolean(adminSettings?.taxSettings?.taxInclusive)}
            onCheckedChange={(checked) =>
              updateNestedSettings(
                "taxSettings",
                "taxInclusive",
                Boolean(checked),
              )
            }
          />
          Prices already include tax
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => saveSettings("tax")}
          disabled={isMonitoringMode || isSavingSection === "tax"}
        >
          {isSavingSection === "tax" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Pricing Settings
        </Button>
      </div>
    </div>
  );
  const renderBooleanGrid = (section, titleMap) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(titleMap).map(([field, label]) => (
        <label
          key={field}
          className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700"
        >
          <Checkbox
            checked={Boolean(adminSettings?.[section]?.[field])}
            onCheckedChange={(checked) =>
              updateNestedSettings(section, field, Boolean(checked))
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
  const renderPaymentTab = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {renderSectionHeader(
        "Payment Methods",
        "Choose which checkout methods are available to your staff and customers.",
      )}

      {renderBooleanGrid("paymentMethods", {
        cash: "Cash",
        card: "Card",
        upi: "UPI",
        digitalWallet: "Digital Wallet",
        splitBill: "Split Bill",
      })}

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => saveSettings("payment")}
          disabled={isMonitoringMode || isSavingSection === "payment"}
        >
          {isSavingSection === "payment" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Payment Methods
        </Button>
      </div>
    </div>
  );
  const renderContent = () => {
    if (activeTab === "profile") {
      return renderProfileTab();
    }
    if (activeTab === "security") {
      return renderSecurityTab();
    }
    if (!canManageSettings) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Limited Access
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You can manage your personal profile and password from here.
            Restaurant settings are available to authorized administrators only.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(buildAdminPath("/dashboard"))}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }
    if (activeTab === "restaurant") {
      return renderRestaurantTab();
    }
    if (activeTab === "hours") {
      return renderBusinessHoursTab();
    }
    if (activeTab === "tax") {
      return renderTaxTab();
    }
    if (activeTab === "payment") {
      return renderPaymentTab();
    }
    return renderProfileTab();
  };
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">
            {isProfileRoute
              ? "Manage your profile and password from one place."
              : "Manage restaurant configuration from one place."}
          </p>
          {!isProfileRoute ? (
            <p className="mt-2 text-sm text-gray-500">
              Any restaurant setting you save here updates only the current
              tenant workspace, not other tenants.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${isActive ? "bg-primary-50 text-primary-700 border border-primary-100" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {isLoadingSettings ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
