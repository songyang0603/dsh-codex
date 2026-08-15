#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
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
const COMPONENT_PACKAGE = "@songyang0603/dsh-codex-apply-patch-engine";
const COMPONENT_VERSION = "0.1.0";
const RUNNER_PACKAGE = "dsh-codex-apply-patch-profile-smoke-runner";
const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const componentDirectory = resolve(
  repositoryRoot,
  "packages/apply-patch-engine",
);
const require = createRequire(import.meta.url);
const dshPackageJson = require.resolve("@deepseek-ai/dsh/package.json");
const dshBin = resolve(dirname(dshPackageJson), "lib/bin.js");

function run(command, arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, {
      cwd: options.cwd ?? repositoryRoot,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      rejectRun(
        new Error(
          `${command} timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    }, options.timeoutMs ?? 120_000);
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-1024 * 1024);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-1024 * 1024);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(
          new Error(
            `${command} ${arguments_.join(" ")} failed: code=${code} signal=${signal}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
          ),
        );
      } else {
        resolveRun({ stdout, stderr });
      }
    });
  });
}

function dsh(arguments_, environment, options) {
  return run(process.execPath, [dshBin, ...arguments_], {
    ...options,
    env: environment,
  });
}

async function main() {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "dsh-codex-apply-patch-profile-"),
  );
  const packedDirectory = join(temporaryRoot, "packed");
  const dshHome = join(temporaryRoot, "dsh-home");
  const runnerDirectory = join(temporaryRoot, "runner");
  const workspace = join(temporaryRoot, "workspace");
  const marker = join(temporaryRoot, "activated.json");
  const profileName = "apply-patch-engine-smoke";
  const environment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "DSH_CODEX_APPLY_PATCH_ENGINE",
      ),
    ),
    DSH_HOME: dshHome,
    DSH_CODEX_APPLY_PATCH_SMOKE_MARKER: marker,
    DSH_CODEX_APPLY_PATCH_SMOKE_WORKSPACE: workspace,
  };

  try {
    await mkdir(packedDirectory, { recursive: true });
    await mkdir(runnerDirectory, { recursive: true });
    await mkdir(workspace, { recursive: true });
    await writeFile(join(workspace, "target.txt"), "before\n", "utf8");

    const manifest = JSON.parse(
      await readFile(join(componentDirectory, "package.json"), "utf8"),
    );
    if (manifest.version !== COMPONENT_VERSION) {
      throw new Error(`unexpected component version ${manifest.version}`);
    }
    await run(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["pack", "--pack-destination", packedDirectory],
      { cwd: componentDirectory, env: environment },
    );
    const archives = (await readdir(packedDirectory)).filter((entry) =>
      entry.endsWith(".tgz"),
    );
    if (archives.length !== 1) {
      throw new Error(`expected one package archive, found ${archives.length}`);
    }
    const archive = join(packedDirectory, archives[0]);

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
      `import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const name = ${JSON.stringify(RUNNER_PACKAGE)};
export const inject = ["codexApplyPatch", "cmdlineArgs"];

export async function apply(ctx) {
  if (process.env.DSH_CODEX_APPLY_PATCH_ENGINE !== undefined) {
    throw new Error("profile inherited an engine override");
  }
  const workspace = process.env.DSH_CODEX_APPLY_PATCH_SMOKE_WORKSPACE;
  const marker = process.env.DSH_CODEX_APPLY_PATCH_SMOKE_MARKER;
  if (!workspace || !marker) throw new Error("missing smoke paths");
  const hello = await ctx.codexApplyPatch.hello();
  if (hello.codexCommit !== ${JSON.stringify(CODEX_COMMIT)}) {
    throw new Error("unexpected Codex commit " + hello.codexCommit);
  }
  if (hello.filesystem !== "LocalFileSystem::unsandboxed" || hello.sandbox !== "none") {
    throw new Error("engine obscured its unsandboxed boundary");
  }
  const patch = "*** Begin Patch\\n*** Update File: target.txt\\n@@\\n-before\\n+after\\n*** End Patch";
  const cwd = pathToFileURL(workspace + "/").href;
  const verified = await ctx.codexApplyPatch.verifyPatch({
    patch,
    cwd,
    mode: "preserve_line_endings",
  });
  if (verified.classification !== "body" || verified.action?.changes.length !== 1) {
    throw new Error("unexpected verify result " + JSON.stringify(verified));
  }
  const applied = await ctx.codexApplyPatch.applyPatch({
    patch,
    cwd,
    mode: "preserve_line_endings",
  });
  if (!applied.success || applied.delta.changes.length !== 1) {
    throw new Error("unexpected apply result " + JSON.stringify(applied));
  }
  const content = await readFile(workspace + "/target.txt", "utf8");
  if (content !== "after\\n") throw new Error("patch did not mutate target exactly");
  await writeFile(marker, JSON.stringify({ hello, verified, applied, content }), "utf8");
  const exit = ctx.get("appExit");
  if (typeof exit !== "function") throw new Error("missing DSH appExit");
  exit(0);
}
`,
      "utf8",
    );

    const version = await dsh(["--version"], environment);
    if (version.stdout.trim() !== DSH_VERSION) {
      throw new Error(`unexpected DSH version ${version.stdout.trim()}`);
    }
    await dsh(
      [
        "plugin",
        "--profile",
        profileName,
        "add",
        archive,
        runnerDirectory,
        "--prefer-offline",
        "--ignore-scripts",
      ],
      environment,
    );

    const profileDirectory = join(dshHome, "profiles", profileName);
    const profileManifestPath = join(profileDirectory, "package.json");
    const profileManifest = JSON.parse(
      await readFile(profileManifestPath, "utf8"),
    );
    if (profileManifest.dependencies?.[COMPONENT_PACKAGE] === undefined) {
      throw new Error("profile omitted component dependency");
    }
    if (!profileManifest.dsh?.profile?.bundles?.includes(COMPONENT_PACKAGE)) {
      throw new Error("profile omitted component bundle");
    }
    const profileRequire = createRequire(profileManifestPath);
    const installedManifestPath = profileRequire.resolve(
      `${COMPONENT_PACKAGE}/package.json`,
    );
    const installedDirectory = dirname(installedManifestPath);
    if (
      (await realpath(installedDirectory)) ===
      (await realpath(componentDirectory))
    ) {
      throw new Error("profile resolved source checkout instead of archive");
    }
    const nativeName =
      process.platform === "win32"
        ? "dsh-codex-apply-patch-engine.exe"
        : "dsh-codex-apply-patch-engine";
    const nativePath = join(
      installedDirectory,
      "native",
      `${process.platform}-${process.arch}`,
      nativeName,
    );
    const packageRealPath = await realpath(installedDirectory);
    const nativeRealPath = await realpath(nativePath);
    if (!nativeRealPath.startsWith(`${packageRealPath}${sep}`)) {
      throw new Error("native sidecar escaped installed package");
    }
    const checksumFields = (await readFile(`${nativePath}.sha256`, "utf8"))
      .trim()
      .split(/\s+/u);
    const checksum = createHash("sha256")
      .update(await readFile(nativePath))
      .digest("hex");
    if (
      checksumFields.length !== 2 ||
      checksumFields[0] !== checksum ||
      checksumFields[1] !== basename(nativePath)
    ) {
      throw new Error("installed native checksum mismatch");
    }

    await writeFile(
      join(profileDirectory, "cordis.patch.yml"),
      `- insert:
    - id: apply-patch-engine-smoke-runner
      name: ${RUNNER_PACKAGE}
      inject:
        - codexApplyPatch
        - cmdlineArgs
`,
      "utf8",
    );
    await dsh(["--profile", profileName], environment);
    const activated = JSON.parse(await readFile(marker, "utf8"));
    if (
      activated.hello?.codexCommit !== CODEX_COMMIT ||
      activated.content !== "after\n"
    ) {
      throw new Error("profile activation marker is invalid");
    }

    await dsh(
      ["plugin", "--profile", profileName, "remove", RUNNER_PACKAGE],
      environment,
    );
    await dsh(
      ["plugin", "--profile", profileName, "remove", COMPONENT_PACKAGE],
      environment,
    );
    const removedManifest = JSON.parse(
      await readFile(profileManifestPath, "utf8"),
    );
    if (
      removedManifest.dependencies?.[COMPONENT_PACKAGE] !== undefined ||
      removedManifest.dsh?.profile?.bundles?.includes(COMPONENT_PACKAGE)
    ) {
      throw new Error("component was not removed from clean profile");
    }
    process.stdout.write(
      `verified packed ${COMPONENT_PACKAGE}@${COMPONENT_VERSION} in DSH ${DSH_VERSION} (${process.platform}-${process.arch})\n`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
