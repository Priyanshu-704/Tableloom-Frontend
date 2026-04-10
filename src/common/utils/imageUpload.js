export const IMAGE_UPLOAD_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const IMAGE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png";
export const IMAGE_UPLOAD_MIME_TYPES = ["image/jpeg", "image/png"];
export const validateImageFile = file => {
  if (!file) {
    return "Select a JPG or PNG image.";
  }
  if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type)) {
    return "Only JPG, JPEG, and PNG images are allowed.";
  }
  if (file.size > IMAGE_UPLOAD_MAX_SIZE_BYTES) {
    return "Image size must be 2MB or smaller.";
  }
  return "";
};
export const appendImageToFormData = (formData, file, fieldName = "image") => {
  if (file) {
    formData.append(fieldName, file);
  }
  return formData;
};
export const createImagePreview = file => file ? URL.createObjectURL(file) : "";
export const revokeImagePreview = (previewUrl = "") => {
  if (typeof previewUrl === "string" && previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
};
export const resolveOriginalImageUrl = (asset = {}, fallback = "") => asset?.image || asset?.logo || asset?.thumbnail || asset?.logoThumbnail || fallback;
export const resolveThumbnailImageUrl = (asset = {}, fallback = "") => asset?.thumbnail || asset?.logoThumbnail || asset?.image || asset?.logo || fallback;
