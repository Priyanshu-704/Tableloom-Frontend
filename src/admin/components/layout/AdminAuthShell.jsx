/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { BrandBadge } from "../../../common/components/BrandBadge";

const DEFAULT_BRAND_NAME = "Tableloom";
const DEFAULT_LOGO_SRC = "/tableloom-mark.svg";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const getBrandDetails = (settings) => ({
  name: settings?.restaurant?.name || DEFAULT_BRAND_NAME,
  logoSrc:
    settings?.restaurant?.logoThumbnail ||
    settings?.restaurant?.logo ||
    DEFAULT_LOGO_SRC,
});

const getShellClassName = ({ lockViewport, compactMobile }) =>
  joinClasses(
    "relative min-h-screen bg-slate-950 text-slate-100",
    lockViewport && "lg:h-screen",
    lockViewport && compactMobile && "h-dvh overflow-hidden",
  );

const getLayoutClassName = ({ lockViewport, compactMobile }) =>
  joinClasses(
    "relative mx-auto grid min-h-screen w-full max-w-7xl items-center content-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,560px)] lg:gap-12 lg:px-8 lg:py-12",
    lockViewport && "lg:h-screen",
    lockViewport &&
      compactMobile &&
      "h-dvh min-h-0 content-center px-3 py-3 sm:px-5 sm:py-5 lg:min-h-screen",
  );

const getSidePanelClassName = ({ lockViewport, isHiddenOnMobile }) =>
  joinClasses(
    "order-2 lg:order-1 lg:py-6",
    lockViewport && "min-h-0 lg:overflow-hidden",
    isHiddenOnMobile ? "hidden lg:block" : "block",
  );

const getCardWrapClassName = ({
  lockViewport,
  compactMobile,
  isHiddenOnMobile,
}) =>
  joinClasses(
    "order-1 mx-auto w-full max-w-xl lg:order-2 lg:max-w-none lg:justify-self-end lg:self-center",
    lockViewport && "min-h-0",
    lockViewport && compactMobile && "max-w-md",
    isHiddenOnMobile ? "hidden lg:block" : "block",
  );

const getCardClassName = ({ lockViewport, compactMobile }) =>
  joinClasses(
    "border border-white/10 bg-white/95 shadow-2xl shadow-slate-950/30 backdrop-blur",
    lockViewport
      ? "flex min-h-0 flex-col rounded-[2rem] p-6 sm:p-8 lg:max-h-[calc(100vh-6rem)] lg:p-10"
      : "rounded-[2rem] p-6 sm:p-8 lg:p-10",
    lockViewport &&
      compactMobile &&
      "max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl p-4 sm:max-h-[calc(100dvh-2.5rem)] sm:p-6 lg:overflow-visible lg:rounded-[2rem]",
  );

const getContentClassName = (contentScrollable) =>
  contentScrollable ? "min-h-0 flex-1 overflow-y-auto pr-1" : "";

function AuthShellBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_32%),linear-gradient(160deg,#020617_0%,#0f172a_45%,#082f49_100%)]" />
      <div className="absolute -left-32 top-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
    </>
  );
}

function AuthShellSidePanel({
  brandName,
  logoSrc,
  sideLabel,
  sideTitle,
  sideDescription,
  highlights,
  showMobilePreview,
  mobilePrimaryActionLabel,
  onShowMobileForm,
}) {
  return (
    <div className="max-w-xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
        <Sparkles className="h-4 w-4" />
        {sideLabel}
      </div>

      <div className="mt-8">
        <BrandBadge
          logoSrc={logoSrc}
          name={brandName}
          size="lg"
          className="items-center"
          nameClassName="text-3xl text-white"
        />
        <h2 className="mt-8 max-w-lg text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {sideTitle}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          {sideDescription}
        </p>
      </div>

      {highlights.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur"
            >
              <p className="text-sm font-semibold text-sky-200">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showMobilePreview ? (
        <button
          type="button"
          onClick={onShowMobileForm}
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-slate-100 lg:hidden"
        >
          {mobilePrimaryActionLabel}
        </button>
      ) : null}
    </div>
  );
}

