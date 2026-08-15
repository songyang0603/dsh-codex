#!/usr/bin/env node

import { spawn, execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const execFile = promisify(execFileCallback);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const EXPECTED = Object.freeze({
  protocolVersion: 3,
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
  utilsCliTree: "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee",
  utilsHomeDirTree: "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  shellCommandTree: "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106",
  cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
});

const CASE_FIELDS = [
  "schemaVersion",
  "id",
  "codexHomeMode",
  "directories",
  "files",
  "symlinks",
  "requiresUnixSymlinks",
  "cwd",
  "cliOverrides",
  "strictConfig",
  "profileV2",
  "ignoreUserConfig",
  "ignoreUserAndProjectExecPolicyRules",
  "cloud",
  "originKeys",
  "evaluations",
  "expectErrorStage",
];
const DECISIONS = new Set(["allow", "prompt", "forbidden"]);
const ERROR_STAGES = new Set(["profile", "cli", "loader"]);

function usage() {
  return "Usage: node run-candidate.mjs --engine FILE --corpus FILE --output FILE";
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (!["--engine", "--corpus", "--output"].includes(argument)) {
      throw new Error(`unknown argument: ${argument}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}\n${usage()}`);
    parsed[argument.slice(2)] = resolve(value);
    index += 1;
  }
  for (const required of ["engine", "corpus", "output"]) {
    if (!parsed[required])
      throw new Error(`--${required} is required\n${usage()}`);
  }
  if (parsed.corpus === parsed.output)
    throw new Error("output must not overwrite the corpus");
  if (parsed.engine === parsed.output)
    throw new Error("output must not overwrite the engine");
  return parsed;
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertKeys(value, allowed, label) {
  assertObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new Error(`${label}: unknown field ${key}`);
  }
}

function safeRelative(value, label) {
  if (
    typeof value !== "string" ||
    !value ||
    isAbsolute(value) ||
    value.includes("\0") ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${label} must contain only safe relative path components`);
  }
  return value;
}

function validateCloud(value, label) {
  if (value === undefined) return { mode: "not_requested" };
  assertObject(value, label);
  if (value.mode === "not_requested") {
    assertKeys(value, ["mode"], label);
    return value;
  }
  if (value.mode !== "snapshot") throw new Error(`${label}.mode is invalid`);
  assertKeys(value, ["mode", "bundle"], label);
  if (value.bundle === null) return value;
  assertObject(value.bundle, `${label}.bundle`);
  assertKeys(
    value.bundle,
    ["config_toml", "requirements_toml"],
    `${label}.bundle`,
  );
  for (const bucket of ["config_toml", "requirements_toml"]) {
    const entry = value.bundle[bucket];
    assertKeys(entry, ["enterprise_managed"], `${label}.bundle.${bucket}`);
    if (!Array.isArray(entry.enterprise_managed)) {
      throw new Error(
        `${label}.bundle.${bucket}.enterprise_managed must be an array`,
      );
    }
    for (const [index, fragment] of entry.enterprise_managed.entries()) {
      const fragmentLabel = `${label}.bundle.${bucket}.enterprise_managed[${index}]`;
      assertKeys(fragment, ["id", "name", "contents"], fragmentLabel);
      for (const field of ["id", "name", "contents"]) {
        if (
          typeof fragment[field] !== "string" ||
          (field !== "contents" && !fragment[field])
        ) {
          throw new Error(`${fragmentLabel}.${field} is invalid`);
        }
      }
    }
  }
  return value;
}

function validateCase(value, label) {
  assertKeys(value, CASE_FIELDS, label);
  if (value.schemaVersion !== 1)
    throw new Error(`${label}: schemaVersion must be 1`);
  if (typeof value.id !== "string" || !value.id)
    throw new Error(`${label}.id is invalid`);
  if (!["discover", "explicit"].includes(value.codexHomeMode)) {
    throw new Error(`${label}.codexHomeMode is invalid`);
  }
  const occupied = new Set();
  for (const [index, directory] of (value.directories ?? []).entries()) {
    safeRelative(directory, `${label}.directories[${index}]`);
    if (occupied.has(directory))
      throw new Error(`${label}: duplicate fixture path ${directory}`);
    occupied.add(directory);
  }
  for (const [index, fixture] of (value.files ?? []).entries()) {
    const fixtureLabel = `${label}.files[${index}]`;
    assertKeys(fixture, ["path", "contents"], fixtureLabel);
    safeRelative(fixture.path, `${fixtureLabel}.path`);
    if (typeof fixture.contents !== "string")
      throw new Error(`${fixtureLabel}.contents must be a string`);
    if (occupied.has(fixture.path))
      throw new Error(`${label}: duplicate fixture path ${fixture.path}`);
    occupied.add(fixture.path);
  }
  for (const [index, fixture] of (value.symlinks ?? []).entries()) {
    const fixtureLabel = `${label}.symlinks[${index}]`;
    assertKeys(fixture, ["path", "target"], fixtureLabel);
    safeRelative(fixture.path, `${fixtureLabel}.path`);
    safeRelative(fixture.target, `${fixtureLabel}.target`);
    if (occupied.has(fixture.path))
      throw new Error(`${label}: duplicate fixture path ${fixture.path}`);
    occupied.add(fixture.path);
  }
  if (
    value.requiresUnixSymlinks !== undefined &&
    typeof value.requiresUnixSymlinks !== "boolean"
  ) {
    throw new Error(`${label}.requiresUnixSymlinks must be boolean`);
  }
  if (value.cwd !== undefined && value.cwd !== null)
    safeRelative(value.cwd, `${label}.cwd`);
  if (
    !Array.isArray(value.cliOverrides ?? []) ||
    !(value.cliOverrides ?? []).every((entry) => typeof entry === "string")
  ) {
    throw new Error(`${label}.cliOverrides must be a string array`);
  }
  for (const field of [
    "strictConfig",
    "ignoreUserConfig",
    "ignoreUserAndProjectExecPolicyRules",
  ]) {
    if (value[field] !== undefined && typeof value[field] !== "boolean") {
      throw new Error(`${label}.${field} must be boolean`);
    }
  }
  if (
    value.profileV2 !== undefined &&
    value.profileV2 !== null &&
    typeof value.profileV2 !== "string"
  ) {
    throw new Error(`${label}.profileV2 must be a string or null`);
  }
  value.cloud = validateCloud(value.cloud, `${label}.cloud`);
  if (
    !Array.isArray(value.originKeys ?? []) ||
    !(value.originKeys ?? []).every(
      (entry) => typeof entry === "string" && entry,
    )
  ) {
    throw new Error(`${label}.originKeys must be a non-empty-string array`);
  }
  for (const [index, evaluation] of (value.evaluations ?? []).entries()) {
    const evaluationLabel = `${label}.evaluations[${index}]`;
    assertKeys(evaluation, ["command", "fallback"], evaluationLabel);
    if (
      !Array.isArray(evaluation.command) ||
      evaluation.command.length === 0 ||
      !evaluation.command.every((token) => typeof token === "string" && token)
    ) {
      throw new Error(
        `${evaluationLabel}.command must contain non-empty strings`,
      );
    }
    if (!DECISIONS.has(evaluation.fallback))
      throw new Error(`${evaluationLabel}.fallback is invalid`);
  }
  if (
    value.expectErrorStage !== undefined &&
    value.expectErrorStage !== null &&
    !ERROR_STAGES.has(value.expectErrorStage)
  ) {
    throw new Error(`${label}.expectErrorStage is invalid`);
  }
  return value;
}

function parseJsonl(text, source) {
  const normalized = text.replaceAll("\r\n", "\n");
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  if (!body) throw new Error(`${source}: corpus is empty`);
  const cases = [];
  const ids = new Set();
  for (const [index, line] of body.split("\n").entries()) {
    if (!line.trim())
      throw new Error(`${source}:${index + 1}: blank JSONL record`);
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: invalid JSON: ${error.message}`);
    }
    const corpusCase = validateCase(value, `${source}:${index + 1}`);
    if (ids.has(corpusCase.id))
      throw new Error(`${source}: duplicate id ${corpusCase.id}`);
    ids.add(corpusCase.id);
    cases.push(corpusCase);
  }
  const discover = cases.flatMap((entry, index) =>
    entry.codexHomeMode === "discover" ? [index] : [],
  );
  if (discover.length !== 1 || discover[0] !== 0) {
    throw new Error(
      `${source}: exactly one discover-home case must be record zero`,
    );
  }
  return cases;
}

