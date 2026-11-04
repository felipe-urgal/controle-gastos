import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
    // Testes com hash de senha e banco passam de 4 s sozinhos; com a suíte em paralelo o padrão de 5 s oscilava.
    testTimeout: 20_000,
  },
});