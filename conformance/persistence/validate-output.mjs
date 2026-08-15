#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EXPECTED,
  assertKeys,
  assertObject,
  parseJsonl,
  readCorpus,
} from "./lib.mjs";

function validateStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
}

function validateFilesystemNode(value, label) {
  assertKeys(value, ["kind", "content"], label);
  if (
    !new Set(["missing", "file", "directory", "symlink", "other"]).has(
      value.kind,
    )
  ) {
    throw new Error(`${label}.kind is unsupported`);
  }
  if (value.kind === "file") {
    if (typeof value.content !== "string")
      throw new Error(`${label}.content is required`);
  } else if (value.content !== undefined) {
    throw new Error(`${label}.content is only valid for files`);
  }
}

function validateFilesystem(value, label) {
  assertKeys(value, ["home", "rules", "policy", "marker"], label);
  for (const key of ["home", "rules", "policy", "marker"]) {
    validateFilesystemNode(value[key], `${label}.${key}`);
  }
}

function validateState(value, label) {
  assertKeys(
    value,
    ["allowedPrefixes", "networkRuleCount", "compiledNetworkDomains"],
    label,
  );
  if (
    !Array.isArray(value.allowedPrefixes) ||
    value.allowedPrefixes.some(
      (prefix) =>
        !Array.isArray(prefix) ||
        prefix.some((token) => typeof token !== "string"),
    )
  ) {
    throw new Error(
      `${label}.allowedPrefixes must be an array of string arrays`,
    );
  }
  if (
    !Number.isSafeInteger(value.networkRuleCount) ||
    value.networkRuleCount < 0
  ) {
    throw new Error(`${label}.networkRuleCount must be a non-negative integer`);
  }
  assertKeys(
    value.compiledNetworkDomains,
    ["allowed", "denied"],
    `${label}.compiledNetworkDomains`,
  );
  validateStringArray(
    value.compiledNetworkDomains.allowed,
    `${label}.compiledNetworkDomains.allowed`,
  );
  validateStringArray(
    value.compiledNetworkDomains.denied,
    `${label}.compiledNetworkDomains.denied`,
  );
}

function validateOutcome(value, operation, label) {
  assertObject(value, label);
  switch (operation.kind) {
    case "open":
      assertKeys(value, ["status", "migration", "loadWarning"], label);
      if (value.status !== "ok") throw new Error(`${label}.status must be ok`);
      assertKeys(
        value.migration,
        ["attempted", "completed", "warning", "skippedReason"],
        `${label}.migration`,
      );
      for (const key of ["attempted", "completed", "warning"]) {
        if (typeof value.migration[key] !== "boolean") {
          throw new Error(`${label}.migration.${key} must be boolean`);
        }
      }
      if (
        value.migration.skippedReason !== null &&
        value.migration.skippedReason !==
          "user_and_project_exec_policy_rules_ignored"
      ) {
        throw new Error(`${label}.migration.skippedReason is unsupported`);
      }
      if (value.loadWarning !== null && value.loadWarning !== "parse_policy") {
        throw new Error(`${label}.loadWarning is unsupported`);
      }
      return;
    case "append_prefix":
      if (value.status === "ok") {
        assertKeys(value, ["status", "changedInMemory"], label);
        if (typeof value.changedInMemory !== "boolean") {
          throw new Error(`${label}.changedInMemory must be boolean`);
        }
      } else if (value.status === "error") {
        assertKeys(value, ["status", "errorClass"], label);
        if (
          !new Set([
            "empty_prefix",
            "create_policy_dir",
            "open_policy_file",
          ]).has(value.errorClass)
        ) {
          throw new Error(`${label}.errorClass is unsupported`);
        }
      } else {
        throw new Error(`${label}.status is unsupported`);
      }
      return;
    case "append_network":
      if (value.status === "ok") {
        assertKeys(value, ["status"], label);
      } else {
        assertKeys(value, ["status", "errorClass"], label);
        if (value.status !== "error" || typeof value.errorClass !== "string") {
          throw new Error(`${label} has an invalid network error`);
        }
      }
      return;
    case "inspect":
    case "write_policy":
    case "append_policy":
    case "remove_home":
    case "replace_rules_dir_with_file":
      assertKeys(value, ["status"], label);
      if (value.status !== "ok") throw new Error(`${label}.status must be ok`);
      return;
    default:
      throw new Error(`${label}: unsupported operation kind`);
  }
}

function validateOutputRecord(value, label) {
  assertKeys(
    value,
    ["schemaVersion", "id", "corpusSha256", "source", "result"],
    label,
  );
  if (value.schemaVersion !== 1)
    throw new Error(`${label}.schemaVersion must be 1`);
  if (typeof value.id !== "string" || !value.id)
    throw new Error(`${label}.id is invalid`);
  if (
    typeof value.corpusSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.corpusSha256)
  ) {
    throw new Error(`${label}.corpusSha256 is invalid`);
  }
  assertKeys(
    value.source,
    [
      "kind",
      "protocolVersion",
      "engineSha256",
      "codexCommit",
      "configTree",
      "execpolicyTree",
      "coreExecPolicyBlob",
      "coreExecPolicyDirTree",
      "cargoLockBlob",
      "os",
      "arch",
    ],
    `${label}.source`,
  );
  if (
    !new Set(["upstream_oracle", "sidecar_candidate"]).has(value.source.kind)
  ) {
    throw new Error(`${label}.source.kind is unsupported`);
  }
  for (const key of [
    "codexCommit",
    "configTree",
    "execpolicyTree",
    "coreExecPolicyBlob",
    "coreExecPolicyDirTree",
    "cargoLockBlob",
  ]) {
    if (value.source[key] !== EXPECTED[key]) {
      throw new Error(
        `${label}.source.${key} does not match the fixed upstream identity`,
      );
    }
  }
  if (value.source.kind === "sidecar_candidate") {
    if (value.source.protocolVersion !== EXPECTED.protocolVersion) {
      throw new Error(
        `${label}.source.protocolVersion must be ${EXPECTED.protocolVersion}`,
      );
    }
    if (
      typeof value.source.engineSha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(value.source.engineSha256)
    ) {
      throw new Error(`${label}.source.engineSha256 is invalid`);
    }
  } else if (value.source.protocolVersion !== undefined) {
    throw new Error(
      `${label}: oracle must not claim a sidecar protocol version`,
    );
  } else if (value.source.engineSha256 !== undefined) {
    throw new Error(`${label}: oracle must not claim a candidate engine hash`);
  }
  for (const key of ["os", "arch"]) {
    if (typeof value.source[key] !== "string" || !value.source[key]) {
      throw new Error(`${label}.source.${key} is invalid`);
    }
  }
  assertObject(value.result, `${label}.result`);
  return value;
}

