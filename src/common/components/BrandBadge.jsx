import React, { useMemo, useState } from "react";

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-16 w-16"
};

const fallbackTextSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg"
};

export function BrandBadge({
  logoSrc = "/tableloom-mark.svg",
  name = "Tableloom",
  size = "md",
  showName = true,
  className = "",
  nameClassName = ""
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const resolvedSizeClass = sizeClasses[size] || sizeClasses.md;
  const fallbackLabel = useMemo(() => String(name || "T").split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "T", [name]);
  return <div className={["flex min-w-0 items-center gap-3", className].filter(Boolean).join(" ")}>
      {logoSrc && !hasImageError ? <img src={logoSrc} alt={`${name} logo`} className={[resolvedSizeClass, "shrink-0 rounded-2xl object-cover shadow-sm"].join(" ")} onError={() => setHasImageError(true)} /> : <div className={[resolvedSizeClass, fallbackTextSizes[size] || fallbackTextSizes.md, "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 font-bold text-white shadow-sm"].join(" ")}>
          {fallbackLabel}
        </div>}
      {showName ? <span className={["min-w-0 text-balance break-words font-bold leading-tight text-slate-900", nameClassName].filter(Boolean).join(" ")}>
          {name}
        </span> : null}
    </div>;
}

export default BrandBadge;
