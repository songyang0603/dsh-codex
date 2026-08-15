#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requestedPackageRoot = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : process.cwd();
const packagesRoot = resolve(repositoryRoot, "packages");
const requestedRelative = relative(packagesRoot, requestedPackageRoot);
const packageRoot =
  requestedRelative.length > 0 &&
  !requestedRelative.startsWith("..") &&
  !isAbsolute(requestedRelative)
    ? requestedPackageRoot
    : resolve(repositoryRoot, "packages/execpolicy");
const requiredFiles = [
  "LICENSE",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "UPSTREAMS.md",
];

const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
);
const publishedFiles = new Set(packageJson.files ?? []);

for (const file of requiredFiles) {
  const packageContent = readFileSync(resolve(packageRoot, file), "utf8");
  if (packageContent.trim().length === 0) {
    throw new Error(`${file} is empty in ${packageJson.name}`);
  }
  if (!publishedFiles.has(file)) {
    throw new Error(`${file} is not included in ${packageJson.name} files`);
  }
}

const rootLicense = readFileSync(resolve(repositoryRoot, "LICENSE"));
const packageLicense = readFileSync(resolve(packageRoot, "LICENSE"));
if (!rootLicense.equals(packageLicense)) {
  throw new Error(`${packageJson.name} LICENSE differs from the repository`);
}

const notice = readFileSync(resolve(packageRoot, "NOTICE"), "utf8");
const thirdPartyNotices = readFileSync(
  resolve(packageRoot, "THIRD_PARTY_NOTICES.md"),
  "utf8",
);
const upstreams = readFileSync(resolve(packageRoot, "UPSTREAMS.md"), "utf8");
const attributionText = `${notice}\n${thirdPartyNotices}\n${upstreams}`;
for (const requiredText of [
  "OpenAI Codex",
  "Apache License, Version 2.0",
  "DeepSeek Harness",
  "MIT License",
  "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  "47f943859bef60e4160492346772ded9b24f765a",
]) {
  if (!attributionText.includes(requiredText)) {
    throw new Error(
      `${packageJson.name} attribution is missing ${JSON.stringify(requiredText)}`,
    );
  }
}

if (!upstreams.includes("https://github.com/openai/codex")) {
  throw new Error(
    `${packageJson.name} UPSTREAMS.md is missing the Codex repository`,
  );
}

process.stdout.write(
  `Verified ${requiredFiles.length} independently scoped attribution files for ${packageJson.name} (${relative(repositoryRoot, packageRoot)}).\n`,
);
