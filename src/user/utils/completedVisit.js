const COMPLETED_VISIT_STORAGE_KEY = "tableloom_completed_visit";
const COMPLETED_VISIT_TTL_MS = 15 * 60 * 1000;

const readCompletedVisit = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(COMPLETED_VISIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearCompletedVisit = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(COMPLETED_VISIT_STORAGE_KEY);
};

export const getCompletedVisit = () => {
  const visit = readCompletedVisit();
  if (!visit?.completedAt) {
    clearCompletedVisit();
    return null;
  }

  const completedAt = new Date(visit.completedAt);
  if (
    Number.isNaN(completedAt.getTime()) ||
    Date.now() - completedAt.getTime() > COMPLETED_VISIT_TTL_MS
  ) {
    clearCompletedVisit();
    return null;
  }

  return visit;
};

export const hasCompletedVisit = () => Boolean(getCompletedVisit());

export const storeCompletedVisit = (payload = {}) => {
  if (typeof window === "undefined") {
    return null;
  }

  const visit = {
    sessionId: String(payload?.sessionId || "").trim(),
    billId: String(payload?.billId || "").trim(),
    billNumber: String(payload?.billNumber || "").trim(),
    message: String(payload?.message || "").trim(),
    completedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(
    COMPLETED_VISIT_STORAGE_KEY,
    JSON.stringify(visit),
  );

  return visit;
};
