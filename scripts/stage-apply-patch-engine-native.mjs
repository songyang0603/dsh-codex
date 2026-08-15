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
    ? "dsh-codex-apply-patch-engine.exe"
    : "dsh-codex-apply-patch-engine";
}

function rustOs(platform) {
  const os = { darwin: "macos", linux: "linux", win32: "windows" }[platform];
  if (os === undefined) throw new Error(`unsupported platform ${platform}`);
  return os;
}

function rustArch(arch) {
  const value = { arm64: "aarch64", x64: "x86_64" }[arch];
  if (value === undefined) throw new Error(`unsupported architecture ${arch}`);
  return value;
}

function parseArgs(argv) {
  const options = { platform: process.platform, arch: process.arch };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!new Set(["--binary", "--platform", "--arch"]).has(key)) {
      throw new Error(`unknown argument ${key}`);
    }
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`missing value for ${key}`);
    options[key.slice(2)] = value;
    index += 1;
  }
  options.binary =
    options.binary === undefined
      ? resolve(
          process.env.CARGO_TARGET_DIR ?? resolve(repositoryRoot, "target"),
          "release",
          executableName(options.platform),
        )
      : resolve(repositoryRoot, options.binary);
  return options;
}

function request(binary, message) {
  return new Promise((resolveResponse, rejectResponse) => {
    const child = spawn(binary, [], {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(() => rejectResponse(new Error("native hello timed out")));
    }, 10_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-16_384);
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      let response;
      try {
        response = JSON.parse(stdout.slice(0, newline));
      } catch (error) {
        child.kill();
        finish(() => rejectResponse(error));
        return;
      }
      child.stdin.write(
        `${JSON.stringify({ protocolVersion: 1, id: 2, method: "shutdown", params: {} })}\n`,
      );
      child.stdin.end();
      child.once("close", (code, signal) => {
        finish(() => {
          if (code !== 0) {
            rejectResponse(
              new Error(
                `native shutdown failed: code=${code} signal=${signal}; ${stderr}`,
              ),
            );
          } else {
            resolveResponse(response);
          }
        });
      });
    });
    child.once("error", (error) => finish(() => rejectResponse(error)));
    child.once("close", (code, signal) => {
      if (stdout.includes("\n")) return;
      finish(() =>
        rejectResponse(
          new Error(
            `native exited before hello: code=${code} signal=${signal}; ${stderr}`,
          ),
        ),
      );
    });
    child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

async function verifyHello(binary, platform, arch) {
  const response = await request(binary, {
    protocolVersion: 1,
    id: 1,
    method: "hello",
    params: {},
  });
  if (response.id !== 1 || response.error !== undefined || !response.result) {
    throw new Error("native sidecar returned malformed hello response");
  }
  const expected = {
    protocolVersion: 1,
    engineVersion: "0.1.0",
    codexRepository: codex.repository,
    codexCommit: codex.commit,
    codexApplyPatchPackage: "codex-apply-patch",
    codexApplyPatchVersion: "0.0.0",
    codexApplyPatchTree: codex.components.applyPatch.gitObject,
    codexApplyPatchLibBlob: codex.components.applyPatchLib.gitObject,
    codexApplyPatchParserBlob: codex.components.applyPatchParser.gitObject,
    codexApplyPatchStreamingParserBlob:
      codex.components.applyPatchStreamingParser.gitObject,
    codexApplyPatchInvocationBlob:
      codex.components.applyPatchInvocation.gitObject,
    codexApplyPatchFileUpdateBlob:
      codex.components.applyPatchFileUpdate.gitObject,
    codexApplyPatchTextFileBlob: codex.components.applyPatchTextFile.gitObject,
    codexApplyPatchSeekSequenceBlob:
      codex.components.applyPatchSeekSequence.gitObject,
    codexCargoLockBlob: codex.components.cargoLock.gitObject,
    os: rustOs(platform),
    arch: rustArch(arch),
    pointerWidth: 64,
    filesystem: "LocalFileSystem::unsandboxed",
    sandbox: "none",
    methods: [
      "hello",
      "parse",
      "stream_parse",
      "verify_patch",
      "verify_invocation",
      "apply_patch",
      "shutdown",
    ],
    modes: ["normalize_to_lf", "preserve_line_endings"],
  };
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(response.result[key]) !== JSON.stringify(value)) {
      throw new Error(
        `native provenance mismatch at ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(response.result[key])}`,
      );
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await verifyHello(options.binary, options.platform, options.arch);
  const destination = resolve(
    repositoryRoot,
    "packages/apply-patch-engine/native",
    `${options.platform}-${options.arch}`,
    executableName(options.platform),
  );
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(options.binary, destination);
  if (options.platform !== "win32") await chmod(destination, 0o755);
  const sha256 = createHash("sha256")
    .update(await readFile(destination))
    .digest("hex");
  await writeFile(
    `${destination}.sha256`,
    `${sha256}  ${basename(destination)}\n`,
    "utf8",
  );
  process.stdout.write(
    `staged ${options.platform}-${options.arch} apply-patch engine\n${destination}\nsha256 ${sha256}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
