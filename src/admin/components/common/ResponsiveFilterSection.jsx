import React, { useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
export function ResponsiveFilterSection({
  title = "Filters",
  children,
  className = "",
  contentClassName = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  return <section className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`.trim()}>
      <button type="button" onClick={() => setIsOpen(current => !current)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 md:hidden" aria-expanded={isOpen}>
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div className={`${isOpen ? "mt-4 block" : "hidden"} md:mt-0 md:block`}>
        <div className={contentClassName}>{children}</div>
      </div>
    </section>;
}
export default ResponsiveFilterSection;
