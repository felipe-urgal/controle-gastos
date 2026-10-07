import { rm } from "node:fs/promises";

const generatedTypeDirectories = [".next/types", ".next/dev/types"];

await Promise.all(
  generatedTypeDirectories.map((path) =>
    rm(path, { recursive: true, force: true }),
  ),
);
