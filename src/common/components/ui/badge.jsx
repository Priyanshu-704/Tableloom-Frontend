import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        primary: "bg-primary-50 text-primary-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-sky-100 text-sky-700",
        danger: "bg-rose-100 text-rose-700",
        info: "bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
function Badge({ className, variant, ...props }) {
  return (
    <div
      className={cn(
        badgeVariants({
          variant,
        }),
        className,
      )}
      {...props}
    />
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
