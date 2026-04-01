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
  footerClassName = ""
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
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
  return <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/15 px-0 py-0 backdrop-blur-[2px] sm:p-4" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-gray-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl ${maxWidth} ${contentClassName}`.trim()} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`.trim()}>{children}</div>

        {footer ? <div className={`border-t border-gray-200 bg-white px-4 py-4 sm:px-5 ${footerClassName}`.trim()}>
            {footer}
          </div> : null}
        </div>
      </div>
    </div>;
}
