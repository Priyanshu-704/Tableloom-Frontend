const INVENTORY_UPLOAD_RESULT_STORAGE_KEY =
  "admin.inventory.bulk-upload.latest-result";
export const saveInventoryBulkUploadResult = (result) => {
  if (typeof window === "undefined" || !result) {
    return;
  }
  window.sessionStorage.setItem(
    INVENTORY_UPLOAD_RESULT_STORAGE_KEY,
    JSON.stringify(result),
  );
};
export const getInventoryBulkUploadResult = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const rawValue = window.sessionStorage.getItem(
    INVENTORY_UPLOAD_RESULT_STORAGE_KEY,
  );
  if (!rawValue) {
    return null;
  }
  try {
    return JSON.parse(rawValue);
  } catch {
    window.sessionStorage.removeItem(INVENTORY_UPLOAD_RESULT_STORAGE_KEY);
    return null;
  }
};