class JsonlSidecar {
  #child;
  #closed = false;
  #nextId = 1;
  #pending = new Map();
  #stderr = "";
  #stdoutBuffer = "";

  constructor(engine, env) {
    this.#child = spawn(engine, [], { stdio: ["pipe", "pipe", "pipe"], env });
    this.#child.stdout.setEncoding("utf8");
    this.#child.stderr.setEncoding("utf8");
    this.#child.stdout.on("data", (chunk) => this.#onStdout(chunk));
    this.#child.stderr.on("data", (chunk) => {
      this.#stderr = (this.#stderr + chunk).slice(-65_536);
    });
    this.#child.on("error", (error) => this.#rejectAll(error));
    this.#child.on("exit", (code, signal) => {
      this.#closed = true;
      if (this.#pending.size > 0) {
        this.#rejectAll(
          new Error(
            `sidecar exited code=${code} signal=${signal}; stderr=${this.#stderr}`,
          ),
        );
      }
    });
  }

  #onStdout(chunk) {
    this.#stdoutBuffer += chunk;
    for (;;) {
      const newline = this.#stdoutBuffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.#stdoutBuffer.slice(0, newline);
      this.#stdoutBuffer = this.#stdoutBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      let response;
      try {
        response = JSON.parse(line);
      } catch (error) {
        this.#rejectAll(
          new Error(`invalid sidecar JSON: ${error.message}: ${line}`),
        );
        return;
      }
      const pending = this.#pending.get(response.id);
      if (!pending) {
        this.#rejectAll(
          new Error(`unexpected sidecar response id: ${response.id}`),
        );
        return;
      }
      this.#pending.delete(response.id);
      clearTimeout(pending.timeout);
      if (response.protocolVersion !== EXPECTED.protocolVersion) {
        pending.reject(
          new Error(
            `unexpected response protocol: ${response.protocolVersion}`,
          ),
        );
      } else if (
        (response.result === undefined) ===
        (response.error === undefined)
      ) {
        pending.reject(
          new Error(
            "sidecar response must contain exactly one of result or error",
          ),
        );
      } else {
        pending.resolve(response);
      }
    }
  }

  #rejectAll(error) {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  request(method, params = {}) {
    if (this.#closed) return Promise.reject(new Error("sidecar is closed"));
    const id = this.#nextId++;
    const payload = JSON.stringify({
      protocolVersion: EXPECTED.protocolVersion,
      id,
      method,
      params,
    });
    return new Promise((resolveRequest, rejectRequest) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        rejectRequest(new Error(`sidecar request timed out: ${method}`));
        this.#child.kill();
      }, 30_000);
      this.#pending.set(id, {
        resolve: resolveRequest,
        reject: rejectRequest,
        timeout,
      });
      this.#child.stdin.write(`${payload}\n`, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.#pending.delete(id);
          rejectRequest(error);
        }
      });
    });
  }

  async requestResult(method, params = {}) {
    const response = await this.request(method, params);
    if (response.error)
      throw new Error(
        `${method}: ${response.error.code}: ${response.error.message}`,
      );
    return response.result;
  }

  async shutdown() {
    if (this.#closed) return;
    await this.requestResult("shutdown", {});
    await new Promise((resolveExit, rejectExit) => {
      if (this.#closed) return resolveExit();
      const timeout = setTimeout(() => {
        this.#child.kill();
        rejectExit(new Error("sidecar did not exit after shutdown"));
      }, 2_000);
      this.#child.once("exit", () => {
        clearTimeout(timeout);
        resolveExit();
      });
    });
  }

  kill() {
    if (!this.#closed) this.#child.kill();
  }
}

