#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const executableName =
  process.platform === "win32"
    ? "dsh-codex-apply-patch-engine.exe"
    : "dsh-codex-apply-patch-engine";
const executable = resolve(
  packageRoot,
  "native",
  `${process.platform}-${process.arch}`,
  executableName,
);

const info = await stat(executable).catch(() => undefined);
if (info === undefined || !info.isFile()) {
  throw new Error(
    `packaged apply-patch engine is missing for ${process.platform}-${process.arch}: ${executable}`,
  );
}
if (process.platform !== "win32" && (info.mode & 0o111) === 0) {
  throw new Error(
    `packaged apply-patch engine is not executable: ${executable}`,
  );
}

const checksumFile = `${executable}.sha256`;
const checksumText = await readFile(checksumFile, "utf8");
const expectedPattern = new RegExp(
  `^([a-f0-9]{64})  ${executableName.replaceAll(".", "\\.")}\\n$`,
  "u",
);
const match = expectedPattern.exec(checksumText);
if (match === null) {
  throw new Error(`malformed native checksum file: ${checksumFile}`);
}
const binary = await readFile(executable);
const actual = createHash("sha256").update(binary).digest("hex");
if (actual !== match[1]) {
  throw new Error(
    `native checksum mismatch for ${basename(executable)}: expected ${match[1]}, got ${actual}`,
  );
}

const { ApplyPatchClient } = await import("../lib/client.js");
const client = new ApplyPatchClient({ enginePath: executable });
try {
  await client.hello();
} finally {
  await client.shutdown();
}
process.stdout.write(
  `Verified ${process.platform}-${process.arch} apply-patch native identity and sha256 ${actual}.\n`,
);
