#!/usr/bin/env node

/**
 * Reproducible source scanner for every GitHub entry in awesome-dsh-plugin.
 *
 * The scanner intentionally treats the list as discovery input, not evidence.
 * For each normalized repository + monorepo subpath it freezes HEAD, inventories
 * the Git tree, reads manifests/bundle patches/entrypoints/tests/workflows, and
 * records only source-observable facts. It uses a partial shallow clone capped
 * to small blobs so repositories containing themes, videos, or model assets do
 * not consume disproportionate disk.
 *
 * Usage:
 *   node scripts/scan.mjs \
 *     --awesome /path/to/awesome-dsh-plugin \
 *     --output ../inventory.jsonl \
 *     --cache /private/tmp/dsh-list-b-cache \
 *     --concurrency 10
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rm,
  writeFile,
  rename,
  readdir,
} from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import process from "node:process";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument near ${key ?? "<end>"}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const awesomeDir = path.resolve(args.awesome ?? ".");
const outputPath = path.resolve(args.output ?? "inventory.jsonl");
const cacheDir = path.resolve(args.cache ?? "/private/tmp/dsh-list-b-cache");
const concurrency = Number.parseInt(args.concurrency ?? "8", 10);
const retryFailures = args["retry-failures"] === "true";
const refreshSubpaths = args["refresh-subpaths"] === "true";
const refreshAll = args["refresh-all"] === "true";

if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 32) {
  throw new Error("--concurrency must be an integer from 1 to 32");
}

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".mjs",
  ".cts",
  ".cjs",
  ".rs",
  ".py",
  ".go",
  ".vue",
  ".svelte",
]);

const SKIP_PARTS = new Set([
  "node_modules",
  "dist",
  "lib",
  "build",
  "coverage",
  ".next",
  "vendor",
  "target",
]);

const LIMITS = {
  manifests: 60,
  sources: 24,
  tests: 12,
  workflows: 20,
  readmes: 4,
  textBytes: 384_000,
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeGithubTarget(rawUrl) {
  const url = new URL(rawUrl);
  if (url.hostname.toLowerCase() !== "github.com") {
    throw new Error(`not a GitHub URL: ${rawUrl}`);
  }
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length < 2) throw new Error(`missing owner/repository: ${rawUrl}`);
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  let listedRef = null;
  let subpath = "";
  if (parts[2] === "tree" && parts.length >= 4) {
    listedRef = parts[3];
    subpath = normalizePath(parts.slice(4).join("/"));
  } else if (parts[2] === "blob" && parts.length >= 5) {
    listedRef = parts[3];
    subpath = normalizePath(parts.slice(4, -1).join("/"));
  }
  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    repositoryKey: `${owner}/${repo}`.toLowerCase(),
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    listedRef,
    subpath,
    canonicalKey:
      `${owner}/${repo}`.toLowerCase() + (subpath ? `#${subpath}` : ""),
  };
}

function parseList(markdown, language) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let inPlugins = false;
  let category = null;
  for (let lineNumber = 1; lineNumber <= lines.length; lineNumber += 1) {
    const line = lines[lineNumber - 1];
    if (/^## Plugins\s*$/.test(line) || /^## \u63d2\u4ef6\s*$/.test(line)) {
      inPlugins = true;
      continue;
    }
    if (inPlugins && /^## (?!#)/.test(line)) break;
    if (!inPlugins) continue;
    const categoryMatch = line.match(/^###\s+(.+?)\s*$/);
    if (categoryMatch) {
      category = categoryMatch[1];
      continue;
    }
    const match = line.match(
      /^- \[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)\s+(?:-|\u2014)\s+(.+?)\s*$/,
    );
    if (!match) continue;
    const target = normalizeGithubTarget(match[2]);
    entries.push({
      language,
      line: lineNumber,
      category,
      label: match[1],
      url: match[2],
      description: match[3],
      ...target,
    });
  }
  return entries;
}

function isWithinScope(file, subpath) {
  return !subpath || file === subpath || file.startsWith(`${subpath}/`);
}

function relativeToScope(file, subpath) {
  if (!subpath) return file;
  return file === subpath ? "" : file.slice(subpath.length + 1);
}

function containsSkippedPart(file) {
  return file.split("/").some((part) => SKIP_PARTS.has(part));
}

function depth(file) {
  return normalizePath(file).split("/").filter(Boolean).length;
}

async function run(command, commandArgs, options = {}) {
  return execFileAsync(command, commandArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    cwd: options.cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_LFS_SKIP_SMUDGE: "1",
    },
  });
}

function compactError(error) {
  const text = [error?.message, error?.stderr, error?.stdout]
    .filter(Boolean)
    .join("\n")
    .replace(/\/private\/tmp\/[^\s:]+/g, "<temporary-path>")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 1_200);
}

async function gitText(repoDir, revisionPath) {
  try {
    const { stdout } = await run("git", ["show", `HEAD:${revisionPath}`], {
      cwd: repoDir,
      timeout: 60_000,
    });
    if (Buffer.byteLength(stdout) > LIMITS.textBytes) {
      return { error: "text_too_large", bytes: Buffer.byteLength(stdout) };
    }
    return {
      text: stdout,
      bytes: Buffer.byteLength(stdout),
      sha256: sha256(stdout),
    };
  } catch (error) {
    return { error: compactError(error) };
  }
}

function selectManifestPaths(files, subpath) {
  const scoped = files.filter(
    (file) =>
      isWithinScope(file, subpath) &&
      path.posix.basename(file) === "package.json" &&
      !containsSkippedPart(file),
  );
  const exact = subpath ? `${subpath}/package.json` : "package.json";
  return [...new Set([exact, "package.json", ...scoped])]
    .filter((file) => files.includes(file))
    .sort((left, right) => {
      if (left === exact) return -1;
      if (right === exact) return 1;
      if (left === "package.json") return -1;
      if (right === "package.json") return 1;
      return depth(left) - depth(right) || left.localeCompare(right);
    })
    .slice(0, LIMITS.manifests);
}

function dshBundlePatch(manifest) {
  return manifest?.dsh?.bundle?.patch ?? null;
}

function packageSummary(file, manifest, parseError = null) {
  const scripts = manifest?.scripts ?? {};
  const dependencies = Object.keys(manifest?.dependencies ?? {});
  const peerDependencies = Object.keys(manifest?.peerDependencies ?? {});
  const optionalDependencies = Object.keys(
    manifest?.optionalDependencies ?? {},
  );
  const allDependencies = [
    ...dependencies,
    ...peerDependencies,
    ...optionalDependencies,
  ];
  return {
    path: file,
    parseError,
    name: manifest?.name ?? null,
    version: manifest?.version ?? null,
    private: manifest?.private ?? null,
    type: manifest?.type ?? null,
    main: manifest?.main ?? null,
    module: manifest?.module ?? null,
    types: manifest?.types ?? manifest?.typings ?? null,
    exports: manifest?.exports ?? null,
    files: Array.isArray(manifest?.files) ? manifest.files : null,
    scripts,
    dependencies,
    peerDependencies,
    optionalDependencies,
    engines: manifest?.engines ?? null,
    packageManager: manifest?.packageManager ?? null,
    workspaces: manifest?.workspaces ?? null,
    dsh: manifest?.dsh ?? null,
    bundlePatch: dshBundlePatch(manifest),
    hasClientManifest: Boolean(manifest?.dsh?.client),
    hasCordisDependency: allDependencies.some((name) =>
      /(?:^|\/)cordis(?:$|-)/i.test(name),
    ),
    hasDshDependency: allDependencies.some((name) =>
      /^@deepseek-ai\/dsh(?:$|-)/.test(name),
    ),
    nativeSignals: allDependencies.filter((name) =>
      /(?:napi|node-gyp|better-sqlite3|sqlite3|sharp|keytar|pty|rust|wasm)/i.test(
        name,
      ),
    ),
    packagingSignals: {
      prepack: scripts.prepack ?? null,
      prepare: scripts.prepare ?? null,
      postinstall: scripts.postinstall ?? null,
      install: scripts.install ?? null,
      build: scripts.build ?? null,
      test: scripts.test ?? null,
      release: scripts.release ?? scripts.publish ?? null,
    },
  };
}

function extractStringCalls(text, regex, limit = 40) {
  const values = [];
  for (const match of text.matchAll(regex)) {
    const value = match[1] ?? match[2];
    if (value && !values.includes(value)) values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

function analyzeSources(sourceRecords) {
  const joined = sourceRecords.map((record) => record.text ?? "").join("\n");
  const importPackages = extractStringCalls(
    joined,
    /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g,
    100,
  );
  const cordisMethods = [
    "on",
    "emit",
    "effect",
    "plugin",
    "provide",
    "set",
    "get",
    "inject",
    "service",
    "scope",
  ].filter((method) => new RegExp(`\\bctx\\.${method}\\s*\\(`).test(joined));
  const events = extractStringCalls(
    joined,
    /\bctx\.(?:on|emit)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  );
  const serviceTokens = [];
  for (const match of joined.matchAll(
    /(?:export\s+const\s+inject|static\s+inject|inject)\s*(?:=|:)\s*(?:as\s+const\s*)?\[([^\]]*)\]/g,
  )) {
    for (const stringMatch of match[1].matchAll(/["'`]([^"'`]+)["'`]/g)) {
      if (!serviceTokens.includes(stringMatch[1]))
        serviceTokens.push(stringMatch[1]);
    }
  }
  const toolTokens = extractStringCalls(
    joined,
    /(?:registerTool|defineTool|tool\s*\.\s*register|tools?\s*\.\s*set|ctx\.tool)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  );
  for (const regex of [
    /defineTool\s*\(\s*\{[\s\S]{0,900}?\bname\s*:\s*["'`]([^"'`]+)["'`]/g,
    /(?:ctx\.)?tools?\.register\s*\(\s*\{[\s\S]{0,900}?\bname\s*:\s*["'`]([^"'`]+)["'`]/g,
    /(?:ctx\.)?tools?\.register\s*\(\s*defineTool\s*\(\s*\{[\s\S]{0,900}?\bname\s*:\s*["'`]([^"'`]+)["'`]/g,
  ]) {
    for (const match of joined.matchAll(regex)) {
      if (!toolTokens.includes(match[1])) toolTokens.push(match[1]);
    }
  }
  const toolRegistrationCallCount =
    (joined.match(/\bdefineTool\s*\(/g) ?? []).length +
    (joined.match(/\b(?:ctx\.)?tools?\.register\s*\(/g) ?? []).length;
  const persistence = [];
  const persistenceSignals = [
    ["sqlite", /\b(?:sqlite|better-sqlite3|FTS5|drizzle)\b/i],
    ["json-or-jsonl", /\b(?:jsonl?|JSON\.stringify|JSON\.parse)\b/],
    ["filesystem", /(?:node:fs|from\s+["']fs["']|readFile|writeFile|mkdir)/],
    ["localStorage", /\blocalStorage\b/],
    ["indexedDB", /\bindexedDB\b/i],
    ["database-service", /\bctx\.(?:database|storage|sessionQuery)\b/],
    ["remote-http", /\b(?:fetch|axios|undici)\s*\(?/],
  ];
  for (const [name, regex] of persistenceSignals) {
    if (regex.test(joined)) persistence.push(name);
  }
  const boundaries = {
    host: importPackages.some((name) =>
      /@deepseek-ai\/(?:dsh$|dsh-agent|dsh-tools|dsh-host|cordis)/.test(name),
    ),
    client: importPackages.some((name) =>
      /@deepseek-ai\/dsh-client|react|vue|preact|solid-js/.test(name),
    ),
    sharedProtocol: importPackages.some((name) =>
      /(?:protocol|sdk|rpc)/i.test(name),
    ),
    processBoundary:
      /\b(?:spawn|fork|execFile|Worker|WebSocket|JSON-RPC|jsonrpc|stdio)\b/.test(
        joined,
      ),
  };
  return {
    inspectedFiles: sourceRecords.map(
      ({ path: file, bytes, sha256: digest, error }) => ({
        path: file,
        bytes: bytes ?? null,
        sha256: digest ?? null,
        error: error ?? null,
      }),
    ),
    imports: importPackages,
    cordisMethods,
    events,
    injectedServices: serviceTokens,
    registeredTools: toolTokens,
    toolRegistrationCallCount,
    persistence,
    boundaries,
    lifecycleSignals: {
      disposer:
        /(?:ctx\.effect|return\s+(?:async\s*)?\(\)\s*=>|dispose|unload|AbortController)/.test(
          joined,
        ),
      asyncCleanup:
        /(?:return\s+async\s*\(\)\s*=>|async\s+(?:dispose|stop|close)|await\s+.*(?:close|stop|dispose))/.test(
          joined,
        ),
      abortSignal: /\b(?:AbortController|AbortSignal|signal\.aborted)\b/.test(
        joined,
      ),
    },
    stateSignals: {
      inMemoryMap: /new\s+Map\s*[<(]/.test(joined),
      mutexOrLock:
        /\b(?:mutex|semaphore|lockfile|proper-lockfile|optimistic\s+lock)/i.test(
          joined,
        ),
      atomicWrite: /\b(?:rename|write-file-atomic|atomicWrite|\.tmp)\b/.test(
        joined,
      ),
      schemaVersion: /\b(?:schemaVersion|schema_version|version\s*:)/.test(
        joined,
      ),
    },
  };
}

function selectSourcePaths(files, subpath, packages) {
  const roots = new Set([subpath].filter(Boolean));
  for (const pkg of packages)
    roots.add(
      path.posix.dirname(pkg.path) === "." ? "" : path.posix.dirname(pkg.path),
    );
  const candidates = files.filter((file) => {
    if (!isWithinScope(file, subpath) || containsSkippedPart(file))
      return false;
    if (!SOURCE_EXTENSIONS.has(path.posix.extname(file).toLowerCase()))
      return false;
    if (/(?:^|\/)(?:test|tests|__tests__|spec|fixtures)(?:\/|$)/i.test(file))
      return false;
    return true;
  });
  const priority = (file) => {
    const relative = relativeToScope(file, subpath);
    let score = 100;
    if (
      /(?:^|\/)(?:src\/)?(?:index|plugin|host|client|service|main)\.(?:[cm]?[jt]sx?|rs|py|go)$/i.test(
        relative,
      )
    )
      score -= 60;
    if (/(?:^|\/)(?:src|client|server|host|plugin)(?:\/|$)/i.test(relative))
      score -= 25;
    if (
      /types?|schema|protocol|storage|persist|tool|event|approval|session/i.test(
        relative,
      )
    )
      score -= 10;
    score += Math.min(depth(relative), 12);
    return score;
  };
  return candidates
    .sort(
      (left, right) =>
        priority(left) - priority(right) || left.localeCompare(right),
    )
    .slice(0, LIMITS.sources);
}

function selectTestPaths(files, subpath) {
  return files
    .filter(
      (file) =>
        isWithinScope(file, subpath) &&
        !containsSkippedPart(file) &&
        /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(
          file,
        ),
    )
    .sort()
    .slice(0, LIMITS.tests);
}

function selectWorkflowPaths(files) {
  return files
    .filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file))
    .sort()
    .slice(0, LIMITS.workflows);
}

function selectReadmePaths(files, subpath) {
  const candidates = [
    subpath && `${subpath}/README.md`,
    subpath && `${subpath}/README.zh.md`,
    "README.md",
    "README.zh.md",
    ...files.filter(
      (file) =>
        isWithinScope(file, subpath) &&
        /(?:^|\/)README(?:\.[^.]+)?\.md$/i.test(file),
    ),
  ].filter(Boolean);
  return [...new Set(candidates)]
    .filter((file) => files.includes(file))
    .slice(0, LIMITS.readmes);
}

function resolveBundlePaths(files, packageRecords, subpath) {
  const paths = [];
  for (const record of packageRecords) {
    if (!isWithinScope(record.path, subpath)) continue;
    const base =
      path.posix.dirname(record.path) === "."
        ? ""
        : path.posix.dirname(record.path);
    const declared = record.bundlePatch;
    for (const item of Array.isArray(declared) ? declared : [declared]) {
      if (typeof item === "string")
        paths.push(normalizePath(path.posix.join(base, item)));
    }
  }
  for (const file of files) {
    if (!isWithinScope(file, subpath)) continue;
    if (
      /(?:^|\/)(?:cordis\.patch|bundle\.patch)(?:\.(?:ya?ml|json|json5|[cm]?js|ts))?$/i.test(
        file,
      )
    ) {
      paths.push(file);
    }
  }
  return [...new Set(paths)]
    .filter((file) => files.includes(file))
    .slice(0, 40);
}

function analyzeBundle(records) {
  const joined = records.map((record) => record.text ?? "").join("\n");
  const ids = extractStringCalls(
    joined,
    /^\s*-?\s*id\s*:\s*["']?([^\s"'#]+)["']?/gm,
    100,
  );
  const names = extractStringCalls(
    joined,
    /^\s*name\s*:\s*["']?([^\s"'#]+)["']?/gm,
    100,
  );
  return {
    declared: records.length > 0,
    files: records.map(({ path: file, bytes, sha256: digest, error }) => ({
      path: file,
      bytes: bytes ?? null,
      sha256: digest ?? null,
      error: error ?? null,
    })),
    insertCount: (joined.match(/^\s*-?\s*insert\s*:/gm) ?? []).length,
    removeCount: (joined.match(/^\s*-?\s*remove\s*:/gm) ?? []).length,
    ids,
    names,
    targetsClient: /(?:client|web|ui|skin)/i.test(joined),
    targetsHost: /(?:host|agent|tool|session|server)/i.test(joined),
  };
}

function analyzeTests(paths, records, packageRecords) {
  const joined = records.map((record) => record.text ?? "").join("\n");
  const scripts = packageRecords
    .map((record) => record.packagingSignals?.test)
    .filter(Boolean);
  return {
    discoveredCount: paths.length,
    inspectedFiles: records.map(
      ({ path: file, bytes, sha256: digest, error }) => ({
        path: file,
        bytes: bytes ?? null,
        sha256: digest ?? null,
        error: error ?? null,
      }),
    ),
    scripts,
    frameworks: [
      ["vitest", /\bvitest\b/i],
      ["jest", /\bjest\b/i],
      ["node-test", /node:test|--test/],
      ["playwright", /\bplaywright\b/i],
      ["cargo-test", /cargo\s+test|#\[test\]/],
      ["pytest", /\bpytest\b/i],
    ]
      .filter(([, regex]) => regex.test(`${joined}\n${scripts.join("\n")}`))
      .map(([name]) => name),
    hostLoaderCoverage: /\bLoader\b|cordis.*loader|dsh.*profile/i.test(joined),
    archiveInstallCoverage:
      /(?:npm\s+pack|pnpm\s+pack|dsh\s+plugin.*add|tarball)/i.test(joined),
    lifecycleCoverage: /(?:dispose|unload|remove|abort|cancel|cleanup)/i.test(
      joined,
    ),
  };
}

function analyzeWorkflows(records) {
  const joined = records.map((record) => record.text ?? "").join("\n");
  return {
    files: records.map(({ path: file, sha256: digest, error }) => ({
      path: file,
      sha256: digest ?? null,
      error: error ?? null,
    })),
    ci: /(?:pull_request|push):|npm\s+(?:test|run)|pnpm\s+(?:test|run)|cargo\s+(?:test|check)/i.test(
      joined,
    ),
    npmPublish: /npm\s+publish|pnpm\s+publish|NODE_AUTH_TOKEN/i.test(joined),
    oidcTrustedPublish: /id-token\s*:\s*write|provenance/i.test(joined),
    tagRelease:
      /tags\s*:|github\.ref.*tag|release\.yml|softprops\/action-gh-release/i.test(
        joined,
      ),
    releaseAssets:
      /upload-release-asset|action-gh-release|gh\s+release\s+upload/i.test(
        joined,
      ),
    platformMatrix: /matrix:[\s\S]{0,500}(?:os|platform|target)/i.test(joined),
    securitySignals:
      /(?:codeql|dependency-review|npm\s+audit|pnpm\s+audit|cargo\s+audit)/i.test(
        joined,
      ),
  };
}

function analyzeReadmes(records) {
  const joined = records.map((record) => record.text ?? "").join("\n");
  const commands = [];
  for (const match of joined.matchAll(
    /(?:^|\n)\s*(```(?:sh|bash|shell)?\s*\n)?\s*((?:npx\s+)?dsh\s+plugin[^\n`]*)/gi,
  )) {
    const command = match[2].trim();
    if (!commands.includes(command)) commands.push(command);
    if (commands.length >= 20) break;
  }
  return {
    files: records.map(({ path: file, sha256: digest, error }) => ({
      path: file,
      sha256: digest ?? null,
      error: error ?? null,
    })),
    installCommands: commands,
    mentionsNpm: /(?:npm|pnpm|yarn)\s+(?:install|add|publish|pack)/i.test(
      joined,
    ),
    mentionsSourceInstall:
      /dsh\s+plugin[^\n]*(?:github:|path:|\.\/|\/packages\/)/i.test(joined),
    documentsConfiguration:
      /(?:configuration|config|\u914d\u7f6e|settings|\u8bbe\u7f6e)/i.test(
        joined,
      ),
    documentsUninstall: /(?:uninstall|remove|\u5378\u8f7d|\u79fb\u9664)/i.test(
      joined,
    ),
    documentsArchitecture:
      /(?:architecture|design|\u67b6\u6784|\u8bbe\u8ba1)/i.test(joined),
  };
}

function classify(entry, packageRecords, bundle, tree, sourceAnalysis) {
  const description = entry.description.toLowerCase();
  const label = entry.label.toLowerCase();
  const scopedPackages = packageRecords.filter((record) =>
    isWithinScope(record.path, entry.subpath),
  );
  const bundlePackages = scopedPackages.filter((record) => record.bundlePatch);
  const exactPackage = packageRecords.find(
    (record) =>
      record.path ===
      (entry.subpath ? `${entry.subpath}/package.json` : "package.json"),
  );
  const hasBundle = bundlePackages.length > 0 && bundle.declared;
  let kind;
  if (
    /plugin template repo|template repository|starter repo/.test(description) ||
    /plugin-template/.test(label)
  )
    kind = "template";
  else if (
    /community distribution|distribution:|runtime on multica/.test(description)
  )
    kind = "distribution";
  else if (
    /ecosystem infrastructure|registry|awesome curated list/.test(
      description,
    ) &&
    !hasBundle
  )
    kind = "ecosystem-infrastructure";
  else if (bundlePackages.length > 1 && !exactPackage?.bundlePatch)
    kind = "plugin-collection";
  else if (entry.category === "Themes & Appearance")
    kind = hasBundle ? "skin-plugin" : "skin-or-theme-nonbundle";
  else if (entry.category === "Skills")
    kind = hasBundle ? "skill-bundle-plugin" : "skill-or-skill-collection";
  else if (/\bmcp\b/.test(description) && !hasBundle)
    kind = "mcp-or-bridge-nonbundle";
  else if (
    /standalone|terminal client|desktop client|tui/.test(description) &&
    !hasBundle
  )
    kind = "external-client-or-app";
  else if (hasBundle) kind = "dsh-runtime-plugin";
  else if (bundlePackages.length > 0) kind = "broken-bundle-declaration";
  else if (packageRecords.length === 0)
    kind = tree.length ? "source-without-node-manifest" : "empty-or-unresolved";
  else kind = "node-package-without-dsh-bundle";

  const capabilities = new Set();
  if (sourceAnalysis.boundaries.host || bundle.targetsHost)
    capabilities.add("host");
  if (
    sourceAnalysis.boundaries.client ||
    bundle.targetsClient ||
    packageRecords.some((p) => p.hasClientManifest)
  )
    capabilities.add("client");
  if (sourceAnalysis.registeredTools.length || /\btool\b/.test(description))
    capabilities.add("tool");
  if (/\bmcp\b/.test(description)) capabilities.add("mcp");
  if (/memory|recall|knowledge/.test(description)) capabilities.add("memory");
  if (/session|message|conversation|turn/.test(description))
    capabilities.add("session");
  if (/model|provider|oauth|auth/.test(description))
    capabilities.add("model-or-auth");
  if (/sandbox|security|approval|permission|guard/.test(description))
    capabilities.add("policy-or-sandbox");
  if (/ui|web|panel|sidebar|composer|theme|skin|dashboard/.test(description))
    capabilities.add("web-ui");
  if (/workflow|automation|schedule|cron|subagent|team/.test(description))
    capabilities.add("workflow");
  return {
    kind,
    hasInstallableBundle: hasBundle,
    capabilities: [...capabilities].sort(),
  };
}

function deriveLessons(record) {
  const patterns = [];
  const antiPatterns = [];
  if (
    record.bundle?.declared &&
    record.packages.some((pkg) => pkg.bundlePatch)
  ) {
    patterns.push("manifest-declared-bundle-patch");
  }
  if (record.source?.boundaries?.host && record.source?.boundaries?.client) {
    patterns.push("host-client-source-split");
  }
  if (record.source?.lifecycleSignals?.disposer)
    patterns.push("lifecycle-disposer-signal");
  if (record.source?.stateSignals?.atomicWrite)
    patterns.push("atomic-file-persistence");
  if (record.tests?.hostLoaderCoverage)
    patterns.push("loader-or-profile-test-signal");
  if (record.tests?.archiveInstallCoverage)
    patterns.push("packed-artifact-install-test");
  if (record.workflows?.oidcTrustedPublish)
    patterns.push("npm-oidc-provenance-release");
  if (record.workflows?.platformMatrix)
    patterns.push("cross-platform-build-matrix");
  if (
    record.packages.some(
      (pkg) => Array.isArray(pkg.files) && pkg.files.length > 0,
    )
  ) {
    patterns.push("explicit-published-files");
  }
  if (
    !record.classification.hasInstallableBundle &&
    ![
      "template",
      "distribution",
      "ecosystem-infrastructure",
      "external-client-or-app",
      "mcp-or-bridge-nonbundle",
      "skill-or-skill-collection",
      "skin-or-theme-nonbundle",
    ].includes(record.classification.kind)
  ) {
    antiPatterns.push("listed-without-observable-dsh-bundle");
  }
  if (
    record.packages.some(
      (pkg) => pkg.packagingSignals?.prepare && !pkg.packagingSignals?.prepack,
    )
  ) {
    antiPatterns.push("source-install-executes-prepare");
  }
  if (
    record.classification.hasInstallableBundle &&
    record.tests.discoveredCount === 0 &&
    record.tests.scripts.length === 0
  ) {
    antiPatterns.push("no-observable-tests");
  }
  if (
    record.classification.hasInstallableBundle &&
    record.workflows.files.length === 0
  ) {
    antiPatterns.push("no-observable-ci");
  }
  if (record.packages.some((pkg) => pkg.private === true && pkg.bundlePatch)) {
    antiPatterns.push("private-bundle-not-registry-publishable");
  }
  if (record.classification.kind === "broken-bundle-declaration") {
    antiPatterns.push("declared-bundle-file-missing");
  }
  return {
    patterns: [...new Set(patterns)],
    antiPatterns: [...new Set(antiPatterns)],
  };
}

async function inspectEntry(entry, workRoot) {
  const safeName = `${entry.repositoryKey.replaceAll("/", "__")}__${sha256(entry.subpath).slice(0, 10)}`;
  const repoDir = path.join(workRoot, safeName);
  await rm(repoDir, { recursive: true, force: true });
  const startedAt = new Date().toISOString();
  try {
    let cloneError = null;
    for (const filter of ["blob:limit=384k", "blob:none", "blob:none"]) {
      await rm(repoDir, { recursive: true, force: true });
      try {
        await run(
          "git",
          [
            "-c",
            "http.proxy=",
            "-c",
            "https.proxy=",
            "clone",
            "--quiet",
            "--depth=1",
            `--filter=${filter}`,
            "--no-checkout",
            "--single-branch",
            entry.cloneUrl,
            repoDir,
          ],
          { timeout: 180_000 },
        );
        cloneError = null;
        break;
      } catch (error) {
        cloneError = error;
      }
    }
    if (cloneError) throw cloneError;
    const [{ stdout: headRaw }, { stdout: branchRaw }, { stdout: treeRaw }] =
      await Promise.all([
        run("git", ["rev-parse", "HEAD"], { cwd: repoDir }),
        run("git", ["symbolic-ref", "--short", "HEAD"], { cwd: repoDir }).catch(
          () => ({ stdout: "" }),
        ),
        run("git", ["ls-tree", "-r", "--name-only", "HEAD"], { cwd: repoDir }),
      ]);
    const head = headRaw.trim();
    const defaultBranch = branchRaw.trim() || null;
    const tree = treeRaw.split(/\r?\n/).filter(Boolean);
    const scopeExists =
      !entry.subpath || tree.some((file) => isWithinScope(file, entry.subpath));

    const manifestPaths = selectManifestPaths(tree, entry.subpath);
    const packages = [];
    for (const manifestPath of manifestPaths) {
      const blob = await gitText(repoDir, manifestPath);
      if (!blob.text) {
        packages.push(packageSummary(manifestPath, null, blob.error));
        continue;
      }
      try {
        packages.push(
          packageSummary(
            manifestPath,
            JSON.parse(blob.text.replace(/^\uFEFF/, "")),
          ),
        );
      } catch (error) {
        packages.push(
          packageSummary(manifestPath, null, `invalid JSON: ${error.message}`),
        );
      }
    }

    const bundlePaths = resolveBundlePaths(tree, packages, entry.subpath);
    const bundleRecords = [];
    for (const bundlePath of bundlePaths) {
      bundleRecords.push({
        path: bundlePath,
        ...(await gitText(repoDir, bundlePath)),
      });
    }
    const bundle = analyzeBundle(bundleRecords);

    const sourcePaths = selectSourcePaths(tree, entry.subpath, packages);
    const sourceRecords = [];
    for (const sourcePath of sourcePaths) {
      sourceRecords.push({
        path: sourcePath,
        ...(await gitText(repoDir, sourcePath)),
      });
    }
    const source = analyzeSources(sourceRecords);

    const testPaths = selectTestPaths(tree, entry.subpath);
    const testRecords = [];
    for (const testPath of testPaths) {
      testRecords.push({
        path: testPath,
        ...(await gitText(repoDir, testPath)),
      });
    }
    const tests = analyzeTests(testPaths, testRecords, packages);

    const workflowPaths = selectWorkflowPaths(tree);
    const workflowRecords = [];
    for (const workflowPath of workflowPaths) {
      workflowRecords.push({
        path: workflowPath,
        ...(await gitText(repoDir, workflowPath)),
      });
    }
    const workflows = analyzeWorkflows(workflowRecords);

    const readmePaths = selectReadmePaths(tree, entry.subpath);
    const readmeRecords = [];
    for (const readmePath of readmePaths) {
      readmeRecords.push({
        path: readmePath,
        ...(await gitText(repoDir, readmePath)),
      });
    }
    const readmes = analyzeReadmes(readmeRecords);
    const classification = classify(entry, packages, bundle, tree, source);

    const record = {
      schemaVersion: 1,
      sourceList: {
        repository: "awesome-dsh-plugin/awesome-dsh-plugin",
        commit: sourceCommit,
        language: "en",
        line: entry.line,
        category: entry.category,
        label: entry.label,
        url: entry.url,
        description: entry.description,
      },
      target: {
        repository: entry.repository,
        repositoryKey: entry.repositoryKey,
        subpath: entry.subpath || null,
        canonicalKey: entry.canonicalKey,
        listedRef: entry.listedRef,
        head,
        defaultBranch,
        inspectedAt: startedAt,
        scopeExists,
      },
      accessibility: {
        status: scopeExists ? "accessible" : "subpath-missing",
        error: null,
      },
      classification,
      repositoryShape: {
        fileCount: tree.length,
        packageManifestCountInScope: tree.filter(
          (file) =>
            isWithinScope(file, entry.subpath) &&
            path.posix.basename(file) === "package.json" &&
            !containsSkippedPart(file),
        ).length,
        monorepo: packages.some((pkg) => pkg.workspaces) || packages.length > 1,
        languages: [
          ...new Set(
            tree
              .map((file) => path.posix.extname(file).toLowerCase())
              .filter((extension) => SOURCE_EXTENSIONS.has(extension)),
          ),
        ].sort(),
      },
      packages,
      bundle,
      source,
      tests,
      workflows,
      readmes,
    };
    record.lessons = deriveLessons(record);
    return record;
  } catch (error) {
    return {
      schemaVersion: 1,
      sourceList: {
        repository: "awesome-dsh-plugin/awesome-dsh-plugin",
        commit: sourceCommit,
        language: "en",
        line: entry.line,
        category: entry.category,
        label: entry.label,
        url: entry.url,
        description: entry.description,
      },
      target: {
        repository: entry.repository,
        repositoryKey: entry.repositoryKey,
        subpath: entry.subpath || null,
        canonicalKey: entry.canonicalKey,
        listedRef: entry.listedRef,
        head: null,
        defaultBranch: null,
        inspectedAt: startedAt,
        scopeExists: false,
      },
      accessibility: { status: "clone-failed", error: compactError(error) },
      classification: {
        kind: "inaccessible",
        hasInstallableBundle: false,
        capabilities: [],
      },
      repositoryShape: null,
      packages: [],
      bundle: null,
      source: null,
      tests: null,
      workflows: null,
      readmes: null,
      lessons: { patterns: [], antiPatterns: [] },
    };
  } finally {
    await rm(repoDir, { recursive: true, force: true });
  }
}

function refreshDerived(record) {
  if (
    record.accessibility?.status !== "accessible" ||
    !record.source ||
    !record.bundle
  ) {
    return record;
  }
  const entry = {
    category: record.sourceList.category,
    description: record.sourceList.description,
    label: record.sourceList.label,
    subpath: record.target.subpath ?? "",
  };
  const treePlaceholder = Array.from({
    length: Math.max(0, record.repositoryShape?.fileCount ?? 0),
  });
  record.classification = classify(
    entry,
    record.packages,
    record.bundle,
    treePlaceholder,
    record.source,
  );
  record.lessons = deriveLessons(record);
  return record;
}

async function readCache(cacheFile) {
  try {
    const record = refreshDerived(
      JSON.parse(await readFile(cacheFile, "utf8")),
    );
    if (retryFailures && record.accessibility?.status !== "accessible")
      return null;
    return record;
  } catch {
    return null;
  }
}

async function writeCache(cacheFile, record) {
  const temporary = `${cacheFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(record)}\n`, "utf8");
  await rename(temporary, cacheFile);
}

async function mapConcurrent(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, consume),
  );
  return output;
}

await mkdir(cacheDir, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });
const [readme, readmeZh] = await Promise.all([
  readFile(path.join(awesomeDir, "README.md"), "utf8"),
  readFile(path.join(awesomeDir, "README.zh.md"), "utf8"),
]);
const [{ stdout: sourceCommitRaw }] = await Promise.all([
  run("git", ["rev-parse", "HEAD"], { cwd: awesomeDir }),
]);
const sourceCommit = sourceCommitRaw.trim();
const englishEntries = parseList(readme, "en");
const chineseEntries = parseList(readmeZh, "zh");

const seen = new Map();
const uniqueEntries = [];
const duplicates = [];
for (const entry of englishEntries) {
  if (seen.has(entry.canonicalKey)) {
    duplicates.push({
      canonicalKey: entry.canonicalKey,
      firstLine: seen.get(entry.canonicalKey).line,
      duplicateLine: entry.line,
    });
    continue;
  }
  seen.set(entry.canonicalKey, entry);
  uniqueEntries.push(entry);
}

const zhKeys = new Set(chineseEntries.map((entry) => entry.canonicalKey));
const enKeys = new Set(englishEntries.map((entry) => entry.canonicalKey));
const languageParity = {
  englishEntries: englishEntries.length,
  chineseEntries: chineseEntries.length,
  englishOnly: [...enKeys].filter((key) => !zhKeys.has(key)),
  chineseOnly: [...zhKeys].filter((key) => !enKeys.has(key)),
};

const workRoot = path.join(cacheDir, "work");
await mkdir(workRoot, { recursive: true });
let completed = 0;
const records = await mapConcurrent(
  uniqueEntries,
  concurrency,
  async (entry) => {
    const cacheFile = path.join(
      cacheDir,
      `${sha256(`${sourceCommit}:${entry.canonicalKey}`)}.json`,
    );
    let record = await readCache(cacheFile);
    if (refreshAll) record = null;
    if (refreshSubpaths && entry.subpath) record = null;
    const cached = Boolean(record);
    if (!record) {
      record = await inspectEntry(entry, workRoot);
      await writeCache(cacheFile, record);
    }
    completed += 1;
    process.stderr.write(
      `[${completed}/${uniqueEntries.length}] ${cached ? "cache" : record.accessibility.status} ${entry.canonicalKey}\n`,
    );
    return record;
  },
);

const metadata = {
  schemaVersion: 1,
  recordType: "scan-metadata",
  source: {
    checkout: awesomeDir,
    commit: sourceCommit,
    readmeSha256: sha256(readme),
    readmeZhSha256: sha256(readmeZh),
  },
  counts: {
    englishEntries: englishEntries.length,
    chineseEntries: chineseEntries.length,
    uniqueTargets: uniqueEntries.length,
    duplicateTargets: duplicates.length,
  },
  duplicates,
  languageParity,
  scanner: {
    partialCloneFilter: "blob:limit=384k",
    concurrency,
    limits: LIMITS,
  },
};
const output =
  [metadata, ...records].map((record) => JSON.stringify(record)).join("\n") +
  "\n";
const temporaryOutput = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporaryOutput, output, "utf8");
await rename(temporaryOutput, outputPath);

const cacheFiles = (await readdir(cacheDir)).filter((file) =>
  file.endsWith(".json"),
).length;
process.stderr.write(
  `wrote ${records.length} records to ${outputPath}; cache contains ${cacheFiles} records\n`,
);
