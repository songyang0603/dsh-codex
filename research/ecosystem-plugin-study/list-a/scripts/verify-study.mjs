#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXPECTED = {
  plugins: 1409,
  repositories: 1344,
  readme: 285,
  catalogOnly: 1124,
};
const ALLOWED_CLASSIFICATIONS = new Set([
  "claimed-plugin-unverified-activation",
  "client-or-launcher",
  "directory-or-registry",
  "dsh-plugin",
  "inaccessible-or-private",
  "mcp-server-or-tool",
  "plugin-collection",
  "skill",
  "theme-plugin",
  "topic-noise-or-non-plugin",
]);

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined)
      throw new Error(`invalid argument at ${key ?? "<end>"}`);
    options[key.slice(2)] = value;
  }
  return options;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJsonl(text, label) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${label}:${index + 1}: ${error.message}`);
      }
    });
}

function countsBy(records, selector) {
  return Object.fromEntries(
    [...Map.groupBy(records, selector).entries()]
      .map(([key, values]) => [key, values.length])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

async function trackedGeneratedFiles(studyRoot) {
  try {
    const { stdout: repositoryRootText } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      {
        cwd: studyRoot,
        encoding: "utf8",
      },
    );
    const repositoryRoot = repositoryRootText.trim();
    const generated = path.relative(
      repositoryRoot,
      path.join(studyRoot, "generated"),
    );
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "--", generated],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
      },
    );
    return stdout.split(/\r?\n/).filter(Boolean);
  } catch (error) {
    if (
      /not a git repository/i.test(
        `${error.stderr ?? ""} ${error.message ?? ""}`,
      )
    )
      return null;
    throw error;
  }
}

const options = parseArgs(process.argv);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const studyRoot = path.resolve(
  options.root ?? path.join(scriptDirectory, ".."),
);
const publicFiles = [
  "README.md",
  "implementation-patterns.md",
  "readme-plugin-reviews.md",
  "catalog-only-directory.md",
  "unavailable.md",
  "plugin-study.jsonl",
  "repository-study.jsonl",
  ".gitignore",
];
const contents = new Map(
  await Promise.all(
    publicFiles.map(async (file) => [
      file,
      await readFile(path.join(studyRoot, file), "utf8"),
    ]),
  ),
);
const plugins = parseJsonl(
  contents.get("plugin-study.jsonl"),
  "plugin-study.jsonl",
);
const repositories = parseJsonl(
  contents.get("repository-study.jsonl"),
  "repository-study.jsonl",
);

assert(
  plugins.length === EXPECTED.plugins,
  `expected ${EXPECTED.plugins} plugin records, got ${plugins.length}`,
);
assert(
  repositories.length === EXPECTED.repositories,
  `expected ${EXPECTED.repositories} repository records, got ${repositories.length}`,
);
assert(
  new Set(plugins.map((record) => record.key)).size === plugins.length,
  "plugin keys are not unique",
);
assert(
  new Set(repositories.map((record) => record.repository.toLowerCase()))
    .size === repositories.length,
  "repository names are not unique case-insensitively",
);

const readmeRecords = plugins.filter((record) =>
  record.source.some((origin) => origin.layer === "readme-curated"),
);
const catalogOnlyRecords = plugins.filter(
  (record) =>
    !record.source.some((origin) => origin.layer === "readme-curated"),
);
assert(
  readmeRecords.length === EXPECTED.readme,
  `expected ${EXPECTED.readme} README records, got ${readmeRecords.length}`,
);
assert(
  catalogOnlyRecords.length === EXPECTED.catalogOnly,
  `expected ${EXPECTED.catalogOnly} CATALOG-only records, got ${catalogOnlyRecords.length}`,
);

const repositoryByName = new Map(
  repositories.map((record) => [record.repository.toLowerCase(), record]),
);
const allRepositoryTargetKeys = repositories.flatMap(
  (record) => record.targetKeys,
);
assert(
  new Set(allRepositoryTargetKeys).size === plugins.length &&
    allRepositoryTargetKeys.length === plugins.length,
  "repository targetKeys do not form a one-to-one cover of plugin records",
);

for (const record of plugins) {
  assert(
    record.schemaVersion === 1,
    `${record.key}: unexpected public schema version`,
  );
  assert(
    ALLOWED_CLASSIFICATIONS.has(record.review.classification),
    `${record.key}: unknown classification`,
  );
  assert(record.source.length > 0, `${record.key}: missing source-list origin`);
  assert(
    record.source.every(
      (origin) =>
        ["README.md", "CATALOG.md"].includes(origin.file) &&
        Number.isInteger(origin.line) &&
        origin.line > 0,
    ),
    `${record.key}: invalid source-list pointer`,
  );
  const repository = repositoryByName.get(record.repository.toLowerCase());
  assert(repository, `${record.key}: missing repository record`);
  assert(
    repository.targetKeys.includes(record.key),
    `${record.key}: absent from repository targetKeys`,
  );

  if (record.review.level === "source-inspected") {
    assert(
      /^[0-9a-f]{40}$/.test(record.review.commit ?? ""),
      `${record.key}: source review lacks fixed HEAD SHA`,
    );
    assert(
      record.implementation.inspectedTextFiles.length > 0,
      `${record.key}: source review read no text files`,
    );
    assert(
      repository.status === "accessible",
      `${record.key}: source review belongs to inaccessible repository`,
    );
    assert(
      record.review.commit === repository.headSha,
      `${record.key}: plugin/repository commit mismatch`,
    );
  } else if (record.review.level === "unavailable") {
    assert(
      record.review.commit === null,
      `${record.key}: unavailable record unexpectedly claims a commit`,
    );
    assert(
      record.review.classification === "inaccessible-or-private",
      `${record.key}: unavailable record lacks explicit failure classification`,
    );
  } else {
    throw new Error(
      `${record.key}: unsupported review level ${record.review.level}`,
    );
  }
}

for (const repository of repositories) {
  if (repository.status === "accessible") {
    assert(
      /^[0-9a-f]{40}$/.test(repository.headSha ?? ""),
      `${repository.repository}: accessible repo lacks SHA`,
    );
    assert(
      repository.inspectedTextFileCount > 0,
      `${repository.repository}: accessible repo read no text`,
    );
  } else {
    assert(
      repository.status === "unavailable",
      `${repository.repository}: unknown repository status`,
    );
    assert(
      repository.error?.kind === "inaccessible-or-private",
      `${repository.repository}: unavailable repo has unstable or missing failure kind`,
    );
  }
}

assert(
  countMatches(contents.get("readme-plugin-reviews.md"), /^## /gm) ===
    EXPECTED.readme,
  "README review section count mismatch",
);
assert(
  countMatches(contents.get("catalog-only-directory.md"), /^\| \[/gm) ===
    EXPECTED.catalogOnly,
  "CATALOG-only table row count mismatch",
);
const unavailableCount = plugins.filter(
  (record) => record.review.level === "unavailable",
).length;
assert(
  countMatches(contents.get("unavailable.md"), /^\| \[/gm) === unavailableCount,
  "unavailable ledger row count mismatch",
);

const combinedPublicText = [...contents.entries()]
  .filter(([file]) => !file.endsWith(".jsonl"))
  .map(([, text]) => text)
  .join("\n");
assert(
  !/\/Users\/[A-Za-z0-9._-]+\//.test(combinedPublicText),
  "public Markdown contains a local user path",
);
assert(
  !/\bghp_[A-Za-z0-9]{20,}\b/.test(combinedPublicText),
  "public Markdown contains a GitHub token candidate",
);
assert(
  !/\bgithub_pat_[A-Za-z0-9_]{20,}\b/.test(combinedPublicText),
  "public Markdown contains a GitHub token candidate",
);
assert(
  /^generated\/$/m.test(contents.get(".gitignore")),
  ".gitignore does not exclude generated/",
);
const trackedCache = await trackedGeneratedFiles(studyRoot);
assert(
  trackedCache === null || trackedCache.length === 0,
  `generated cache is tracked: ${trackedCache?.join(", ")}`,
);

const result = {
  status: "ok",
  plugins: plugins.length,
  repositories: repositories.length,
  sourceReviewLevels: countsBy(plugins, (record) => record.review.level),
  classifications: countsBy(plugins, (record) => record.review.classification),
  repositoryStatuses: countsBy(repositories, (record) => record.status),
  generatedCacheTracked:
    trackedCache === null ? "not-checked-outside-git" : false,
};
console.log(JSON.stringify(result, null, 2));
