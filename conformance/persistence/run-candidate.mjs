#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { EXPECTED, readCorpus } from "./lib.mjs";
import { validateOutput } from "./validate-output.mjs";

const RPC_TIMEOUT_MS = 15_000;

class RpcError extends Error {
  constructor(body) {
    super(`${body.code}: ${body.message}`);
    this.name = "RpcError";
    this.body = body;
  }
}

class JsonlSidecar {
  #child;
  #closed = false;
  #nextId = 1;
  #pending = new Map();
  #stdoutBuffer = "";
  #stderr = "";
  #exitPromise;

  constructor(engine) {
    this.#child = spawn(engine, [], { stdio: ["pipe", "pipe", "pipe"] });
    this.#child.stdout.setEncoding("utf8");
    this.#child.stderr.setEncoding("utf8");
    this.#child.stdout.on("data", (chunk) => this.#onStdout(chunk));
    this.#child.stderr.on("data", (chunk) => {
      this.#stderr = (this.#stderr + chunk).slice(-65_536);
    });
    this.#child.on("error", (error) => {
      this.#closed = true;
      this.#rejectAll(error);
    });
    this.#exitPromise = new Promise((resolveExit) => {
      this.#child.on("close", (code, signal) => {
        this.#closed = true;
        if (this.#pending.size > 0) {
          this.#rejectAll(
            new Error(
              `sidecar exited code=${code} signal=${signal}; stderr=${this.#stderr}`,
            ),
          );
        }
        resolveExit({ code, signal });
      });
    });
  }

  #onStdout(chunk) {
    this.#stdoutBuffer += chunk;
    for (;;) {
      const newline = this.#stdoutBuffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.#stdoutBuffer.slice(0, newline);
      this.#stdoutBuffer = this.#stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let response;
      try {
        response = JSON.parse(line);
      } catch (error) {
        this.#rejectAll(
          new Error(
            `sidecar emitted invalid JSON: ${error.message}; line=${line}`,
          ),
        );
        this.#child.kill("SIGKILL");
        return;
      }
      if (response.protocolVersion !== EXPECTED.protocolVersion) {
        this.#rejectAll(
          new Error(
            `sidecar response protocol mismatch: ${response.protocolVersion}`,
          ),
        );
        this.#child.kill("SIGKILL");
        return;
      }
      const pending = this.#pending.get(String(response.id));
      if (!pending) {
        this.#rejectAll(
          new Error(`sidecar returned unknown response id ${response.id}`),
        );
        this.#child.kill("SIGKILL");
        return;
      }
      this.#pending.delete(String(response.id));
      clearTimeout(pending.timer);
      if (response.error !== undefined)
        pending.reject(new RpcError(response.error));
      else if (response.result !== undefined) pending.resolve(response.result);
      else
        pending.reject(
          new Error("sidecar response has neither result nor error"),
        );
    }
  }

  #rejectAll(error) {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  request(method, params = {}) {
    if (this.#closed) return Promise.reject(new Error("sidecar is closed"));
    const id = this.#nextId;
    this.#nextId += 1;
    const promise = new Promise((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        const pending = this.#pending.get(String(id));
        if (!pending) return;
        this.#pending.delete(String(id));
        pending.reject(
          new Error(
            `sidecar RPC timed out after ${RPC_TIMEOUT_MS}ms: ${method}`,
          ),
        );
        this.#child.kill("SIGKILL");
      }, RPC_TIMEOUT_MS);
      this.#pending.set(String(id), {
        resolve: resolveRequest,
        reject: rejectRequest,
        timer,
      });
    });
    const request = JSON.stringify({
      protocolVersion: EXPECTED.protocolVersion,
      id,
      method,
      params,
    });
    this.#child.stdin.write(`${request}\n`, (error) => {
      if (error) {
        const pending = this.#pending.get(String(id));
        if (pending) {
          this.#pending.delete(String(id));
          clearTimeout(pending.timer);
          pending.reject(error);
        }
      }
    });
    return promise;
  }

  async close() {
    if (!this.#closed) {
      try {
        await this.request("shutdown");
      } catch {
        this.#child.kill("SIGKILL");
      }
    }
    const exit = await this.#exitPromise;
    if (exit.code !== 0 && exit.signal === null) {
      throw new Error(
        `sidecar exited with code ${exit.code}; stderr=${this.#stderr}`,
      );
    }
  }
}

function usage() {
  return "Usage: node run-candidate.mjs --engine FILE --corpus FILE --output FILE";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (!new Set(["--engine", "--corpus", "--output"]).has(argument)) {
      throw new Error(`unknown argument: ${argument}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}\n${usage()}`);
    result[argument.slice(2)] = resolve(value);
    index += 1;
  }
  for (const required of ["engine", "corpus", "output"]) {
    if (!result[required])
      throw new Error(`--${required} is required\n${usage()}`);
  }
  if (result.corpus === result.output || result.engine === result.output) {
    throw new Error("output must not overwrite an input");
  }
  return result;
}

