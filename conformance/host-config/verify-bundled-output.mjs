#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const IDS = [
  "empty-default-discovered-home",
  "base-profile-cli-precedence",
  "invalid-profile-name",
  "profile-v2-legacy-conflict",
  "trusted-project-root-to-cwd-precedence",
  "untrusted-project-layer-is-disabled",
  "ignore-user-config-still-loads-user-rules",
  "ignore-user-project-rules-keeps-user-config",
  "cloud-snapshot-config-and-requirements",
  "ordinary-rules-parse-falls-back-to-cloud-requirements",
  "symlinked-cwd-resolves-project-trust",
];

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

function truthy(value, label) {
  if (!value) fail(`${label}: assertion failed`);
}

function parseJsonl(text, source) {
  const lines = text.replaceAll("\r\n", "\n").replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") fail(`${source}: output is empty`);
  return lines.map((line, index) => {
    if (!line.trim()) fail(`${source}:${index + 1}: blank JSONL record`);
    try {
      return JSON.parse(line);
    } catch (error) {
      fail(`${source}:${index + 1}: invalid JSON: ${error.message}`);
    }
  });
}

function load(record) {
  truthy(record?.result?.load, `${record?.id}.result.load`);
  return record.result.load;
}

function layerKinds(value, enabled = false) {
  const layers = enabled
    ? value.stack.enabledLayersLowToHigh
    : value.stack.allLayersLowToHigh.map((entry) => entry.source);
  return layers.map((source) => source.kind);
}

function decision(record, index) {
  return record.result.evaluations[index]?.evaluation?.decision;
}

function ruleInventory(value, kind, predicate = () => true) {
  return value.discoveredRuleFiles.find(
    (entry) => entry.source.kind === kind && predicate(entry),
  );
}

