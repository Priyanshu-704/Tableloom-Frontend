import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
export const backupAdminService = {
  exportBackup: async () => {
    try {
      const response = await axiosInstance.get("/backups/export", {
        responseType: "blob",
      });
      const contentDisposition =
        response.headers?.["content-disposition"] || "";
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      const filename =
        filenameMatch?.[1] || `tableloom-backup-${Date.now()}.json`;
      const blob = new Blob([response.data], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return {
        success: true,
        filename,
        scope: response.headers?.["x-backup-scope"] || null,
      };
    } catch (error) {
      handleApiError(error, "Failed to export backup");
    }
  },
  cloneBackup: async (payload = {}) => {
    try {
      const response = await axiosInstance.post("/backups/clone", payload);
      return (
        response?.data ?? {
          success: true,
          data: {},
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to clone backup");
    }
  },
};
export default backupAdminService;
