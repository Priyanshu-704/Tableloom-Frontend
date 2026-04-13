const STATUS_MESSAGES = {
  400: "The request could not be processed",
  401: "You need to sign in to continue",
  403: "You do not have permission to perform this action",
  404: "The requested resource was not found",
  409: "This request conflicts with existing data",
  422: "The submitted data is invalid",
  429: "Too many requests. Please try again later",
  500: "Server error. Please try again later",
  503: "Service unavailable. Please try again later",
};
export const getApiMessage = (
  source,
  fallbackMessage = "Something went wrong",
) => {
  if (typeof source === "string") {
    return source.trim() || fallbackMessage;
  }
  const backendData = source?.response?.data || source?.data || source || {};
  const status = source?.response?.status ?? source?.status ?? 0;
  const backendMessage =
    backendData?.error ||
    backendData?.message ||
    backendData?.details ||
    backendData?.errors?.[0]?.message;
  return (
    backendMessage ||
    STATUS_MESSAGES[status] ||
    source?.message ||
    fallbackMessage
  );
};
const normalizeApiError = (error, fallbackMessage = "Something went wrong") => {
  const backendData = error?.response?.data;
  const status = error?.response?.status ?? 0;
  return {
    success: false,
    message: getApiMessage(error, fallbackMessage),
    status,
    data: backendData?.data ?? null,
    meta: backendData?.meta ?? null,
    errors: backendData?.errors ?? null,
  };
};
const handleApiError = (error, fallbackMessage = "Something went wrong") => {
  throw normalizeApiError(error, fallbackMessage);
};
export const createSafeResponse = (
  data = null,
  message = "Request failed",
  extra = {},
) => ({
  success: false,
  data,
  message,
  ...extra,
});
export const getResponseData = (response, fallback = null) =>
  response?.data?.data ?? response?.data ?? fallback;
export const normalizeServiceSuccess = (response, fallbackMessage = "") => {
  const payload = response?.data ?? response ?? null;
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    message: getApiMessage(payload, fallbackMessage),
  };
};
export default handleApiError;
