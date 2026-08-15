#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const CODEX_COMMIT = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const DSH_VERSION = "0.1.0-rc.6";
const EXECPOLICY_PACKAGE = "@songyang0603/dsh-codex-execpolicy";
const EXECPOLICY_VERSION = "0.1.0";
const CORDIS_PACKAGE = "@deepseek-ai/cordis";
const CORDIS_VERSION = "4.0.1";
const SCHEMASTERY_PACKAGE = "@deepseek-ai/schemastery";
const SCHEMASTERY_VERSION = "3.18.1";
const RUNNER_PACKAGE = "dsh-codex-profile-smoke-runner";
const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const execpolicyDirectory = resolve(repositoryRoot, "packages/execpolicy");
const require = createRequire(import.meta.url);
const dshPackageJson = require.resolve("@deepseek-ai/dsh/package.json");
const dshBin = resolve(dirname(dshPackageJson), "lib/bin.js");
const expectedRustOs = { darwin: "macos", linux: "linux", win32: "windows" }[
  process.platform
];
const expectedRustArch = { arm64: "aarch64", x64: "x86_64" }[process.arch];

if (expectedRustOs === undefined || expectedRustArch === undefined) {
  throw new Error(
    `unsupported profile smoke host ${process.platform}/${process.arch}`,
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
  const temporaryRoot = await mkdtemp(join(tmpdir(), "dsh-codex-profile-"));
  const packedDirectory = join(temporaryRoot, "packed");
  const dshHome = join(temporaryRoot, "dsh-home");
  const codexHome = join(temporaryRoot, "codex-home");
  const runnerDirectory = join(temporaryRoot, "runner");
  const marker = join(temporaryRoot, "activated.json");
  const profileName = "execpolicy-smoke";
  const environment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "DSH_CODEX_EXECPOLICY_ENGINE",
      ),
    ),
    CODEX_HOME: codexHome,
    DSH_HOME: dshHome,
    DSH_CODEX_PROFILE_SMOKE_MARKER: marker,
  };

  try {
    await mkdir(packedDirectory, { recursive: true });
    await mkdir(runnerDirectory, { recursive: true });
    await mkdir(codexHome, { recursive: true });

    const sourceManifest = JSON.parse(
      await readFile(join(execpolicyDirectory, "package.json"), "utf8"),
    );
    if (sourceManifest.version !== EXECPOLICY_VERSION) {
      throw new Error(
        `expected ${EXECPOLICY_PACKAGE} ${EXECPOLICY_VERSION}, received ${JSON.stringify(sourceManifest.version)}`,
      );
    }
    await run(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["pack", "--pack-destination", packedDirectory],
      { cwd: execpolicyDirectory, env: environment },
    );
    const archives = (await readdir(packedDirectory)).filter((entry) =>
      entry.endsWith(".tgz"),
    );
    if (archives.length !== 1) {
      throw new Error(
        `expected one execpolicy package archive, found ${archives.length}`,
      );
    }
    const execpolicyArchive = join(packedDirectory, archives[0]);
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
export const inject = ["codexExecPolicy", "cmdlineArgs"];

export async function apply(ctx) {
  if (process.env.DSH_CODEX_EXECPOLICY_ENGINE !== undefined) {
    throw new Error("profile smoke inherited an engine override");
  }
  const hello = await ctx.codexExecPolicy.hello();
  if (hello.codexCommit !== ${JSON.stringify(CODEX_COMMIT)}) {
    throw new Error(\`unexpected Codex commit \${hello.codexCommit}\`);
  }
  const expectedOs = ${JSON.stringify(expectedRustOs)};
  const expectedArch = ${JSON.stringify(expectedRustArch)};
  if (hello.os !== expectedOs || hello.arch !== expectedArch) {
    throw new Error(\`native host mismatch \${hello.os}/\${hello.arch}\`);
  }
  const marker = process.env.DSH_CODEX_PROFILE_SMOKE_MARKER;
  if (!marker) throw new Error("missing smoke marker path");
  await writeFile(marker, JSON.stringify(hello), "utf8");
  const exit = ctx.get("appExit");
  if (typeof exit !== "function") throw new Error("missing DSH appExit");
  setImmediate(() => exit(0));
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
        `${CORDIS_PACKAGE}@${CORDIS_VERSION}`,
        execpolicyArchive,
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
    if (profileManifest.dependencies?.[EXECPOLICY_PACKAGE] === undefined) {
      throw new Error("dsh plugin add did not install the execpolicy package");
    }
    if (profileManifest.dependencies?.[CORDIS_PACKAGE] !== CORDIS_VERSION) {
      throw new Error("dsh plugin add did not install the exact Cordis peer");
    }
    if (!profileManifest.dsh?.profile?.bundles?.includes(EXECPOLICY_PACKAGE)) {
      throw new Error("dsh plugin add did not activate the execpolicy bundle");
    }

    const profileRequire = createRequire(profileManifestPath);
    const installedManifestPath = profileRequire.resolve(
      `${EXECPOLICY_PACKAGE}/package.json`,
    );
    const installedPackageDirectory = dirname(installedManifestPath);
    if (
      (await realpath(installedPackageDirectory)) ===
      (await realpath(execpolicyDirectory))
    ) {
      throw new Error(
        "profile resolved the source checkout instead of the archive",
      );
    }
    const installedManifest = JSON.parse(
      await readFile(installedManifestPath, "utf8"),
    );
    if (installedManifest.version !== EXECPOLICY_VERSION) {
      throw new Error(
        `installed execpolicy version mismatch: ${JSON.stringify(installedManifest.version)}`,
      );
    }
    const installedRequire = createRequire(installedManifestPath);
    for (const [packageName, expectedVersion] of [
      [CORDIS_PACKAGE, CORDIS_VERSION],
      [SCHEMASTERY_PACKAGE, SCHEMASTERY_VERSION],
    ]) {
      const dependencyManifest = JSON.parse(
        await readFile(
          installedRequire.resolve(`${packageName}/package.json`),
          "utf8",
        ),
      );
      if (dependencyManifest.version !== expectedVersion) {
        throw new Error(
          `installed ${packageName} version mismatch: ${JSON.stringify(dependencyManifest.version)}`,
        );
      }
    }
    const engineFilename =
      process.platform === "win32"
        ? "dsh-codex-execpolicy-engine.exe"
        : "dsh-codex-execpolicy-engine";
    const installedNativePath = join(
      installedPackageDirectory,
      "native",
      `${process.platform}-${process.arch}`,
      engineFilename,
    );
    const packageRealPath = await realpath(installedPackageDirectory);
    const nativeRealPath = await realpath(installedNativePath);
    if (!nativeRealPath.startsWith(`${packageRealPath}${sep}`)) {
      throw new Error("installed native sidecar escaped the package directory");
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
      throw new Error("installed native checksum file is malformed");
    }
    const nativeChecksum = createHash("sha256")
      .update(await readFile(installedNativePath))
      .digest("hex");
    if (nativeChecksum !== checksumFields[0]) {
      throw new Error("installed native sidecar checksum mismatch");
    }

    // Keep the boot surface intentionally minimal: the CLI installation path
    // was already exercised above, while activation below mounts exactly the
    // component under test plus a one-shot observer.
    profileManifest.dsh.profile.bundles = [EXECPOLICY_PACKAGE];
    await writeFile(
      profileManifestPath,
      `${JSON.stringify(profileManifest, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(profileDirectory, "cordis.patch.yml"),
      `- insert:
    - id: execpolicy-smoke-runner
      name: ${RUNNER_PACKAGE}
      inject:
        - codexExecPolicy
        - cmdlineArgs
`,
      "utf8",
    );

    const dump = await dsh(
      ["--profile", profileName, "--dump-config"],
      environment,
    );
    if (
      !dump.stdout.includes(EXECPOLICY_PACKAGE) ||
      !dump.stdout.includes(RUNNER_PACKAGE)
    ) {
      throw new Error("dsh config dump omitted the installed bundle or runner");
    }

    await dsh(["--profile", profileName], environment, { timeoutMs: 60_000 });
    const activated = JSON.parse(await readFile(marker, "utf8"));
    if (
      activated.codexCommit !== CODEX_COMMIT ||
      activated.os !== expectedRustOs ||
      activated.arch !== expectedRustArch
    ) {
      throw new Error(
        "profile activation marker has the wrong native identity",
      );
    }
    process.stdout.write(
      `dsh ${DSH_VERSION} archive profile activation: ${process.platform}-${process.arch} ok\n`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
