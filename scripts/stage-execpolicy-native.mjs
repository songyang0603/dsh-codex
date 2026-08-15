#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const upstreams = JSON.parse(
  await readFile(resolve(repositoryRoot, "upstreams.lock.json"), "utf8"),
);
const codex = upstreams.upstreams.codex;

function executableName(platform = process.platform) {
  return platform === "win32"
    ? "dsh-codex-execpolicy-engine.exe"
    : "dsh-codex-execpolicy-engine";
}

function rustOs(platform) {
  const value = { darwin: "macos", linux: "linux", win32: "windows" }[platform];
  if (value === undefined)
    throw new Error(`unsupported Node platform: ${platform}`);
  return value;
}

function rustArch(arch) {
  const value = { arm64: "aarch64", x64: "x86_64" }[arch];
  if (value === undefined)
    throw new Error(`unsupported Node architecture: ${arch}`);
  return value;
}

function usage() {
  return [
    "Usage: node scripts/stage-execpolicy-native.mjs [options]",
    "",
    "Options:",
    "  --binary FILE    Built sidecar (default: target/release/<engine>)",
    "  --platform NAME  Node platform name (default: current platform)",
    "  --arch NAME      Node architecture name (default: current architecture)",
    "  --help           Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    platform: process.platform,
    arch: process.arch,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (!["--binary", "--platform", "--arch"].includes(argument)) {
      throw new Error(`unknown argument ${argument}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}\n${usage()}`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  if (!new Set(["darwin", "linux", "win32"]).has(options.platform)) {
    throw new Error(`unsupported Node platform: ${options.platform}`);
  }
  if (!new Set(["arm64", "x64"]).has(options.arch)) {
    throw new Error(`unsupported Node architecture: ${options.arch}`);
  }
  options.binary = resolve(
    repositoryRoot,
    options.binary ?? `target/release/${executableName(options.platform)}`,
  );
  return options;
}

function expectedHello() {
  const components = codex.components;
  return {
    protocolVersion: 3,
    codexCommit: codex.commit,
    execpolicyTree: components.execpolicy.gitObject,
    shellCommandTree: components.shellCommand.gitObject,
    configTree: components.config.gitObject,
    execServerTree: components.execServer.gitObject,
    utilsCliTree: components.utilsCli.gitObject,
    utilsHomeDirTree: components.utilsHomeDir.gitObject,
    cargoLockBlob: components.cargoLock.gitObject,
    coreExecPolicyBlob: components.coreExecPolicyFile.gitObject,
    coreExecPolicyDirTree: components.coreExecPolicyDirectory.gitObject,
  };
}

async function verifyHello(binary, platform, arch) {
  const child = spawn(binary, [], {
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  const exit = new Promise((resolveExit) => {
    child.once("error", (error) => resolveExit({ error }));
    child.once("exit", (code, signal) => {
      resolveExit({ code, signal });
    });
  });
  const response = new Promise((resolveResponse, rejectResponse) => {
    const timeout = setTimeout(() => {
      child.kill();
      rejectResponse(new Error("native sidecar hello timed out"));
    }, 10_000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectResponse(error);
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try {
        resolveResponse(JSON.parse(stdout.slice(0, newline)));
      } catch (error) {
        rejectResponse(error);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-16_384);
    });
    child.once("exit", (code, signal) => {
      if (stdout.includes("\n")) return;
      clearTimeout(timeout);
      rejectResponse(
        new Error(
          `native sidecar exited before hello: code=${code} signal=${signal}; ${stderr}`,
        ),
      );
    });
  });

  child.stdin.write(
    `${JSON.stringify({ protocolVersion: 3, id: 1, method: "hello", params: {} })}\n`,
  );
  const message = await response;
  if (message.id !== 1 || message.error !== undefined || !message.result) {
    child.kill();
    throw new Error("native sidecar returned a malformed hello response");
  }
  for (const [field, expected] of Object.entries(expectedHello())) {
    if (message.result[field] !== expected) {
      child.kill();
      throw new Error(
        `native sidecar provenance mismatch at ${field}: expected ${expected}, got ${String(message.result[field])}`,
      );
    }
  }
  if (message.result.os !== rustOs(platform)) {
    child.kill();
    throw new Error(
      `native sidecar target mismatch at os: expected ${rustOs(platform)}, got ${String(message.result.os)}`,
    );
  }
  if (message.result.arch !== rustArch(arch)) {
    child.kill();
    throw new Error(
      `native sidecar target mismatch at arch: expected ${rustArch(arch)}, got ${String(message.result.arch)}`,
    );
  }
  child.stdin.write(
    `${JSON.stringify({ protocolVersion: 3, id: 2, method: "shutdown", params: {} })}\n`,
  );
  let shutdownTimeout;
  try {
    const outcome = await Promise.race([
      exit,
      new Promise((_, rejectExit) => {
        shutdownTimeout = setTimeout(() => {
          child.kill();
          rejectExit(new Error("native sidecar did not exit after shutdown"));
        }, 5_000);
      }),
    ]);
    if (outcome.error) throw outcome.error;
    if (outcome.code !== 0) {
      throw new Error(
        `native sidecar shutdown failed: code=${outcome.code} signal=${outcome.signal}`,
      );
    }
  } finally {
    clearTimeout(shutdownTimeout);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await verifyHello(options.binary, options.platform, options.arch);
  const destination = resolve(
    repositoryRoot,
    "packages/execpolicy/native",
    `${options.platform}-${options.arch}`,
    executableName(options.platform),
  );
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(options.binary, destination);
  if (options.platform !== "win32") await chmod(destination, 0o755);
  const bytes = await readFile(destination);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(
    `${destination}.sha256`,
    `${sha256}  ${basename(destination)}\n`,
    "utf8",
  );
  process.stdout.write(
    `staged ${options.platform}-${options.arch} execpolicy engine\n${destination}\nsha256 ${sha256}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
