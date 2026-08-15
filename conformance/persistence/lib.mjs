import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const EXPECTED = Object.freeze({
  protocolVersion: 3,
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
  coreExecPolicyDirTree: "b313a3ba1b113f08e3c1686272162910dad76540",
  cargoLockBlob: "a8c2addc02055be48c345b65760a7a1b96cfbf28",
});

const CASE_KEYS = [
  "schemaVersion",
  "id",
  "requiresUnix",
  "initial",
  "operations",
];
const INITIAL_KEYS = ["home", "policy", "marker"];
const PROTOCOLS = new Set([
  "http",
  "https",
  "https_connect",
  "http-connect",
  "socks5_tcp",
  "socks5_udp",
]);
const DECISIONS = new Set(["allow", "prompt", "forbidden"]);

export function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

export function assertKeys(value, allowed, label) {
  assertObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new Error(`${label}: unknown field ${key}`);
  }
}

function assertString(value, label, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(
      `${label} must be ${allowEmpty ? "a" : "a non-empty"} string`,
    );
  }
}

function validateManager(value, label) {
  assertString(value, label);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} is not a safe manager id`);
  }
}

function validateOperation(operation, label, openedManagers) {
  assertObject(operation, label);
  assertString(operation.kind, `${label}.kind`);
  switch (operation.kind) {
    case "open":
      assertKeys(
        operation,
        ["kind", "manager", "ignoreUserAndProjectExecPolicyRules"],
        label,
      );
      validateManager(operation.manager, `${label}.manager`);
      if (
        operation.ignoreUserAndProjectExecPolicyRules !== undefined &&
        typeof operation.ignoreUserAndProjectExecPolicyRules !== "boolean"
      ) {
        throw new Error(
          `${label}.ignoreUserAndProjectExecPolicyRules must be boolean`,
        );
      }
      openedManagers.add(operation.manager);
      return;
    case "append_prefix":
      assertKeys(operation, ["kind", "manager", "prefix"], label);
      validateManager(operation.manager, `${label}.manager`);
      if (
        !Array.isArray(operation.prefix) ||
        operation.prefix.some((token) => typeof token !== "string")
      ) {
        throw new Error(`${label}.prefix must be a string array`);
      }
      break;
    case "append_network":
      assertKeys(
        operation,
        ["kind", "manager", "host", "protocol", "decision", "justification"],
        label,
      );
      validateManager(operation.manager, `${label}.manager`);
      assertString(operation.host, `${label}.host`, { allowEmpty: true });
      if (!PROTOCOLS.has(operation.protocol)) {
        throw new Error(`${label}.protocol is unsupported`);
      }
      if (!DECISIONS.has(operation.decision)) {
        throw new Error(`${label}.decision is unsupported`);
      }
      if (
        operation.justification !== undefined &&
        operation.justification !== null &&
        typeof operation.justification !== "string"
      ) {
        throw new Error(`${label}.justification must be a string or null`);
      }
      break;
    case "inspect":
      assertKeys(operation, ["kind", "manager"], label);
      validateManager(operation.manager, `${label}.manager`);
      break;
    case "write_policy":
    case "append_policy":
      assertKeys(operation, ["kind", "source"], label);
      assertString(operation.source, `${label}.source`, { allowEmpty: true });
      return;
    case "remove_home":
    case "replace_rules_dir_with_file":
      assertKeys(operation, ["kind"], label);
      return;
    default:
      throw new Error(`${label}.kind is unsupported: ${operation.kind}`);
  }
  if (!openedManagers.has(operation.manager)) {
    throw new Error(
      `${label} references unopened manager ${operation.manager}`,
    );
  }
}

export function validateCorpusCase(value, label) {
  assertKeys(value, CASE_KEYS, label);
  if (value.schemaVersion !== 1)
    throw new Error(`${label}.schemaVersion must be 1`);
  assertString(value.id, `${label}.id`);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(value.id)) {
    throw new Error(`${label}.id is not a safe case id`);
  }
  if (
    value.requiresUnix !== undefined &&
    typeof value.requiresUnix !== "boolean"
  ) {
    throw new Error(`${label}.requiresUnix must be boolean`);
  }
  assertKeys(value.initial, INITIAL_KEYS, `${label}.initial`);
  if (!new Set(["missing", "directory"]).has(value.initial.home)) {
    throw new Error(`${label}.initial.home is unsupported`);
  }
  if (value.initial.policy !== undefined) {
    assertString(value.initial.policy, `${label}.initial.policy`, {
      allowEmpty: true,
    });
    if (value.initial.home !== "directory") {
      throw new Error(`${label}: an initial policy requires a directory home`);
    }
  }
  if (value.initial.marker !== undefined) {
    assertObject(value.initial.marker, `${label}.initial.marker`);
    if (value.initial.home !== "directory") {
      throw new Error(`${label}: an initial marker requires a directory home`);
    }
    if (value.initial.marker.kind === "file") {
      assertKeys(
        value.initial.marker,
        ["kind", "content"],
        `${label}.initial.marker`,
      );
      assertString(
        value.initial.marker.content,
        `${label}.initial.marker.content`,
        {
          allowEmpty: true,
        },
      );
    } else if (value.initial.marker.kind === "symlink_loop") {
      assertKeys(value.initial.marker, ["kind"], `${label}.initial.marker`);
      if (!value.requiresUnix) {
        throw new Error(`${label}: symlink_loop requires requiresUnix=true`);
      }
    } else {
      throw new Error(`${label}.initial.marker.kind is unsupported`);
    }
  }
  if (!Array.isArray(value.operations) || value.operations.length === 0) {
    throw new Error(`${label}.operations must be a non-empty array`);
  }
  const openedManagers = new Set();
  for (const [index, operation] of value.operations.entries()) {
    validateOperation(
      operation,
      `${label}.operations[${index}]`,
      openedManagers,
    );
  }
  return value;
}

export function parseJsonl(text, source, validateRecord) {
  const normalized = text.replaceAll("\r\n", "\n");
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  if (body.length === 0) throw new Error(`${source}: JSONL file is empty`);
  const records = [];
  const ids = new Set();
  for (const [index, line] of body.split("\n").entries()) {
    if (!line.trim())
      throw new Error(`${source}:${index + 1}: blank JSONL record`);
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: invalid JSON: ${error.message}`);
    }
    const record = validateRecord(value, `${source}:${index + 1}`);
    if (ids.has(record.id))
      throw new Error(`${source}: duplicate id ${record.id}`);
    ids.add(record.id);
    records.push(record);
  }
  return records;
}

export async function readCorpus(argument) {
  const path = resolve(argument);
  const bytes = await readFile(path);
  const text = bytes.toString("utf8");
  return {
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    cases: parseJsonl(text, path, validateCorpusCase),
  };
}

export function canonical(value) {
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

export function firstDifference(expected, actual, path = "$") {
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
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) {
        return `${path}.${key}`;
      }
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
