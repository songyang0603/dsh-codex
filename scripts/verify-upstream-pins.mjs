#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const lockPath = resolve(repositoryRoot, "upstreams.lock.json");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const codex = lock.upstreams?.codex;
const deepseekHarness = lock.upstreams?.deepseekHarness;

if (
  codex === undefined ||
  typeof codex.commit !== "string" ||
  deepseekHarness === undefined ||
  typeof deepseekHarness.commit !== "string"
) {
  throw new Error("upstreams.lock.json does not contain both upstream commits");
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv.at(index + 1);
}

// The first positional argument remains a backward-compatible Codex checkout.
const legacyCodexArgument =
  process.argv.at(2)?.startsWith("--") === false
    ? process.argv.at(2)
    : undefined;
const codexCheckout = resolve(
  option("--codex") ??
    legacyCodexArgument ??
    process.env.CODEX_UPSTREAM_CHECKOUT ??
    resolve(repositoryRoot, "..", "codex"),
);
const deepseekHarnessCheckout = resolve(
  option("--deepseek-harness") ??
    process.env.DEEPSEEK_HARNESS_UPSTREAM_CHECKOUT ??
    resolve(repositoryRoot, "..", "deepseek-harness"),
);

function git(checkout, ...arguments_) {
  return execFileSync("git", ["-C", checkout, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const failures = [];

function verifyUpstream(label, upstream, checkout) {
  try {
    git(checkout, "cat-file", "-e", `${upstream.commit}^{commit}`);
  } catch (error) {
    const detail = error?.stderr?.toString().trim();
    failures.push(
      `${label}: checkout ${checkout} does not contain ${upstream.commit}${detail ? `: ${detail}` : ""}`,
    );
    return;
  }

  for (const [name, component] of Object.entries(upstream.components ?? {})) {
    const actual = git(
      checkout,
      "rev-parse",
      `${upstream.commit}:${component.path}`,
    );
    const actualType = git(checkout, "cat-file", "-t", actual);
    if (
      actual !== component.gitObject ||
      actualType !== component.gitObjectType
    ) {
      failures.push(
        `${label}/${name}: expected ${component.gitObjectType} ${component.gitObject}, got ${actualType} ${actual}`,
      );
    }
    if (component.packageVersion !== undefined) {
      const manifest = JSON.parse(
        git(
          checkout,
          "show",
          `${upstream.commit}:${component.path}/package.json`,
        ),
      );
      if (manifest.version !== component.packageVersion) {
        failures.push(
          `${label}/${name}: expected package version ${component.packageVersion}, got ${manifest.version ?? "<missing>"}`,
        );
      }
    }
  }
}

verifyUpstream("codex", codex, codexCheckout);
verifyUpstream("deepseekHarness", deepseekHarness, deepseekHarnessCheckout);

const cargoManifest = readFileSync(
  resolve(repositoryRoot, "crates/execpolicy-engine/Cargo.toml"),
  "utf8",
);
const cargoLock = readFileSync(resolve(repositoryRoot, "Cargo.lock"), "utf8");
for (const dependency of [
  "codex-config",
  "codex-exec-server",
  "codex-execpolicy",
  "codex-shell-command",
  "codex-utils-absolute-path",
  "codex-utils-cli",
  "codex-utils-home-dir",
]) {
  const expression = new RegExp(
    `^${dependency.replaceAll("-", "\\-")}\\s*=\\s*\\{[^}]*\\brev\\s*=\\s*"([0-9a-f]{40})"[^}]*\\}`,
    "m",
  );
  const revision = cargoManifest.match(expression)?.[1];
  if (revision !== codex.commit) {
    failures.push(
      `${dependency}: Cargo revision ${revision ?? "<missing>"} does not match ${codex.commit}`,
    );
  }

  const packageStart = cargoLock.indexOf(
    `[[package]]\nname = "${dependency}"\n`,
  );
  const packageEnd =
    packageStart === -1 ? -1 : cargoLock.indexOf("\n\n", packageStart);
  const packageRecord =
    packageStart === -1
      ? ""
      : cargoLock.slice(
          packageStart,
          packageEnd === -1 ? undefined : packageEnd,
        );
  const expectedSource =
    `source = "git+${codex.repository}?rev=${codex.commit}` +
    `#${codex.commit}"`;
  if (!packageRecord.includes(expectedSource)) {
    failures.push(
      `${dependency}: Cargo.lock does not resolve the exact pinned Git commit`,
    );
  }
}

function cargoPackageIdentities(contents) {
  return contents
    .split("\n[[package]]\n")
    .slice(1)
    .flatMap((record) => {
      const name = record.match(/^name = "([^"]+)"$/m)?.[1];
      const version = record.match(/^version = "([^"]+)"$/m)?.[1];
      const source = record.match(/^source = "([^"]+)"$/m)?.[1];
      const checksum = record.match(/^checksum = "([^"]+)"$/m)?.[1];
      return name === undefined || version === undefined
        ? []
        : [{ name, version, source, checksum }];
    });
}