function verifyHello(hello) {
  assertObject(hello, "engine hello");
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (hello[key] !== expected) {
      throw new Error(
        `engine hello ${key} mismatch: expected ${expected}, got ${hello[key]}`,
      );
    }
  }
  if (
    typeof hello.os !== "string" ||
    !hello.os ||
    typeof hello.arch !== "string" ||
    !hello.arch
  ) {
    throw new Error("engine hello os/arch must be non-empty strings");
  }
}

function canonicalText(value, caseRoot) {
  const canonical = value.split(caseRoot).join("$CASE");
  return canonical.includes("$CASE")
    ? canonical.replaceAll("\\", "/")
    : canonical;
}

function canonicalize(value, caseRoot) {
  if (typeof value === "string") return canonicalText(value, caseRoot);
  if (Array.isArray(value))
    return value.map((entry) => canonicalize(entry, caseRoot));
  if (value && typeof value === "object") {
    const result = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        canonicalText(key, caseRoot),
        canonicalize(entry, caseRoot),
      ]),
    );
    if (
      result.kind === "packaged_defaults" &&
      typeof result.file === "string"
    ) {
      result.file = "$EXECUTABLE";
    }
    return result;
  }
  return value;
}

function selectOrigins(origins, keys, caseRoot, label) {
  assertObject(origins, label);
  return Object.fromEntries(
    keys.map((key) => {
      const lookup = key.split("$CASE").join(caseRoot);
      return [key, origins[lookup] ?? null];
    }),
  );
}

