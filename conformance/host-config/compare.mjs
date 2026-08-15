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
  return "Usage: node compare.mjs ORACLE.jsonl CANDIDATE.jsonl";
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
    if (
      value?.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      !value.id
    ) {
      throw new Error(`${source}:${index + 1}: invalid schemaVersion or id`);
    }
    if (records.has(value.id))
      throw new Error(`${source}: duplicate id ${value.id}`);
    records.set(value.id, value);
  }
  return records;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function firstDifference(expected, actual, path = "$") {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return path;
    if (expected.length !== actual.length) return `${path}.length`;
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(
        expected[index],
        actual[index],
        `${path}[${index}]`,
      );
      if (difference) return difference;
    }
    return null;
  }
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    const keys = [
      ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ].sort();
    for (const key of keys) {
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key))
        return `${path}.${key}`;
      const difference = firstDifference(
        expected[key],
        actual[key],
        `${path}.${key}`,
      );
      if (difference) return difference;
    }
    return null;
  }
  return path;
}

function selfTestComparator() {
  if (
    firstDifference(
      { nested: [1, { value: "same" }] },
      { nested: [1, { value: "same" }] },
    )
  ) {
    throw new Error(
      "internal comparator self-test rejected equal nested values",
    );
  }
  const path = firstDifference(
    { nested: [1, { value: "expected" }] },
    { nested: [1, { value: "actual" }] },
  );
  if (path !== "$.nested[1].value") {
    throw new Error(
      `internal comparator self-test missed a semantic difference: ${path}`,
    );
  }
}

function verifyIdentity(id, oracle, candidate) {
  for (const field of Object.keys(EXPECTED).filter(
    (key) => key !== "protocolVersion",
  )) {
    if (oracle.upstream?.[field] !== EXPECTED[field]) {
      throw new Error(
        `${id}: oracle upstream.${field} does not match the fixed source`,
      );
    }
  }
  for (const field of [
    "codexCommit",
    "configTree",
    "execServerTree",
    "utilsCliTree",
    "utilsHomeDirTree",
    "execpolicyTree",
    "coreExecPolicyBlob",
    "cargoLockBlob",
  ]) {
    if (candidate.engine?.[field] !== EXPECTED[field]) {
      throw new Error(
        `${id}: candidate engine.${field} does not match the fixed source`,
      );
    }
  }
  if (candidate.engine?.protocolVersion !== EXPECTED.protocolVersion) {
    throw new Error(
      `${id}: candidate protocolVersion must be ${EXPECTED.protocolVersion}`,
    );
  }
  if (
    oracle.upstream.os !== candidate.engine.os ||
    oracle.upstream.arch !== candidate.engine.arch
  ) {
    throw new Error(
      `${id}: platform mismatch (${oracle.upstream.os}/${oracle.upstream.arch} vs ${candidate.engine.os}/${candidate.engine.arch})`,
    );
  }
}

function expectedWireError(error) {
  switch (error.stage) {
    case "profile":
    case "cli":
      return {
        code: "invalid_params",
        message: `invalid params: ${error.message}`,
      };
    case "loader":
      return {
        code: "host_config_load_failed",
        message: `failed to load Codex host configuration: ${error.message}`,
      };
    default:
      throw new Error(`unknown oracle error stage: ${error.stage}`);
  }
}

async function main() {
  selfTestComparator();
  const [oracleArgument, candidateArgument, ...extra] = process.argv.slice(2);
  if (!oracleArgument || !candidateArgument || extra.length > 0)
    throw new Error(usage());
  const oraclePath = resolve(oracleArgument);
  const candidatePath = resolve(candidateArgument);
  const [oracle, candidate] = await Promise.all([
    readFile(oraclePath, "utf8").then((text) => parseJsonl(text, oraclePath)),
    readFile(candidatePath, "utf8").then((text) =>
      parseJsonl(text, candidatePath),
    ),
  ]);
  const missing = [...oracle.keys()].filter((id) => !candidate.has(id));
  const extras = [...candidate.keys()].filter((id) => !oracle.has(id));
  if (missing.length || extras.length) {
    throw new Error(
      `case-set mismatch; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extras)}`,
    );
  }

  const mismatches = [];
  for (const [id, expectedRecord] of oracle) {
    const actualRecord = candidate.get(id);
    verifyIdentity(id, expectedRecord, actualRecord);
    const expected = expectedRecord.result;
    const actual = actualRecord.result;
    if (expected.skipped) {
      const path = firstDifference(canonical(expected), canonical(actual));
      if (path)
        mismatches.push({
          id,
          path: `$.result${path.slice(1)}`,
          expected,
          actual,
        });
      continue;
    }
    if (expected.loadError) {
      const expectedError = expectedWireError(expected.loadError);
      const actualError = actual.loadError;
      const path = firstDifference(
        canonical(expectedError),
        canonical(actualError),
      );
      if (path)
        mismatches.push({
          id,
          path: `$.result.loadError${path.slice(1)}`,
          expected: expectedError,
          actual: actualError,
        });
      continue;
    }
    const path = firstDifference(canonical(expected), canonical(actual));
    if (path)
      mismatches.push({
        id,
        path: `$.result${path.slice(1)}`,
        expected,
        actual,
      });
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches)
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    throw new Error(
      `host-config parity failed: ${mismatches.length}/${oracle.size} cases diverged`,
    );
  }
  process.stdout.write(
    `host-config parity: ${oracle.size}/${oracle.size} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
