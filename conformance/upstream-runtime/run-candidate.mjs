#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPECTED = Object.freeze({
  protocolVersion: 3,
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  shellCommandTree: "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106",
  cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
  execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
  utilsCliTree: "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee",
  utilsHomeDirTree: "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
});

function usage() {
  process.stderr.write(
    "Usage: node run-candidate.mjs --engine FILE --corpus FILE --output FILE\n",
  );
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      usage();
      process.exit(0);
    }
    if (!["--engine", "--corpus", "--output"].includes(argument)) {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}`);
    result[argument.slice(2)] = resolve(value);
    index += 1;
  }
  for (const required of ["engine", "corpus", "output"]) {
    if (!result[required]) throw new Error(`--${required} is required`);
  }
  if (result.corpus === result.output) {
    throw new Error("output must not overwrite the corpus");
  }
  return result;
}

function parseJsonl(text, source) {
  const ids = new Set();
  const cases = [];
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    if (!raw.trim()) continue;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: ${error.message}`);
    }
    if (
      value.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      !value.id
    ) {
      throw new Error(`${source}:${index + 1}: invalid schemaVersion or id`);
    }
    if (ids.has(value.id)) throw new Error(`duplicate corpus id: ${value.id}`);
    if (
      !value.policy ||
      typeof value.policy.source !== "string" ||
      !value.request
    ) {
      throw new Error(`${source}:${index + 1}: missing policy or request`);
    }
    ids.add(value.id);
    cases.push(value);
  }
  if (cases.length === 0) throw new Error("corpus contains no cases");
  return cases;
}

class JsonlSidecar {
  #child;
  #nextId = 1;
  #pending = new Map();
  #stdoutBuffer = "";
  #stderr = "";
  #closed = false;

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
            `sidecar exited with code=${code} signal=${signal}; stderr=${this.#stderr}`,
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
      } else if (response.error) {
        pending.reject(
          new Error(`${response.error.code}: ${response.error.message}`),
        );
      } else {
        pending.resolve(response.result);
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
      }, 15_000);
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

  async shutdown() {
    if (this.#closed) return;
    await this.request("shutdown", {});
    await new Promise((resolveExit, rejectExit) => {
      if (this.#closed) {
        resolveExit();
        return;
      }
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
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (hello[key] !== expected) {
      throw new Error(
        `engine hello ${key} mismatch: expected ${expected}, got ${hello[key]}`,
      );
    }
  }
}

function hostProgramPath(os, name) {
  return os === "windows" ? `C:\\usr\\bin\\${name}.exe` : `/usr/bin/${name}`;
}

function alternateGitPath(os) {
  return os === "windows"
    ? "C:\\opt\\homebrew\\bin\\git.exe"
    : "/opt/homebrew/bin/git";
}

function starlarkString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function expandPlatformPlaceholders(value, os) {
  const git = hostProgramPath(os, "git");
  const cargo = hostProgramPath(os, "cargo");
  return value
    .replaceAll("$HOST_GIT_STARLARK", starlarkString(git))
    .replaceAll("$HOST_CARGO_STARLARK", starlarkString(cargo))
    .replaceAll("$HOST_ALT_GIT", alternateGitPath(os))
    .replaceAll("$HOST_GIT", git)
    .replaceAll("$HOST_CARGO", cargo);
}

function expandCase(corpusCase, os) {
  return {
    policy: {
      identifier: corpusCase.policy.identifier,
      source: expandPlatformPlaceholders(corpusCase.policy.source, os),
    },
    request: {
      ...corpusCase.request,
      command: corpusCase.request.command.map((token) =>
        expandPlatformPlaceholders(token, os),
      ),
      ...(corpusCase.request.prefixRule === undefined
        ? {}
        : {
            prefixRule: corpusCase.request.prefixRule.map((token) =>
              expandPlatformPlaceholders(token, os),
            ),
          }),
    },
  };
}

function verifyRequiredWindowsPowerShell(command, os) {
  if (os !== "windows") return Promise.resolve();
  const executable = command[0];
  if (
    typeof executable !== "string" ||
    !/(^|[\\/])powershell\.exe$/iu.test(executable)
  ) {
    return Promise.reject(
      new Error(
        `requiresWindowsPowerShell case must invoke powershell.exe, got ${JSON.stringify(executable)}`,
      ),
    );
  }
  return new Promise((resolveCheck, rejectCheck) => {
    const child = spawn(
      executable,
      [
        "-NoLogo",
        "-NoProfile",
        "-Command",
        "Write-Output dsh-codex-candidate-ready",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      rejectCheck(
        new Error(`required Windows PowerShell timed out: ${executable}`),
      );
    }, 10_000);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectCheck(
        new Error(
          `required Windows PowerShell could not start (${executable}): ${error.message}`,
        ),
      );
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        rejectCheck(
          new Error(
            `required Windows PowerShell failed (${executable}): code=${code} signal=${signal}`,
          ),
        );
      } else {
        resolveCheck();
      }
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = parseJsonl(await readFile(args.corpus, "utf8"), args.corpus);
  const sidecar = new JsonlSidecar(args.engine);
  const output = [];
  try {
    const hello = await sidecar.request("hello", {});
    verifyHello(hello);
    for (const corpusCase of cases) {
      const expanded = expandCase(corpusCase, hello.os);
      if (corpusCase.requiresWindowsPowerShell === true) {
        await verifyRequiredWindowsPowerShell(
          expanded.request.command,
          hello.os,
        );
      }
      await sidecar.request("load", {
        sources: [
          {
            identifier: expanded.policy.identifier,
            content: expanded.policy.source,
          },
        ],
      });
      const result = await sidecar.request(
        "check_exec_approval_requirement",
        expanded.request,
      );
      output.push(
        JSON.stringify({
          schemaVersion: 1,
          id: corpusCase.id,
          engine: hello,
          result,
        }),
      );
    }
    await sidecar.shutdown();
  } catch (error) {
    sidecar.kill();
    throw error;
  }
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, `${output.join("\n")}\n`, "utf8");
  process.stdout.write(`candidate runtime output: ${args.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