async function snapshotTree(root) {
  const entries = [];
  async function visit(path, relativePath) {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) {
      entries.push([relativePath, "symlink", await readlink(path)]);
      return;
    }
    if (metadata.isDirectory()) {
      entries.push([relativePath, "directory"]);
      const children = await readdir(path);
      children.sort();
      for (const child of children) {
        await visit(
          join(path, child),
          relativePath ? `${relativePath}/${child}` : child,
        );
      }
      return;
    }
    if (metadata.isFile()) {
      const digest = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      entries.push([relativePath, "file", digest]);
      return;
    }
    entries.push([relativePath, "other"]);
  }
  await visit(root, "");
  return JSON.stringify(entries);
}

async function materializeCase(corpusCase, caseRoot) {
  await mkdir(join(caseRoot, "home"), { recursive: true });
  for (const directory of corpusCase.directories ?? []) {
    await mkdir(join(caseRoot, directory), { recursive: true });
  }
  for (const fixture of corpusCase.files ?? []) {
    const path = join(caseRoot, fixture.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      fixture.contents.split("$CASE").join(caseRoot),
      "utf8",
    );
  }
  for (const fixture of corpusCase.symlinks ?? []) {
    const path = join(caseRoot, fixture.path);
    await mkdir(dirname(path), { recursive: true });
    const resolvedTarget = resolve(dirname(path), fixture.target);
    const escape = relative(caseRoot, resolvedTarget);
    if (
      escape === ".." ||
      escape.startsWith(`..${sep}`) ||
      isAbsolute(escape)
    ) {
      throw new Error(`${corpusCase.id}: symlink target escapes case root`);
    }
    await symlink(fixture.target, path);
  }
}

function hostParams(corpusCase, caseRoot) {
  return {
    schemaVersion: 1,
    codexHome:
      corpusCase.codexHomeMode === "discover"
        ? { mode: "discover" }
        : { mode: "explicit", path: join(caseRoot, "home") },
    cwd:
      corpusCase.cwd === undefined || corpusCase.cwd === null
        ? null
        : { mode: "absolute", path: join(caseRoot, corpusCase.cwd) },
    cliOverrides: corpusCase.cliOverrides ?? [],
    strictConfig: corpusCase.strictConfig ?? false,
    profileV2: corpusCase.profileV2 ?? null,
    ignoreUserConfig: corpusCase.ignoreUserConfig ?? false,
    ignoreUserAndProjectExecPolicyRules:
      corpusCase.ignoreUserAndProjectExecPolicyRules ?? false,
    cloud: corpusCase.cloud ?? { mode: "not_requested" },
    threadConfig: { mode: "none" },
  };
}