const pinnedCargoLock = git(
  codexCheckout,
  "show",
  `${codex.commit}:codex-rs/Cargo.lock`,
);
const pinnedExternalPackages = new Set(
  cargoPackageIdentities(pinnedCargoLock)
    .filter(({ source }) => source !== undefined)
    .map(
      ({ name, version, source, checksum }) =>
        `${name}\0${version}\0${source}\0${checksum ?? ""}`,
    ),
);
for (const package_ of cargoPackageIdentities(cargoLock)) {
  if (package_.source === undefined) continue;
  if (
    package_.source.startsWith(
      `git+${codex.repository}?rev=${codex.commit}#${codex.commit}`,
    )
  ) {
    continue;
  }
  const identity = `${package_.name}\0${package_.version}\0${package_.source}\0${package_.checksum ?? ""}`;
  if (!pinnedExternalPackages.has(identity)) {
    failures.push(
      `${package_.name} ${package_.version}: Cargo.lock external dependency identity is absent from the pinned Codex Cargo.lock`,
    );
  }
}

const runtimeSource = readFileSync(
  resolve(repositoryRoot, "crates/execpolicy-engine/src/runtime.rs"),
  "utf8",
);
if (!runtimeSource.includes(`at commit ${codex.commit}.`)) {
  failures.push(
    "runtime.rs does not name the pinned Codex commit in its modified-source notice",
  );
}

const configStackSource = readFileSync(
  resolve(repositoryRoot, "crates/execpolicy-engine/src/config_stack.rs"),
  "utf8",
);
if (
  !configStackSource.includes("Adapted from OpenAI Codex at commit") ||
  !configStackSource.includes(codex.commit)
) {
  failures.push(
    "config_stack.rs does not name the pinned Codex commit in its modified-source notice",
  );
}

const packageManifests = [
  [
    "root",
    JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8")),
  ],
  [
    "execpolicy",
    JSON.parse(
      readFileSync(
        resolve(repositoryRoot, "packages/execpolicy/package.json"),
        "utf8",
      ),
    ),
  ],
];
const pnpmLock = readFileSync(
  resolve(repositoryRoot, "pnpm-lock.yaml"),
  "utf8",
);
const dependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
];

for (const [name, artifact] of Object.entries(
  deepseekHarness.npmArtifacts ?? {},
)) {
  const declarations = packageManifests.flatMap(([packageName, manifest]) =>
    dependencySections.flatMap((section) => {
      const version = manifest[section]?.[name];
      return version === undefined ? [] : [[packageName, section, version]];
    }),
  );

  if (artifact.direct !== false && declarations.length === 0) {
    failures.push(
      `${name}: npm artifact is pinned but no public package declares it`,
    );
  }

  for (const [packageName, section, version] of declarations) {
    if (version !== artifact.version) {
      failures.push(
        `${packageName}/${name}: ${section} version ${version} does not match pinned artifact ${artifact.version}`,
      );
    }
  }

  const lockRecord =
    `  '${name}@${artifact.version}':\n` +
    `    resolution: {integrity: ${artifact.integrity}}`;
  if (!pnpmLock.includes(lockRecord)) {
    failures.push(
      `${name}: pnpm-lock.yaml does not contain ${artifact.version} with the pinned integrity`,
    );
  }
}

if (failures.length > 0) {
  throw new Error(
    `upstream pin verification failed:\n- ${failures.join("\n- ")}`,
  );
}

process.stdout.write(
  `Verified ${Object.keys(codex.components ?? {}).length} Codex and ` +
    `${Object.keys(deepseekHarness.components ?? {}).length} DeepSeek Harness source objects.\n`,
);
