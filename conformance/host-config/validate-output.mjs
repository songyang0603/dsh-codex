#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED = Object.freeze({
  protocolVersion: 3,
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
  utilsCliTree: "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee",
  utilsHomeDirTree: "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
  coreCargoBlob: "ff683fb5f921dcf23fe52ef52db6cf9889ca8efe",
  cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
  configLoaderBlob: "244f7df02f1aba0eeb80fa8acebc7732195f8f3a",
  configStateBlob: "bda2b7d1a73a22c0f39abbba0bad7f4a5e6932ea",
  execServerLibBlob: "bfaec24cad2a27a91a7c685f3fead3138e2b01f7",
  utilsCliLibBlob: "633638e72d65a931f68a503d523c76f75d0ac62b",
  utilsHomeDirLibBlob: "caa43569c78bae9f5cc875092f378f4d935b8063",
});

function usage() {
  return "Usage: node validate-output.mjs --kind oracle|candidate --corpus FILE --output FILE";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--kind", "--corpus", "--output"].includes(argument)) {
      throw new Error(`unknown argument: ${argument}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}\n${usage()}`);
    result[argument.slice(2)] = value;
    index += 1;
  }
  if (
    !["oracle", "candidate"].includes(result.kind) ||
    !result.corpus ||
    !result.output
  ) {
    throw new Error(usage());
  }
  return result;
}

function parseJsonl(text, source) {
  const normalized = text.replaceAll("\r\n", "\n");
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  if (!body) throw new Error(`${source}: JSONL file is empty`);
  const records = new Map();
  for (const [index, line] of body.split("\n").entries()) {
    if (!line.trim())
      throw new Error(`${source}:${index + 1}: blank JSONL record`);
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: invalid JSON: ${error.message}`);
    }
    if (typeof value?.id !== "string" || !value.id) {
      throw new Error(`${source}:${index + 1}: missing non-empty id`);
    }
    if (records.has(value.id))
      throw new Error(`${source}: duplicate id ${value.id}`);
    records.set(value.id, value);
  }
  return records;
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertExactKeys(value, expected, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(
      `${label} keys mismatch: expected ${wanted.join(",")}, got ${actual.join(",")}`,
    );
  }
}

function verifyIdentity(identity, kind, id) {
  assertObject(identity, `${id}.${kind}`);
  const fields =
    kind === "upstream"
      ? Object.keys(EXPECTED).filter((key) => key !== "protocolVersion")
      : [
          "protocolVersion",
          "codexCommit",
          "configTree",
          "execServerTree",
          "utilsCliTree",
          "utilsHomeDirTree",
          "execpolicyTree",
          "coreExecPolicyBlob",
          "cargoLockBlob",
        ];
  for (const field of fields) {
    if (identity[field] !== EXPECTED[field]) {
      throw new Error(`${id}.${kind}.${field} identity mismatch`);
    }
  }
  if (
    typeof identity.os !== "string" ||
    !identity.os ||
    typeof identity.arch !== "string" ||
    !identity.arch
  ) {
    throw new Error(`${id}.${kind} os/arch must be non-empty strings`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [corpus, output] = await Promise.all([
    readFile(resolve(args.corpus), "utf8").then((text) =>
      parseJsonl(text, args.corpus),
    ),
    readFile(resolve(args.output), "utf8").then((text) =>
      parseJsonl(text, args.output),
    ),
  ]);
  if (corpus.size !== output.size) {
    throw new Error(
      `case count mismatch: corpus=${corpus.size}, output=${output.size}`,
    );
  }
  for (const [id, corpusCase] of corpus) {
    const record = output.get(id);
    if (!record) throw new Error(`output is missing case ${id}`);
    if (record.schemaVersion !== 1)
      throw new Error(`${id}: schemaVersion must be 1`);
    assertExactKeys(
      record,
      [
        "schemaVersion",
        "id",
        args.kind === "oracle" ? "upstream" : "engine",
        "result",
      ],
      id,
    );
    verifyIdentity(
      record[args.kind === "oracle" ? "upstream" : "engine"],
      args.kind === "oracle" ? "upstream" : "engine",
      id,
    );
    assertObject(record.result, `${id}.result`);
    const hasLoad = Object.hasOwn(record.result, "load");
    const hasError = Object.hasOwn(record.result, "loadError");
    const hasSkipped = Object.hasOwn(record.result, "skipped");
    if (Number(hasLoad) + Number(hasError) + Number(hasSkipped) !== 1) {
      throw new Error(
        `${id}: result must contain exactly one of load, loadError, or skipped`,
      );
    }
    const expectsError =
      corpusCase.expectErrorStage !== undefined &&
      corpusCase.expectErrorStage !== null;
    if (!hasSkipped && hasError !== expectsError) {
      throw new Error(`${id}: output error/success disagrees with corpus`);
    }
    if (hasLoad) {
      assertExactKeys(record.result, ["load", "evaluations"], `${id}.result`);
      assertObject(record.result.load, `${id}.result.load`);
      if (!Array.isArray(record.result.evaluations))
        throw new Error(`${id}: evaluations must be an array`);
      if (
        record.result.load.discovery?.startupMigration?.mode !== "not_requested"
      ) {
        throw new Error(
          `${id}: load_host_config_stack must not perform startup migration`,
        );
      }
    } else if (hasError) {
      assertExactKeys(record.result, ["loadError"], `${id}.result`);
      assertObject(record.result.loadError, `${id}.result.loadError`);
      if (
        args.kind === "oracle" &&
        record.result.loadError.stage !== corpusCase.expectErrorStage
      ) {
        throw new Error(`${id}: oracle error stage mismatch`);
      }
    } else {
      assertExactKeys(record.result, ["skipped"], `${id}.result`);
      assertObject(record.result.skipped, `${id}.result.skipped`);
      const identity = record[args.kind === "oracle" ? "upstream" : "engine"];
      if (
        corpusCase.requiresUnixSymlinks !== true ||
        identity.os !== "windows" ||
        record.result.skipped.reason !== "requires_unix_symlinks" ||
        record.result.skipped.platform !== identity.os ||
        Object.keys(record.result.skipped).length !== 2
      ) {
        throw new Error(
          `${id}: invalid platform skip; only the declared Unix-symlink case may skip on Windows`,
        );
      }
    }
  }
  for (const id of output.keys()) {
    if (!corpus.has(id)) throw new Error(`output contains extra case ${id}`);
  }
  process.stdout.write(
    `validated host-config ${args.kind} output: ${output.size}/${corpus.size} cases\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
