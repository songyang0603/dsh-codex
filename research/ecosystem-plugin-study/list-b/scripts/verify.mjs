#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const base = path.resolve(
  process.argv[2] ?? path.join(import.meta.dirname, ".."),
);
const lines = (await readFile(path.join(base, "plugins.jsonl"), "utf8"))
  .trim()
  .split("\n");
const [metadata, ...records] = lines.map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`invalid JSONL line ${index + 1}: ${error.message}`);
  }
});

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

check(
  metadata.recordType === "study-metadata",
  "line 1 must be study metadata",
);
check(
  records.length === metadata.coverage.uniqueTargets,
  "row count must equal declared uniqueTargets",
);
check(
  metadata.coverage.englishEntries === metadata.coverage.chineseEntries,
  "English/Chinese list counts differ",
);
check(
  metadata.coverage.englishOnly.length === 0,
  "English list has unmatched targets",
);
check(
  metadata.coverage.chineseOnly.length === 0,
  "Chinese list has unmatched targets",
);
check(
  metadata.coverage.accessible === records.length,
  "not every target is accessible",
);

const keys = new Set();
let observedBundles = 0;
for (const [index, record] of records.entries()) {
  const row = index + 2;
  const key = record.target?.canonicalKey;
  check(
    typeof key === "string" && key.length > 2,
    `line ${row}: missing canonical key`,
  );
  check(!keys.has(key), `line ${row}: duplicate canonical key ${key}`);
  keys.add(key);
  check(
    /^[0-9a-f]{40}$/.test(record.target?.head ?? ""),
    `line ${row}: invalid HEAD for ${key}`,
  );
  check(
    record.target?.scopeExists === true,
    `line ${row}: missing listed scope for ${key}`,
  );
  check(
    /^https:\/\/github\.com\//.test(record.list?.url ?? ""),
    `line ${row}: non-GitHub list URL for ${key}`,
  );
  check(
    typeof record.list?.category === "string",
    `line ${row}: missing category for ${key}`,
  );
  check(
    Array.isArray(record.packages),
    `line ${row}: packages is not an array for ${key}`,
  );
  check(
    Array.isArray(record.bundle?.files),
    `line ${row}: bundle evidence missing for ${key}`,
  );
  check(
    Array.isArray(record.architecture?.inspectedEntrypoints),
    `line ${row}: entrypoint evidence missing for ${key}`,
  );
  check(
    Array.isArray(record.verification?.tests?.files),
    `line ${row}: test evidence missing for ${key}`,
  );
  if (record.classification?.hasInstallableBundle) {
    observedBundles += 1;
    check(
      record.bundle.files.length > 0,
      `line ${row}: installable classification lacks patch file for ${key}`,
    );
    check(
      record.packages.some((pkg) => pkg.bundlePatch),
      `line ${row}: installable classification lacks manifest declaration for ${key}`,
    );
  }
  for (const file of [
    ...record.architecture.inspectedEntrypoints,
    ...record.verification.tests.files,
    ...record.bundle.files.map((entry) => entry.path),
  ]) {
    check(
      typeof file === "string" &&
        !path.posix.isAbsolute(file) &&
        !file.split("/").includes(".."),
      `line ${row}: unsafe evidence path ${file}`,
    );
  }
}
check(
  observedBundles === metadata.coverage.installableBundleObserved,
  "observed bundle count differs from metadata",
);

const markdown = await readFile(path.join(base, "clusters.md"), "utf8");
check(
  markdown.includes(metadata.source.commit),
  "clusters.md omits the list commit pin",
);
check(
  markdown.includes("## Complete target index"),
  "clusters.md omits complete target index",
);
for (const record of records) {
  check(
    markdown.includes(record.target.head.slice(0, 12)),
    `clusters.md omits ${record.target.canonicalKey}`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `verified ${records.length} unique pinned targets, ${observedBundles} observable bundles, and complete Markdown coverage\n`,
  );
}