export async function validateOutput(
  corpusArgument,
  outputArgument,
  expectedKind,
) {
  const corpus = await readCorpus(corpusArgument);
  const outputPath = resolve(outputArgument);
  const records = parseJsonl(
    await readFile(outputPath, "utf8"),
    outputPath,
    validateOutputRecord,
  );
  if (records.length !== corpus.cases.length) {
    throw new Error(
      `${outputPath}: expected ${corpus.cases.length} records, found ${records.length}`,
    );
  }
  const canonicalSource = JSON.stringify(records[0]?.source);
  if (
    records.some((record) => JSON.stringify(record.source) !== canonicalSource)
  ) {
    throw new Error(`${outputPath}: source identity changed between records`);
  }
  for (let index = 0; index < corpus.cases.length; index += 1) {
    const corpusCase = corpus.cases[index];
    const record = records[index];
    if (record.id !== corpusCase.id) {
      throw new Error(
        `${outputPath}:${index + 1}: expected id ${corpusCase.id}, got ${record.id}`,
      );
    }
    if (record.corpusSha256 !== corpus.sha256) {
      throw new Error(`${record.id}: corpus SHA-256 mismatch`);
    }
    if (expectedKind && record.source.kind !== expectedKind) {
      throw new Error(`${record.id}: expected source.kind=${expectedKind}`);
    }
    const shouldSkip =
      corpusCase.requiresUnix === true && record.source.os === "windows";
    if (shouldSkip) {
      assertKeys(record.result, ["skipped"], `${record.id}.result`);
      if (record.result.skipped !== "requires_unix") {
        throw new Error(`${record.id}: invalid skip result`);
      }
      continue;
    }
    assertKeys(
      record.result,
      ["operations", "finalFilesystem"],
      `${record.id}.result`,
    );
    if (!Array.isArray(record.result.operations)) {
      throw new Error(`${record.id}.result.operations must be an array`);
    }
    if (record.result.operations.length !== corpusCase.operations.length) {
      throw new Error(`${record.id}: operation result count mismatch`);
    }
    for (
      let operationIndex = 0;
      operationIndex < corpusCase.operations.length;
      operationIndex += 1
    ) {
      const operation = corpusCase.operations[operationIndex];
      const actual = record.result.operations[operationIndex];
      assertKeys(
        actual,
        ["kind", "manager", "outcome", "state", "filesystem"],
        `${record.id}.operations[${operationIndex}]`,
      );
      if (actual.kind !== operation.kind)
        throw new Error(`${record.id}: operation kind mismatch`);
      const expectsManager = Object.hasOwn(operation, "manager");
      if (
        expectsManager
          ? actual.manager !== operation.manager
          : actual.manager !== undefined
      ) {
        throw new Error(`${record.id}: operation manager mismatch`);
      }
      validateOutcome(
        actual.outcome,
        operation,
        `${record.id}.operations[${operationIndex}].outcome`,
      );
      if (expectsManager) {
        validateState(
          actual.state,
          `${record.id}.operations[${operationIndex}].state`,
        );
      } else if (actual.state !== undefined) {
        throw new Error(
          `${record.id}: mutation operation must not contain manager state`,
        );
      }
      validateFilesystem(
        actual.filesystem,
        `${record.id}.operations[${operationIndex}].filesystem`,
      );
    }
    validateFilesystem(
      record.result.finalFilesystem,
      `${record.id}.result.finalFilesystem`,
    );
  }
  return { corpus, records, outputPath };
}

async function main() {
  const args = process.argv.slice(2);
  let corpus;
  let output;
  let kind;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!new Set(["--corpus", "--output", "--kind"]).has(argument)) {
      throw new Error(
        "Usage: node validate-output.mjs --corpus FILE --output FILE [--kind upstream_oracle|sidecar_candidate]",
      );
    }
    const value = args[index + 1];
    if (!value) throw new Error(`missing value for ${argument}`);
    if (argument === "--corpus") corpus = value;
    if (argument === "--output") output = value;
    if (argument === "--kind") kind = value;
    index += 1;
  }
  if (!corpus || !output) throw new Error("--corpus and --output are required");
  if (kind && !new Set(["upstream_oracle", "sidecar_candidate"]).has(kind)) {
    throw new Error("--kind is invalid");
  }
  const validated = await validateOutput(corpus, output, kind);
  process.stdout.write(
    `validated persistence output: ${validated.records.length} records (${validated.records[0]?.source.kind ?? "empty"})\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
