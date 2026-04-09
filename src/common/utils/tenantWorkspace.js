export const normalizeTenantSlugInput = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");

export const normalizeTenantKeyInput = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const buildTenantWorkspacePath = (tenant = {}) =>
  `/${tenant?.slug || "tenant"}/${tenant?.key || "workspace"}`;
