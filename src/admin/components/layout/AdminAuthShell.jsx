/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { BrandBadge } from "../../../common/components/BrandBadge";
export function AdminAuthShell({
  settings,
  eyebrow,
  title,
  description,
  children,
  lockViewport = false,
  contentScrollable = false,
  mobileAuthMode = "split",
  mobilePrimaryActionLabel = "Open Form",
  mobileBackActionLabel = "Back",
  sideLabel = "Admin Access",
  sideTitle = "Keep service moving without the dashboard feeling heavy.",
  sideDescription = "Manage tables, orders, staff, and live service updates from one calm workspace.",
  highlights = []
}) {
  const [showMobileForm, setShowMobileForm] = useState(mobileAuthMode !== "preview");
  const brandName = settings?.restaurant?.name || "Tableloom";
  const logoSrc = settings?.restaurant?.logoThumbnail || settings?.restaurant?.logo || "/tableloom-mark.svg";
  const showMobilePreview = mobileAuthMode === "preview" && !showMobileForm;
  const hideSidePanelOnMobile = mobileAuthMode === "formOnly" || showMobileForm;
  const hideFormCardOnMobile = showMobilePreview;
  const shellClassName = lockViewport ? "relative min-h-screen bg-slate-950 text-slate-100 lg:h-screen" : "relative min-h-screen bg-slate-950 text-slate-100";
  const layoutClassName = lockViewport ? "relative mx-auto grid min-h-screen w-full max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,560px)] lg:gap-12 lg:px-8 lg:py-12" : "relative mx-auto grid min-h-screen w-full max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,560px)] lg:gap-12 lg:px-8 lg:py-12";
  const sidePanelClassName = lockViewport ? "order-2 min-h-0 lg:order-1 lg:overflow-hidden lg:pt-6" : "order-2 lg:order-1 lg:pt-6";
  const cardWrapClassName = lockViewport ? "order-1 mx-auto min-h-0 w-full max-w-xl lg:order-2 lg:max-w-none lg:justify-self-end lg:self-start" : "order-1 mx-auto w-full max-w-xl lg:order-2 lg:max-w-none lg:justify-self-end lg:self-start";
  const cardClassName = lockViewport ? "flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8 lg:max-h-[calc(100vh-6rem)] lg:p-10" : "rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8 lg:p-10";
  const contentClassName = contentScrollable ? "min-h-0 flex-1 overflow-visible lg:overflow-y-auto lg:pr-1" : "";
  useEffect(() => {
    setShowMobileForm(mobileAuthMode !== "preview");
  }, [mobileAuthMode, title]);
  return <div className={shellClassName}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(160deg,_#020617_0%,_#0f172a_45%,_#082f49_100%)]" />
      <div className="absolute left-[-8rem] top-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-[-6rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className={layoutClassName}>
        <div className={`${sidePanelClassName} ${hideSidePanelOnMobile ? "hidden lg:block" : "block"}`}>
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
              <Sparkles className="h-4 w-4" />
              {sideLabel}
            </div>

            <div className="mt-8">
              <BrandBadge logoSrc={logoSrc} name={brandName} size="lg" className="items-center" nameClassName="text-3xl text-white" />
              <h2 className="mt-8 max-w-lg text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {sideTitle}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {sideDescription}
              </p>
            </div>

            {highlights.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {highlights.map(item => <div key={item.title} className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                    <p className="text-sm font-semibold text-sky-200">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>)}
              </div> : null}

            {showMobilePreview ? <button type="button" onClick={() => setShowMobileForm(true)} className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-slate-100 lg:hidden">
                {mobilePrimaryActionLabel}
              </button> : null}
          </div>
        </div>

        <div className={`${cardWrapClassName} ${hideFormCardOnMobile ? "hidden lg:block" : "block"}`}>
          <div className={cardClassName}>
            <div className="mb-8">
              <BrandBadge logoSrc={logoSrc} name={brandName} className="mb-6 lg:hidden" />
              {mobileAuthMode === "preview" && showMobileForm ? <button type="button" onClick={() => setShowMobileForm(false)} className="mb-5 text-sm font-medium text-sky-700 hover:text-sky-800 lg:hidden">
                  {mobileBackActionLabel}
                </button> : null}
              {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  {eyebrow}
                </p> : null}
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>

            <div className={contentClassName}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
export default AdminAuthShell;
