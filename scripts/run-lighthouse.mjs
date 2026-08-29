import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const [url, outputPath] = process.argv.slice(2);

if (!url || !outputPath) {
  console.error("usage: node scripts/run-lighthouse.mjs <url> <output-path>");
  process.exit(2);
}

const lighthouseArgs = [
  "dlx",
  "lighthouse@13.4.1",
  url,
  "--quiet",
  "--only-categories=performance,accessibility,best-practices",
  "--output=json",
  `--output-path=${outputPath}`,
  '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
];

if (process.env.LIGHTHOUSE_EXTRA_HEADERS) {
  lighthouseArgs.push(`--extra-headers=${process.env.LIGHTHOUSE_EXTRA_HEADERS}`);
}

async function reportIsValid() {
  try {
    const report = JSON.parse(await readFile(outputPath, "utf8"));
    const runtimeError = report.runtimeError;
    const performanceScore = report.categories?.performance?.score;

    if (runtimeError) {
      console.error(
        `Lighthouse runtime error for ${url}: ${runtimeError.code ?? "UNKNOWN"} - ${runtimeError.message ?? "no message"}`,
      );
      return false;
    }

    if (performanceScore === null || performanceScore === undefined) {
      console.error(`Lighthouse did not produce a performance score for ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Unable to validate Lighthouse report for ${url}:`, error);
    return false;
  }
}

for (let attempt = 1; attempt <= 2; attempt += 1) {
  await rm(outputPath, { force: true });

  const result = spawnSync("pnpm", lighthouseArgs, {
    stdio: "inherit",
    env: process.env,
  });

  if (await reportIsValid()) {
    process.exit(0);
  }

  if (attempt < 2) {
    console.warn(`Retrying Lighthouse for ${url} after invalid run (${attempt}/2).`);
    continue;
  }

  if (result.error) {
    console.error(result.error);
  }
}

console.error(`Lighthouse failed to produce a valid report for ${url} after 2 attempts.`);
process.exit(1);
