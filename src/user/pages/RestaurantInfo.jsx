import React from "react";
import { MapPin, Clock, Phone, Mail, ArrowLeft, Globe, CreditCard, Receipt } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../common/context/SettingsContext";
import { buildCustomerPath } from "../../common/utils/routes";
const formatHours = (dayConfig = {}) => {
  if (dayConfig?.closed) {
    return "Closed";
  }
  if (dayConfig?.open && dayConfig?.close) {
    return `${dayConfig.open} - ${dayConfig.close}`;
  }
  return "Hours unavailable";
};
export function RestaurantInfo() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const {
    settings
  } = useSettings();
  const paymentMethods = settings?.paymentMethods || {};
  const enabledPaymentMethods = [paymentMethods.cash ? "Cash" : null, paymentMethods.card ? "Card" : null, paymentMethods.upi ? "UPI" : null, paymentMethods.digitalWallet ? "Wallet" : null, paymentMethods.splitBill ? "Split bill available" : null].filter(Boolean);
  const handleBack = () => {
    navigate(buildCustomerPath("/"));
  };
  const restaurantInfo = {
    name: settings?.restaurant?.name || "Tableloom Restaurant",
    description: settings?.restaurant?.description || t("restaurantDescription"),
    address: settings?.restaurant?.address || "Address unavailable",
    phone: settings?.restaurant?.phone || "Phone unavailable",
    email: settings?.restaurant?.email || "Email unavailable",
    website: settings?.restaurant?.website || "",
    hours: settings?.businessHours || {},
    paymentMethods: enabledPaymentMethods,
    currency: settings?.taxSettings?.currency || "INR",
    taxRate: Number(settings?.taxSettings?.taxRate || 0),
    serviceCharge: Number(settings?.taxSettings?.serviceCharge || 0)
  };
  const howItWorksSteps = [{
    step: 1,
    title: t("scanQRCodeStep"),
    description: t("scanQRCodeStepDesc")
  }, {
    step: 2,
    title: t("orderPayStep"),
    description: t("orderPayStepDesc")
  }, {
    step: 3,
    title: t("enjoyStep"),
    description: t("enjoyStepDesc")
  }];
  const daysTranslation = {
    Monday: t("Monday"),
    Tuesday: t("Tuesday"),
    Wednesday: t("Wednesday"),
    Thursday: t("Thursday"),
    Friday: t("Friday"),
    Saturday: t("Saturday"),
    Sunday: t("Sunday")
  };
  return <div className="min-h-screen bg-gray-50">
      {}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={handleBack} className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t("back")}
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t("aboutUs")}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
            <h1 className="text-3xl font-bold text-white text-center">
              {restaurantInfo.name}
            </h1>
          </div>

          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">
              {restaurantInfo.description}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-primary-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-primary-700">
                  Currency
                </p>
                <p className="mt-1 font-semibold text-gray-900">{restaurantInfo.currency}</p>
              </div>
              <div className="rounded-lg bg-primary-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-primary-700">
                  Billing
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  Tax {restaurantInfo.taxRate}% • Service {restaurantInfo.serviceCharge}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="grid md:grid-cols-2 gap-6">
          {}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("contactInfo")}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary-600" />
                <span className="text-gray-700">{restaurantInfo.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-600" />
                <span className="text-gray-700">{restaurantInfo.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-600" />
                <span className="text-gray-700">{restaurantInfo.email}</span>
              </div>
              {restaurantInfo.website ? <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-primary-600" />
                  <span className="text-gray-700">{restaurantInfo.website}</span>
                </div> : null}
            </div>
          </div>

          {}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary-600" />
              {t("openingHours")}
            </h2>
            <div className="space-y-2">
              {Object.entries(restaurantInfo.hours).map(([day, hours]) => <div key={day} className="flex justify-between">
                  <span className="text-gray-600">
                    {daysTranslation[day] || day}
                  </span>
                  <span className="font-medium text-gray-900">
                    {typeof hours === "string" ? hours : formatHours(hours)}
                  </span>
                </div>)}
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment & Billing
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {restaurantInfo.paymentMethods.map((method, index) => {
            const icons = [CreditCard, Receipt, CreditCard, Receipt, CreditCard];
            const Icon = icons[index] || CreditCard;
            return <div key={method} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Icon className="h-4 w-4 text-primary-600" />
                  <span className="text-sm text-gray-700">{method}</span>
                </div>;
          })}
          </div>
        </div>

        {}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {t("howItWorks")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorksSteps.map(({
            step,
            title,
            description
          }) => <div key={step} className="text-center">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
}
