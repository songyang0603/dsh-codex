#!/usr/bin/env node

import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function usage() {
  process.stderr.write(
    "Usage: node run-candidate.mjs --engine FILE --package-dir DIR --output FILE [--corpus FILE]\n",
  );
}

function parseArgs(argv) {
  const options = { corpus: new URL("./corpus.jsonl", import.meta.url) };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "-h" || flag === "--help") {
      usage();
      process.exit(0);
    }
    if (!["--engine", "--package-dir", "--output", "--corpus"].includes(flag)) {
      throw new Error(`unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`missing value for ${flag}`);
    index += 1;
    if (flag === "--engine") options.engine = resolve(value);
    if (flag === "--package-dir") options.packageDir = resolve(value);
    if (flag === "--output") options.output = resolve(value);
    if (flag === "--corpus") options.corpus = resolve(value);
  }
  if (!options.engine || !options.packageDir || !options.output) {
    usage();
    throw new Error("--engine, --package-dir, and --output are required");
  }
  return options;
}

function parseJsonl(text, label) {
  if (text.length === 0) throw new Error(`${label} is empty`);
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const seen = new Set();
  return lines.map((line, index) => {
    if (line.trim().length === 0) {
      throw new Error(`${label}:${index + 1}: blank lines are forbidden`);
    }
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`${label}:${index + 1}: invalid JSON`, { cause: error });
    }
    if (
      value === null ||
      Array.isArray(value) ||
      typeof value !== "object" ||
      value.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      typeof value.operation !== "string"
    ) {
      throw new Error(`${label}:${index + 1}: invalid corpus record`);
    }
    if (seen.has(value.id))
      throw new Error(`${label}: duplicate id ${value.id}`);
    seen.add(value.id);
    return value;
  });
}

function materialize(value, root) {
  return value.replaceAll("$ROOT", root);
}

async function materializeFixture(root, fixture, caseId) {
  if (
    fixture === null ||
    Array.isArray(fixture) ||
    typeof fixture !== "object" ||
    typeof fixture.path !== "string" ||
    typeof fixture.kind !== "string"
  ) {
    throw new Error(`${caseId}: malformed fixture`);
  }
  const path = join(root, fixture.path);
  if (fixture.kind === "directory") {
    await mkdir(path, { recursive: true });
  } else if (fixture.kind === "file") {
    await mkdir(dirname(path), { recursive: true });
    const bytesHex = fixture.bytesHex ?? "";
    if (
      typeof bytesHex !== "string" ||
      !/^(?:[0-9a-fA-F]{2})*$/.test(bytesHex)
    ) {
      throw new Error(
        `${caseId}: fixture bytesHex must contain complete hex bytes`,
      );
    }
    await writeFile(path, Buffer.from(bytesHex, "hex"));
  } else if (fixture.kind === "symlink") {
    if (process.platform === "win32") {
      throw new Error(
        `${caseId}: Unix symlink fixture is unavailable on Windows`,
      );
    }
    if (typeof fixture.target !== "string") {
      throw new Error(`${caseId}: symlink target must be a string`);
    }
    await mkdir(dirname(path), { recursive: true });
    await symlink(materialize(fixture.target, root), path);
  } else {
    throw new Error(`${caseId}: unsupported fixture kind ${fixture.kind}`);
  }
  if (fixture.kind !== "symlink" && fixture.mode !== undefined) {
    if (typeof fixture.mode !== "string" || !/^[0-7]{4}$/.test(fixture.mode)) {
      throw new Error(`${caseId}: fixture mode must be four octal digits`);
    }
    await chmod(path, Number.parseInt(fixture.mode, 8));
  }
}

async function setupCase(record) {
  const root = await mkdtemp(
    join(tmpdir(), "dsh-codex-apply-patch-candidate-case."),
  );
  await Promise.all(
    ["work", "abs", "outside-project", "symlink-targets"].map((path) =>
      mkdir(join(root, path)),
    ),
  );
  if (record.fixtures !== undefined && !Array.isArray(record.fixtures)) {
    throw new Error(`${record.id}: fixtures must be an array`);
  }
  for (const fixture of record.fixtures ?? []) {
    await materializeFixture(root, fixture, record.id);
  }
  return root;
}

function octalMode(stats) {
  return (stats.mode & 0o7777).toString(8).padStart(4, "0");
}

async function snapshot(root) {
  const entries = [];
  async function visit(directory) {
    const names = await readdir(directory);
    names.sort();
    for (const name of names) {
      const path = join(directory, name);
      const stats = await lstat(path);
      const item = { path: relative(root, path), mode: octalMode(stats) };
      if (stats.isSymbolicLink()) {
        entries.push({
          ...item,
          kind: "symlink",
          target: await readlink(path),
        });
      } else if (stats.isDirectory()) {
        entries.push({ ...item, kind: "directory" });
        await visit(path);
      } else if (stats.isFile()) {
        entries.push({
          ...item,
          kind: "file",
          bytesHex: (await readFile(path)).toString("hex"),
        });
      } else {
        entries.push({ ...item, kind: "other" });
      }
    }
  }
  await visit(root);
  entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return entries;
}

function caseMode(record) {
  const mode = record.mode ?? "normalizeToLf";
  if (mode === "normalizeToLf") return "normalize_to_lf";
  if (mode === "preserveLineEndings") return "preserve_line_endings";
  throw new Error(`${record.id}: unsupported mode ${mode}`);
}

async function runCase(client, record, root) {
  const mode = caseMode(record);
  const cwd = pathToFileURL(join(root, "work")).href;
  if (record.operation === "parse") {
    if (typeof record.patch !== "string")
      throw new Error(`${record.id}: patch must be a string`);
    return client.parse({ patch: materialize(record.patch, root) });
  }
  if (record.operation === "stream") {
    if (
      !Array.isArray(record.chunks) ||
      !record.chunks.every((value) => typeof value === "string")
    ) {
      throw new Error(`${record.id}: chunks must be a string array`);
    }
    return client.streamParse({
      chunks: record.chunks.map((value) => materialize(value, root)),
    });
  }
  if (record.operation === "invocation") {
    if (
      !Array.isArray(record.argv) ||
      !record.argv.every((value) => typeof value === "string")
    ) {
      throw new Error(`${record.id}: argv must be a string array`);
    }
    return client.verifyInvocation({
      argv: record.argv.map((value) => materialize(value, root)),
      cwd,
      mode,
    });
  }
  if (record.operation === "verify" || record.operation === "apply") {
    if (typeof record.patch !== "string")
      throw new Error(`${record.id}: patch must be a string`);
    const params = { patch: materialize(record.patch, root), cwd, mode };
    return record.operation === "verify"
      ? client.verifyPatch(params)
      : client.applyPatch(params);
  }
  throw new Error(`${record.id}: unsupported operation ${record.operation}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const corpusPath =
    options.corpus instanceof URL ? options.corpus : resolve(options.corpus);
  const corpusFilesystemPath =
    corpusPath instanceof URL ? fileURLToPath(corpusPath) : corpusPath;
  if (resolve(corpusFilesystemPath) === options.output) {
    throw new Error("output must not overwrite the corpus");
  }
  const roots = [];
  const previousUmask = process.umask(0o022);
  const stagedOutput = `${options.output}.candidate-${process.pid}.tmp`;
  let client;
  try {
    const clientModule = pathToFileURL(
      join(options.packageDir, "lib", "client.js"),
    ).href;
    const { ApplyPatchClient } = await import(clientModule);
    client = new ApplyPatchClient({ enginePath: options.engine });
    const hello = await client.hello();
    const corpus = parseJsonl(
      await readFile(corpusPath, "utf8"),
      String(corpusPath),
    );
    const lines = [];
    for (const record of corpus) {
      const root = await setupCase(record);
      roots.push(root);
      const preSnapshot = await snapshot(root);
      const result =
        record.requiresUnix === true && process.platform === "win32"
          ? { skipped: true, reason: "requires_unix" }
          : await runCase(client, record, root);
      const postSnapshot = await snapshot(root);
      lines.push(
        JSON.stringify({
          schemaVersion: 1,
          id: record.id,
          operation: record.operation,
          evidence: "candidate",
          identity: hello,
          caseRoot: root,
          preSnapshot,
          result,
          postSnapshot,
        }),
      );
    }
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(stagedOutput, `${lines.join("\n")}\n`, { flag: "wx" });
    await rename(stagedOutput, options.output);
    process.stdout.write(
      `candidate apply-patch engine output: ${options.output}\n`,
    );
  } finally {
    process.umask(previousUmask);
    await client?.shutdown().catch(() => {});
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    await rm(stagedOutput, { force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
