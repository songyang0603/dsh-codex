#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED_COMMIT = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const EXPECTED_APPLY_PATCH_TREE = "1601c43435739cfeca8c5ae4fe28e56b5efc4246";
const EXPECTED_CARGO_LOCK_BLOB = "a8c2addc02055be48c345b65760a7a1b96cfbf28";
const EXPECTED_ORACLE_IDENTITY = Object.freeze({
  codexCommit: EXPECTED_COMMIT,
  applyPatchTree: EXPECTED_APPLY_PATCH_TREE,
  execServerTree: "51751785508060e633f0e0472fa0d2572787b36a",
  fileSystemTree: "971c42b87f1e8e94411d6b63a854b1404df45d1d",
  pathUriTree: "02fceb44b126b04efe3d4d2087284d092fa02f13",
  cargoLockBlob: EXPECTED_CARGO_LOCK_BLOB,
  os: "macos",
  arch: "aarch64",
  pointerWidth: 64,
});
const EXPECTED_METHODS = Object.freeze([
  "hello",
  "parse",
  "stream_parse",
  "verify_patch",
  "verify_invocation",
  "apply_patch",
  "shutdown",
]);
const EXPECTED_MODES = Object.freeze([
  "normalize_to_lf",
  "preserve_line_endings",
]);

function usage() {
  process.stderr.write(
    "Usage: node compare.mjs CORPUS.jsonl ORACLE.jsonl CANDIDATE.jsonl\n",
  );
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: key mismatch; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    );
  }
}

function parseJsonl(text, label) {
  if (text.length === 0) throw new Error(`${label}: empty JSONL`);
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const values = [];
  const seen = new Set();
  for (const [index, line] of lines.entries()) {
    if (line.trim().length === 0) {
      throw new Error(`${label}:${index + 1}: blank lines are forbidden`);
    }
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`${label}:${index + 1}: invalid JSON`, { cause: error });
    }
    if (!isObject(value) || typeof value.id !== "string") {
      throw new Error(
        `${label}:${index + 1}: record object with string id required`,
      );
    }
    if (seen.has(value.id))
      throw new Error(`${label}: duplicate id ${value.id}`);
    seen.add(value.id);
    values.push(value);
  }
  if (values.length === 0) throw new Error(`${label}: no records`);
  return values;
}

function recordsById(values) {
  return new Map(values.map((value) => [value.id, value]));
}

function assertCaseSet(label, expectedIds, actual) {
  const missing = expectedIds.filter((id) => !actual.has(id));
  const extra = [...actual.keys()].filter((id) => !expectedIds.includes(id));
  if (missing.length !== 0 || extra.length !== 0) {
    throw new Error(
      `${label}: case-set mismatch; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`,
    );
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeRoot(value, root) {
  if (typeof value === "string") return value.replaceAll(root, "$ROOT");
  if (Array.isArray(value))
    return value.map((entry) => normalizeRoot(entry, root));
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeRoot(entry, root),
      ]),
    );
  }
  return value;
}

