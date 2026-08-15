#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TEXT_FILE_LIMIT = 256 * 1024;
const REPOSITORY_TEXT_LIMIT = 4 * 1024 * 1024;
const SCAN_SCHEMA_VERSION = 3;

function parseArgs(argv) {
  const options = {
    concurrency: "4",
    scope: "all",
    force: "false",
    "progress-every": "10",
    transport: "auto",
  };
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument sequence at ${key ?? "<end>"}`);
    }
    options[key.slice(2)] = value;
  }
  if (!options.inventory || !options.output) {
    throw new Error(
      "usage: scan-repositories.mjs --inventory <inventory.all.jsonl> --output <directory> [--scope all|readme|catalog-only] [--concurrency 4] [--force false] [--match owner/repo] [--limit N]",
    );
  }
  const concurrency = Number.parseInt(options.concurrency, 10);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) {
    throw new Error("--concurrency must be an integer between 1 and 12");
  }
  if (!new Set(["all", "readme", "catalog-only"]).has(options.scope)) {
    throw new Error("--scope must be all, readme, or catalog-only");
  }
  if (!new Set(["auto", "api", "sparse"]).has(options.transport)) {
    throw new Error("--transport must be auto, sparse, or api");
  }
  const progressEvery = Number.parseInt(options["progress-every"], 10);
  if (!Number.isInteger(progressEvery) || progressEvery < 1) {
    throw new Error("--progress-every must be a positive integer");
  }
  return {
    ...options,
    concurrency,
    progressEvery,
    force: options.force === "true",
  };
}

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function safeCacheName(repositoryKey) {
  return `${repositoryKey.replace(/[^a-z0-9._-]+/gi, "--")}--${createHash("sha256").update(repositoryKey).digest("hex").slice(0, 12)}.json`;
}

async function run(command, args, options = {}) {
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_LFS_SKIP_SMUDGE: "1",
    GCM_INTERACTIVE: "never",
  };
  return execFileAsync(command, args, {
    cwd: options.cwd,
    env,
    encoding: "utf8",
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    timeout: options.timeout ?? 90_000,
  });
}

function targetContains(file, target) {
  if (target.subpath === ".") return true;
  const prefix = target.subpath.replace(/\/$/, "");
  return file === prefix || file.startsWith(`${prefix}/`);
}

function relativeDepth(file, target) {
  const relative =
    target.subpath === "."
      ? file
      : file.slice(target.subpath.length).replace(/^\//, "");
  return relative.split("/").length - 1;
}

function priority(file, target) {
  const lower = file.toLowerCase();
  const depth = relativeDepth(file, target);
  let value = depth * 5;
  if (/package\.json$/.test(lower)) value -= 100;
  if (
    /cordis\.patch\.ya?ml$|dsh\.plugin\.json$|\.dsh-plugin\/plugin\.json$/.test(
      lower,
    )
  )
    value -= 95;
  if (
    /(?:^|\/)src\/(?:index|plugin|service|server|client)\.[cm]?[jt]sx?$/.test(
      lower,
    )
  )
    value -= 80;
  if (/(?:^|\/)(?:index|plugin)\.[cm]?[jt]sx?$/.test(lower)) value -= 70;
  if (/(?:^|\/)readme(?:\.[^/]+)?\.md$/.test(lower)) value -= 65;
  if (/(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|\.)/.test(lower)) value -= 40;
  if (/(?:^|\/)migrations?\//.test(lower)) value -= 30;
  return value;
}

function chooseFiles(files, targets) {
  const selected = new Set();
  const workflows = files
    .filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file))
    .slice(0, 20);
  for (const file of workflows) selected.add(file);
  for (const file of files) {
    if (
      /^(?:readme(?:\.[^/]+)?\.md|package\.json|pnpm-workspace\.yaml|lerna\.json|turbo\.json|cargo\.toml|pyproject\.toml|license(?:\.[^/]+)?|notice(?:\.[^/]+)?)$/i.test(
        file,
      )
    ) {
      selected.add(file);
    }
  }

  for (const target of targets) {
    const within = files.filter((file) => targetContains(file, target));
    if (target.subpath !== "." && files.includes(target.subpath))
      selected.add(target.subpath);
    const manifests = within
      .filter(
        (file) =>
          /(?:^|\/)(?:package\.json|cargo\.toml|pyproject\.toml)$/i.test(
            file,
          ) && relativeDepth(file, target) <= 5,
      )
      .sort((left, right) => priority(left, target) - priority(right, target))
      .slice(0, 20);
    const activation = within
      .filter((file) =>
        /(?:cordis(?:\.patch)?\.ya?ml|dsh\.plugin\.json|\.dsh-plugin\/plugin\.json|plugin\.ya?ml)$/i.test(
          file,
        ),
      )
      .sort((left, right) => priority(left, target) - priority(right, target))
      .slice(0, 20);
    const docs = within
      .filter((file) => /(?:^|\/)(?:readme(?:\.[^/]+)?|skill)\.md$/i.test(file))
      .sort((left, right) => priority(left, target) - priority(right, target))
      .slice(0, 4);
    const primarySource = within
      .filter(
        (file) =>
          /\.[cm]?[jt]sx?$/.test(file) &&
          !/(?:^|\/)(?:dist|build|lib|coverage|vendor|node_modules|\.next)\//.test(
            file,
          ),
      )
      .sort((left, right) => priority(left, target) - priority(right, target))
      .slice(0, 28);
    const fallbackBuiltSource = primarySource.length
      ? []
      : within
          .filter(
            (file) =>
              /\.[cm]?[jt]sx?$/.test(file) &&
              !/(?:^|\/)(?:dist|build|coverage|vendor|node_modules|\.next)\//.test(
                file,
              ),
          )
          .sort(
            (left, right) => priority(left, target) - priority(right, target),
          )
          .slice(0, 16);
    const source = [...primarySource, ...fallbackBuiltSource];
    const tests = within
      .filter(
        (file) =>
          /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|\.)/i.test(file) ||
          /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file),
      )
      .sort((left, right) => priority(left, target) - priority(right, target))
      .slice(0, 8);
    const migrations = within
      .filter((file) =>
        /(?:^|\/)migrations?\/.*\.(?:sql|[cm]?[jt]s)$/i.test(file),
      )
      .slice(0, 8);
    for (const file of [
      ...manifests,
      ...activation,
      ...docs,
      ...source,
      ...tests,
      ...migrations,
    ])
      selected.add(file);
  }
  return [...selected]
    .filter((file) => !file.includes("\n") && !file.includes("\0"))
    .slice(0, 260);
}

async function readSelectedFiles(checkout, selected) {
  if (selected.length) {
    let checkoutError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await run("git", ["checkout", "-q", "HEAD", "--", ...selected], {
          cwd: checkout,
          timeout: 180_000,
          maxBuffer: 16 * 1024 * 1024,
        });
        checkoutError = undefined;
        break;
      } catch (error) {
        checkoutError = error;
        if (!isTransientCloneError(error) || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
    if (checkoutError) throw checkoutError;
  }
  const contents = new Map();
  let total = 0;
  for (const file of selected) {
    if (total >= REPOSITORY_TEXT_LIMIT) break;
    try {
      const content = await readFile(path.join(checkout, file), "utf8");
      const bounded = content.slice(
        0,
        Math.min(TEXT_FILE_LIMIT, REPOSITORY_TEXT_LIMIT - total),
      );
      contents.set(file, bounded);
      total += Buffer.byteLength(bounded);
    } catch {
      // Binary files and checkout races are intentionally omitted from text analysis.
    }
  }
  return contents;
}

async function readPlainSelectedFiles(checkout, selected) {
  const contents = new Map();
  let total = 0;
  for (const file of selected) {
    if (total >= REPOSITORY_TEXT_LIMIT) break;
    try {
      const content = await readFile(path.join(checkout, file), "utf8");
      const bounded = content.slice(
        0,
        Math.min(TEXT_FILE_LIMIT, REPOSITORY_TEXT_LIMIT - total),
      );
      contents.set(file, bounded);
      total += Buffer.byteLength(bounded);
    } catch {
      // Binary files and unsupported archive entries are intentionally omitted.
    }
  }
  return contents;
}

function parsePackageJson(file, text) {
  try {
    const value = JSON.parse(text);
    const dependencyNames = Object.keys({
      ...(value.dependencies ?? {}),
      ...(value.devDependencies ?? {}),
      ...(value.peerDependencies ?? {}),
      ...(value.optionalDependencies ?? {}),
    }).sort();
    return {
      path: file,
      name: value.name ?? null,
      version: value.version ?? null,
      private: value.private ?? false,
      type: value.type ?? null,
      main: value.main ?? null,
      module: value.module ?? null,
      exports: value.exports ?? null,
      bin: value.bin ?? null,
      files: value.files ?? null,
      workspaces: value.workspaces ?? null,
      scripts: value.scripts ?? {},
      dependencyNames,
      repository: value.repository ?? null,
      keywords: value.keywords ?? [],
      dsh: value.dsh ?? null,
    };
  } catch (error) {
    return { path: file, parseError: error.message };
  }
}

function uniqueMatches(texts, expression, group = 1, limit = 40) {
  const matches = new Set();
  for (const text of texts) {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(text))) {
      matches.add(match[group] ?? match[0]);
      if (matches.size >= limit) return [...matches].sort();
      if (match[0].length === 0) expression.lastIndex += 1;
    }
  }
  return [...matches].sort();
}

function uniqueValues(values, limit = 40) {
  return [...new Set(values.filter(Boolean))].sort().slice(0, limit);
}

function isTestFile(file) {
  return (
    /(?:^|\/)(?:test|tests|__tests__|spec|fixtures?|snapshots?)(?:\/|\.)/i.test(
      file,
    ) || /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file)
  );
}

function isImplementationSource(file) {
  return (
    /\.[cm]?[jt]sx?$/i.test(file) &&
    !isTestFile(file) &&
    !/(?:^|\/)(?:node_modules|vendor|coverage|docs?|examples?|\.github)(?:\/|$)/i.test(
      file,
    )
  );
}

function quotedNamesFromBlocks(texts, expression, limit = 40) {
  const values = [];
  for (const text of texts) {
    expression.lastIndex = 0;
    let block;
    while ((block = expression.exec(text))) {
      const quoted = block[1]?.matchAll(/["'`]([\w.:-]+)["'`]/g) ?? [];
      for (const match of quoted) {
        values.push(match[1]);
        if (new Set(values).size >= limit) return uniqueValues(values, limit);
      }
      if (block[0].length === 0) expression.lastIndex += 1;
    }
  }
  return uniqueValues(values, limit);
}

