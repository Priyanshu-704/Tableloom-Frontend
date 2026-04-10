import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const normalizeBasePath = (path = "/") => {
  const trimmed = `/${String(path || "/").replace(/^\/+|\/+$/g, "")}`;
  return trimmed === "/" ? "/" : `${trimmed}/`;
};
export default defineConfig(({
  mode
}) => {
  const env = loadEnv(mode, projectRoot, "");
  return {
    plugins: [react(), tailwindcss()],
    base: normalizeBasePath(env.VITE_CONTEXT_PATH || "/")
  };
});
