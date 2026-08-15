#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

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

const LAYER_KINDS = new Set(["system", "user", "project", "session_flags"]);
const REQUIREMENT_KINDS = new Set([
  "system",
  "enterprise_managed",
  "legacy_managed_file",
]);
const DECISIONS = new Set(["allow", "prompt", "forbidden"]);

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
  if (parsed.corpus === parsed.output) {
    throw new Error("output must not overwrite the corpus");
  }
  if (parsed.engine === parsed.output) {
    throw new Error("output must not overwrite the engine");
  }
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

function assertComponent(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new Error(`${label} must be a safe, non-empty path component`);
  }
}

function validateCase(value, label) {
  assertKeys(
    value,
    [
      "schemaVersion",
      "id",
      "layers",
      "requirementsLayers",
      "ignoreUserAndProjectExecPolicyRules",
      "originKeys",
      "evaluations",
      "expectStackError",
    ],
    label,
  );
  if (value.schemaVersion !== 1)
    throw new Error(`${label}: schemaVersion must be 1`);
  if (typeof value.id !== "string" || value.id.length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (!Array.isArray(value.layers) || value.layers.length === 0) {
    throw new Error(`${label}.layers must be a non-empty array`);
  }

  const layerIds = new Set();
  for (const [index, layer] of value.layers.entries()) {
    const layerLabel = `${label}.layers[${index}]`;
    assertKeys(
      layer,
      ["id", "kind", "config", "rules", "profile", "disabledReason"],
      layerLabel,
    );
    assertComponent(layer.id, `${layerLabel}.id`);
    if (layerIds.has(layer.id))
      throw new Error(`${label}: duplicate layer id ${layer.id}`);
    layerIds.add(layer.id);
    if (!LAYER_KINDS.has(layer.kind)) {
      throw new Error(`${layerLabel}.kind is unsupported`);
    }
    if (layer.config !== undefined)
      assertObject(layer.config, `${layerLabel}.config`);
    if (
      layer.profile !== undefined &&
      layer.profile !== null &&
      typeof layer.profile !== "string"
    ) {
      throw new Error(`${layerLabel}.profile must be a string or null`);
    }
    if (
      layer.kind !== "user" &&
      layer.profile !== undefined &&
      layer.profile !== null
    ) {
      throw new Error(`${layerLabel}.profile is only valid for user layers`);
    }
    if (
      layer.disabledReason !== undefined &&
      layer.disabledReason !== null &&
      typeof layer.disabledReason !== "string"
    ) {
      throw new Error(`${layerLabel}.disabledReason must be a string or null`);
    }
    const rules = layer.rules ?? [];
    if (!Array.isArray(rules))
      throw new Error(`${layerLabel}.rules must be an array`);
    if (layer.kind === "session_flags" && rules.length > 0) {
      throw new Error(`${layerLabel}: session_flags cannot contain rule files`);
    }
    const ruleNames = new Set();
    for (const [ruleIndex, rule] of rules.entries()) {
      const ruleLabel = `${layerLabel}.rules[${ruleIndex}]`;
      assertKeys(rule, ["name", "source"], ruleLabel);
      assertComponent(rule.name, `${ruleLabel}.name`);
      if (!rule.name.endsWith(".rules")) {
        throw new Error(`${ruleLabel}.name must end in .rules`);
      }
      if (ruleNames.has(rule.name)) {
        throw new Error(`${layerLabel}: duplicate rule file ${rule.name}`);
      }
      ruleNames.add(rule.name);
      if (typeof rule.source !== "string") {
        throw new Error(`${ruleLabel}.source must be a string`);
      }
    }
  }

  const requirements = value.requirementsLayers ?? [];
  if (!Array.isArray(requirements)) {
    throw new Error(`${label}.requirementsLayers must be an array`);
  }
  const requirementIds = new Set();
  for (const [index, layer] of requirements.entries()) {
    const layerLabel = `${label}.requirementsLayers[${index}]`;
    assertKeys(layer, ["id", "kind", "toml", "name"], layerLabel);
    assertComponent(layer.id, `${layerLabel}.id`);
    if (requirementIds.has(layer.id)) {
      throw new Error(`${label}: duplicate requirements layer id ${layer.id}`);
    }
    requirementIds.add(layer.id);
    if (!REQUIREMENT_KINDS.has(layer.kind)) {
      throw new Error(`${layerLabel}.kind is unsupported`);
    }
    if (typeof layer.toml !== "string")
      throw new Error(`${layerLabel}.toml must be a string`);
    if (layer.kind === "enterprise_managed") {
      if (typeof layer.name !== "string") {
        throw new Error(
          `${layerLabel}.name is required for enterprise_managed`,
        );
      }
    } else if (layer.name !== undefined && layer.name !== null) {
      throw new Error(
        `${layerLabel}.name is only valid for enterprise_managed`,
      );
    }
  }

  const originKeys = value.originKeys ?? [];
  if (
    !Array.isArray(originKeys) ||
    originKeys.some((key) => typeof key !== "string" || !key)
  ) {
    throw new Error(`${label}.originKeys must contain non-empty strings`);
  }
  const evaluations = value.evaluations ?? [];
  if (!Array.isArray(evaluations))
    throw new Error(`${label}.evaluations must be an array`);
  for (const [index, evaluation] of evaluations.entries()) {
    const evaluationLabel = `${label}.evaluations[${index}]`;
    assertKeys(evaluation, ["command", "fallback"], evaluationLabel);
    if (
      !Array.isArray(evaluation.command) ||
      evaluation.command.length === 0 ||
      evaluation.command.some((token) => typeof token !== "string")
    ) {
      throw new Error(
        `${evaluationLabel}.command must be a non-empty string array`,
      );
    }
    if (!DECISIONS.has(evaluation.fallback)) {
      throw new Error(`${evaluationLabel}.fallback is invalid`);
    }
  }
  for (const booleanField of [
    "ignoreUserAndProjectExecPolicyRules",
    "expectStackError",
  ]) {
    if (
      value[booleanField] !== undefined &&
      typeof value[booleanField] !== "boolean"
    ) {
      throw new Error(`${label}.${booleanField} must be boolean`);
    }
  }
  return value;
}

function parseJsonl(text, source) {
  const normalized = text.replaceAll("\r\n", "\n");
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  if (body.length === 0) throw new Error(`${source}: corpus is empty`);
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
  return cases;
}

class JsonlSidecar {
  #child;
  #closed = false;
  #nextId = 1;
  #pending = new Map();
  #stderr = "";
  #stdoutBuffer = "";

  constructor(engine) {
    this.#child = spawn(engine, [], { stdio: ["pipe", "pipe", "pipe"] });
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
    const id = this.#nextId;
    this.#nextId += 1;
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
    if (response.error) {
      throw new Error(
        `${method}: ${response.error.code}: ${response.error.message}`,
      );
    }
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

function canonicalize(value, caseRoot) {
  if (typeof value === "string") return value.split(caseRoot).join("$CASE");
  if (Array.isArray(value))
    return value.map((entry) => canonicalize(entry, caseRoot));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        canonicalize(entry, caseRoot),
      ]),
    );
  }
  return value;
}

