#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EXPECTED_COMMIT, canonicalJson, parseJsonl } from "./lib.mjs";

const EXPECTED_IDENTITY = Object.freeze({
  codexCommit: EXPECTED_COMMIT,
  protocolApprovalsBlob: "44dc8d7d7c9728a69e0b153dc1e43e248aaab9bc",
  sandboxingBlob: "2d20334f6446b2273128e6ed54e8001e28e37a76",
  sessionHandlersBlob: "a928090cc82eae3368030172e36b938c9422d5c3",
  sessionConstructorBlob: "84829d90f112ab4717abeaa16877379c3ca0a117",
  appServerItemBlob: "dcfe928508e8eef1af3b3f05c739860e75c0d607",
  appServerBespokeBlob: "32c222668614aa17b8496712c24b061d76bcc2b5",
});

function usage() {
  process.stderr.write(
    "Usage: node compare.mjs CORPUS.jsonl ORACLE.jsonl CANDIDATE.jsonl\n",
  );
}

async function records(path) {
  const resolved = resolve(path);
  const values = parseJsonl(await readFile(resolved, "utf8"), resolved);
  return new Map(values.map((value) => [value.id, value]));
}

function assertCaseSet(label, expectedIds, actual) {
  const missing = expectedIds.filter((id) => !actual.has(id));
  const extra = [...actual.keys()].filter((id) => !expectedIds.includes(id));
  if (missing.length || extra.length) {
    throw new Error(
      `${label} case-set mismatch; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`,
    );
  }
}

function diffValues(expected, actual, path = "result", output = []) {
  if (Object.is(expected, actual)) return output;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      output.push({ path, expected, actual });
      return output;
    }
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      if (index >= expected.length || index >= actual.length) {
        output.push({
          path: `${path}[${index}]`,
          expected: expected[index],
          actual: actual[index],
        });
      } else {
        diffValues(expected[index], actual[index], `${path}[${index}]`, output);
      }
    }
    return output;
  }
  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object"
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of [...keys].sort()) {
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) {
        output.push({
          path: `${path}.${key}`,
          expected: expected[key],
          actual: actual[key],
        });
      } else {
        diffValues(expected[key], actual[key], `${path}.${key}`, output);
      }
    }
    return output;
  }
  output.push({ path, expected, actual });
  return output;
}

async function main() {
  const [corpusArg, oracleArg, candidateArg, ...extra] = process.argv.slice(2);
  if (!corpusArg || !oracleArg || !candidateArg || extra.length > 0) {
    usage();
    process.exitCode = 64;
    return;
  }
  const [corpusValues, oracle, candidate] = await Promise.all([
    readFile(resolve(corpusArg), "utf8").then((text) =>
      parseJsonl(text, resolve(corpusArg)),
    ),
    records(oracleArg),
    records(candidateArg),
  ]);
  const ids = corpusValues.map((value) => value.id);
  const corpusById = new Map(corpusValues.map((value) => [value.id, value]));
  assertCaseSet("oracle", ids, oracle);
  assertCaseSet("candidate", ids, candidate);

  const mismatches = [];
  for (const id of ids) {
    const expected = oracle.get(id);
    const actual = candidate.get(id);
    const expectedEvidence =
      corpusById.get(id)?.operation === "responseToCore"
        ? "pinned_private_source_model"
        : "pinned_upstream";
    if (expected.evidence !== expectedEvidence) {
      throw new Error(`${id}: oracle evidence kind is not ${expectedEvidence}`);
    }
    for (const [key, value] of Object.entries(EXPECTED_IDENTITY)) {
      if (expected.identity?.[key] !== value) {
        throw new Error(`${id}: oracle identity ${key} is not pinned`);
      }
    }
    if (
      actual.evidence !== "candidate" ||
      actual.identity?.codexCommit !== EXPECTED_COMMIT
    ) {
      throw new Error(`${id}: candidate identity is not pinned`);
    }
    for (const platformKey of ["os", "arch", "pointerWidth"]) {
      if (expected.identity?.[platformKey] !== actual.identity?.[platformKey]) {
        throw new Error(
          `${id}: platform mismatch at ${platformKey}: ${expected.identity?.[platformKey]} vs ${actual.identity?.[platformKey]}`,
        );
      }
    }
    if (canonicalJson(expected.result) !== canonicalJson(actual.result)) {
      mismatches.push({
        id,
        differences: diffValues(expected.result, actual.result),
      });
    }
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `approval upstream parity failed: ${mismatches.length}/${ids.length} cases diverged`,
    );
  }
  process.stdout.write(
    `approval upstream parity: ${ids.length}/${ids.length} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
