import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const KB = 1024;
const limits = {
  publicAsset: Number(process.env.FRONTEND_MAX_ASSET_KB ?? 500) * KB,
  chunk: Number(process.env.FRONTEND_MAX_CHUNK_KB ?? 700) * KB,
  totalJs: Number(process.env.FRONTEND_MAX_TOTAL_JS_KB ?? 5120) * KB,
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function formatKb(bytes) {
  return `${(bytes / KB).toFixed(1)} KiB`;
}

async function collectPublicAssets() {
  const files = await walk("public");
  return Promise.all(files.map(async (path) => ({
    path,
    size: (await stat(path)).size,
  })));
}

async function collectChunks() {
  const root = ".next/static/chunks";
  const files = (await walk(root)).filter((path) => path.endsWith(".js"));
  return Promise.all(files.map(async (path) => ({
    path,
    size: (await stat(path)).size,
  })));
}

const [assets, chunks] = await Promise.all([
  collectPublicAssets(),
  collectChunks(),
]);

const oversizedAssets = assets.filter(({ size }) => size > limits.publicAsset);
const oversizedChunks = chunks.filter(({ size }) => size > limits.chunk);
const totalJs = chunks.reduce((sum, { size }) => sum + size, 0);
const largestChunks = [...chunks].sort((a, b) => b.size - a.size).slice(0, 5);

console.log("Frontend budget");
console.log(`- public asset limit: ${formatKb(limits.publicAsset)}`);
console.log(`- single JS chunk limit: ${formatKb(limits.chunk)}`);
console.log(`- total JS chunks limit: ${formatKb(limits.totalJs)}`);
console.log(`- current total JS chunks: ${formatKb(totalJs)}`);

if (largestChunks.length) {
  console.log("- largest chunks:");
  for (const item of largestChunks) {
    console.log(`  ${relative(process.cwd(), item.path)}: ${formatKb(item.size)}`);
  }
}

const failures = [];

for (const item of oversizedAssets) {
  failures.push(`public asset ${relative(process.cwd(), item.path)} is ${formatKb(item.size)}`);
}

for (const item of oversizedChunks) {
  failures.push(`JS chunk ${relative(process.cwd(), item.path)} is ${formatKb(item.size)}`);
}

if (totalJs > limits.totalJs) {
  failures.push(`total JS chunks are ${formatKb(totalJs)}`);
}

if (failures.length) {
  console.error("\nFrontend budget exceeded:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Frontend budget OK.");
