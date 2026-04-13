/* eslint-disable no-undef */
const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};
const readEnvironment = () => {
  const viteEnv =
    typeof import.meta !== "undefined" && import.meta?.env
      ? import.meta.env
      : undefined;
  return {
    mode:
      viteEnv?.MODE ||
      (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) ||
      "development",
    configuredLevel:
      viteEnv?.VITE_LOG_LEVEL ||
      (typeof process !== "undefined"
        ? process.env?.VITE_LOG_LEVEL
        : undefined) ||
      "",
  };
};
const normalizeLevel = (level = "") => {
  const normalized = String(level || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(LOG_LEVELS, normalized)
    ? normalized
    : null;
};
const resolveLevel = () => {
  const { mode, configuredLevel } = readEnvironment();
  const explicitLevel = normalizeLevel(configuredLevel);
  if (explicitLevel) {
    return explicitLevel;
  }
  return mode === "production" ? "warn" : "debug";
};
const safeSerialize = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
};
const shouldLog = (level) => LOG_LEVELS[level] >= LOG_LEVELS[resolveLevel()];
const writeLog = (level, message, ...meta) => {
  if (!shouldLog(level)) {
    return;
  }
  const timestamp = new Date().toISOString();
  const loggerMethod = level === "debug" ? "debug" : level;
  const args = [
    `[${timestamp}] [${level.toUpperCase()}]`,
    message,
    ...meta.map(safeSerialize),
  ];
  if (typeof console?.[loggerMethod] === "function") {
    console[loggerMethod](...args);
    return;
  }
  console.log(...args);
};
export const logger = {
  debug: (message, ...meta) => writeLog("debug", message, ...meta),
  info: (message, ...meta) => writeLog("info", message, ...meta),
  warn: (message, ...meta) => writeLog("warn", message, ...meta),
  error: (message, ...meta) => writeLog("error", message, ...meta),
};
export default logger;
