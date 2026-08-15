#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages/execpolicy");
const requiredFiles = [
  "LICENSE",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "UPSTREAMS.md",
];

const mismatches = [];
for (const file of requiredFiles) {
  const rootContent = readFileSync(resolve(repositoryRoot, file));
  const packageContent = readFileSync(resolve(packageRoot, file));
  if (!rootContent.equals(packageContent)) mismatches.push(file);
}

if (mismatches.length > 0) {
  throw new Error(
    `package attribution files differ from repository roots: ${mismatches.join(", ")}`,
  );
}

process.stdout.write(
  `Verified ${requiredFiles.length} package attribution files.\n`,
);
