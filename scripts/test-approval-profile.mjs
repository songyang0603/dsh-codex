#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DSH_VERSION = "0.1.0-rc.6";
const CODEX_COMMIT = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const APPROVAL_PACKAGE = "@songyang0603/dsh-codex-approval";
const APPROVAL_VERSION = "0.1.0";
const RUNNER_PACKAGE = "dsh-codex-approval-profile-smoke-runner";
const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const approvalDirectory = resolve(repositoryRoot, "packages/approval");
const require = createRequire(import.meta.url);
const dshPackageJson = require.resolve("@deepseek-ai/dsh/package.json");
const dshBin = resolve(dirname(dshPackageJson), "lib/bin.js");
const expectedRustOs = { darwin: "macos", linux: "linux", win32: "windows" }[
  process.platform
];
const expectedRustArch = { arm64: "aarch64", x64: "x86_64" }[process.arch];

if (expectedRustOs === undefined || expectedRustArch === undefined) {
  throw new Error(
    `unsupported approval profile smoke host ${process.platform}/${process.arch}`,
  );
}

function run(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const retain = (current, chunk) =>
      (current + chunk.toString()).slice(-1024 * 1024);
    child.stdout.on("data", (chunk) => {
      stdout = retain(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = retain(stderr, chunk);
    });
    const timeout = setTimeout(() => {
      child.kill();
      rejectRun(
        new Error(
          `${command} ${args.join(" ")} timed out after ${timeoutMs}ms\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(
          new Error(
            `${command} ${args.join(" ")} failed: code=${code} signal=${signal}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
          ),
        );
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

function dsh(args, environment, options = {}) {
  return run(process.execPath, [dshBin, ...args], {
    ...options,
    env: environment,
  });
}

async function main() {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "dsh-codex-approval-profile-"),
  );
  const packedDirectory = join(temporaryRoot, "packed");
  const dshHome = join(temporaryRoot, "dsh-home");
  const runnerDirectory = join(temporaryRoot, "runner");
  const marker = join(temporaryRoot, "activated.json");
  const profileName = "approval-smoke";
  const environment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "DSH_CODEX_APPROVAL_PROTOCOL_ENGINE",
      ),
    ),
    DSH_HOME: dshHome,
    DSH_CODEX_APPROVAL_SMOKE_MARKER: marker,
  };

  try {
    await mkdir(packedDirectory, { recursive: true });
    await mkdir(runnerDirectory, { recursive: true });

    const sourceManifest = JSON.parse(
      await readFile(join(approvalDirectory, "package.json"), "utf8"),
    );
    if (sourceManifest.version !== APPROVAL_VERSION) {
      throw new Error(
        `expected ${APPROVAL_PACKAGE} ${APPROVAL_VERSION}, received ${JSON.stringify(sourceManifest.version)}`,
      );
    }

    await run(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["pack", "--pack-destination", packedDirectory],
      { cwd: approvalDirectory, env: environment },
    );
    const archives = (await readdir(packedDirectory)).filter((entry) =>
      entry.endsWith(".tgz"),
    );
    if (archives.length !== 1) {
      throw new Error(
        `expected one approval package archive, found ${archives.length}`,
      );
    }
    const approvalArchive = join(packedDirectory, archives[0]);

    await writeFile(
      join(runnerDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: RUNNER_PACKAGE,
          version: "0.0.0",
          private: true,
          type: "module",
          main: "./index.js",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      join(runnerDirectory, "index.js"),
      `import { writeFile } from "node:fs/promises";

export const name = ${JSON.stringify(RUNNER_PACKAGE)};
export const inject = ["codexApproval", "cmdlineArgs"];

export async function apply(ctx) {
  if (process.env.DSH_CODEX_APPROVAL_PROTOCOL_ENGINE !== undefined) {
    throw new Error("profile smoke inherited an approval engine override");
  }
  const hello = await ctx.codexApproval.protocolHello();
  if (hello.codexCommit !== ${JSON.stringify(CODEX_COMMIT)}) {
    throw new Error("unexpected Codex commit " + hello.codexCommit);
  }
  if (hello.os !== ${JSON.stringify(expectedRustOs)} || hello.arch !== ${JSON.stringify(expectedRustArch)}) {
    throw new Error("native host mismatch " + hello.os + "/" + hello.arch);
  }
  let exactInteger = false;
  const promptQueue = [];
  const promptWaiters = [];
  ctx.on("codex-approval/request", async (prompt) => {
    exactInteger =
      typeof prompt.params.startedAtMs === "bigint" &&
      prompt.params.startedAtMs === 9223372036854775807n;
    if (!exactInteger) throw new Error("lossless i64::MAX was not preserved");
    const waiter = promptWaiters.shift();
    if (waiter) waiter(prompt);
    else promptQueue.push(prompt);
    return "claimed";
  });
  const nextPrompt = () => {
    const prompt = promptQueue.shift();
    if (prompt) return Promise.resolve(prompt);
    return new Promise((resolve) => promptWaiters.push(resolve));
  };
  const first = ctx.codexApproval.requestJson({
    rawJson: '{"threadId":"profile-thread","turnId":"profile-turn","itemId":"profile-item","startedAtMs":9223372036854775807,"command":"git status"}',
  });
  const firstPrompt = await nextPrompt();
  const second = ctx.codexApproval.requestJson({
    rawJson: '{"threadId":"profile-thread","turnId":"replacement-turn","itemId":"profile-item","startedAtMs":9223372036854775807,"command":"git status"}',
  });
  const secondPrompt = await nextPrompt();
  const firstResolution = await first;
  if (firstResolution.kind !== "cancelled" || firstResolution.source !== "superseded") {
    throw new Error("first request was not superseded " + JSON.stringify(firstResolution));
  }
  if (firstPrompt.requestId === secondPrompt.requestId) {
    throw new Error("replacement prompt reused a correlation id");
  }
  const lateFirstResponse = ctx.codexApproval.respond(firstPrompt.requestId, "accept");
  if (lateFirstResponse.kind !== "ignored") {
    throw new Error("stale response was not ignored " + JSON.stringify(lateFirstResponse));
  }
  const currentResponse = ctx.codexApproval.respond(secondPrompt.requestId, "accept");
  if (currentResponse.kind !== "accepted") {
    throw new Error("current response was not accepted " + JSON.stringify(currentResponse));
  }
  const resolution = await second;
  if (resolution.kind !== "approved_once" || resolution.decision !== "accept") {
    throw new Error("unexpected replacement resolution " + JSON.stringify(resolution));
  }
  const marker = process.env.DSH_CODEX_APPROVAL_SMOKE_MARKER;
  if (!marker) throw new Error("missing smoke marker path");
  await writeFile(marker, JSON.stringify({
    hello,
    firstResolution,
    lateFirstResponse,
    currentResponse,
    resolution,
    exactInteger,
  }), "utf8");
  const exit = ctx.get("appExit");
  if (typeof exit !== "function") throw new Error("missing DSH appExit");
  // Request shutdown before returning from this one-shot runner. The launcher
  // defers disposal through its shutdown controller, so this does not tear the
  // Loader tree down inside apply(), and it cannot be stranded behind a later
  // event-loop callback while the profile is settling.
  exit(0);
}
`,
      "utf8",
    );

    const version = await dsh(["--version"], environment);
    if (version.stdout.trim() !== DSH_VERSION) {
      throw new Error(
        `expected dsh ${DSH_VERSION}, received ${JSON.stringify(version.stdout.trim())}`,
      );
    }

    await dsh(
      [
        "plugin",
        "--profile",
        profileName,
        "add",
        approvalArchive,
        runnerDirectory,
        "--prefer-offline",
        "--ignore-scripts",
      ],
      environment,
      { timeoutMs: 120_000 },
    );

    const profileDirectory = join(dshHome, "profiles", profileName);
    const profileManifestPath = join(profileDirectory, "package.json");
    const profileManifest = JSON.parse(
      await readFile(profileManifestPath, "utf8"),
    );
    if (profileManifest.dependencies?.[APPROVAL_PACKAGE] === undefined) {
      throw new Error("dsh plugin add did not install the approval package");
    }
    if (!profileManifest.dsh?.profile?.bundles?.includes(APPROVAL_PACKAGE)) {
      throw new Error("dsh plugin add did not activate the approval bundle");
    }

    const profileRequire = createRequire(profileManifestPath);
    const installedManifestPath = profileRequire.resolve(
      `${APPROVAL_PACKAGE}/package.json`,
    );
    const installedPackageDirectory = dirname(installedManifestPath);
    if (
      (await realpath(installedPackageDirectory)) ===
      (await realpath(approvalDirectory))
    ) {
      throw new Error(
        "profile resolved the source checkout instead of archive",
      );
    }
    const installedManifest = JSON.parse(
      await readFile(installedManifestPath, "utf8"),
    );
    if (installedManifest.version !== APPROVAL_VERSION) {
      throw new Error(
        `installed approval version mismatch: ${JSON.stringify(installedManifest.version)}`,
      );
    }

    const engineFilename =
      process.platform === "win32"
        ? "dsh-codex-approval-protocol-engine.exe"
        : "dsh-codex-approval-protocol-engine";
    const installedNativePath = join(
      installedPackageDirectory,
      "native",
      `${process.platform}-${process.arch}`,
      engineFilename,
    );
    const packageRealPath = await realpath(installedPackageDirectory);
    const nativeRealPath = await realpath(installedNativePath);
    if (!nativeRealPath.startsWith(`${packageRealPath}${sep}`)) {
      throw new Error(
        "installed approval native sidecar escaped the package directory",
      );
    }
    const checksumFields = (
      await readFile(`${installedNativePath}.sha256`, "utf8")
    )
      .trim()
      .split(/\s+/u);
    if (
      checksumFields.length !== 2 ||
      !/^[0-9a-f]{64}$/u.test(checksumFields[0]) ||
      checksumFields[1] !== basename(installedNativePath)
    ) {
      throw new Error("installed approval native checksum file is malformed");
    }
    const nativeChecksum = createHash("sha256")
      .update(await readFile(installedNativePath))
      .digest("hex");
    if (nativeChecksum !== checksumFields[0]) {
      throw new Error("installed approval native sidecar checksum mismatch");
    }

    await writeFile(
      join(profileDirectory, "cordis.patch.yml"),
      `- insert:
    - id: approval-smoke-runner
      name: ${RUNNER_PACKAGE}
      inject:
        - codexApproval
        - cmdlineArgs
`,
      "utf8",
    );

    const dump = await dsh(
      ["--profile", profileName, "--dump-config"],
      environment,
    );
    if (
      !dump.stdout.includes(APPROVAL_PACKAGE) ||
      !dump.stdout.includes(RUNNER_PACKAGE)
    ) {
      throw new Error("dsh config dump omitted the installed bundle or runner");
    }

    await dsh(["--profile", profileName], environment);
    const activated = JSON.parse(await readFile(marker, "utf8"));
    if (
      activated.hello?.codexCommit !== CODEX_COMMIT ||
      activated.hello?.os !== expectedRustOs ||
      activated.hello?.arch !== expectedRustArch ||
      activated.exactInteger !== true ||
      activated.firstResolution?.kind !== "cancelled" ||
      activated.firstResolution?.source !== "superseded" ||
      activated.lateFirstResponse?.kind !== "ignored" ||
      activated.currentResponse?.kind !== "accepted" ||
      activated.resolution?.kind !== "approved_once" ||
      activated.resolution?.decision !== "accept"
    ) {
      throw new Error("profile activation marker has the wrong resolution");
    }

    await dsh(
      ["plugin", "--profile", profileName, "remove", APPROVAL_PACKAGE],
      environment,
      { timeoutMs: 120_000 },
    );
    const removedManifest = JSON.parse(
      await readFile(profileManifestPath, "utf8"),
    );
    if (
      removedManifest.dependencies?.[APPROVAL_PACKAGE] !== undefined ||
      removedManifest.dsh?.profile?.bundles?.includes(APPROVAL_PACKAGE)
    ) {
      throw new Error("dsh plugin remove retained approval package state");
    }

    process.stdout.write(
      `dsh ${DSH_VERSION} approval archive add/activate/remove: ${process.platform}-${process.arch} ok\n`,
    );
  } finally {
    if (process.env.DSH_CODEX_APPROVAL_KEEP_TEMP === "1") {
      process.stderr.write(
        `retained approval profile smoke directory: ${temporaryRoot}\n`,
      );
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