async function main() {
  const [argument, ...extra] = process.argv.slice(2);
  if (!argument || extra.length > 0) {
    fail("Usage: node verify-bundled-output.mjs ORACLE.jsonl");
  }
  const path = resolve(argument);
  const text = await readFile(path, "utf8");
  const records = parseJsonl(text, path);
  equal(
    records.map((record) => record.id),
    IDS,
    "bundled case order",
  );
  if (
    /\/cases\/\d+(?:\/|\b)/.test(text) ||
    /dsh-(?:codex-)?host-(?:config-)?(?:oracle|preview)/.test(text)
  ) {
    fail("oracle output leaked an absolute fixture-root path instead of $CASE");
  }
  const byId = new Map(records.map((record) => [record.id, record]));

  for (const record of records) {
    if (record.result.load) {
      equal(
        record.result.load.discovery.startupMigration,
        {
          attempted: false,
          completed: false,
          mode: "not_requested",
          warning: null,
        },
        `${record.id}.startupMigration`,
      );
    }
  }

  const empty = load(byId.get(IDS[0]));
  equal(
    layerKinds(empty),
    ["packaged_defaults", "system", "user"],
    "empty layer order",
  );
  equal(empty.loadedFiles, [], "empty loaded files");
  equal(
    empty.stack.effectiveConfig.project_doc_max_bytes,
    32768,
    "packaged default precedence",
  );
  equal(
    empty.stack.origins.include_permissions_instructions?.kind,
    "packaged_defaults",
    "packaged origin",
  );
  equal(
    empty.stack.origins["history.persistence"]?.kind,
    "packaged_defaults",
    "nested packaged origin",
  );
  equal(
    empty.stack.origins.project_root_markers,
    null,
    "default-without-origin projection",
  );
  equal(empty.discovery.codexHomeMode, "discover", "discover home mode");
  equal(empty.discovery.resolvedCodexHome, "$CASE/home", "discovered home");

  const precedenceRecord = byId.get(IDS[1]);
  const precedence = load(precedenceRecord);
  equal(
    layerKinds(precedence),
    ["packaged_defaults", "system", "user", "user", "session_flags"],
    "profile/CLI layer order",
  );
  equal(
    precedence.stack.effectiveConfig.model,
    "cli-model",
    "CLI model precedence",
  );
  equal(
    precedence.stack.effectiveConfig.model_provider,
    "base-provider",
    "base user value",
  );
  equal(
    precedence.stack.effectiveConfig.approval_policy,
    "never",
    "profile value",
  );
  equal(
    precedence.stack.effectiveConfig.project_doc_max_bytes,
    33333,
    "CLI nested value",
  );
  equal(
    precedence.stack.origins.model,
    { kind: "session_flags" },
    "CLI model origin",
  );
  equal(
    precedence.stack.origins.approval_policy?.profile,
    "work",
    "profile origin",
  );
  equal(precedence.discovery.profileV2, "work", "profile discovery");

  equal(
    byId.get(IDS[2]).result.loadError,
    {
      kind: "profile_parse",
      message:
        "invalid --profile value `../work`; pass a plain name such as `work`",
      stage: "profile",
    },
    "invalid profile error",
  );
  equal(
    byId.get(IDS[3]).result.loadError,
    {
      kind: "invaliddata",
      message:
        '--profile `work` cannot be used while $CASE/home/config.toml contains legacy `profile = "work"` or `[profiles.work]` config; move those settings into $CASE/home/work.config.toml and remove the legacy profile selector/table. See https://developers.openai.com/codex/config-advanced#profiles for more information.',
      stage: "loader",
    },
    "profile conflict error",
  );

  const trustedRecord = byId.get(IDS[4]);
  const trusted = load(trustedRecord);
  equal(
    layerKinds(trusted),
    ["packaged_defaults", "system", "user", "project", "project"],
    "trusted project layer order",
  );
  equal(
    trusted.loadedFiles,
    [
      "$CASE/workspace/project/.codex/rules/a-root.rules",
      "$CASE/workspace/project/.codex/rules/z-root.rules",
      "$CASE/workspace/project/sub/.codex/rules/cwd.rules",
    ],
    "trusted rule stable order",
  );
  equal(
    trusted.stack.effectiveConfig.project_doc_max_bytes,
    30000,
    "cwd project precedence",
  );
  equal(
    trusted.stack.origins.project_doc_max_bytes?.dotCodexFolder,
    "$CASE/workspace/project/sub/.codex",
    "cwd project origin",
  );
  equal(decision(trustedRecord, 0), "allow", "root rule decision");
  equal(decision(trustedRecord, 1), "forbidden", "cwd rule decision");

  const untrustedRecord = byId.get(IDS[5]);
  const untrusted = load(untrustedRecord);
  equal(
    layerKinds(untrusted),
    ["packaged_defaults", "system", "user", "project"],
    "untrusted layer inventory",
  );
  equal(
    layerKinds(untrusted, true),
    ["packaged_defaults", "system", "user"],
    "untrusted enabled layers",
  );
  equal(
    untrusted.stack.allLayersLowToHigh[3].disabledReason,
    "$CASE/workspace/project is marked as untrusted in $CASE/home/config.toml. To load project-local config, hooks, and exec policies, mark it trusted.",
    "untrusted disabled reason",
  );
  equal(untrusted.loadedFiles, [], "disabled project rules not loaded");
  const disabledProjectInventory = ruleInventory(untrusted, "project");
  equal(
    disabledProjectInventory?.enabled,
    false,
    "disabled project inventory flag",
  );
  equal(
    disabledProjectInventory?.files,
    ["$CASE/workspace/project/.codex/rules/project.rules"],
    "disabled project file remains discoverable",
  );
  equal(decision(untrustedRecord, 0), "prompt", "disabled project fallback");

  const ignoreConfigRecord = byId.get(IDS[6]);
  const ignoreConfig = load(ignoreConfigRecord);
  equal(
    ignoreConfig.discovery.ignoreUserConfig,
    true,
    "ignore-user-config flag",
  );
  equal(ignoreConfig.stack.origins.model, null, "ignored user config origin");
  equal(
    ignoreConfig.loadedFiles,
    ["$CASE/home/rules/user.rules"],
    "rules survive ignore-user-config",
  );
  equal(
    decision(ignoreConfigRecord, 0),
    "allow",
    "rules survive ignore-user-config decision",
  );

  const ignoreRulesRecord = byId.get(IDS[7]);
  const ignoreRules = load(ignoreRulesRecord);
  equal(
    ignoreRules.stack.ignoreUserAndProjectExecPolicyRules,
    true,
    "ignore-rules stack flag",
  );
  equal(
    ignoreRules.stack.effectiveConfig.model,
    "config-survives-rule-ignore",
    "config survives rule ignore",
  );
  equal(ignoreRules.loadedFiles, [], "ignored user rules not loaded");
  const ignoredUserInventory = ruleInventory(ignoreRules, "user");
  equal(
    ignoredUserInventory?.ignoredByExecPolicy,
    true,
    "ignored user rule inventory flag",
  );
  equal(
    ignoredUserInventory?.files,
    ["$CASE/home/rules/user.rules"],
    "ignored rule remains discoverable",
  );
  equal(decision(ignoreRulesRecord, 0), "prompt", "ignored rule fallback");

  const cloudRecord = byId.get(IDS[8]);
  const cloud = load(cloudRecord);
  equal(
    layerKinds(cloud),
    [
      "packaged_defaults",
      "system",
      "enterprise_managed",
      "enterprise_managed",
      "user",
    ],
    "cloud config layer order",
  );
  equal(
    cloud.stack.effectiveConfig.file_opener,
    "cloud-low-editor",
    "cloud low config",
  );
  equal(
    cloud.stack.effectiveConfig.model_provider,
    "cloud-high-provider",
    "cloud high config",
  );
  equal(
    cloud.stack.effectiveConfig.model,
    "user-model",
    "user-over-cloud precedence",
  );
  equal(
    cloud.requirements,
    {
      execPolicySource: {
        kind: "composite",
        sources: [
          {
            id: "requirements-high",
            kind: "enterprise_managed",
            name: "Requirements high",
          },
          {
            id: "requirements-low",
            kind: "enterprise_managed",
            name: "Requirements low",
          },
        ],
      },
      inputSourcesLowToHigh: null,
      normalizedRulesPresent: true,
      rawRulesPresent: true,
    },
    "cloud requirements provenance",
  );
  equal(decision(cloudRecord, 0), "forbidden", "cloud requirements decision");

  const fallbackRecord = byId.get(IDS[9]);
  const fallback = load(fallbackRecord);
  equal(
    fallback.loadedFiles,
    ["$CASE/home/rules/a-broken.rules", "$CASE/home/rules/z-broken.rules"],
    "malformed ordinary-rule stable order",
  );
  equal(fallback.warning?.kind, "parse_policy", "ordinary-rule warning kind");
  equal(
    fallback.warning?.path,
    "$CASE/home/rules/a-broken.rules",
    "first ordinary-rule warning path",
  );
  equal(
    fallback.warning?.location?.path,
    "$CASE/home/rules/a-broken.rules",
    "warning location path",
  );
  equal(
    fallback.requirements.execPolicySource,
    {
      id: "fallback",
      kind: "enterprise_managed",
      name: "Managed fallback",
    },
    "requirements fallback provenance",
  );
  equal(
    decision(fallbackRecord, 0),
    "forbidden",
    "requirements fallback decision",
  );
  equal(decision(fallbackRecord, 1), "prompt", "unmatched fallback decision");

  const symlinkRecord = byId.get(IDS[10]);
  if (symlinkRecord.result.skipped) {
    equal(
      symlinkRecord.upstream.os,
      "windows",
      "symlink skip platform identity",
    );
    equal(
      symlinkRecord.result.skipped,
      {
        platform: "windows",
        reason: "requires_unix_symlinks",
      },
      "Windows symlink skip",
    );
  } else {
    const symlink = load(symlinkRecord);
    truthy(
      symlinkRecord.upstream.os !== "windows",
      "symlink case must run outside Windows",
    );
    equal(
      symlink.loadedFiles,
      ["$CASE/workspace/link/.codex/rules/project.rules"],
      "symlink rule path",
    );
    equal(
      symlink.stack.origins.project_doc_max_bytes?.dotCodexFolder,
      "$CASE/workspace/link/.codex",
      "symlink project origin",
    );
    equal(
      symlink.stack.effectiveConfig.projects,
      {
        "$CASE/workspace/real": { trust_level: "trusted" },
      },
      "symlink trust canonical path",
    );
    equal(decision(symlinkRecord, 0), "allow", "symlink project rule decision");
  }

  process.stdout.write(
    `verified bundled host-config semantics: ${records.length}/${IDS.length} cases\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