async function evaluateCase(sidecar, hello, corpusCase, caseRoot) {
  if (corpusCase.requiresUnixSymlinks && process.platform === "win32") {
    return {
      schemaVersion: 1,
      id: corpusCase.id,
      engine: hello,
      result: {
        skipped: {
          reason: "requires_unix_symlinks",
          platform: hello.os,
        },
      },
    };
  }
  await materializeCase(corpusCase, caseRoot);
  const before = await snapshotTree(caseRoot);
  const response = await sidecar.request(
    "load_host_config_stack",
    hostParams(corpusCase, caseRoot),
  );
  const after = await snapshotTree(caseRoot);
  if (after !== before) {
    throw new Error(
      `${corpusCase.id}: load_host_config_stack mutated its host fixture`,
    );
  }
  const expectsError =
    corpusCase.expectErrorStage !== undefined &&
    corpusCase.expectErrorStage !== null;
  if (response.error) {
    if (!expectsError) {
      throw new Error(
        `${corpusCase.id}: unexpected load error ${response.error.code}: ${response.error.message}`,
      );
    }
    return {
      schemaVersion: 1,
      id: corpusCase.id,
      engine: hello,
      result: { loadError: canonicalize(response.error, caseRoot) },
    };
  }
  if (expectsError)
    throw new Error(
      `${corpusCase.id}: expected ${corpusCase.expectErrorStage} error`,
    );

  response.result.stack.origins = selectOrigins(
    response.result.stack.origins,
    corpusCase.originKeys ?? [],
    caseRoot,
    `${corpusCase.id}.stack.origins`,
  );
  const load = canonicalize(response.result, caseRoot);
  const evaluations = [];
  for (const evaluation of corpusCase.evaluations ?? []) {
    const result = await sidecar.requestResult("check_tokens", {
      commands: [evaluation.command],
      fallbackDecision: evaluation.fallback,
      resolveHostExecutables: false,
    });
    evaluations.push({
      command: evaluation.command,
      fallback: evaluation.fallback,
      evaluation: canonicalize(result, caseRoot),
    });
  }
  return {
    schemaVersion: 1,
    id: corpusCase.id,
    engine: hello,
    result: { load, evaluations },
  };
}

async function assertIsolatedHost() {
  for (const path of [
    "/etc/codex/config.toml",
    "/etc/codex/requirements.toml",
    "/etc/codex/managed_config.toml",
  ]) {
    try {
      await access(path);
      throw new Error(`ambient host policy prevents an isolated run: ${path}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  if (process.platform === "darwin") {
    for (const key of ["config_toml_base64", "requirements_toml_base64"]) {
      try {
        await execFile("/usr/bin/defaults", ["read", "com.openai.codex", key]);
        throw new Error(
          `ambient MDM preference prevents an isolated run: com.openai.codex:${key}`,
        );
      } catch (error) {
        if (error?.code === 1) continue;
        throw error;
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = parseJsonl(await readFile(args.corpus, "utf8"), args.corpus);
  await assertIsolatedHost();
  await mkdir(dirname(args.output), { recursive: true });
  let tempRoot = await mkdtemp(
    join(dirname(args.output), ".host-config-candidate-"),
  );
  tempRoot = await realpath(tempRoot);
  const stagedOutput = join(tempRoot, "candidate.jsonl");
  const discoverHome = join(tempRoot, "cases", "0", "home");
  await mkdir(discoverHome, { recursive: true });
  const sidecar = new JsonlSidecar(args.engine, {
    ...process.env,
    CODEX_HOME: discoverHome,
  });
  try {
    const hello = await sidecar.requestResult("hello", {});
    verifyHello(hello);
    const records = [];
    for (const [index, corpusCase] of cases.entries()) {
      records.push(
        await evaluateCase(
          sidecar,
          hello,
          corpusCase,
          join(tempRoot, "cases", String(index)),
        ),
      );
    }
    await sidecar.shutdown();
    await writeFile(
      stagedOutput,
      `${records.map(JSON.stringify).join("\n")}\n`,
      "utf8",
    );
    // Validation is deliberately a separate process so this runner does not
    // depend on module side effects or a candidate-owned projection.
    await new Promise((resolveValidation, rejectValidation) => {
      const child = spawn(
        process.execPath,
        [
          join(SCRIPT_DIR, "validate-output.mjs"),
          "--kind",
          "candidate",
          "--corpus",
          args.corpus,
          "--output",
          stagedOutput,
        ],
        { stdio: "inherit" },
      );
      child.once("exit", (code) =>
        code === 0
          ? resolveValidation()
          : rejectValidation(new Error(`candidate validator exited ${code}`)),
      );
      child.once("error", rejectValidation);
    });
    await rename(stagedOutput, args.output);
    process.stdout.write(`host-config candidate output: ${args.output}\n`);
  } finally {
    sidecar.kill();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
