export const toServiceResponse = (response, fallback = {}) => {
  const payload = response?.data ?? {};
  const status = Number(response?.status || 0);
  return {
    success:
      typeof payload?.success === "boolean"
        ? payload.success
        : status >= 200 && status < 300,
    message: payload?.message || fallback.message || "",
    data:
      payload?.data !== undefined
        ? payload.data
        : fallback.data !== undefined
          ? fallback.data
          : null,
    pagination: payload?.pagination || fallback.pagination,
    meta: payload?.meta || fallback.meta,
    publicSettings: payload?.publicSettings || fallback.publicSettings,
    accessToken: payload?.accessToken || fallback.accessToken,
    logoutRequired:
      payload?.logoutRequired !== undefined
        ? payload.logoutRequired
        : fallback.logoutRequired,
    status,
  };
};

export default toServiceResponse;
