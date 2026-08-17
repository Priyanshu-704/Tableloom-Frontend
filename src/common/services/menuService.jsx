import { axiosInstance } from "./api";
import handleApiError from "../utils/handleApiError";
import { createRequestCache } from "../utils/requestCache";
import { appendImageToFormData } from "../utils/imageUpload";
const menuRequestCache = createRequestCache(5000);
const buildMultipartFormData = (data = {}, imageFile = null) => {
  const formData = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  return appendImageToFormData(formData, imageFile);
};
const processMenuItemFormData = (data = {}) => {
  const processed = {
    ...(data || {}),
  };
  delete processed.image;
  delete processed.thumbnail;
  if (Array.isArray(processed.ingredients)) {
    processed.ingredients = JSON.stringify(processed.ingredients);
  }
  if (Array.isArray(processed.allergens)) {
    processed.allergens = JSON.stringify(processed.allergens);
  }
  if (Array.isArray(processed.tags)) {
    processed.tags = JSON.stringify(processed.tags);
  }
  if (Array.isArray(processed.prices)) {
    processed.prices = JSON.stringify(processed.prices);
  }
  if (
    processed.nutritionalInfo &&
    typeof processed.nutritionalInfo === "object"
  ) {
    processed.nutritionalInfo = JSON.stringify(processed.nutritionalInfo);
  }
  if (processed.seasonal && typeof processed.seasonal === "object") {
    processed.seasonal = JSON.stringify(processed.seasonal);
  }
  if (processed.discount && typeof processed.discount === "object") {
    processed.discount = JSON.stringify(processed.discount);
  }
  return processed;
};
const processFilters = (filters = {}) => {
  const processed = {
    ...(filters || {}),
  };
  if (typeof processed.activeOnly === "boolean") {
    processed.activeOnly = String(processed.activeOnly);
  }
  if (typeof processed.availableOnly === "boolean") {
    processed.availableOnly = String(processed.availableOnly);
  }
  if (typeof processed.isAvailable === "boolean") {
    processed.isAvailable = String(processed.isAvailable);
  }
  if (Array.isArray(processed.tags)) {
    processed.tags = processed.tags.join(",");
  }
  if (Array.isArray(processed.dietary)) {
    processed.dietary = processed.dietary.join(",");
  }
  if (Array.isArray(processed.sizeIds)) {
    processed.sizeIds = processed.sizeIds.join(",");
  }
  if (Array.isArray(processed.spiceLevels)) {
    processed.spiceLevels = processed.spiceLevels.join(",");
  }
  return processed;
};
const downloadBlob = (blobData, filename) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
export const menuService = {
  formatPrice: (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0)),
  isItemSeasonal: (seasonal = {}) => {
    if (!seasonal?.isSeasonal) {
      return false;
    }
    const now = new Date();
    const startDate = seasonal.startDate ? new Date(seasonal.startDate) : null;
    const endDate = seasonal.endDate ? new Date(seasonal.endDate) : null;
    if (startDate && startDate > now) {
      return false;
    }
    if (endDate && endDate < now) {
      return false;
    }
    return true;
  },
  createCategory: async (categoryData = {}, imageFile = null) => {
    try {
      const response = await axiosInstance.post(
        "/menu/categories",
        buildMultipartFormData(categoryData, imageFile),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:categories");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to create category");
    }
  },
  getCategories: async (
    activeOnly = "all",
    withStation = true,
    options = {},
  ) => {
    try {
      const params = {};
      if (activeOnly === true || activeOnly === "true") {
        params.activeOnly = "true";
      } else if (activeOnly === false || activeOnly === "false") {
        params.activeOnly = "false";
      }
      if (typeof withStation === "boolean") {
        params.withStation = String(withStation);
      }
      if (options?.view) {
        params.view = options.view;
      }
      return await menuRequestCache.run(
        {
          scope: "menu:categories",
          params,
        },
        async () => {
          const response = await axiosInstance.get("/menu/categories", {
            params,
          });
          return (
            response?.data ?? {
              success: true,
              data: [],
            }
          );
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch categories");
    }
  },
  getCategoryById: async (categoryId) => {
    try {
      const response = await axiosInstance.get(
        `/menu/categories/${categoryId}`,
      );
      return (
        response?.data ?? {
          success: true,
          data: null,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch category");
    }
  },
  updateCategory: async (categoryId, updateData = {}, imageFile = null) => {
    try {
      const response = await axiosInstance.put(
        `/menu/categories/${categoryId}`,
        buildMultipartFormData(updateData, imageFile),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:categories");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update category");
    }
  },
  toggleCategoryStatus: async (categoryId) => {
    try {
      const response = await axiosInstance.put(
        `/menu/categories/${categoryId}/status`,
      );
      menuRequestCache.invalidate("menu:categories");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to toggle category status");
    }
  },
  deleteCategory: async (categoryId) => {
    try {
      const response = await axiosInstance.delete(
        `/menu/categories/${categoryId}`,
      );
      menuRequestCache.invalidate("menu:categories");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to delete category");
    }
  },
  getSizes: async (activeOnly = "all") => {
    try {
      const params = {};
      if (activeOnly === true || activeOnly === "true") {
        params.activeOnly = "true";
      } else if (activeOnly === false || activeOnly === "false") {
        params.activeOnly = "false";
      }
      return await menuRequestCache.run(
        {
          scope: "menu:sizes",
          params,
        },
        async () => {
          const response = await axiosInstance.get("/menu/sizes", {
            params,
          });
          return (
            response?.data ?? {
              success: true,
              data: [],
            }
          );
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch sizes");
    }
  },
  createSize: async (sizeData = {}) => {
    try {
      const response = await axiosInstance.post("/menu/sizes", sizeData);
      menuRequestCache.invalidate("menu:sizes");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to create size");
    }
  },
  updateSize: async (sizeId, sizeData = {}) => {
    try {
      const response = await axiosInstance.put(
        `/menu/sizes/${sizeId}`,
        sizeData,
      );
      menuRequestCache.invalidate("menu:sizes");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update size");
    }
  },
  toggleSizeStatus: async (sizeId) => {
    try {
      const response = await axiosInstance.patch(
        `/menu/sizes/${sizeId}/toggle-status`,
      );
      menuRequestCache.invalidate("menu:sizes");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to toggle size status");
    }
  },
  getCoupons: async (activeOnly = "all") => {
    try {
      const params = {};
      if (activeOnly === true || activeOnly === "true") {
        params.activeOnly = "true";
      } else if (activeOnly === false || activeOnly === "false") {
        params.activeOnly = "false";
      }
      const response = await axiosInstance.get("/menu/coupons", {
        params,
      });
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch coupons");
    }
  },
  createCoupon: async (couponData = {}) => {
    try {
      const response = await axiosInstance.post("/menu/coupons", couponData);
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to create coupon");
    }
  },
  updateCoupon: async (couponId, couponData = {}) => {
    try {
      const response = await axiosInstance.put(
        `/menu/coupons/${couponId}`,
        couponData,
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update coupon");
    }
  },
  toggleCouponStatus: async (couponId) => {
    try {
      const response = await axiosInstance.patch(
        `/menu/coupons/${couponId}/toggle-status`,
      );
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to toggle coupon status");
    }
  },
  deleteCoupon: async (couponId) => {
    try {
      const response = await axiosInstance.delete(`/menu/coupons/${couponId}`);
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to delete coupon");
    }
  },
  createMenuItem: async (menuItemData = {}, imageFile = null) => {
    try {
      const response = await axiosInstance.post(
        "/menu/items",
        buildMultipartFormData(
          processMenuItemFormData(menuItemData),
          imageFile,
        ),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to create menu item");
    }
  },
  getMenuItems: async (filters = {}) => {
    try {
      const processedFilters = processFilters(filters);
      if (!processedFilters.view) {
        processedFilters.view = "admin";
      }
      const response = await axiosInstance.get("/menu/items", {
        params: processedFilters,
      });
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch menu items");
    }
  },
  getMenuItem: async (itemId) => {
    try {
      const response = await axiosInstance.get(`/menu/items/${itemId}`);
      return (
        response?.data ?? {
          success: true,
          data: null,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch menu item");
    }
  },
  updateMenuItem: async (itemId, updateData = {}, imageFile = null) => {
    try {
      const response = await axiosInstance.put(
        `/menu/items/${itemId}`,
        buildMultipartFormData(processMenuItemFormData(updateData), imageFile),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to update menu item");
    }
  },
  toggleMenuItemAvailability: async (itemId) => {
    try {
      const response = await axiosInstance.put(
        `/menu/items/${itemId}/availability`,
      );
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to toggle menu item availability");
    }
  },
  deleteMenuItem: async (itemId) => {
    try {
      const response = await axiosInstance.delete(`/menu/items/${itemId}`);
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to delete menu item");
    }
  },
  getSeasonalItems: async () => {
    try {
      const response = await axiosInstance.get("/menu/items/seasonal");
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch seasonal items");
    }
  },
  getPriceHistory: async (itemId, period = "all") => {
    try {
      const response = await axiosInstance.get(
        `/menu/items/${itemId}/price-history`,
        {
          params: {
            period,
          },
        },
      );
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch price history");
    }
  },
  getAllPriceChanges: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/menu/price-changes", {
        params: processFilters(filters),
      });
      return (
        response?.data ?? {
          success: true,
          data: [],
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch price changes");
    }
  },
  getMenuStatistics: async () => {
    try {
      return await menuRequestCache.run(
        "menu:statistics",
        async () => {
          const response = await axiosInstance.get("/menu/statistics");
          return (
            response?.data ?? {
              success: true,
              data: {},
            }
          );
        },
        {
          ttlMs: 10000,
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch menu statistics");
    }
  },
  getMenuFilterOptions: async () => {
    try {
      return await menuRequestCache.run(
        "menu:filters",
        async () => {
          const response = await axiosInstance.get("/menu/filters");
          return (
            response?.data ?? {
              success: true,
              data: {},
            }
          );
        },
        {
          ttlMs: 30000,
        },
      );
    } catch (error) {
      handleApiError(error, "Failed to fetch menu filter options");
    }
  },
  bulkUpdateMenuItems: async (updates = [], action) => {
    try {
      const response = await axiosInstance.put("/menu/items/bulk/update", {
        updates,
        action,
      });
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to bulk update menu items");
    }
  },
  bulkUpdatePrices: async (updates = []) => {
    return menuService.bulkUpdateMenuItems(updates, "updatePrices");
  },
  bulkUpdateAvailability: async (updates = []) => {
    return menuService.bulkUpdateMenuItems(updates, "updateAvailability");
  },
  bulkUpdateStatus: async (updates = []) => {
    return menuService.bulkUpdateMenuItems(updates, "updateStatus");
  },
  bulkUpdateCategories: async (updates = []) => {
    return menuService.bulkUpdateMenuItems(updates, "updateCategories");
  },
  exportMenuItems: async (filters = {}) => {
    try {
      const response = await axiosInstance.get("/menu/export", {
        params: processFilters(filters),
        responseType: "blob",
      });
      const contentDisposition = response?.headers?.["content-disposition"];
      let filename = `menu-export-${Date.now()}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }
      downloadBlob(response?.data, filename);
      return {
        success: true,
        filename,
      };
    } catch (error) {
      handleApiError(error, "Failed to export menu items");
    }
  },
  downloadImportTemplate: async () => {
    try {
      const response = await axiosInstance.get("/menu/import/template", {
        responseType: "blob",
      });
      downloadBlob(response?.data, "menu-import-template.csv");
      return {
        success: true,
      };
    } catch (error) {
      handleApiError(error, "Failed to download import template");
    }
  },
  downloadCategoryImportTemplate: async () => {
    try {
      const response = await axiosInstance.get("/menu/categories/import/template", {
        responseType: "blob",
      });
      downloadBlob(response?.data, "category-import-template.csv");
      return {
        success: true,
      };
    } catch (error) {
      handleApiError(error, "Failed to download category import template");
    }
  },
  importMenuItems: async (csvFile) => {
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const response = await axiosInstance.post(
        "/menu/items/bulk/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to import menu items");
    }
  },
  importCategories: async (csvFile) => {
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const response = await axiosInstance.post(
        "/menu/categories/bulk/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      menuRequestCache.invalidate("menu:");
      return (
        response?.data ?? {
          success: true,
        }
      );
    } catch (error) {
      handleApiError(error, "Failed to import categories");
    }
  },
  processMenuItemFormData,
  processFilters,
};
export default menuService;
