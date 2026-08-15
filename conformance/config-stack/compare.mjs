#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED = Object.freeze({
  protocolVersion: 3,
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
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

function normalizedOracleResult(result) {
  const normalized = structuredClone(result);
  if (
    normalized.policy?.warning &&
    Object.hasOwn(normalized.policy.warning, "display")
  ) {
    delete normalized.policy.warning.display;
  }
  return canonical(normalized);
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
    {
      nested: [1, { value: "actual" }],
    },
  );
  if (path !== "$.nested[1].value") {
    throw new Error(
      `internal comparator self-test missed a semantic difference: ${path}`,
    );
  }
}

function verifyIdentity(id, oracle, candidate) {
  for (const key of [
    "codexCommit",
    "configTree",
    "execpolicyTree",
    "coreExecPolicyBlob",
  ]) {
    if (oracle.upstream?.[key] !== EXPECTED[key]) {
      throw new Error(
        `${id}: oracle upstream.${key} does not match the fixed source`,
      );
    }
    if (candidate.engine?.[key] !== EXPECTED[key]) {
      throw new Error(
        `${id}: candidate engine.${key} does not match the fixed source`,
      );
    }
  }
  if (candidate.engine.protocolVersion !== EXPECTED.protocolVersion) {
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

function compareStackError(id, expected, actual) {
  if (!actual?.stackError) {
    return { id, path: "$.stackError", expected, actual };
  }
  const expectedMessage = `invalid config layer stack: ${expected.stackError.message}`;
  if (
    actual.stackError.code !== "invalid_config_stack" ||
    actual.stackError.message !== expectedMessage ||
    actual.stackError.data !== undefined
  ) {
    return {
      id,
      path: "$.stackError",
      expected: { code: "invalid_config_stack", message: expectedMessage },
      actual: actual.stackError,
    };
  }
  return null;
}

async function main() {
  selfTestComparator();
  const [oracleArgument, candidateArgument, ...extra] = process.argv.slice(2);
  if (!oracleArgument || !candidateArgument || extra.length > 0) {
    throw new Error(usage());
  }
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
    if (expected.stackError) {
      const mismatch = compareStackError(id, expected, actual);
      if (mismatch) mismatches.push(mismatch);
      continue;
    }
    const normalizedExpected = normalizedOracleResult(expected);
    const normalizedActual = canonical(actual);
    const path = firstDifference(normalizedExpected, normalizedActual);
    if (path)
      mismatches.push({
        id,
        path,
        expected: normalizedExpected,
        actual: normalizedActual,
      });
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `config-stack parity failed: ${mismatches.length}/${oracle.size} cases diverged`,
    );
  }
  process.stdout.write(
    `config-stack parity: ${oracle.size}/${oracle.size} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
