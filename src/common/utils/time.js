const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
const MONTH_IN_SECONDS = 30 * DAY_IN_SECONDS;
const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS;

const pluralize = (value, unit) =>
  `${value} ${unit}${value === 1 ? "" : "s"} ago`;

export const formatElapsedTime = (value, fallback = "Just now") => {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return fallback;
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < MINUTE_IN_SECONDS) {
    return `${diffSeconds || 1}s ago`;
  }

  if (diffSeconds < HOUR_IN_SECONDS) {
    return `${Math.floor(diffSeconds / MINUTE_IN_SECONDS)}m ago`;
  }

  if (diffSeconds < DAY_IN_SECONDS) {
    return `${Math.floor(diffSeconds / HOUR_IN_SECONDS)}h ago`;
  }

  if (diffSeconds < MONTH_IN_SECONDS) {
    return pluralize(Math.floor(diffSeconds / DAY_IN_SECONDS), "day");
  }

  if (diffSeconds < YEAR_IN_SECONDS) {
    return pluralize(Math.floor(diffSeconds / MONTH_IN_SECONDS), "month");
  }

  return pluralize(Math.floor(diffSeconds / YEAR_IN_SECONDS), "year");
};

export default formatElapsedTime;
