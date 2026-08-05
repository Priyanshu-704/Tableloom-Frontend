import React, { useEffect } from "react";
import { X } from "lucide-react";
export function AdminModal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-4xl",
  contentClassName = "",
  bodyClassName = "",
  footerClassName = "",
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);
  if (!isOpen) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/40 px-3 py-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center py-4">
        <div
          className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl sm:max-h-[85vh] ${maxWidth} ${contentClassName}`.trim()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6 sm:py-5 bg-white">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl tracking-tight">{title}</h2>
              {subtitle ? (
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName}`.trim()}
          >
            {children}
          </div>

          {footer ? (
            <div
              className={`border-t border-slate-200/80 bg-slate-50/90 px-5 py-4 sm:px-6 ${footerClassName}`.trim()}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
