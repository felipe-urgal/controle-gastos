import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const dest = join(root, "public", "ocr");
const packageRoot = (name) => dirname(require.resolve(`${name}/package.json`));
const copy = (source, target) => {
  if (!existsSync(source)) throw new Error(`Missing OCR asset: ${source}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
};

const worker = packageRoot("tesseract.js");
copy(join(worker, "dist", "worker.min.js"), join(dest, "worker.min.js"));

const core = packageRoot("tesseract.js-core");
for (const name of readdirSync(core).filter((item) => /^tesseract-core.*\.wasm(\.js)?$/.test(item))) {
  copy(join(core, name), join(dest, "core", name));
}
const coreVariants = ["tesseract-core.wasm", "tesseract-core-simd.wasm", "tesseract-core-lstm.wasm", "tesseract-core-simd-lstm.wasm"];
for (const variant of coreVariants) {
  if (!existsSync(join(dest, "core", `${variant}.js`)) || !existsSync(join(dest, "core", variant))) {
    throw new Error(`Missing Tesseract core variant: ${variant}`);
  }
}
if (!existsSync(join(dest, "core", "tesseract-core.wasm.js"))) {
  throw new Error("Tesseract WASM core not found");
}

const languageRoot = packageRoot("@tesseract.js-data/por");
const findLanguage = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      const found = findLanguage(path);
      if (found) return found;
    } else if (entry === "por.traineddata.gz") {
      return path;
    }
  }
  return null;
};
const language = findLanguage(languageRoot);
if (!language) throw new Error("Portuguese OCR traineddata not found");
copy(language, join(dest, "lang", "por.traineddata.gz"));
console.log("Same-origin OCR assets prepared");
