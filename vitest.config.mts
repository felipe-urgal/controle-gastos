import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

if (existsSync(".env.test")) {
  loadEnvFile(".env.test");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});