function AuthShellHeader({
  brandName,
  logoSrc,
  eyebrow,
  title,
  description,
  compactMobile,
  showBackAction,
  mobileBackActionLabel,
  onBackToPreview,
  hideSidePanel,
}) {
  return (
    <div className={compactMobile ? "mb-4 sm:mb-6 lg:mb-8" : "mb-8"}>
      <BrandBadge
        logoSrc={logoSrc}
        name={brandName}
        className={joinClasses(
          compactMobile ? "mb-3 flex" : "mb-6 flex",
          hideSidePanel ? "flex" : "lg:hidden",
        )}
      />

      {showBackAction ? (
        <button
          type="button"
          onClick={onBackToPreview}
          className="mb-5 text-sm font-medium text-sky-700 hover:text-sky-800 lg:hidden"
        >
          {mobileBackActionLabel}
        </button>
      ) : null}

      {eyebrow ? (
        <p
          className={joinClasses(
            compactMobile ? "text-xs" : "text-sm",
            "font-semibold uppercase tracking-[0.2em] text-sky-600",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h1
        className={joinClasses(
          compactMobile ? "mt-2 text-xl sm:text-2xl" : "mt-3 text-2xl sm:text-3xl",
          "font-semibold tracking-tight text-slate-950",
        )}
      >
        {title}
      </h1>

      <p
        className={joinClasses(
          compactMobile
            ? "mt-2 hidden text-sm leading-5 sm:block sm:text-sm"
            : "mt-3 text-sm leading-6 sm:text-base",
          "text-slate-600",
        )}
      >
        {description}
      </p>
    </div>
  );
}

export function AdminAuthShell({
  settings,
  eyebrow,
  title,
  description,
  children,
  lockViewport = false,
  contentScrollable = false,
  compactMobile = false,
  mobileAuthMode = "split",
  mobilePrimaryActionLabel = "Open Form",
  mobileBackActionLabel = "Back",
  sideLabel = "Admin Access",
  sideTitle = "Keep service moving without the dashboard feeling heavy.",
  sideDescription = "Manage tables, orders, staff, and live service updates from one calm workspace.",
  highlights = [],
  hideSidePanel = false,
}) {
  const [showMobileForm, setShowMobileForm] = useState(
    mobileAuthMode !== "preview",
  );

  const { name: brandName, logoSrc } = getBrandDetails(settings);
  const showMobilePreview = mobileAuthMode === "preview" && !showMobileForm;
  const hideSidePanelOnMobile = mobileAuthMode === "formOnly" || showMobileForm;
  const hideFormCardOnMobile = showMobilePreview;

  const shellClassName = getShellClassName({ lockViewport, compactMobile });
  const layoutClassName = hideSidePanel
    ? "relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    : getLayoutClassName({ lockViewport, compactMobile });

  const sidePanelClassName = getSidePanelClassName({
    lockViewport,
    isHiddenOnMobile: hideSidePanelOnMobile,
  });
  const cardWrapClassName = hideSidePanel
    ? "w-full mx-auto"
    : getCardWrapClassName({
        lockViewport,
        compactMobile,
        isHiddenOnMobile: hideFormCardOnMobile,
      });
  const cardClassName = getCardClassName({ lockViewport, compactMobile });
  const contentClassName = getContentClassName(contentScrollable);

  useEffect(() => {
    setShowMobileForm(mobileAuthMode !== "preview");
  }, [mobileAuthMode, title]);

  return (
    <div className={shellClassName}>
      <AuthShellBackground />

      <div className={layoutClassName}>
        {!hideSidePanel && (
          <div className={sidePanelClassName}>
            <AuthShellSidePanel
              brandName={brandName}
              logoSrc={logoSrc}
              sideLabel={sideLabel}
              sideTitle={sideTitle}
              sideDescription={sideDescription}
              highlights={highlights}
              showMobilePreview={showMobilePreview}
              mobilePrimaryActionLabel={mobilePrimaryActionLabel}
              onShowMobileForm={() => setShowMobileForm(true)}
            />
          </div>
        )}

        <div className={cardWrapClassName}>
          <div className={cardClassName}>
            <AuthShellHeader
              brandName={brandName}
              logoSrc={logoSrc}
              eyebrow={eyebrow}
              title={title}
              description={description}
              compactMobile={compactMobile}
              showBackAction={mobileAuthMode === "preview" && showMobileForm}
              mobileBackActionLabel={mobileBackActionLabel}
              onBackToPreview={() => setShowMobileForm(false)}
              hideSidePanel={hideSidePanel}
            />

            <div className={contentClassName}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAuthShell;