function extractInstallCommands(contents, target) {
  const commands = [];
  for (const [file, text] of contents) {
    if (
      !targetContains(file, target) ||
      !/(?:^|\/)readme(?:\.[^/]+)?\.md$/i.test(file)
    )
      continue;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim().replace(/^[$>]\s*/, "");
      if (
        /(?:dsh\s+plugin|pnpm\s+(?:add|install)|npm\s+(?:install|i)|npx\s+|github:[^\s`]+)/i.test(
          trimmed,
        ) &&
        trimmed.length <= 400
      ) {
        commands.push(trimmed);
      }
      if (commands.length >= 12) return [...new Set(commands)];
    }
  }
  return [...new Set(commands)];
}

function targetAnalysis(target, files, contents, repositoryMeta) {
  const withinFiles = files.filter((file) => targetContains(file, target));
  const withinContents = [...contents].filter(([file]) =>
    targetContains(file, target),
  );
  const implementationText = withinContents
    .filter(([file]) => isImplementationSource(file))
    .filter(([file]) => targetContains(file, target))
    .map(([, text]) => text);
  const packageJson = [...contents]
    .filter(
      ([file]) =>
        targetContains(file, target) && /(?:^|\/)package\.json$/i.test(file),
    )
    .map(([file, text]) => parsePackageJson(file, text));
  const activationFiles = withinFiles.filter((file) =>
    /(?:cordis(?:\.patch)?\.ya?ml|dsh\.plugin\.json|\.dsh-plugin\/plugin\.json|plugin\.ya?ml)$/i.test(
      file,
    ),
  );
  const bundlePackages = packageJson.filter(
    (manifest) => manifest.dsh?.bundle?.patch,
  );
  const entryFiles = [...contents.keys()].filter(
    (file) =>
      targetContains(file, target) &&
      /(?:^|\/)(?:src\/)?(?:index|plugin|service|server|client)\.[cm]?[jt]sx?$/i.test(
        file,
      ),
  );
  const testFiles = withinFiles.filter(
    (file) =>
      /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|\.)/i.test(file) ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file),
  );
  const workflowFiles = repositoryMeta.workflowFiles;
  const sourceFileCount = withinFiles.filter(
    (file) =>
      /\.[cm]?[jt]sx?$/.test(file) &&
      !/(?:^|\/)(?:dist|build|vendor|node_modules)\//.test(file),
  ).length;
  const serviceNames = uniqueValues([
    ...uniqueMatches(
      implementationText,
      /ctx\.(?:provide|get)\s*\(\s*["'`]([\w.:-]+)["'`]/g,
    ),
    ...uniqueMatches(
      implementationText,
      /super\s*\(\s*ctx\s*,\s*["'`]([\w.:-]+)["'`]/g,
    ),
    ...quotedNamesFromBlocks(
      implementationText,
      /(?:export\s+const\s+inject\s*=|\binject\s*:|ctx\.inject\s*\()\s*\[([\s\S]{0,1200}?)\]/g,
    ),
  ]);
  const toolNames = uniqueValues([
    ...uniqueMatches(
      implementationText,
      /defineTool\s*\(\s*\{[\s\S]{0,1200}?\bname\s*:\s*["'`]([\w.:-]+)["'`]/g,
    ),
    ...uniqueMatches(
      implementationText,
      /(?:ctx\.tools\.register|registerTool)\s*\(\s*(?:ctx\s*,\s*)?\{[\s\S]{0,1200}?\bname\s*:\s*["'`]([\w.:-]+)["'`]/g,
    ),
  ]);
  const eventNames = uniqueMatches(
    implementationText,
    /ctx\.(?:on|once|emit|parallel|bail|serial)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  );
  const commandNames = uniqueMatches(
    implementationText,
    /(?:ctx\.command|registerCommand)\s*\(\s*["'`]([\w./:-]+)["'`]/g,
  );
  const clientEvidence = withinFiles.filter(
    (file) =>
      /(?:^|\/)(?:client|web|ui|components?|views?)\//i.test(file) &&
      /\.(?:tsx?|jsx?|vue|css|scss)$/i.test(file),
  );
  const dependencyNames = new Set(
    packageJson.flatMap((manifest) => manifest.dependencyNames ?? []),
  );
  const migrationText = withinContents
    .filter(([file]) => /(?:^|\/)migrations?\//i.test(file))
    .map(([, text]) => text);
  const fullText = [
    ...implementationText,
    ...migrationText,
    [...dependencyNames].join(" "),
  ].join("\n");
  const persistenceSignals = [];
  const persistenceRules = [
    ["sqlite", /sqlite|better-sqlite3|fts5/i],
    ["database-service", /ctx\.(?:database|model)|@cordisjs\/plugin-database/i],
    ["yaml-settings", /settings\.ya?ml|yaml/i],
    ["json-file", /(?:writeFile|readFile)[\s\S]{0,80}\.json|\.json["'`]/i],
    ["filesystem-storage", /DSH_HOME|storages?\/|\.dsh\//i],
    ["browser-local-storage", /localStorage|indexedDB/i],
    ["memory-only", /new\s+(?:Map|Set)\s*\(/i],
    ["migration", /migrations?\/|CREATE\s+TABLE/i],
  ];
  for (const [label, expression] of persistenceRules)
    if (expression.test(fullText)) persistenceSignals.push(label);

  const actual =
    `${target.name} ${target.description} ${packageJson.map((item) => `${item.name ?? ""} ${(item.keywords ?? []).join(" ")}`).join(" ")} ${withinFiles.join(" ")}`.toLowerCase();
  const hasDshDependency = [...dependencyNames].some((name) =>
    /@deepseek-ai\/dsh|cordis|dsh-client/i.test(name),
  );
  const hasActivation = activationFiles.length > 0 || bundlePackages.length > 0;
  const hasSkill = withinFiles.some((file) => /(?:^|\/)skill\.md$/i.test(file));
  const hasMcp =
    /(?:^|[-_/\s])mcp(?:$|[-_/\s])/.test(actual) ||
    [...dependencyNames].some((name) => /modelcontextprotocol/i.test(name));
  const isTheme = /theme|skin|colorscheme|皮肤|壁纸/.test(actual);
  const isClient = /electron|tauri|desktop|launcher|桌面客户端/.test(actual);
  const isDirectory =
    /awesome|catalog|registry|plugin-market|plugin-store|插件市场|插件目录/.test(
      actual,
    );
  const bundleCount = new Set([
    ...activationFiles.map((file) => path.posix.dirname(file)),
    ...bundlePackages.map((manifest) => path.posix.dirname(manifest.path)),
  ]).size;
  let classification;
  if (hasActivation && bundleCount > 1) classification = "plugin-collection";
  else if (hasActivation && isTheme) classification = "theme-plugin";
  else if (hasActivation) classification = "dsh-plugin";
  else if (hasSkill && !hasDshDependency) classification = "skill";
  else if (hasMcp && !hasDshDependency) classification = "mcp-server-or-tool";
  else if (isDirectory) classification = "directory-or-registry";
  else if (isClient) classification = "client-or-launcher";
  else if (
    hasDshDependency ||
    /deepseek harness|dsh plugin|dsh-plugin/.test(actual)
  )
    classification = "claimed-plugin-unverified-activation";
  else classification = "topic-noise-or-non-plugin";

  const strengths = [];
  if (hasActivation)
    strengths.push("declares a machine-visible DSH/Cordis activation layer");
  if (entryFiles.length)
    strengths.push("keeps an identifiable server/plugin entry point");
  if (clientEvidence.length && entryFiles.length)
    strengths.push("separates server integration from client UI code");
  if (toolNames.length)
    strengths.push(
      "registers model-facing tools through a named extension surface",
    );
  if (eventNames.length)
    strengths.push("uses lifecycle/event integration instead of core patches");
  if (persistenceSignals.includes("migration"))
    strengths.push("ships an explicit persistence migration path");
  if (testFiles.length)
    strengths.push("keeps implementation tests in the source repository");
  if (workflowFiles.length)
    strengths.push("automates repository checks in GitHub Actions");
  if (repositoryMeta.releaseSignals.length)
    strengths.push("contains an explicit packaging/release path");

  const gaps = [];
  if (/plugin/.test(classification) && !hasActivation)
    gaps.push(
      "no recognized dsh.bundle.patch or Cordis activation manifest was found",
    );
  if (/plugin/.test(classification) && !entryFiles.length)
    gaps.push(
      "no conventional core source entry was found in the inspected target",
    );
  if (/plugin/.test(classification) && testFiles.length === 0)
    gaps.push("no test/spec files were found");
  if (/plugin/.test(classification) && workflowFiles.length === 0)
    gaps.push("no GitHub Actions workflow was found");
  if (
    /plugin/.test(classification) &&
    repositoryMeta.releaseSignals.length === 0
  )
    gaps.push("no explicit release workflow or publish script was found");
  if (packageJson.some((manifest) => manifest.parseError))
    gaps.push(
      "at least one inspected package.json could not be parsed as JSON",
    );
  if (target.subpath !== "." && withinFiles.length === 0)
    gaps.push("catalog subpath does not exist at the scanned HEAD");

  return {
    key: target.key,
    repository: target.repository,
    subpath: target.subpath,
    name: target.name,
    description: target.description,
    origins: target.origins,
    requestedRef: target.requestedRef,
    scannedCommit: repositoryMeta.headSha,
    defaultBranch: repositoryMeta.defaultBranch,
    sourceReviewLevel: withinFiles.length
      ? "source-inspected"
      : "repository-metadata-only",
    classification,
    evidence: {
      targetFileCount: withinFiles.length,
      sourceFileCount,
      packageJson,
      activationFiles,
      bundlePackages: bundlePackages.map((manifest) => ({
        path: manifest.path,
        patch: manifest.dsh.bundle.patch,
      })),
      entryFiles,
      inspectedTextFiles: [...contents.keys()].filter((file) =>
        targetContains(file, target),
      ),
      testFiles: testFiles.slice(0, 100),
      workflowFiles,
      releaseSignals: repositoryMeta.releaseSignals,
      licenseFiles: repositoryMeta.licenseFiles,
      lockFiles: repositoryMeta.lockFiles,
    },
    extensionPoints: {
      services: serviceNames,
      tools: toolNames,
      events: eventNames,
      commands: commandNames,
      clientUiFiles: clientEvidence.slice(0, 50),
      hasDshOrCordisDependency: hasDshDependency,
    },
    stateAndPersistence: persistenceSignals,
    installation: {
      listedPackageSpec: target.packageSpec ?? null,
      documentedCommands: extractInstallCommands(contents, target),
      packageNames: packageJson
        .map((manifest) => manifest.name)
        .filter(Boolean),
    },
    reusablePatterns: strengths,
    gaps,
  };
}

function repositorySignals(files, contents) {
  const workflowFiles = files.filter((file) =>
    /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file),
  );
  const licenseFiles = files.filter((file) =>
    /(?:^|\/)(?:license|copying)(?:\.[^/]+)?$/i.test(file),
  );
  const lockFiles = files.filter((file) =>
    /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|cargo\.lock|uv\.lock|poetry\.lock)$/i.test(
      file,
    ),
  );
  const releaseSignals = new Set();
  for (const file of workflowFiles) {
    const text = contents.get(file) ?? "";
    if (/publish|npm|release|provenance|tags:/i.test(text))
      releaseSignals.add(file);
  }
  for (const [file, text] of contents) {
    if (!/(?:^|\/)package\.json$/i.test(file)) continue;
    const manifest = parsePackageJson(file, text);
    for (const [name, script] of Object.entries(manifest.scripts ?? {})) {
      if (/publish|release|pack|prepack|prepublish/i.test(`${name} ${script}`))
        releaseSignals.add(`${file}#scripts.${name}`);
    }
  }
  return {
    workflowFiles,
    licenseFiles,
    lockFiles,
    releaseSignals: [...releaseSignals].sort(),
  };
}

function errorSummary(error) {
  const text = [error?.stderr, error?.stdout, error?.message]
    .filter(Boolean)
    .join("\n")
    .replace(/https:\/\/[^@\s]+@github\.com/gi, "https://github.com")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join(" | ")
    .slice(0, 2000);
  if (
    /repository not found|authentication failed|could not read username|403|access denied/i.test(
      text,
    )
  ) {
    return { kind: "inaccessible-or-private", detail: text };
  }
  if (/empty repository|does not have any commits/i.test(text))
    return { kind: "empty-repository", detail: text };
  if (
    error?.killed ||
    error?.signal === "SIGTERM" ||
    /timed out|timeout|signal.*term/i.test(text)
  ) {
    return {
      kind: "network-timeout",
      detail: text || "remote operation exceeded its timeout",
    };
  }
  return { kind: "clone-or-network-failure", detail: text };
}

function isTransientCloneError(error) {
  if (error?.killed || error?.signal === "SIGTERM") return true;
  const text = [error?.stderr, error?.stdout, error?.message]
    .filter(Boolean)
    .join("\n");
  if (
    /Command failed: git clone/i.test(text) &&
    !/repository not found|authentication failed|fatal:|remote:/i.test(text)
  ) {
    return true;
  }
  return /SSL_ERROR|connection reset|could not resolve host|operation timed out|timed out|early EOF|HTTP\/2 stream|502|503|504|network is unreachable|connection.*closed/i.test(
    text,
  );
}

async function cloneWithRetry(repositoryUrl, checkout) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await run(
        "git",
        [
          "clone",
          "--quiet",
          "--depth",
          "1",
          "--single-branch",
          "--filter=blob:limit=512k",
          "--no-checkout",
          `${repositoryUrl}.git`,
          checkout,
        ],
        { timeout: 120_000, maxBuffer: 16 * 1024 * 1024 },
      );
      return;
    } catch (error) {
      lastError = error;
      if (error?.killed || error?.signal === "SIGTERM") throw error;
      const detail = [error?.stderr, error?.stdout]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (!detail && /Command failed: git clone/i.test(error?.message ?? ""))
        throw error;
      if (!isTransientCloneError(error) || attempt === 3) throw error;
      await rm(checkout, { recursive: true, force: true });
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function accessibleResult(
  repository,
  targets,
  startedAt,
  files,
  contents,
  headSha,
  defaultBranch,
  transport,
) {
  const repositoryMeta = {
    headSha: headSha.trim(),
    defaultBranch: defaultBranch.trim() || null,
    fileCount: files.length,
    inspectedTextFileCount: contents.size,
    scanTransport: transport,
    ...repositorySignals(files, contents),
  };
  return {
    scanSchemaVersion: SCAN_SCHEMA_VERSION,
    targetKeys: targets.map((target) => target.key).sort(),
    repositoryKey: repository.repositoryKey,
    repository: repository.repository,
    url: repository.url,
    status: "accessible",
    startedAt,
    completedAt: new Date().toISOString(),
    ...repositoryMeta,
    targets: targets.map((target) =>
      targetAnalysis(target, files, contents, repositoryMeta),
    ),
  };
}

async function scanWithSnapshot(repository, targets, tempRoot, startedAt) {
  const { stdout: remote } = await run(
    "git",
    ["ls-remote", "--symref", `${repository.url}.git`, "HEAD"],
    {
      timeout: 45_000,
    },
  );
  const branch = remote.match(/^ref:\s+refs\/heads\/(.+)\s+HEAD$/m)?.[1] ?? "";
  const headSha = remote.match(/^([0-9a-f]{40})\s+HEAD$/m)?.[1];
  if (!headSha)
    throw new Error(`ls-remote returned no HEAD for ${repository.repository}`);

  const archive = path.join(tempRoot, "snapshot.tar.gz");
  await run(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--retry",
      "2",
      "--connect-timeout",
      "20",
      "--max-time",
      "300",
      "--output",
      archive,
      `https://codeload.github.com/${repository.repository}/tar.gz/${headSha}`,
    ],
    { timeout: 330_000, maxBuffer: 16 * 1024 * 1024 },
  );
  const { stdout: listing } = await run("tar", ["-tzf", archive], {
    timeout: 90_000,
    maxBuffer: 128 * 1024 * 1024,
  });
  const archiveFiles = listing
    .split(/\r?\n/)
    .filter((file) => file && !file.endsWith("/"));
  const rootPrefix = archiveFiles[0]?.split("/")[0];
  if (!rootPrefix)
    throw new Error(
      `snapshot archive for ${repository.repository} contained no files`,
    );
  const files = archiveFiles
    .filter((file) => file.startsWith(`${rootPrefix}/`))
    .map((file) => file.slice(rootPrefix.length + 1))
    .filter(
      (file) =>
        file &&
        !file.startsWith("../") &&
        !file.includes("/../") &&
        !path.posix.isAbsolute(file),
    );
  const selected = chooseFiles(files, targets);
  const checkout = path.join(tempRoot, "snapshot");
  await mkdir(checkout, { recursive: true });
  if (selected.length) {
    await run(
      "tar",
      [
        "-xzf",
        archive,
        "-C",
        checkout,
        "--strip-components",
        "1",
        "--",
        ...selected.map((file) => `${rootPrefix}/${file}`),
      ],
      { timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
  }
  const contents = await readPlainSelectedFiles(checkout, selected);
  return accessibleResult(
    repository,
    targets,
    startedAt,
    files,
    contents,
    headSha,
    branch,
    "codeload-snapshot",
  );
}

function shouldTraverseSparseDirectory(directory, targets, depth) {
  const lower = directory.toLowerCase();
  if (
    /(?:^|\/)(?:node_modules|vendor|dist|build|coverage|assets?|public|static|docs?|examples?|fixtures?|snapshots?)(?:\/|$)/.test(
      lower,
    )
  ) {
    return false;
  }
  if (
    targets.some(
      (target) =>
        target.subpath !== "." &&
        (target.subpath.startsWith(`${directory}/`) ||
          directory.startsWith(`${target.subpath}/`) ||
          directory === target.subpath),
    )
  ) {
    return true;
  }
  const pieces = lower.split("/");
  const first = pieces[0];
  if (
    new Set([
      ".github",
      "src",
      "client",
      "server",
      "packages",
      "plugins",
      "apps",
      "test",
      "tests",
      "__tests__",
      "crates",
    ]).has(first)
  ) {
    return depth <= 7;
  }
  return depth <= 3 && /(?:dsh|deepseek|harness|plugin|codex)/.test(lower);
}

async function sparseTreeFiles(checkout, targets) {
  const files = [];
  const queue = [{ directory: "", depth: 0 }];
  let directories = 0;
  while (queue.length && directories < 3_000 && files.length < 50_000) {
    const current = queue.shift();
    directories += 1;
    const treeish = current.directory
      ? `FETCH_HEAD:${current.directory}`
      : "FETCH_HEAD";
    let stdout;
    try {
      ({ stdout } = await run("git", ["ls-tree", "-z", treeish], {
        cwd: checkout,
        timeout: 45_000,
        maxBuffer: 32 * 1024 * 1024,
      }));
    } catch {
      continue;
    }
    for (const raw of stdout.split("\0").filter(Boolean)) {
      const match = raw.match(
        /^[0-9]+\s+(blob|tree|commit)\s+[0-9a-f]+\t([\s\S]+)$/,
      );
      if (!match) continue;
      const child = current.directory
        ? `${current.directory}/${match[2]}`
        : match[2];
      if (match[1] === "blob") files.push(child);
      else if (
        match[1] === "tree" &&
        shouldTraverseSparseDirectory(child, targets, current.depth + 1)
      ) {
        queue.push({ directory: child, depth: current.depth + 1 });
      }
    }
  }
  return files;
}

async function scanWithSparseGit(repository, targets, tempRoot, startedAt) {
  const checkout = path.join(tempRoot, "sparse-git");
  await mkdir(checkout, { recursive: true });
  await run("git", ["init", "-q"], { cwd: checkout });
  await run("git", ["remote", "add", "origin", `${repository.url}.git`], {
    cwd: checkout,
  });
  await run(
    "git",
    ["fetch", "-q", "--depth", "1", "--filter=tree:0", "origin", "HEAD"],
    {
      cwd: checkout,
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const [{ stdout: headSha }, { stdout: remote }] = await Promise.all([
    run("git", ["rev-parse", "FETCH_HEAD"], { cwd: checkout }),
    run("git", ["ls-remote", "--symref", `${repository.url}.git`, "HEAD"], {
      timeout: 45_000,
    }),
  ]);
  const branch = remote.match(/^ref:\s+refs\/heads\/(.+)\s+HEAD$/m)?.[1] ?? "";
  const files = await sparseTreeFiles(checkout, targets);
  const selected = chooseFiles(files, targets);
  await run("git", ["update-ref", "refs/heads/scan", "FETCH_HEAD"], {
    cwd: checkout,
  });
  await run("git", ["symbolic-ref", "HEAD", "refs/heads/scan"], {
    cwd: checkout,
  });
  const contents = await readSelectedFiles(checkout, selected);
  return accessibleResult(
    repository,
    targets,
    startedAt,
    files,
    contents,
    headSha,
    branch,
    "git-tree-zero-sparse-walk",
  );
}

function rawGithubUrl(repository, headSha, file) {
  const encodedPath = file.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${repository.repository}/${headSha}/${encodedPath}`;
}

async function scanWithGithubApi(repository, targets, startedAt) {
  const { stdout: remote } = await run(
    "git",
    ["ls-remote", "--symref", `${repository.url}.git`, "HEAD"],
    {
      timeout: 45_000,
    },
  );
  const branch = remote.match(/^ref:\s+refs\/heads\/(.+)\s+HEAD$/m)?.[1] ?? "";
  const headSha = remote.match(/^([0-9a-f]{40})\s+HEAD$/m)?.[1];
  if (!headSha)
    throw new Error(`ls-remote returned no HEAD for ${repository.repository}`);
  const { stdout: treeText } = await run(
    "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--retry",
      "2",
      "--connect-timeout",
      "20",
      "--max-time",
      "90",
      "--header",
      "Accept: application/vnd.github+json",
      "--header",
      "X-GitHub-Api-Version: 2022-11-28",
      "--header",
      "User-Agent: dsh-codex-ecosystem-study",
      `https://api.github.com/repos/${repository.repository}/git/trees/${headSha}?recursive=1`,
    ],
    { timeout: 120_000, maxBuffer: 128 * 1024 * 1024 },
  );
  const tree = JSON.parse(treeText);
  if (!Array.isArray(tree.tree))
    throw new Error(
      `GitHub tree API returned no tree for ${repository.repository}`,
    );
  const files = tree.tree
    .filter((entry) => entry?.type === "blob" && typeof entry.path === "string")
    .map((entry) => entry.path)
    .filter(
      (file) =>
        file &&
        !file.startsWith("../") &&
        !file.includes("/../") &&
        !path.posix.isAbsolute(file),
    );
  const selected = chooseFiles(files, targets);
  const contents = new Map();
  let cursor = 0;
  let total = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= selected.length || total >= REPOSITORY_TEXT_LIMIT) return;
      const file = selected[index];
      try {
        const { stdout } = await run(
          "curl",
          [
            "--fail",
            "--location",
            "--silent",
            "--show-error",
            "--retry",
            "1",
            "--connect-timeout",
            "15",
            "--max-time",
            "45",
            rawGithubUrl(repository, headSha, file),
          ],
          { timeout: 60_000, maxBuffer: TEXT_FILE_LIMIT * 2 },
        );
        const bounded = stdout.slice(0, TEXT_FILE_LIMIT);
        if (total + Buffer.byteLength(bounded) <= REPOSITORY_TEXT_LIMIT) {
          contents.set(file, bounded);
          total += Buffer.byteLength(bounded);
        }
      } catch {
        // A missing or non-text raw blob is represented by absence from inspectedTextFiles.
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(6, selected.length) }, () => worker()),
  );
  const result = accessibleResult(
    repository,
    targets,
    startedAt,
    files,
    contents,
    headSha,
    branch,
    "github-tree-and-raw",
  );
  result.githubTreeTruncated = tree.truncated === true;
  return result;
}

async function scanRepository(repository, targets, cacheDirectory, transport) {
  const startedAt = new Date().toISOString();
  const cachePath = path.join(
    cacheDirectory,
    safeCacheName(repository.repositoryKey),
  );
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "dsh-list-a-"));
  const checkout = path.join(tempRoot, "repo");
  try {
    if (transport === "api") {
      const result = await scanWithGithubApi(repository, targets, startedAt);
      await writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`);
      return result;
    }
    if (transport === "sparse") {
      const result = await scanWithSparseGit(
        repository,
        targets,
        tempRoot,
        startedAt,
      );
      await writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`);
      return result;
    }
    try {
      await cloneWithRetry(repository.url, checkout);
    } catch (cloneError) {
      if (!isTransientCloneError(cloneError)) throw cloneError;
      await rm(checkout, { recursive: true, force: true });
      let result;
      try {
        result = await scanWithSparseGit(
          repository,
          targets,
          tempRoot,
          startedAt,
        );
      } catch (sparseError) {
        if (!isTransientCloneError(sparseError)) throw sparseError;
        try {
          result = await scanWithSnapshot(
            repository,
            targets,
            tempRoot,
            startedAt,
          );
        } catch (snapshotError) {
          if (!isTransientCloneError(snapshotError)) throw snapshotError;
          result = await scanWithGithubApi(repository, targets, startedAt);
        }
      }
      await writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`);
      return result;
    }
    const [{ stdout: headSha }, { stdout: defaultBranch }, { stdout: tree }] =
      await Promise.all([
        run("git", ["rev-parse", "HEAD"], { cwd: checkout }),
        run("git", ["branch", "--show-current"], { cwd: checkout }),
        run("git", ["ls-tree", "-r", "--name-only", "-z", "HEAD"], {
          cwd: checkout,
          timeout: 90_000,
          maxBuffer: 128 * 1024 * 1024,
        }),
      ]);
    const files = tree.split("\0").filter(Boolean);
    const selected = chooseFiles(files, targets);
    const contents = await readSelectedFiles(checkout, selected);
    const result = accessibleResult(
      repository,
      targets,
      startedAt,
      files,
      contents,
      headSha,
      defaultBranch,
      "git-partial-clone",
    );
    await writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } catch (error) {
    const failure = errorSummary(error);
    const result = {
      scanSchemaVersion: SCAN_SCHEMA_VERSION,
      targetKeys: targets.map((target) => target.key).sort(),
      repositoryKey: repository.repositoryKey,
      repository: repository.repository,
      url: repository.url,
      status: failure.kind === "empty-repository" ? "empty" : "unavailable",
      startedAt,
      completedAt: new Date().toISOString(),
      error: failure,
      targets: targets.map((target) => ({
        key: target.key,
        repository: target.repository,
        subpath: target.subpath,
        name: target.name,
        description: target.description,
        origins: target.origins,
        requestedRef: target.requestedRef,
        scannedCommit: null,
        defaultBranch: null,
        sourceReviewLevel: "unavailable",
        classification: failure.kind,
        evidence: {},
        extensionPoints: {},
        stateAndPersistence: [],
        installation: {
          listedPackageSpec: target.packageSpec ?? null,
          documentedCommands: [],
          packageNames: [],
        },
        reusablePatterns: [],
        gaps: [
          "source was not reviewed because the repository could not be cloned",
        ],
      })),
    };
    await writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

const options = parseArgs(process.argv);
const allTargets = parseJsonl(await readFile(options.inventory, "utf8"));
const targets = allTargets.filter((target) => {
  const isReadme = target.origins.some(
    (origin) => origin.sourceLayer === "readme-curated",
  );
  if (options.scope === "readme") return isReadme;
  if (options.scope === "catalog-only") return !isReadme;
  return true;
});
let grouped = [
  ...Map.groupBy(targets, (target) => target.repositoryKey).entries(),
]
  .map(([repositoryKey, repositoryTargets]) => ({
    repositoryKey,
    repository: repositoryTargets[0].repository,
    url: `https://github.com/${repositoryTargets[0].repository}`,
    targets: repositoryTargets,
  }))
  .sort((left, right) => left.repositoryKey.localeCompare(right.repositoryKey));
if (options.match)
  grouped = grouped.filter((item) =>
    item.repositoryKey.includes(options.match.toLowerCase()),
  );
if (options.limit !== undefined) {
  const limit = Number.parseInt(options.limit, 10);
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("--limit must be a positive integer");
  grouped = grouped.slice(0, limit);
}

const cacheDirectory = path.join(options.output, "repo-cache");
await mkdir(cacheDirectory, { recursive: true });
let completed = 0;
const liveStatuses = new Map();
function reportProgress(repositoryKey, status, source) {
  completed += 1;
  liveStatuses.set(status, (liveStatuses.get(status) ?? 0) + 1);
  if (
    completed === 1 ||
    completed === grouped.length ||
    completed % options.progressEvery === 0
  ) {
    console.error(
      `[${completed}/${grouped.length}] ${source} ${repositoryKey} ${status}; totals=${JSON.stringify(Object.fromEntries(liveStatuses))}`,
    );
  }
}
const results = await mapLimit(
  grouped,
  options.concurrency,
  async (repository) => {
    const cachePath = path.join(
      cacheDirectory,
      safeCacheName(repository.repositoryKey),
    );
    if (!options.force) {
      try {
        const cached = JSON.parse(await readFile(cachePath, "utf8"));
        const expectedTargetKeys = repository.targets
          .map((target) => target.key)
          .sort();
        if (
          cached.scanSchemaVersion === SCAN_SCHEMA_VERSION &&
          JSON.stringify(cached.targetKeys) ===
            JSON.stringify(expectedTargetKeys) &&
          !new Set(["clone-or-network-failure", "network-timeout"]).has(
            cached.error?.kind,
          )
        ) {
          reportProgress(repository.repositoryKey, cached.status, "cached");
          return cached;
        }
      } catch {
        // Scan when no valid cache entry exists.
      }
    }
    const result = await scanRepository(
      repository,
      repository.targets,
      cacheDirectory,
      options.transport,
    );
    reportProgress(repository.repositoryKey, result.status, "scanned");
    return result;
  },
);

results.sort((left, right) =>
  left.repositoryKey.localeCompare(right.repositoryKey),
);
const targetResults = results
  .flatMap((result) => result.targets)
  .sort((left, right) => left.key.localeCompare(right.key));
const summary = {
  generatedAt: new Date().toISOString(),
  scope: options.scope,
  repositoryCount: results.length,
  targetCount: targetResults.length,
  repositoryStatuses: Object.fromEntries(
    [...Map.groupBy(results, (result) => result.status).entries()].map(
      ([key, values]) => [key, values.length],
    ),
  ),
  targetClassifications: Object.fromEntries(
    [...Map.groupBy(targetResults, (result) => result.classification).entries()]
      .map(([key, values]) => [key, values.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  ),
  sourceReviewLevels: Object.fromEntries(
    [
      ...Map.groupBy(
        targetResults,
        (result) => result.sourceReviewLevel,
      ).entries(),
    ].map(([key, values]) => [key, values.length]),
  ),
};
await Promise.all([
  writeFile(
    path.join(options.output, `repository-scan.${options.scope}.jsonl`),
    `${results.map((value) => JSON.stringify(value)).join("\n")}\n`,
  ),
  writeFile(
    path.join(options.output, `plugin-scan.${options.scope}.jsonl`),
    `${targetResults.map((value) => JSON.stringify(value)).join("\n")}\n`,
  ),
  writeFile(
    path.join(options.output, `scan-summary.${options.scope}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  ),
]);
console.log(JSON.stringify(summary, null, 2));
