import React from "react";
import { getInventoryStatusMeta } from "../../common/utils/inventory";
export function InventoryStatusBadge({ status }) {
  const meta = getInventoryStatusMeta(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
export default InventoryStatusBadge;