function diffValues(expected, actual, path = "semantic", output = []) {
  if (Object.is(expected, actual)) return output;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      output.push({ path, expected, actual });
      return output;
    }
    for (
      let index = 0;
      index < Math.max(expected.length, actual.length);
      index += 1
    ) {
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
  if (isObject(expected) && isObject(actual)) {
    const keys = [
      ...new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ].sort();
    for (const key of keys) {
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

function validateCorpus(values) {
  const allowed = new Set([
    "schemaVersion",
    "id",
    "operation",
    "patch",
    "chunks",
    "argv",
    "mode",
    "fixtures",
    "requiresUnix",
  ]);
  for (const value of values) {
    if (value.schemaVersion !== 1 || typeof value.operation !== "string") {
      throw new Error(
        `${value.id}: corpus schemaVersion 1 and operation are required`,
      );
    }
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw new Error(
          `${value.id}: forbidden/unknown corpus field ${key}; corpus is input-only`,
        );
      }
    }
  }
}

function validateRecord(record, evidence, label) {
  if (!isObject(record)) throw new Error(`${label}: record must be an object`);
  exactKeys(
    record,
    [
      "schemaVersion",
      "id",
      "operation",
      "evidence",
      "identity",
      "caseRoot",
      "preSnapshot",
      "result",
      "postSnapshot",
    ],
    label,
  );
  if (record.schemaVersion !== 1 || record.evidence !== evidence) {
    throw new Error(`${label}: wrong schemaVersion or evidence`);
  }
  if (
    !isObject(record.identity) ||
    typeof record.caseRoot !== "string" ||
    record.caseRoot.length === 0
  ) {
    throw new Error(`${label}: identity and non-empty caseRoot are required`);
  }
  if (
    !Array.isArray(record.preSnapshot) ||
    !Array.isArray(record.postSnapshot)
  ) {
    throw new Error(`${label}: filesystem snapshots must be arrays`);
  }
}

function validateIdentity(oracleIdentity, candidateIdentity, id) {
  for (const [key, expected] of Object.entries(EXPECTED_ORACLE_IDENTITY)) {
    if (canonicalJson(oracleIdentity[key]) !== canonicalJson(expected)) {
      throw new Error(`${id}: oracle identity ${key} is not pinned`);
    }
  }
  const candidateExpected = {
    protocolVersion: 1,
    codexRepository: "https://github.com/openai/codex",
    codexCommit: EXPECTED_COMMIT,
    codexApplyPatchPackage: "codex-apply-patch",
    codexApplyPatchVersion: "0.0.0",
    codexApplyPatchTree: EXPECTED_APPLY_PATCH_TREE,
    codexApplyPatchLibBlob: "5b5fac0683288b0e008ebf753dee0d588f625b77",
    codexApplyPatchParserBlob: "c400d075a684fda29c10269aef1958a27faf90aa",
    codexApplyPatchStreamingParserBlob:
      "ff1b2f82feec7bdf454f6cba61ad5f15611f5573",
    codexApplyPatchInvocationBlob: "41ee8b539aa0c2be321e1e839a503ee4760393a7",
    codexApplyPatchFileUpdateBlob: "d700570264f2b72f356011064028dededa4a2a55",
    codexApplyPatchTextFileBlob: "b7d598ca973ec73f0ed064d2360f4d218e2a792d",
    codexApplyPatchSeekSequenceBlob: "9934fa55e767cacf85db7e459a913e72c9d828a0",
    codexCargoLockBlob: EXPECTED_CARGO_LOCK_BLOB,
    os: "macos",
    arch: "aarch64",
    pointerWidth: 64,
    filesystem: "LocalFileSystem::unsandboxed",
    sandbox: "none",
    methods: EXPECTED_METHODS,
    modes: EXPECTED_MODES,
  };
  for (const [key, expected] of Object.entries(candidateExpected)) {
    if (canonicalJson(candidateIdentity[key]) !== canonicalJson(expected)) {
      throw new Error(`${id}: candidate identity ${key} is not pinned`);
    }
  }
  if (
    typeof candidateIdentity.engineVersion !== "string" ||
    candidateIdentity.engineVersion.length === 0
  ) {
    throw new Error(`${id}: candidate engineVersion is missing`);
  }
  if (
    typeof candidateIdentity.scope !== "string" ||
    !candidateIdentity.scope.includes("semantic engine only")
  ) {
    throw new Error(
      `${id}: candidate scope does not state the engine-only boundary`,
    );
  }
}

async function main() {
  const [corpusArg, oracleArg, candidateArg, ...extra] = process.argv.slice(2);
  if (!corpusArg || !oracleArg || !candidateArg || extra.length !== 0) {
    usage();
    process.exitCode = 64;
    return;
  }
  const [corpusValues, oracleValues, candidateValues] = await Promise.all(
    [corpusArg, oracleArg, candidateArg].map(async (path) => {
      const absolute = resolve(path);
      return parseJsonl(await readFile(absolute, "utf8"), absolute);
    }),
  );
  validateCorpus(corpusValues);
  const ids = corpusValues.map((value) => value.id);
  const corpus = recordsById(corpusValues);
  const oracle = recordsById(oracleValues);
  const candidate = recordsById(candidateValues);
  assertCaseSet("oracle", ids, oracle);
  assertCaseSet("candidate", ids, candidate);

  const mismatches = [];
  for (const id of ids) {
    const input = corpus.get(id);
    const expected = oracle.get(id);
    const actual = candidate.get(id);
    validateRecord(expected, "pinned_upstream", `${id}: oracle`);
    validateRecord(actual, "candidate", `${id}: candidate`);
    if (
      expected.operation !== input.operation ||
      actual.operation !== input.operation
    ) {
      throw new Error(`${id}: operation does not match corpus`);
    }
    validateIdentity(expected.identity, actual.identity, id);
    const expectedSemantic = normalizeRoot(
      {
        preSnapshot: expected.preSnapshot,
        result: expected.result,
        postSnapshot: expected.postSnapshot,
      },
      expected.caseRoot,
    );
    const actualSemantic = normalizeRoot(
      {
        preSnapshot: actual.preSnapshot,
        result: actual.result,
        postSnapshot: actual.postSnapshot,
      },
      actual.caseRoot,
    );
    if (canonicalJson(expectedSemantic) !== canonicalJson(actualSemantic)) {
      mismatches.push({
        id,
        differences: diffValues(expectedSemantic, actualSemantic).slice(0, 100),
      });
    }
  }
  if (mismatches.length !== 0) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `apply-patch engine upstream parity failed: ${mismatches.length}/${ids.length} cases diverged`,
    );
  }
  process.stdout.write(
    `apply-patch engine upstream parity: ${ids.length}/${ids.length} cases matched (macOS arm64)\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