function layerSource(layer, layerRoot) {
  switch (layer.kind) {
    case "system":
      return { kind: "system", file: join(layerRoot, "config.toml") };
    case "user":
      return {
        kind: "user",
        file: join(layerRoot, "config.toml"),
        profile: layer.profile ?? null,
      };
    case "project":
      return { kind: "project", dotCodexFolder: layerRoot };
    case "session_flags":
      return { kind: "session_flags" };
    default:
      throw new Error(`unsupported layer kind ${layer.kind}`);
  }
}

async function materializeCase(corpusCase, caseRoot) {
  const layers = [];
  for (const layer of corpusCase.layers) {
    const layerRoot = join(caseRoot, "layers", layer.id);
    await mkdir(layerRoot, { recursive: true });
    await writeFile(
      join(layerRoot, "config.toml"),
      "# values supplied over protocol\n",
      "utf8",
    );
    for (const rule of layer.rules ?? []) {
      const rulesRoot = join(layerRoot, "rules");
      await mkdir(rulesRoot, { recursive: true });
      await writeFile(join(rulesRoot, rule.name), rule.source, "utf8");
    }
    const wireLayer = {
      source: layerSource(layer, layerRoot),
      config: layer.config ?? {},
    };
    if (layer.disabledReason !== undefined)
      wireLayer.disabledReason = layer.disabledReason;
    layers.push(wireLayer);
  }

  const requirementsLayers = [];
  for (const layer of corpusCase.requirementsLayers ?? []) {
    const requirementsRoot = join(caseRoot, "requirements");
    await mkdir(requirementsRoot, { recursive: true });
    const file = join(requirementsRoot, `${layer.id}.toml`);
    await writeFile(file, layer.toml, "utf8");
    let source;
    switch (layer.kind) {
      case "system":
        source = { kind: "system_requirements_toml", file };
        break;
      case "enterprise_managed":
        source = { kind: "enterprise_managed", id: layer.id, name: layer.name };
        break;
      case "legacy_managed_file":
        source = { kind: "legacy_managed_config_toml_from_file", file };
        break;
      default:
        throw new Error(`unsupported requirements kind ${layer.kind}`);
    }
    requirementsLayers.push({ source, toml: layer.toml });
  }

  return {
    layers,
    requirementsLayers,
    ignoreUserAndProjectExecPolicyRules:
      corpusCase.ignoreUserAndProjectExecPolicyRules ?? false,
  };
}

function selectOrigins(origins, keys, label) {
  assertObject(origins, label);
  return Object.fromEntries(keys.map((key) => [key, origins[key] ?? null]));
}

async function evaluateCase(sidecar, hello, corpusCase, caseRoot) {
  const params = await materializeCase(corpusCase, caseRoot);
  const loadResponse = await sidecar.request("load_config_stack", params);
  if (loadResponse.error) {
    if (!corpusCase.expectStackError) {
      throw new Error(
        `${corpusCase.id}: load_config_stack failed: ${loadResponse.error.code}: ${loadResponse.error.message}`,
      );
    }
    return {
      schemaVersion: 1,
      id: corpusCase.id,
      engine: hello,
      result: { stackError: loadResponse.error },
    };
  }
  if (corpusCase.expectStackError) {
    throw new Error(`${corpusCase.id}: expected load_config_stack to fail`);
  }

  const load = canonicalize(loadResponse.result, caseRoot);
  load.stack.origins = selectOrigins(
    load.stack.origins,
    corpusCase.originKeys ?? [],
    `${corpusCase.id}.stack.origins`,
  );
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
    result: {
      stack: load.stack,
      discoveredRuleFiles: load.discoveredRuleFiles,
      requirements: load.requirements,
      policy: {
        evaluations,
        warning: load.warning,
      },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = parseJsonl(await readFile(args.corpus, "utf8"), args.corpus);
  await mkdir(dirname(args.output), { recursive: true });
  const tempRoot = await mkdtemp(
    join(dirname(args.output), ".config-stack-candidate-"),
  );
  const stagedOutput = join(tempRoot, "candidate.jsonl");
  const sidecar = new JsonlSidecar(args.engine);
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
    await rename(stagedOutput, args.output);
    process.stdout.write(`candidate config-stack output: ${args.output}\n`);
  } catch (error) {
    sidecar.kill();
    throw error;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
