import { spawn } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputDirectory = path.join(
  process.cwd(),
  ".next",
  "diagnostics",
  "analyze",
);

await rm(outputDirectory, { recursive: true, force: true });

const nextBinary = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(
    nextBinary,
    ["experimental-analyze", "--output"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  child.once("error", reject);
  child.once("close", (code) => resolve(code ?? 1));
});

if (exitCode !== 0) {
  process.exit(exitCode);
}

let entries;
try {
  entries = await readdir(outputDirectory);
} catch {
  console.error(
    "Bundle analysis failed: .next/diagnostics/analyze was not created.",
  );
  process.exit(1);
}

if (entries.length === 0) {
  console.error(
    "Bundle analysis failed: .next/diagnostics/analyze is empty.",
  );
  process.exit(1);
}

console.log(
  `Bundle analysis written to ${path.relative(process.cwd(), outputDirectory)}`,
);