function candidateSource(hello, engineSha256) {
  for (const key of Object.keys(EXPECTED)) {
    if (hello[key] !== EXPECTED[key]) {
      throw new Error(`sidecar hello.${key} does not match the fixed identity`);
    }
  }
  if (typeof hello.os !== "string" || typeof hello.arch !== "string") {
    throw new Error("sidecar hello is missing platform identity");
  }
  return {
    kind: "sidecar_candidate",
    protocolVersion: hello.protocolVersion,
    engineSha256,
    codexCommit: hello.codexCommit,
    configTree: hello.configTree,
    execpolicyTree: hello.execpolicyTree,
    coreExecPolicyBlob: hello.coreExecPolicyBlob,
    coreExecPolicyDirTree: hello.coreExecPolicyDirTree,
    cargoLockBlob: hello.cargoLockBlob,
    os: hello.os,
    arch: hello.arch,
  };
}

async function nodeSnapshot(path) {
  let metadata;
  try {
    metadata = await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR")
      return { kind: "missing" };
    throw error;
  }
  if (metadata.isSymbolicLink()) return { kind: "symlink" };
  if (metadata.isDirectory()) return { kind: "directory" };
  if (metadata.isFile())
    return { kind: "file", content: await readFile(path, "utf8") };
  return { kind: "other" };
}

async function filesystemSnapshot(home) {
  return {
    home: await nodeSnapshot(home),
    rules: await nodeSnapshot(join(home, "rules")),
    policy: await nodeSnapshot(join(home, "rules", "default.rules")),
    marker: await nodeSnapshot(join(home, ".sandbox_migration")),
  };
}

async function initializeCase(home, initial) {
  if (initial.home === "directory") await mkdir(home, { recursive: true });
  if (Object.hasOwn(initial, "policy")) {
    await mkdir(join(home, "rules"), { recursive: true });
    await writeFile(
      join(home, "rules", "default.rules"),
      initial.policy,
      "utf8",
    );
  }
  if (initial.marker?.kind === "file") {
    await writeFile(
      join(home, ".sandbox_migration"),
      initial.marker.content,
      "utf8",
    );
  } else if (initial.marker?.kind === "symlink_loop") {
    await symlink(".sandbox_migration", join(home, ".sandbox_migration"));
  }
}

function openParams(home, operation) {
  return {
    schemaVersion: 1,
    codexHome: { mode: "explicit", path: home },
    cwd: null,
    cliOverrides: [],
    strictConfig: false,
    profileV2: null,
    ignoreUserConfig: false,
    ignoreUserAndProjectExecPolicyRules:
      operation.ignoreUserAndProjectExecPolicyRules ?? false,
    cloud: { mode: "not_requested" },
    threadConfig: { mode: "none" },
  };
}

async function managerState(client) {
  const [diagnostics, compiledNetworkDomains] = await Promise.all([
    client.request("diagnostics"),
    client.request("compile_network_domains"),
  ]);
  return {
    allowedPrefixes: diagnostics.allowedPrefixes,
    networkRuleCount: diagnostics.networkRules,
    compiledNetworkDomains,
  };
}

function classifyPrefixError(error) {
  if (!(error instanceof RpcError) || error.body.code !== "append_rule_failed")
    throw error;
  const message = error.body.message;
  if (message.includes("prefix rule requires at least one token"))
    return "empty_prefix";
  if (message.includes("failed to create policy directory"))
    return "create_policy_dir";
  if (message.includes("failed to open policy file")) return "open_policy_file";
  throw new Error(
    `unrecognized append-prefix error: ${JSON.stringify(error.body)}`,
  );
}

function classifyNetworkError(error) {
  if (!(error instanceof RpcError)) throw error;
  if (error.body.code === "append_rule_failed") return "append_rule_failed";
  if (error.body.code === "invalid_params") return "invalid_params";
  if (error.body.code === "update_policy_failed") return "update_policy_failed";
  throw new Error(
    `unrecognized append-network error: ${JSON.stringify(error.body)}`,
  );
}

