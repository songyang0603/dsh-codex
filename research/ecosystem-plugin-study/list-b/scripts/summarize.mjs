#!/usr/bin/env node

/** Build deterministic, commit-sized research artifacts from inventory.jsonl. */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";

const base = path.resolve(
  process.argv[2] ?? path.join(import.meta.dirname, ".."),
);
const inventoryPath = path.join(base, "inventory.jsonl");
const compactPath = path.join(base, "plugins.jsonl");
const markdownPath = path.join(base, "clusters.md");

const [metadata, ...records] = (await readFile(inventoryPath, "utf8"))
  .trim()
  .split("\n")
  .map(JSON.parse);

function countBy(items, selector) {
  const output = new Map();
  for (const item of items) {
    const key = selector(item);
    output.set(key, (output.get(key) ?? 0) + 1);
  }
  return [...output.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
}

function relevantDependencies(pkg) {
  return [
    ...new Set(
      [
        ...pkg.dependencies,
        ...pkg.peerDependencies,
        ...pkg.optionalDependencies,
      ].filter((name) =>
        /(?:deepseek-ai|cordis|sqlite|react|vue|preact|playwright|electron|tauri|napi|wasm|pty|docker|sandbox|mcp|model-context-protocol)/i.test(
          name,
        ),
      ),
    ),
  ].sort();
}

function compactRecord(record) {
  return {
    schemaVersion: 1,
    list: {
      line: record.sourceList.line,
      category: record.sourceList.category,
      label: record.sourceList.label,
      url: record.sourceList.url,
      description: record.sourceList.description,
    },
    target: {
      repository: record.target.repository,
      subpath: record.target.subpath,
      canonicalKey: record.target.canonicalKey,
      head: record.target.head,
      defaultBranch: record.target.defaultBranch,
      scopeExists: record.target.scopeExists,
    },
    classification: record.classification,
    repository: record.repositoryShape,
    packages: record.packages.map((pkg) => ({
      path: pkg.path,
      name: pkg.name,
      version: pkg.version,
      private: pkg.private,
      main: pkg.main,
      types: pkg.types,
      files: pkg.files,
      bundlePatch: pkg.bundlePatch,
      hasClientManifest: pkg.hasClientManifest,
      dependencies: relevantDependencies(pkg),
      nativeSignals: pkg.nativeSignals,
      packaging: pkg.packagingSignals,
      parseError: pkg.parseError,
    })),
    bundle: record.bundle,
    architecture: {
      languages: record.repositoryShape.languages,
      inspectedEntrypoints: record.source.inspectedFiles.map(
        (file) => file.path,
      ),
      frameworkImports: record.source.imports.filter((name) =>
        /(?:deepseek-ai|cordis|react|vue|preact|mcp|model-context-protocol|sqlite|electron|tauri|napi|wasm)/i.test(
          name,
        ),
      ),
      boundaries: record.source.boundaries,
      cordisMethods: record.source.cordisMethods,
      events: record.source.events,
      injectedServices: record.source.injectedServices,
      registeredTools: record.source.registeredTools,
      toolRegistrationCallCount:
        record.source.toolRegistrationCallCount ?? null,
      persistenceSignals: record.source.persistence,
      lifecycleSignals: record.source.lifecycleSignals,
      stateSignals: record.source.stateSignals,
    },
    verification: {
      tests: {
        inspectedCount: record.tests.discoveredCount,
        files: record.tests.inspectedFiles.map((file) => file.path),
        scripts: record.tests.scripts,
        frameworks: record.tests.frameworks,
        loaderOrProfile: record.tests.hostLoaderCoverage,
        packedArchiveInstall: record.tests.archiveInstallCoverage,
        lifecycle: record.tests.lifecycleCoverage,
      },
      automation: record.workflows,
    },
    distribution: record.readmes,
    observations: record.lessons,
  };
}

const compactRecords = records.map(compactRecord);
const compactMetadata = {
  schemaVersion: 1,
  recordType: "study-metadata",
  source: {
    repository: "awesome-dsh-plugin/awesome-dsh-plugin",
    commit: metadata.source.commit,
    readmeSha256: metadata.source.readmeSha256,
    readmeZhSha256: metadata.source.readmeZhSha256,
  },
  coverage: {
    ...metadata.counts,
    englishOnly: metadata.languageParity.englishOnly,
    chineseOnly: metadata.languageParity.chineseOnly,
    accessible: records.filter(
      (record) => record.accessibility.status === "accessible",
    ).length,
    installableBundleObserved: records.filter(
      (record) => record.classification.hasInstallableBundle,
    ).length,
  },
  method: {
    identity: "normalized GitHub owner/repository plus monorepo subpath",
    repositoryPin: "resolved shallow-clone HEAD SHA",
    inspected: [
      "package manifests",
      "declared bundle patches",
      "core host/client source entrypoints",
      "tests",
      "GitHub workflows and release automation",
      "README installation instructions",
    ],
    caveat:
      "Signals mean observable in the pinned tree and inspected entrypoint set; absence is not proof of runtime impossibility.",
  },
};
await writeFile(
  compactPath,
  [compactMetadata, ...compactRecords]
    .map((record) => JSON.stringify(record))
    .join("\n") + "\n",
  "utf8",
);

function displayBoundary(record) {
  const { host, client, processBoundary } = record.architecture.boundaries;
  if (host && client) return processBoundary ? "H+C+P" : "H+C";
  if (host) return processBoundary ? "H+P" : "H";
  if (client) return processBoundary ? "C+P" : "C";
  return processBoundary ? "P" : "-";
}

function mdEscape(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function linkFor(record, file = null) {
  const root = `https://github.com/${record.target.repository}`;
  if (!file) return `[${mdEscape(record.list.label)}](${root})`;
  return `[${mdEscape(file)}](${root}/blob/${record.target.head}/${file})`;
}

function find(key) {
  const record = compactRecords.find(
    (candidate) => candidate.target.canonicalKey === key,
  );
  if (!record) throw new Error(`missing expected record ${key}`);
  return record;
}

function firstSource(record, pattern = null) {
  return (
    record.architecture.inspectedEntrypoints.find(
      (file) => !pattern || pattern.test(file),
    ) ??
    record.architecture.inspectedEntrypoints[0] ??
    record.packages[0]?.path ??
    "README.md"
  );
}

function pinnedExample(key, note, pattern = null) {
  const record = find(key);
  const file = firstSource(record, pattern);
  return `- ${linkFor(record, file)} @ \`${record.target.head}\`: ${note}`;
}

function shortRef(key, pattern = null) {
  const record = find(key);
  const file = firstSource(record, pattern);
  return `${linkFor(record, file)} @ \`${record.target.head.slice(0, 12)}\``;
}

const categoryCounts = countBy(
  compactRecords,
  (record) => record.list.category,
);
const classificationCounts = countBy(
  compactRecords,
  (record) => record.classification.kind,
);
const boundaryCounts = countBy(compactRecords, displayBoundary);
const patternCounts = new Map();
const gapCounts = new Map();
for (const record of compactRecords) {
  for (const pattern of record.observations.patterns)
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  for (const gap of record.observations.antiPatterns)
    gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
}

const testsPresent = compactRecords.filter(
  (record) =>
    record.verification.tests.inspectedCount ||
    record.verification.tests.scripts.length,
).length;
const loaderTests = compactRecords.filter(
  (record) => record.verification.tests.loaderOrProfile,
).length;
const archiveTests = compactRecords.filter(
  (record) => record.verification.tests.packedArchiveInstall,
).length;
const ciCount = compactRecords.filter(
  (record) => record.verification.automation.ci,
).length;
const npmPublish = compactRecords.filter(
  (record) => record.verification.automation.npmPublish,
).length;
const oidcPublish = compactRecords.filter(
  (record) => record.verification.automation.oidcTrustedPublish,
).length;
const platformMatrix = compactRecords.filter(
  (record) => record.verification.automation.platformMatrix,
).length;
const withToolRegistration = compactRecords.filter(
  (record) =>
    (record.architecture.toolRegistrationCallCount ?? 0) > 0 ||
    record.architecture.registeredTools.length > 0,
).length;
const withServices = compactRecords.filter(
  (record) => record.architecture.injectedServices.length > 0,
).length;
const withLifecycle = compactRecords.filter(
  (record) => record.architecture.lifecycleSignals.disposer,
).length;
const withPersistence = compactRecords.filter(
  (record) => record.architecture.persistenceSignals.length > 0,
).length;
const withAtomic = compactRecords.filter(
  (record) => record.architecture.stateSignals.atomicWrite,
).length;
const withLock = compactRecords.filter(
  (record) => record.architecture.stateSignals.mutexOrLock,
).length;
const rootListingsWithNestedBundles = compactRecords.filter((record) => {
  if (record.target.subpath || record.packages.length < 2) return false;
  const rootPackage = record.packages.find(
    (pkg) => pkg.path === "package.json",
  );
  return (
    !rootPackage?.bundlePatch && record.packages.some((pkg) => pkg.bundlePatch)
  );
});

const lines = [];
lines.push("# awesome-dsh-plugin: per-plugin source study");
lines.push("");
lines.push(
  "> This is a source study of every GitHub entry in the pinned list, not a study of how the awesome list is generated. List prose is discovery input; repository contents are the evidence.",
);
lines.push("");
lines.push("## Coverage and method");
lines.push("");
lines.push(
  `- List pin: \`awesome-dsh-plugin/awesome-dsh-plugin@${metadata.source.commit}\`.`,
);
lines.push(
  `- Parsed ${metadata.counts.englishEntries} English and ${metadata.counts.chineseEntries} Chinese entries. Their normalized targets are identical.`,
);
lines.push(
  `- ${metadata.counts.uniqueTargets} unique repository+subpath targets, ${new Set(compactRecords.map((record) => record.target.repository.toLowerCase())).size} repositories, ${compactRecords.filter((record) => record.target.subpath).length} explicit monorepo subpaths.`,
);
lines.push(
  `- ${compactRecords.filter((record) => record.target.scopeExists).length}/${compactRecords.length} targets were source-accessible and pinned to a concrete HEAD; ${compactRecords.filter((record) => record.classification.hasInstallableBundle).length} have an observable manifest declaration whose patch file exists.`,
);
lines.push(
  "- Every target was inspected for package manifests, `dsh.bundle.patch`, patch rows, core host/client source, Cordis use, tools/events/services/state/persistence signals, tests, CI/release, and install/package instructions.",
);
lines.push(
  "- The scanner uses `git clone --depth=1 --filter=blob:limit=384k --no-checkout`; it retries with `blob:none`, reads only relevant blobs, caches one JSON record per target, and deletes working clones.",
);
lines.push(
  '- All negative counts below mean "not observable in the pinned tree/inspected files". They do not prove a behavior cannot exist at runtime.',
);
lines.push("");
lines.push(
  "The reproducible scanner is [`scripts/scan.mjs`](scripts/scan.mjs); the compact row for every target is [`plugins.jsonl`](plugins.jsonl). `inventory.jsonl` is the scanner's evidence-rich intermediate.",
);
lines.push("");
lines.push("## What the 457 implementations actually look like");
lines.push("");
lines.push("| Classification | Count |");
lines.push("| --- | ---: |");
for (const [name, count] of classificationCounts)
  lines.push(`| ${mdEscape(name)} | ${count} |`);
lines.push("");
lines.push(
  'The key correction to a simple "everything is a plugin" mental model is that the bundle patch is only the composition edge. Real implementations repeatedly split into host services, client extensions, shared protocol/types, persistent stores, background processes, and release artifacts. The patch makes those pieces loadable; it does not erase their boundaries.',
);
lines.push("");
lines.push("### Runtime boundaries");
lines.push("");
lines.push(
  "`H` = observable host imports, `C` = observable client/UI imports, `P` = subprocess/RPC/worker boundary.",
);
lines.push("");
lines.push("| Boundary | Count |");
lines.push("| --- | ---: |");
for (const [name, count] of boundaryCounts)
  lines.push(`| ${name} | ${count} |`);
lines.push("");
lines.push(
  `${withServices} targets expose source-visible injected service names; ${withToolRegistration} contain a visible tool-registration call/name; ${withLifecycle} contain a disposer/unload/abort cleanup signal.`,
);
lines.push("");
lines.push(
  pinnedExample(
    "zhenyu98/dsh-context-doctor",
    "A clean host/client split: host audits injected `fs`, `skills`, `tools`, and sessions; the client registers locale, store, and UI slots.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "omdsh-dev/dsh-genui",
    "The client is not a cosmetic afterthought: an action/event loop joins rendered components back to host behavior, with Loader/profile tests around the integration.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "openma-ai/deepseek-harness-tui",
    "A standalone Rust terminal client can still ship a DSH bundle adapter; protocol/process and DSH composition remain distinct layers.",
    /(?:src|crates).*(?:main|lib)\.rs$/,
  ),
);
lines.push(
  pinnedExample(
    "jesse-njx/dsh-cowork",
    "One repository can contain core, CLI, MCP, DSH, and chat-node packages; the listed root is a collection, not one indivisible plugin.",
    /packages\/dsh\/src\/index\.ts$/,
  ),
);
lines.push("");
lines.push(
  `${rootListingsWithNestedBundles.length} root-level list entries have no root bundle declaration but do contain one or more nested installable DSH packages. This includes adapter monorepos such as \`freehul/sgme\`, \`taxueseek/argo\`, and \`btspoony/mstar-harness\`. For dsh-codex, the publishable package path and npm \`repository.directory\` must therefore be authoritative; a GitHub repository URL alone is not an install contract.`,
);
lines.push("");
lines.push("### Tools, services, events, and lifecycle");
lines.push("");
lines.push(
  "Across the list, tool implementations are commonly thin registrations over injected services. Long-lived concerns (session queries, filesystems, approvals, web servers, persistence) are obtained from the Cordis context rather than recreated inside each tool. UI-heavy plugins often communicate through events or a shared store. Cleanup is normally registered at the same ownership boundary that created routes, timers, watchers, or subprocesses.",
);
lines.push("");
lines.push(
  pinnedExample(
    "perrylink/dsh-memento",
    "Memory writes are approval-gated and persisted behind a typed service seam; this is directly relevant to keeping Codex policy and persistence separable.",
    /index\.mjs$/,
  ),
);
lines.push(
  pinnedExample(
    "dfycaly98931680/dsh-trajectory-governance",
    "A stateful governance plugin combines SQLite, events, host/client surfaces, and tests instead of embedding all behavior in one tool callback.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "jesse-njx/dsh-crosstalk",
    "Cross-session coordination uses a file-backed registry/inbox with heartbeat and locking signals, illustrating explicit ownership of durable state.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "kunjinkao-os/dsh-mobile-gui-agent",
    "A high-event-count host/client implementation shows that event contracts become a first-class API surface and need their own compatibility tests.",
    /src\/index\.ts$/,
  ),
);
lines.push("");
lines.push("### State and persistence");
lines.push("");
lines.push(
  `${withPersistence} targets contain at least one storage/transport signal; ${withAtomic} contain atomic-write/rename signals and ${withLock} contain mutex, semaphore, lockfile, or optimistic-lock signals. Frequent observable media are filesystem JSON/JSONL, SQLite/FTS5, browser localStorage, and remote HTTP stores.`,
);
lines.push("");
lines.push(
  "For dsh-codex this argues for explicit persistence components and typed state transitions. A session, approval cache, policy store, or task ledger should not be hidden in a UI plugin, and process shutdown must make outstanding writes owner-visible.",
);
lines.push("");
lines.push(
  pinnedExample(
    "modusensus/dsh-mneme#dsh-mneme",
    "SQLite plus a human-editable Markdown mirror demonstrates dual durable representations and offline search inside a scoped package.",
    /dsh-mneme\/src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "nwflower/dsh-file-claim",
    "Heartbeat stale takeover and a merge area make concurrency semantics explicit rather than relying on last-write-wins.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "anionex/dsh-turn-rewind",
    "Workspace rewind is built around a persistent change ledger, a useful model for Codex undo/checkpoint components.",
    /src\/index\.ts$/,
  ),
);
lines.push("");
lines.push("### Process, sandbox, and native/provider boundaries");
lines.push("");
lines.push(
  pinnedExample(
    "strukto-ai/mirage#typescript/packages/dsh",
    "Filesystem and bash providers are swapped behind a virtual-workspace adapter; execution backends remain selectable process/sandbox providers.",
    /typescript\/packages\/dsh\/src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "omdsh-dev/sandbox-micro",
    "A sandbox implementation is packaged as a provider component with focused tests and packed-artifact checks, not as scattered command conditionals.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "anionex/dsh-computer-use",
    "Browser/computer control crosses host, client, process, approval, and archive-install boundaries and therefore tests more than the nominal tool response.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "suntianc/dsh-codex-auth",
    "Codex authentication is adapted at an account/provider seam while the native product remains external; this is a bridge pattern, not a Codex loop decomposition.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "franksong2702/dsh-codex-connect",
    "Codex connectivity similarly demonstrates a bounded adapter with Loader tests, rather than evidence that Codex internals became DSH components.",
    /src\/index\.ts$/,
  ),
);
lines.push("");
lines.push("### Approval and policy plugins");
lines.push("");
lines.push(
  pinnedExample(
    "ilharp/dsh-tool-approval",
    "Manual approval is implemented as its own runtime component and can therefore be compared independently with Codex decision semantics.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "arrow949/dsh-turn-approval",
    "Turn-scoped authorization adds an explicit lifetime to cached permission, a useful contrast with session/permanent approval scope.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "lonelymoon87/dsh-guardian",
    "Policy checks and output redaction are kept as a security component with CI, rather than mixed into every tool implementation.",
    /src\/index\.ts$/,
  ),
);
lines.push("");
lines.push(
  "These plugins are useful design references, not Codex-parity oracles. dsh-codex approval must continue to derive wire types, decisions, lifetime, cancellation, and persistence from the pinned Codex source and conformance corpus.",
);
lines.push("");
lines.push("## Verification and release patterns");
lines.push("");
lines.push(
  `- ${testsPresent} targets expose a test script or inspected test file.`,
);
lines.push(`- ${loaderTests} contain Loader/profile integration-test signals.`);
lines.push(
  `- ${archiveTests} contain npm-pack/tarball/real-plugin-install test signals.`,
);
lines.push(
  `- ${ciCount} contain a CI workflow signal; ${npmPublish} contain npm publish automation; ${oidcPublish} contain OIDC/provenance signals; ${platformMatrix} contain a platform/target matrix.`,
);
lines.push("");
lines.push(
  pinnedExample(
    "dsh-market/dsh-market",
    "Combines archive installation checks, tag/version release discipline, npm publishing, provenance, and a platform matrix.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "omdsh-dev/dsh-plugin-check",
    "Treats package structure as executable contract checks; useful checks must still be filtered against official DSH behavior rather than copied wholesale.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "labmimors/dsh-mcp-lens",
    "Pairs Loader/archive signals with multi-workflow release automation, showing that plugin discovery and runtime management can be tested from packed output.",
    /src\/index\.ts$/,
  ),
);
lines.push(
  pinnedExample(
    "openma-ai/deepseek-harness-tui",
    "Cross-platform native builds and npm provenance are both required when an installable DSH adapter carries a native client.",
    /src\/index\.ts$/,
  ),
);
lines.push("");
lines.push("### Observable gaps and counterexamples");
lines.push("");
lines.push(
  "These are pinned-tree observations, not security or quality verdicts:",
);
lines.push("");
lines.push("| Observation | Count |");
lines.push("| --- | ---: |");
for (const [name, count] of [...gapCounts.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)) {
  lines.push(`| ${mdEscape(name)} | ${count} |`);
}
lines.push("");
lines.push(
  pinnedExample(
    "iccuse/dsh-pain-point-check",
    "The manifest declares `./cordis.patch.yml`, but that file is absent at the pinned HEAD. This is the one list entry whose declared bundle could not be resolved.",
  ),
);
lines.push(
  "- A `prepare` hook makes a Git/source install execute build code; it is not automatically wrong, but it is a materially different trust and reproducibility boundary from a prebuilt npm archive.",
);
lines.push(
  "- A private bundle package can be source-installable but cannot be treated as a registry-distributed component without a separate publishable package.",
);
lines.push(
  "- README listing, topic membership, stars, or an awesome badge never substitutes for Loader activation and packed-artifact tests.",
);
lines.push("");
lines.push("## Codex-component mapping learned from implementations");
lines.push("");
lines.push(
  "| dsh-codex surface | Implementation references | Reusable DSH lesson | Boundary that still needs Codex parity evidence |",
);
lines.push("| --- | --- | --- | --- |");
lines.push(
  `| Approval | ${shortRef("ilharp/dsh-tool-approval", /src\/index\.ts$/)}; ${shortRef("arrow949/dsh-turn-approval")} | Approval can be a separately installable service; cached grants need an explicit lifetime. | Decision enum, raw wire integers, cancellation, rejection text, persistence, and pending-request lifecycle come from Codex, not these plugins. |`,
);
lines.push(
  `| Sandbox and execution | ${shortRef("strukto-ai/mirage#typescript/packages/dsh", /typescript\/packages\/dsh\/src\/index\.ts$/)}; ${shortRef("omdsh-dev/sandbox-micro", /src\/index\.ts$/)} | Filesystem/bash/sandbox backends can be provider packages behind a stable DSH seam. | Codex sandbox profiles, exec policy, escalation, platform syscalls, and failure mapping remain pinned-oracle work. |`,
);
lines.push(
  `| Tool system | ${shortRef("omdsh-dev/dsh-toolkit", /src\/index\.ts$/)}; ${shortRef("vibeinging/dsh-tool-search", /src\/index\.ts$/)} | Tool registration should be thin over injected services; discovery/search can remain a separate component. | Codex schemas, parallelism, truncation, approval coupling, and tool-result protocol must be differential-tested. |`,
);
lines.push(
  `| Context and compaction | ${shortRef("zhenyu98/dsh-context-doctor", /src\/index\.ts$/)}; ${shortRef("evilirving/dsh-context-proxy", /src\/index\.ts$/)} | Host accounting and client visualization can share typed data without merging runtimes. | Token accounting, instruction discovery, compaction triggers/content, and resume behavior require Codex fixtures. |`,
);
lines.push(
  `| Sessions and rollback | ${shortRef("anionex/dsh-turn-rewind", /src\/index\.ts$/)}; ${shortRef("nwflower/dsh-file-claim", /index\.mjs$/)} | Durable ledgers, heartbeat ownership, and merge/rewind state deserve independent services. | Codex event log shape, fork/resume semantics, rollout recovery, and workspace checkpoint behavior remain upstream-defined. |`,
);
lines.push(
  `| Agent loop and automation | ${shortRef("vlln/dsh-loop", /src\/index\.ts$/)}; ${shortRef("jesse-njx/dsh-routines", /src\/index\.ts$/)} | The loop/scheduler can be a plugin and coordinate through events/services. | Codex turn state machine, tool scheduling, retry, cancellation, and compaction ordering need exact loop conformance. |`,
);
lines.push(
  `| Model/account adapters | ${shortRef("franksong2702/dsh-codex-connect", /src\/index\.ts$/)}; ${shortRef("suntianc/dsh-codex-auth", /src\/index\.ts$/)} | Auth, RPC, settings UI, and model/provider registration are separable adapter seams. | These are bridges to native Codex; they do not reproduce the Codex agent loop or its context/session state. |`,
);
lines.push(
  `| TUI/UI | ${shortRef("openma-ai/deepseek-harness-tui", /src\/main\.rs$/)}; ${shortRef("omdsh-dev/dsh-better-sidebar", /src\/index\.ts$/)} | A standalone/native client can speak a stable protocol while an installable DSH adapter owns activation. | Codex TUI event rendering, input modes, approval UX, interrupt behavior, and resume/fork views need their own parity corpus. |`,
);
lines.push(
  `| Packaging/release | ${shortRef("dsh-market/dsh-market", /src\/index\.ts$/)}; ${shortRef("omdsh-dev/dsh-plugin-check", /src\/index\.ts$/)} | Validate the packed archive, publish with provenance, and add a platform matrix for native payloads. | A green source-tree test does not establish installed-artifact or cross-platform parity. |`,
);
lines.push("");
lines.push("## Direct design consequences for dsh-codex");
lines.push("");
lines.push(
  "1. **Keep one installable DSH component per bounded Codex contract.** Each publishable package owns its bundle row, README, types, build, tests, and release artifact. A root composition bundle may assemble them later, but must not hide component identity.",
);
lines.push(
  "2. **Separate protocol engines from DSH adapters.** The approved Rust approval-protocol sidecar belongs inside the approval component's distribution, while the Cordis service owns DSH lifecycle and routing. This matches the ecosystem's successful process/provider adapters without weakening the Codex wire oracle.",
);
lines.push(
  "3. **Make host/client/shared boundaries visible in the directory tree.** Use `src/host`, `src/client`, and `src/shared` (or equivalent explicit packages); do not make UI imports accidental dependencies of headless behavior.",
);
lines.push(
  "4. **Model services, events, and tools separately.** Tools should be shallow endpoints over typed services. Event names and payloads are contracts. Persistence and approval are services with lifecycle, not helper functions copied into callers.",
);
lines.push(
  "5. **Make cleanup awaitable.** Routes, watchers, subprocesses, pending approvals, locks, and writes must settle under the owning Cordis disposer. The ecosystem has many disposer signals, but dsh-codex should additionally prove quiescence with adversarial tests.",
);
lines.push(
  "6. **Use a layered test ladder for every parity claim.** Pure contract tests -> pinned upstream differential oracle -> real Cordis Loader/profile -> packed archive install/activate/remove -> cross-platform native artifact. No single layer is enough.",
);
lines.push(
  "7. **Publish prebuilt artifacts with provenance.** For TypeScript-only components, restrict `files` and run `prepack`; for Rust/native components, publish platform artifacts from a matrix and verify checksum/tag/version linkage. Avoid making ordinary users compile arbitrary Git HEADs.",
);
lines.push(
  "8. **Treat community plugins as implementation references, not behavioral specifications.** Codex parity continues to be decided by pinned Codex code and conformance results. Ecosystem code informs packaging, Cordis integration, lifecycle, UI seams, and practical failure modes.",
);
lines.push("");
lines.push("## Complete target index (each target exactly once)");
lines.push("");
lines.push(
  "The full machine-readable details are in `plugins.jsonl`. Here `tests` is inspected test files or a test script; `CI` is a source-visible CI signal; `bundle` requires both the manifest declaration and the referenced patch file.",
);
lines.push("");
for (const [category, count] of categoryCounts) {
  lines.push(`### ${mdEscape(category)} (${count})`);
  lines.push("");
  lines.push("| Target | HEAD | Kind | Boundary | Bundle | Tests | CI |");
  lines.push("| --- | --- | --- | --- | ---: | ---: | ---: |");
  for (const record of compactRecords.filter(
    (candidate) => candidate.list.category === category,
  )) {
    const hasTests = Boolean(
      record.verification.tests.inspectedCount ||
      record.verification.tests.scripts.length,
    );
    lines.push(
      `| ${linkFor(record)}${record.target.subpath ? ` \`${mdEscape(record.target.subpath)}\`` : ""} | \`${record.target.head.slice(0, 12)}\` | ${mdEscape(record.classification.kind)} | ${displayBoundary(record)} | ${record.classification.hasInstallableBundle ? "yes" : "no"} | ${hasTests ? "yes" : "no"} | ${record.verification.automation.ci ? "yes" : "no"} |`,
    );
  }
  lines.push("");
}

await writeFile(
  markdownPath,
  await format(`${lines.join("\n")}\n`, { parser: "markdown" }),
  "utf8",
);
process.stderr.write(
  `wrote ${compactRecords.length} plugin rows and ${lines.length} Markdown lines\n`,
);
