import { runProdSmoke } from "./lib/prod-smoke.mjs";

try {
  await runProdSmoke({
    baseUrl: process.env.PROD_SMOKE_BASE_URL,
    email: process.env.PROD_SMOKE_EMAIL,
    password: process.env.PROD_SMOKE_PASSWORD,
  });
} catch (error) {
  process.stderr.write(
    `[fail] prod-smoke ${error instanceof Error ? error.message : "erro desconhecido"}\n`,
  );
  process.exitCode = 1;
}