async function executeCase(
  engine,
  engineSha256,
  corpusCase,
  source,
  corpusSha256,
) {
  if (corpusCase.requiresUnix && process.platform === "win32") {
    return {
      schemaVersion: 1,
      id: corpusCase.id,
      corpusSha256,
      source,
      result: { skipped: "requires_unix" },
    };
  }
  const root = await mkdtemp(
    join(tmpdir(), `dsh-codex-persistence-${corpusCase.id}-`),
  );
  const home = join(root, "codex-home");
  const managers = new Map();
  const operations = [];
  let primaryError;
  try {
    await initializeCase(home, corpusCase.initial);
    for (const operation of corpusCase.operations) {
      let client;
      let outcome;
      if (Object.hasOwn(operation, "manager")) {
        client = managers.get(operation.manager);
      }
      switch (operation.kind) {
        case "open": {
          if (!client) {
            client = new JsonlSidecar(engine);
            const hello = await client.request("hello");
            candidateSource(hello, engineSha256);
            managers.set(operation.manager, client);
          }
          const opened = await client.request(
            "open_host_policy",
            openParams(home, operation),
          );
          const migration = opened.discovery?.startupMigration;
          if (!migration || migration.mode !== "canonical_startup") {
            throw new Error(
              `${corpusCase.id}: open result lacks canonical startup migration`,
            );
          }
          outcome = {
            status: "ok",
            migration: {
              attempted: migration.attempted,
              completed: migration.completed,
              warning: migration.warning !== null,
              skippedReason: migration.skippedReason ?? null,
            },
            loadWarning: opened.warning?.kind ?? null,
          };
          break;
        }
        case "append_prefix":
          try {
            const appended = await client.request("append_prefix_amendment", {
              prefix: operation.prefix,
            });
            outcome = {
              status: "ok",
              changedInMemory: appended.changedInMemory,
            };
          } catch (error) {
            outcome = {
              status: "error",
              errorClass: classifyPrefixError(error),
            };
          }
          break;
        case "append_network":
          try {
            await client.request("append_network_amendment", {
              host: operation.host,
              protocol: operation.protocol,
              decision: operation.decision,
              justification: operation.justification,
            });
            outcome = { status: "ok" };
          } catch (error) {
            outcome = {
              status: "error",
              errorClass: classifyNetworkError(error),
            };
          }
          break;
        case "inspect":
          outcome = { status: "ok" };
          break;
        case "write_policy":
          await mkdir(join(home, "rules"), { recursive: true });
          await writeFile(
            join(home, "rules", "default.rules"),
            operation.source,
            "utf8",
          );
          outcome = { status: "ok" };
          break;
        case "append_policy":
          await mkdir(join(home, "rules"), { recursive: true });
          await appendFile(
            join(home, "rules", "default.rules"),
            operation.source,
            "utf8",
          );
          outcome = { status: "ok" };
          break;
        case "remove_home":
          await rm(home, { recursive: true, force: true });
          outcome = { status: "ok" };
          break;
        case "replace_rules_dir_with_file":
          await rm(join(home, "rules"), { recursive: true, force: true });
          await writeFile(join(home, "rules"), "not a directory\n", "utf8");
          outcome = { status: "ok" };
          break;
        default:
          throw new Error(`unsupported operation ${operation.kind}`);
      }
      const result = {
        kind: operation.kind,
        ...(operation.manager === undefined
          ? {}
          : { manager: operation.manager }),
        outcome,
        ...(client ? { state: await managerState(client) } : {}),
        filesystem: await filesystemSnapshot(home),
      };
      operations.push(result);
    }
    return {
      schemaVersion: 1,
      id: corpusCase.id,
      corpusSha256,
      source,
      result: {
        operations,
        finalFilesystem: await filesystemSnapshot(home),
      },
    };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const closeResults = await Promise.allSettled(
      [...managers.values()].map((client) => client.close()),
    );
    const removeResult = await Promise.allSettled([
      rm(root, { recursive: true, force: true }),
    ]);
    const failedClose = closeResults.find(
      (result) => result.status === "rejected",
    );
    const failedRemove = removeResult.find(
      (result) => result.status === "rejected",
    );
    if (!primaryError && failedClose) throw failedClose.reason;
    if (!primaryError && failedRemove) throw failedRemove.reason;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = await readCorpus(args.corpus);
  await mkdir(dirname(args.output), { recursive: true });
  const stagingDir = await mkdtemp(
    join(dirname(args.output), ".persistence-candidate-"),
  );
  const stagedOutput = join(stagingDir, "candidate.jsonl");
  const identitySidecar = new JsonlSidecar(args.engine);
  let primaryError;
  try {
    const engineSha256 = createHash("sha256")
      .update(await readFile(args.engine))
      .digest("hex");
    const source = candidateSource(
      await identitySidecar.request("hello"),
      engineSha256,
    );
    const records = [];
    for (const corpusCase of corpus.cases) {
      records.push(
        await executeCase(
          args.engine,
          engineSha256,
          corpusCase,
          source,
          corpus.sha256,
        ),
      );
    }
    await writeFile(
      stagedOutput,
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    );
    await validateOutput(args.corpus, stagedOutput, "sidecar_candidate");
    await rename(stagedOutput, args.output);
    process.stdout.write(
      `sidecar persistence candidate output: ${args.output}\n`,
    );
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const cleanupResults = await Promise.allSettled([
      identitySidecar.close(),
      rm(stagingDir, { recursive: true, force: true }),
    ]);
    const failedCleanup = cleanupResults.find(
      (result) => result.status === "rejected",
    );
    if (!primaryError && failedCleanup) throw failedCleanup.reason;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
