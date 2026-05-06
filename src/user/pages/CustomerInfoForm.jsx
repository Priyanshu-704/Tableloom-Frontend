import React, { useEffect, useState } from "react";
import { QrCode, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSettings } from "../../common/context/SettingsContext";
import customerSessionService from "../../common/services/CustomerSessionService";
import { useNotification } from "../../common/NotificationContext";
import { BrandBadge } from "../../common/components/BrandBadge";
import { buildCustomerPath } from "../../common/utils/routes";

export function CustomerInfoForm() {
  const navigate = useNavigate();
  const { dispatch, tableNumber, tableId, qrToken, sessionId } = useApp();
  const { settings } = useSettings();
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQrValidating, setIsQrValidating] = useState(true);
  const [qrStatus, setQrStatus] = useState({
    valid: false,
    message: "",
  });

  useEffect(() => {
    if (sessionId) {
      navigate(buildCustomerPath("/home"), {
        replace: true,
      });
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    let active = true;

    const validateQr = async () => {
      if (!tableId || !qrToken) {
        if (active) {
          setQrStatus({
            valid: false,
            message: "Scan a valid table QR code to start your session.",
          });
          setIsQrValidating(false);
        }
        return;
      }

      try {
        setIsQrValidating(true);
        const response = await customerSessionService.validateScan(
          tableId,
          qrToken,
        );

        if (!response?.success) {
          throw new Error(response?.message || "Invalid QR code");
        }

        const resolvedTable = response?.data?.table || {};
        dispatch({
          type: "SET_TABLE_INFO",
          payload: {
            tableId: resolvedTable?._id || tableId,
            tableNumber: resolvedTable?.tableNumber || tableNumber,
            token: qrToken,
            restaurantId: "1",
          },
        });

        if (active) {
          setQrStatus({
            valid: true,
            message:
              "QR verified. Start your dining session and you can request the bill email later.",
          });
        }
      } catch (error) {
        if (active) {
          setQrStatus({
            valid: false,
            message:
              error?.response?.data?.message ||
              error?.message ||
              "Invalid or expired QR code. Please scan again.",
          });
        }
      } finally {
        if (active) {
          setIsQrValidating(false);
        }
      }
    };

    validateQr();

    return () => {
      active = false;
    };
  }, [dispatch, qrToken, tableId, tableNumber]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!tableId || !qrToken || !qrStatus.valid) {
      notify(
        "Invalid or expired QR code. Please scan the table QR again.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionResponse = await customerSessionService.createSessionByScan(
        tableId,
        qrToken,
        {},
      );
      const nextSessionId = sessionResponse?.data?.sessionId || "";

      if (!sessionResponse?.success || !nextSessionId) {
        notify(
          sessionResponse?.message || "Unable to start your dining session",
          "error",
        );
        return;
      }

      const detailsResponse =
        await customerSessionService.getSession(nextSessionId);
      const sessionDetails = detailsResponse?.data || null;
      const sessionTable = sessionDetails?.table || {};

      dispatch({
        type: "SET_CUSTOMER_INFO",
        payload: null,
      });
      dispatch({
        type: "SET_SESSION",
        payload: nextSessionId,
      });
      dispatch({
        type: "SET_SESSION_DETAILS",
        payload: sessionDetails,
      });
      dispatch({
        type: "SET_TABLE_INFO",
        payload: {
          tableId: sessionTable?._id || tableId,
          tableNumber:
            sessionTable?.tableNumber || sessionTable?.number || tableNumber,
          token: qrToken,
          restaurantId: "1",
        },
      });

      notify(
        "Session started successfully. You can place your order now.",
        "success",
      );
      navigate(buildCustomerPath("/home"));
    } catch (error) {
      notify(
        error?.message || "Unable to start your dining session",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff2a8_0%,#f9fafb_34%,#dff5f7_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-emerald-950/85"></div>
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl"></div>
        <div className="absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-yellow-200/70 blur-3xl"></div>
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-orange-100/80 blur-3xl"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-4xl border border-white/70 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur xl:grid xl:grid-cols-[0.95fr_1.05fr]">
          <section className="relative border-b border-slate-200/80 px-6 py-8 sm:px-8 xl:border-b-0 xl:border-r">
            <div className="absolute right-10 top-12 h-4 w-4 rounded-full bg-cyan-500 shadow-[0_0_0_10px_rgba(6,182,212,0.12)]"></div>
            <div className="max-w-sm">
              <BrandBadge
                logoSrc={
                  settings?.restaurant?.logoThumbnail ||
                  settings?.restaurant?.logo ||
                  "/tableloom-mark.svg"
                }
                name={settings?.restaurant?.name || "Tableloom"}
                size="lg"
                className="items-start justify-start"
                nameClassName="bg-gradient-to-r from-slate-700 to-orange-600 bg-clip-text text-4xl font-semibold text-transparent sm:text-5xl"
              />
              <p className="mt-4 text-base text-slate-600">
                Welcome to Digital Ordering System
              </p>
              <div className="mt-5 inline-flex rounded-2xl bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    You are at
                  </p>
                  <p className="mt-2 text-2xl font-bold text-sky-700">
                    {tableNumber
                      ? `Table ${tableNumber}`
                      : "Table access required"}
                  </p>
                </div>
              </div>
              <div className="mt-8 rounded-3xl border border-slate-200/80 bg-slate-50/85 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  How it works
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                      1
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      Scan the QR code placed on the table to unlock the
                      restaurant workspace for that table.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                      2
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      Start your dining session right away. We only ask for your
                      email later when you request the bill.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 py-8 sm:px-8">
            {isQrValidating ? (
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  Validating your table QR code...
                </div>
              </div>
            ) : (
              <div
                className={`mb-5 rounded-2xl border p-4 text-sm ${qrStatus.valid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
              >
                <div className="flex items-start gap-3">
                  <QrCode className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{qrStatus.message}</p>
                </div>
              </div>
            )}

            {!qrStatus.valid && !isQrValidating ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.9)_100%)] px-6 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                  <QrCode className="h-7 w-7 text-rose-500" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                  Access Locked
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
                  You can only use the customer app after scanning a valid table
                  QR code and creating a dining session.
                </p>
                <div className="mx-auto mt-6 max-w-md rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
                  Open this page from the table QR or a valid
                  `table/:tableNumber` customer entry route.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/85 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Quick Start
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    No details needed before you order
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    We’ll open a session for this table now. You can browse the
                    menu immediately and only enter your email later when you
                    request the bill.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isQrValidating || !qrStatus.valid}
                  className={`mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 ${isSubmitting ? "animate-pulse" : ""}`}
                >
                  <span className="flex items-center justify-center">
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        Start dining session
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
