#!/usr/bin/env node

import fs from "node:fs";

function fail(message) {
  throw new Error(message);
}

function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function load(path) {
  const records = fs
    .readFileSync(path, "utf8")
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  return new Map(records.map((record) => [record.id, record]));
}

function required(records, id) {
  return records.get(id) ?? fail(`missing bundled case ${JSON.stringify(id)}`);
}

function decisions(record) {
  return record.result.policy.evaluations.map(
    (entry) => entry.evaluation.decision,
  );
}

function main() {
  const [output, ...extra] = process.argv.slice(2);
  if (!output || extra.length !== 0) {
    fail("Usage: verify-bundled-output.mjs OUTPUT.jsonl");
  }
  const records = load(output);
  equal(records.size, 6, "bundled case count");

  const precedence = required(records, "stack-precedence-and-origins");
  equal(
    precedence.result.stack.effectiveConfig,
    {
      model: "session-model",
      nested: {
        owner: "session",
        projectOnly: true,
        systemOnly: true,
        userOnly: true,
      },
      provider: "system-provider",
    },
    "effective config precedence",
  );
  equal(
    precedence.result.stack.origins.model.kind,
    "session_flags",
    "model origin",
  );
  equal(
    precedence.result.stack.origins.provider.kind,
    "system",
    "provider origin",
  );
  equal(
    precedence.result.stack.origins["nested.projectOnly"].kind,
    "project",
    "project origin",
  );

  const invalidOrder = required(records, "stack-rejects-out-of-order-layers");
  equal(
    invalidOrder.result.stackError.message,
    "config layers are not in correct precedence order",
    "out-of-order stack failure",
  );

  const stableSort = required(records, "stable-rule-file-order-within-layer");
  equal(
    stableSort.result.discoveredRuleFiles[0].files,
    [
      "$CASE/layers/project/rules/a-first.rules",
      "$CASE/layers/project/rules/m-middle.rules",
      "$CASE/layers/project/rules/z-last.rules",
    ],
    "stable rule-file order",
  );
  equal(
    decisions(stableSort),
    ["allow", "prompt", "forbidden"],
    "sorted-file evaluations",
  );

  const ignored = required(
    records,
    "ignore-user-and-project-rules-keeps-system",
  );
  equal(
    ignored.result.discoveredRuleFiles.map(
      (entry) => entry.ignoredByExecPolicy,
    ),
    [false, true, true],
    "ignored layer markers",
  );
  equal(
    decisions(ignored),
    ["allow", "prompt", "prompt"],
    "ignored rules evaluations",
  );

  const overlay = required(
    records,
    "requirements-composition-overlay-and-provenance",
  );
  equal(
    overlay.result.requirements.execPolicySource,
    {
      kind: "composite",
      sources: [
        {
          id: "enterprise",
          kind: "enterprise_managed",
          name: "Enterprise policy",
        },
        {
          file: "$CASE/requirements/system.toml",
          kind: "system_requirements_toml",
        },
      ],
    },
    "requirements provenance",
  );
  equal(
    decisions(overlay),
    ["forbidden", "allow"],
    "requirements overlay evaluations",
  );
  equal(
    overlay.result.policy.evaluations[0].evaluation.matchedRules.map(
      (match) => match.prefixRuleMatch.justification,
    ),
    ["ordinary allow", "enterprise block", "system review"],
    "requirements high-priority-first rule order",
  );

  const fallback = required(
    records,
    "ordinary-parse-warning-falls-back-to-requirements",
  );
  equal(
    fallback.result.policy.warning.path,
    "$CASE/layers/project/rules/a-broken.rules",
    "deterministic parse-warning path",
  );
  equal(
    fallback.result.policy.warning.location.path,
    "$CASE/layers/project/rules/a-broken.rules",
    "structured parse-warning location",
  );
  equal(
    decisions(fallback),
    ["forbidden", "prompt"],
    "requirements fallback evaluations",
  );
  equal(
    fallback.result.policy.evaluations[0].evaluation.matchedRules[0]
      .prefixRuleMatch.justification,
    "managed fallback",
    "requirements fallback provenance marker",
  );

  process.stdout.write("verified bundled config-stack semantics: 6/6 cases\n");
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
