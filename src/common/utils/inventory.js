export const INVENTORY_PAGE_SIZE = 10;
export const INVENTORY_FORM_DEFAULTS = {
  ingredientName: "",
  sku: "",
  unit: "pcs",
  currentStock: "",
  minimumStock: "",
  reorderQuantity: "",
  notes: "",
  isActive: true,
  relatedMenuItems: []
};
export const INVENTORY_ADJUSTMENT_DEFAULTS = {
  adjustmentType: "add",
  quantity: "",
  notes: ""
};
export const INVENTORY_STATUS_OPTIONS = [{
  value: "all",
  label: "All Statuses"
}, {
  value: "in_stock",
  label: "In Stock"
}, {
  value: "low_stock",
  label: "Low Stock"
}, {
  value: "out_of_stock",
  label: "Out of Stock"
}, {
  value: "inactive",
  label: "Inactive"
}];
export const INVENTORY_ADJUSTMENT_OPTIONS = [{
  value: "add",
  label: "Add Stock"
}, {
  value: "subtract",
  label: "Subtract Stock"
}];
export const INVENTORY_STATUS_META = {
  in_stock: {
    label: "In Stock",
    className: "bg-emerald-50 text-emerald-700"
  },
  low_stock: {
    label: "Low Stock",
    className: "bg-sky-50 text-sky-700"
  },
  out_of_stock: {
    label: "Out of Stock",
    className: "bg-rose-50 text-rose-700"
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-700"
  }
};
export const getInventoryStatusMeta = status => INVENTORY_STATUS_META[status] || INVENTORY_STATUS_META.inactive;
export const normalizeInventoryRelations = (relations = []) => (Array.isArray(relations) ? relations : []).filter(relation => relation?.menuItem).map(relation => ({
  menuItem: typeof relation.menuItem === "string" ? relation.menuItem : relation.menuItem?._id || "",
  quantityRequired: Math.max(Number(relation.quantityRequired || 0), 0)
}));
