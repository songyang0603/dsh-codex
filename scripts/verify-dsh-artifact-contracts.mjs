#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const lock = JSON.parse(
  readFileSync(resolve(repositoryRoot, "upstreams.lock.json"), "utf8"),
);
const packageName = "@deepseek-ai/dsh-user-approval";
const artifact = lock.upstreams?.deepseekHarness?.npmArtifacts?.[packageName];

if (
  artifact === undefined ||
  typeof artifact.version !== "string" ||
  typeof artifact.integrity !== "string"
) {
  throw new Error(`${packageName} is not pinned with version and integrity`);
}

const pnpmLock = readFileSync(
  resolve(repositoryRoot, "pnpm-lock.yaml"),
  "utf8",
);
const lockRecord =
  `  '${packageName}@${artifact.version}':\n` +
  `    resolution: {integrity: ${artifact.integrity}}`;
if (!pnpmLock.includes(lockRecord)) {
  throw new Error(
    `pnpm-lock.yaml does not contain ${packageName}@${artifact.version} with the pinned integrity`,
  );
}

const pnpmStore = resolve(repositoryRoot, "node_modules/.pnpm");
if (!existsSync(pnpmStore)) {
  throw new Error(
    "node_modules is missing; run pnpm install before artifact:verify",
  );
}

// pnpm shortens virtual-store directory names more aggressively on Windows,
// so their names are not a portable package lookup API. Resolve the package
// through pnpm's stable hoisted dependency directory instead.
const installedPackage = resolve(
  pnpmStore,
  "node_modules/@deepseek-ai/dsh-user-approval",
);
const installedDeclaration = resolve(installedPackage, "lib/types/types.d.ts");
if (!existsSync(installedDeclaration)) {
  throw new Error(
    `could not resolve the installed ${packageName}@${artifact.version} declaration`,
  );
}

const installedManifest = JSON.parse(
  readFileSync(resolve(installedPackage, "package.json"), "utf8"),
);
if (
  installedManifest.name !== packageName ||
  installedManifest.version !== artifact.version
) {
  throw new Error(
    `resolved unexpected DSH approval artifact: ${installedManifest.name}@${installedManifest.version}`,
  );
}

function stringLiteralUnion(source, typeName) {
  const declaration = source.match(
    new RegExp(`export\\s+type\\s+${typeName}\\s*=([\\s\\S]*?);`),
  )?.[1];
  if (declaration === undefined) {
    throw new Error(`could not find exported type ${typeName}`);
  }

  const literals = [...declaration.matchAll(/["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  if (literals.length === 0) {
    throw new Error(`${typeName} is not a string-literal union`);
  }
  return [...new Set(literals)].sort();
}

const installedOutcomes = stringLiteralUnion(
  readFileSync(installedDeclaration, "utf8"),
  "ApprovalOutcome",
);
const localOutcomes = stringLiteralUnion(
  readFileSync(
    resolve(repositoryRoot, "packages/approval/src/types.ts"),
    "utf8",
  ),
  "DshOneShotApprovalOutcome",
);

if (JSON.stringify(localOutcomes) !== JSON.stringify(installedOutcomes)) {
  throw new Error(
    `DSH one-shot approval vocabulary differs: local=${JSON.stringify(localOutcomes)}, installed=${JSON.stringify(installedOutcomes)}`,
  );
}

process.stdout.write(
  `Verified ${packageName}@${artifact.version} integrity and ${installedOutcomes.length}-value outcome vocabulary.\n`,
);
