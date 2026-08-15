#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined)
      throw new Error(`invalid argument at ${key ?? "<end>"}`);
    options[key.slice(2)] = value;
  }
  if (
    !options.inventory ||
    !options.scan ||
    !options["repository-scan"] ||
    !options.summary ||
    !options.output
  ) {
    throw new Error(
      "usage: render-study.mjs --inventory <inventory.all.jsonl> --scan <plugin-scan.all.jsonl> --repository-scan <repository-scan.all.jsonl> --summary <inventory-summary.json> --output <directory>",
    );
  }
  return options;
}

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function compactList(values, limit = 8) {
  const clean = [...new Set((values ?? []).filter(Boolean))];
  if (!clean.length) return "—";
  const visible = clean
    .slice(0, limit)
    .map((value) => `\`${escapeCell(value)}\``)
    .join(", ");
  return clean.length > limit
    ? `${visible}（另 ${clean.length - limit} 项）`
    : visible;
}

function yesNoCount(values) {
  return values?.length ? `有（${values.length}）` : "未发现";
}

function pluginUrl(record) {
  if (!record.scannedCommit) return `https://github.com/${record.repository}`;
  const suffix = record.subpath === "." ? "" : `/${record.subpath}`;
  return `https://github.com/${record.repository}/tree/${record.scannedCommit}${suffix}`;
}

function sourceUrl(origin, sourceCommit) {
  return `https://github.com/0xsline/awesome-deepseek-harness/blob/${sourceCommit}/${origin.sourceFile}#L${origin.sourceLine}`;
}

function originLabel(record) {
  return record.origins
    .map(
      (origin) =>
        `${origin.sourceLayer}:${origin.sourceSection}@L${origin.sourceLine}`,
    )
    .join("; ");
}

function packageNames(record) {
  return (
    record.evidence?.packageJson
      ?.map((manifest) => manifest.name)
      .filter(Boolean) ?? []
  );
}

function implementationSummary(record) {
  if (record.sourceReviewLevel === "unavailable")
    return `未审源码：${record.classification}`;
  const activation = [
    ...(record.evidence?.activationFiles ?? []),
    ...(record.evidence?.bundlePackages ?? []).map(
      (item) => `${item.path} → ${item.patch}`,
    ),
  ];
  const pieces = [record.classification];
  if (activation.length) pieces.push(`activation ${activation.length}`);
  if (record.evidence?.entryFiles?.length)
    pieces.push(`entry ${record.evidence.entryFiles.length}`);
  if (record.extensionPoints?.tools?.length)
    pieces.push(`tools ${record.extensionPoints.tools.length}`);
  if (record.extensionPoints?.events?.length)
    pieces.push(`events ${record.extensionPoints.events.length}`);
  if (record.extensionPoints?.clientUiFiles?.length)
    pieces.push(`UI ${record.extensionPoints.clientUiFiles.length}`);
  if (record.stateAndPersistence?.length)
    pieces.push(`state ${record.stateAndPersistence.join("+")}`);
  return pieces.join("; ");
}

function statusCounts(records, field) {
  return Object.fromEntries(
    [...Map.groupBy(records, (record) => record[field]).entries()]
      .map(([key, values]) => [key, values.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizedClassification(record) {
  if (record.sourceReviewLevel === "unavailable") return record.classification;
  const activation = [
    ...(record.evidence?.activationFiles ?? []),
    ...(record.evidence?.bundlePackages ?? []).map((item) => item.path),
  ];
  const activationOwners = new Set(
    activation.map((file) => path.posix.dirname(file)),
  );
  const packageNames =
    record.evidence?.packageJson
      ?.map((manifest) => manifest.name ?? "")
      .join(" ") ?? "";
  const identity =
    `${record.repository} ${record.name} ${packageNames}`.toLowerCase();
  const description = String(record.description ?? "").toLowerCase();
  if (activation.length) {
    if (activationOwners.size > 1) return "plugin-collection";
    if (
      /theme|skin|catppuccin|solarized|colorscheme|dskin|wallpaper|custom-css|appearance/.test(
        identity,
      ) ||
      (/background/.test(identity) &&
        /wallpaper|theme|skin|css|壁纸|背景图|换肤|web\s*ui/.test(description))
    ) {
      return "theme-plugin";
    }
    return "dsh-plugin";
  }
  return record.classification;
}

function normalizedReleaseSignals(signals) {
  return (signals ?? []).filter((signal) => {
    if (signal.includes("#scripts.")) return true;
    const filename = path.posix.basename(signal).toLowerCase();
    return /(?:release|publish|deploy|package|npm|provenance|pages|tag)/.test(
      filename,
    );
  });
}

function normalizeRecord(record) {
  const normalized = {
    ...record,
    evidence: {
      ...(record.evidence ?? {}),
      releaseSignals: normalizedReleaseSignals(record.evidence?.releaseSignals),
    },
    reusablePatterns: [...(record.reusablePatterns ?? [])],
    gaps: [...(record.gaps ?? [])],
  };
  normalized.classification = normalizedClassification(normalized);

  const releasePattern = "contains an explicit packaging/release path";
  const releaseGap = "no explicit release workflow or publish script was found";
  if (!normalized.evidence.releaseSignals.length) {
    normalized.reusablePatterns = normalized.reusablePatterns.filter(
      (item) => item !== releasePattern,
    );
    if (
      /plugin/.test(normalized.classification) &&
      !normalized.gaps.includes(releaseGap)
    ) {
      normalized.gaps.push(releaseGap);
    }
  }
  return normalized;
}

function compactPluginRecord(record) {
  return {
    schemaVersion: 1,
    key: record.key,
    name: record.name,
    description: record.description,
    repository: record.repository,
    url: `https://github.com/${record.repository}`,
    subpath: record.subpath,
    requestedRef: record.requestedRef ?? null,
    source: record.origins.map((origin) => ({
      layer: origin.sourceLayer,
      file: origin.sourceFile,
      line: origin.sourceLine,
      section: origin.sourceSection,
      packageSpec: origin.packageSpec ?? null,
    })),
    review: {
      level: record.sourceReviewLevel,
      classification: record.classification,
      commit: record.scannedCommit ?? null,
      defaultBranch: record.defaultBranch ?? null,
    },
    packageManifests: (record.evidence?.packageJson ?? []).map((manifest) => ({
      path: manifest.path,
      name: manifest.name ?? null,
      version: manifest.version ?? null,
      private: manifest.private ?? null,
      main: manifest.main ?? null,
      module: manifest.module ?? null,
      bin: manifest.bin ?? null,
      files: manifest.files ?? null,
      scriptNames: Object.keys(manifest.scripts ?? {}).sort(),
      dsh: manifest.dsh ?? null,
      parseError: manifest.parseError ?? null,
    })),
    activation: {
      files: record.evidence?.activationFiles ?? [],
      bundlePackages: record.evidence?.bundlePackages ?? [],
    },
    implementation: {
      targetFileCount: record.evidence?.targetFileCount ?? null,
      sourceFileCount: record.evidence?.sourceFileCount ?? null,
      entries: record.evidence?.entryFiles ?? [],
      inspectedTextFiles: (record.evidence?.inspectedTextFiles ?? []).slice(
        0,
        40,
      ),
    },
    extensionPoints: {
      extraction: "bounded-static-regex-candidates",
      services: record.extensionPoints?.services ?? [],
      tools: record.extensionPoints?.tools ?? [],
      events: record.extensionPoints?.events ?? [],
      commands: record.extensionPoints?.commands ?? [],
      clientUiFiles: (record.extensionPoints?.clientUiFiles ?? []).slice(0, 30),
      hasDshOrCordisDependency:
        record.extensionPoints?.hasDshOrCordisDependency ?? false,
    },
    stateAndPersistence: record.stateAndPersistence ?? [],
    quality: {
      tests: (record.evidence?.testFiles ?? []).slice(0, 50),
      workflows: record.evidence?.workflowFiles ?? [],
      releaseSignals: record.evidence?.releaseSignals ?? [],
      licenses: record.evidence?.licenseFiles ?? [],
      lockFiles: record.evidence?.lockFiles ?? [],
    },
    installation: {
      listedPackageSpec: record.installation?.listedPackageSpec ?? null,
      packageNames: record.installation?.packageNames ?? [],
      documentedCommands: (record.installation?.documentedCommands ?? [])
        .slice(0, 8)
        .map((command) => command.slice(0, 500)),
    },
    reusablePatterns: record.reusablePatterns ?? [],
    gaps: record.gaps ?? [],
  };
}

function renderReadmeReviews(records, sourceCommit) {
  const lines = [
    "# README 精选插件逐项源码审查",
    "",
    `范围固定到 \`awesome-deepseek-harness@${sourceCommit}\` 的 README 285 个插件条目。每节都对应一个去重后的 GitHub repo+subpath；“源码已审”只表示扫描时实际读取了固定 HEAD 的 manifest、activation、入口、测试和 workflow 候选文件，不代表运行时行为已经通过复现实验。`,
    "",
  ];
  for (const record of records) {
    const primaryOrigin =
      record.origins.find(
        (origin) => origin.sourceLayer === "readme-curated",
      ) ?? record.origins[0];
    const activation = [
      ...(record.evidence?.activationFiles ?? []),
      ...(record.evidence?.bundlePackages ?? []).map(
        (item) => `${item.path} → ${item.patch}`,
      ),
    ];
    const workflows = record.evidence?.workflowFiles ?? [];
    const tests = record.evidence?.testFiles ?? [];
    const inspected = record.evidence?.inspectedTextFiles ?? [];
    lines.push(
      `## ${record.name}`,
      "",
      `- 榜单来源：[${primaryOrigin.sourceSection} · L${primaryOrigin.sourceLine}](${sourceUrl(primaryOrigin, sourceCommit)})；源码：[${record.repository}${record.subpath === "." ? "" : `/${record.subpath}`}](${pluginUrl(record)})。`,
      `- 结论：\`${record.classification}\`；审查层级 \`${record.sourceReviewLevel}\`${record.scannedCommit ? `；HEAD \`${record.scannedCommit}\`` : ""}。`,
      `- 包与安装：${compactList(packageNames(record))}；榜单 spec ${record.installation?.listedPackageSpec ? `\`${escapeCell(record.installation.listedPackageSpec)}\`` : "未给出"}；文档命令 ${compactList(record.installation?.documentedCommands, 5)}。`,
      `- DSH/Cordis activation：${compactList(activation, 12)}。入口：${compactList(record.evidence?.entryFiles, 12)}。`,
      `- 扩展面：services ${compactList(record.extensionPoints?.services)}；tools ${compactList(record.extensionPoints?.tools)}；events ${compactList(record.extensionPoints?.events)}；commands ${compactList(record.extensionPoints?.commands)}；client UI ${yesNoCount(record.extensionPoints?.clientUiFiles)}。`,
      `- 状态/持久化信号：${compactList(record.stateAndPersistence)}。`,
      `- 测试与发布：tests ${yesNoCount(tests)} ${compactList(tests, 6)}；workflows ${yesNoCount(workflows)} ${compactList(workflows, 6)}；release ${compactList(record.evidence?.releaseSignals, 6)}。`,
      `- 可借鉴模式：${record.reusablePatterns?.length ? record.reusablePatterns.join("；") : "当前证据不足，未抽取实现模式"}。`,
      `- 明显缺口：${record.gaps?.length ? record.gaps.join("；") : "本次静态审查未发现结构性缺口；这不等于已验证运行时质量"}。`,
      `- 已读取证据：${compactList(inspected, 14)}。`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderCatalogDirectory(records) {
  const lines = [
    "# CATALOG-only 自动目录层",
    "",
    "这里覆盖 CATALOG 中不在 README 精选层的 1124 个 repo+subpath。表格明确区分真实 activation、只有插件自述但未发现 activation、skill/MCP/client/infra/topic noise，以及无法访问的仓库。详细 manifest、入口、测试、workflow 与安装证据在同目录 `plugin-study.jsonl` 中逐条保存。",
    "",
    "| 条目 | 来源 | 固定版本 | 分类与审查 | 实现摘要 | 测试 / workflow | 主要缺口 |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const record of records) {
    const origin =
      record.origins.find((item) => item.sourceLayer !== "readme-curated") ??
      record.origins[0];
    const target = `[${escapeCell(record.name)}](${pluginUrl(record)})`;
    const version = record.scannedCommit
      ? `\`${record.scannedCommit.slice(0, 12)}\``
      : "—";
    const tests = record.evidence?.testFiles?.length ?? 0;
    const workflows = record.evidence?.workflowFiles?.length ?? 0;
    lines.push(
      `| ${target}<br>\`${escapeCell(record.repository)}::${escapeCell(record.subpath)}\` | ${escapeCell(origin.sourceLayer)} / ${escapeCell(origin.sourceSection)} | ${version} | \`${escapeCell(record.classification)}\`<br>\`${escapeCell(record.sourceReviewLevel)}\` | ${escapeCell(implementationSummary(record))} | ${tests} / ${workflows} | ${escapeCell(record.gaps?.join("；") || "—")} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderFailures(records) {
  const failures = records.filter(
    (record) =>
      record.sourceReviewLevel === "unavailable" ||
      record.sourceReviewLevel === "repository-metadata-only",
  );
  const lines = [
    "# 无法完成源码审查的条目",
    "",
    "这些条目没有被伪装成源码已审。失败原因来自固定扫描结果；瞬时网络错误应通过扫描器续跑后再生成本表。",
    "",
    "| 条目 | 来源 | 分类 | 原因 |",
    "|---|---|---|---|",
  ];
  for (const record of failures) {
    lines.push(
      `| [${escapeCell(record.name)}](https://github.com/${record.repository})<br>\`${escapeCell(record.key)}\` | ${escapeCell(originLabel(record))} | \`${escapeCell(record.classification)}\` | ${escapeCell(record.gaps?.join("；") || "target path had no inspectable files")} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderOverview({
  inventorySummary,
  records,
  readmeRecords,
  catalogOnlyRecords,
  sourceCommit,
}) {
  const accessible = records.filter(
    (record) => record.sourceReviewLevel === "source-inspected",
  ).length;
  const metadataOnly = records.filter(
    (record) => record.sourceReviewLevel === "repository-metadata-only",
  ).length;
  const unavailable = records.length - accessible - metadataOnly;
  const lines = [
    "# awesome-deepseek-harness 插件级源码研究（List A）",
    "",
    `研究源固定为 [0xsline/awesome-deepseek-harness@${sourceCommit}](https://github.com/0xsline/awesome-deepseek-harness/tree/${sourceCommit})。本目录研究的是榜单里的每一个实现，而不是 awesome-list 的收录规则。`,
    "",
    "## 覆盖范围",
    "",
    `- README 精选层：${inventorySummary.counts.readmeUniqueTargets} 个 repo+subpath，${inventorySummary.counts.readmeRepositories} 个仓库。`,
    `- CATALOG 自动层：${inventorySummary.counts.catalogEntries} 个原始条目；扣除 README 重合后 ${inventorySummary.counts.catalogOnlyTargets} 个 repo+subpath。`,
    `- 总计：${inventorySummary.counts.allUniqueTargets} 个唯一 repo+subpath、${inventorySummary.counts.allRepositories} 个 GitHub 仓库。`,
    `- 扫描结果：源码已审 ${accessible}；仅仓库元数据 ${metadataOnly}；不可访问/空仓库 ${unavailable}。`,
    "",
    "CATALOG 自称“998 个 topic 仓库 + 12 个手动补充”，但当前文件实际包含 1007 个 topic 表格行；本研究以可复核的 Markdown 行数为准，并保留这一源数据矛盾。",
    "",
    "## 读什么、没有声称什么",
    "",
    "每个可访问目标都固定到扫描时 HEAD，检查 package manifest、`dsh.bundle.patch` / Cordis patch / legacy plugin manifest、核心 TypeScript/JavaScript 入口、测试文件、GitHub Actions / release 脚本、安装文档，并静态抽取服务、工具、事件、命令、客户端 UI 和持久化信号。扩展点名称是有界正则得到的静态候选，不等于运行时注册集。静态扫描不能替代真实 DSH Loader、模型调用或端到端 UI 复现，因此本目录使用 `source-inspected`，不使用“运行验证通过”。",
    "",
    "## 文件",
    "",
    "- `plugin-study.jsonl`：1409 个逐 repo+subpath 的完整、可机器读取记录。",
    "- `repository-study.jsonl`：1344 个逐仓库记录，含固定 SHA 与仓库级 workflow/release/license/lockfile。",
    "- `readme-plugin-reviews.md`：README 285 个精选条目的逐项详细审查。",
    "- `catalog-only-directory.md`：1124 个 CATALOG-only 条目的自动目录与明确分类。",
    "- `implementation-patterns.md`：从真实插件实现反推对 dsh-codex 有用的设计模式。",
    "- `unavailable.md`：私有、404、空仓库、缺失 subpath 等没有完成源码审查的条目。",
    "- `scripts/`：从固定 awesome checkout 重建 inventory、联网扫描、渲染报告和离线验证公开产物。全部中间 inventory/scan/cache 写进 `generated/`，该目录已被 `.gitignore` 排除。",
    "",
    "## 复现",
    "",
    "```sh",
    `git clone https://github.com/0xsline/awesome-deepseek-harness.git /tmp/awesome-deepseek-harness`,
    `git -C /tmp/awesome-deepseek-harness checkout ${sourceCommit}`,
    "node scripts/build-inventory.mjs --awesome /tmp/awesome-deepseek-harness --output generated",
    "node scripts/scan-repositories.mjs --inventory generated/inventory.all.jsonl --output generated --scope all --concurrency 4",
    "node scripts/render-study.mjs --inventory generated/inventory.all.jsonl --scan generated/plugin-scan.all.jsonl --repository-scan generated/repository-scan.all.jsonl --summary generated/inventory-summary.json --output .",
    "node scripts/verify-study.mjs",
    "```",
    "",
    "扫描器使用有界并发、repo 级缓存和临时目录清理。普通仓库走 shallow partial clone；大仓库可回退到 `tree:0` 稀疏树、codeload 或 GitHub tree/raw。重新运行会复用成功结果，并重试瞬时网络失败。",
    "",
    "## 分类总览",
    "",
    "```json",
    JSON.stringify(statusCounts(records, "classification"), null, 2),
    "```",
    "",
    `README 详细层共 ${readmeRecords.length} 条；CATALOG-only 自动层共 ${catalogOnlyRecords.length} 条。`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv);
const inventory = parseJsonl(await readFile(options.inventory, "utf8"));
const scan = parseJsonl(await readFile(options.scan, "utf8"));
const repositoryScan = parseJsonl(
  await readFile(options["repository-scan"], "utf8"),
);
const inventorySummary = JSON.parse(await readFile(options.summary, "utf8"));
const sourceCommit = inventorySummary.source.commit;
const scanByKey = new Map(scan.map((record) => [record.key, record]));
const records = inventory.map((item) => {
  const scanned = scanByKey.get(item.key);
  if (!scanned) throw new Error(`scan output missing ${item.key}`);
  return normalizeRecord({ ...item, ...scanned });
});
const readmeRecords = records.filter((record) =>
  record.origins.some((origin) => origin.sourceLayer === "readme-curated"),
);
const catalogOnlyRecords = records.filter(
  (record) =>
    !record.origins.some((origin) => origin.sourceLayer === "readme-curated"),
);
const compactRepositories = repositoryScan.map((record) => ({
  repositoryKey: record.repositoryKey,
  repository: record.repository,
  url: record.url,
  status: record.status,
  headSha: record.headSha ?? null,
  defaultBranch: record.defaultBranch ?? null,
  fileCount: record.fileCount ?? null,
  inspectedTextFileCount: record.inspectedTextFileCount ?? 0,
  scanTransport: record.scanTransport ?? null,
  workflowFiles: record.workflowFiles ?? [],
  releaseSignals: normalizedReleaseSignals(record.releaseSignals),
  licenseFiles: record.licenseFiles ?? [],
  lockFiles: record.lockFiles ?? [],
  targetKeys:
    record.targetKeys ?? record.targets?.map((target) => target.key) ?? [],
  error: record.error ?? null,
}));
const compactPlugins = records.map(compactPluginRecord);
if (
  readmeRecords.length !== 285 ||
  catalogOnlyRecords.length !== 1124 ||
  records.length !== 1409
) {
  throw new Error(
    `coverage mismatch: readme=${readmeRecords.length} catalogOnly=${catalogOnlyRecords.length} all=${records.length}`,
  );
}

await mkdir(options.output, { recursive: true });
await Promise.all([
  writeFile(
    path.join(options.output, "README.md"),
    renderOverview({
      inventorySummary,
      records,
      readmeRecords,
      catalogOnlyRecords,
      sourceCommit,
    }),
  ),
  writeFile(
    path.join(options.output, "readme-plugin-reviews.md"),
    renderReadmeReviews(readmeRecords, sourceCommit),
  ),
  writeFile(
    path.join(options.output, "catalog-only-directory.md"),
    renderCatalogDirectory(catalogOnlyRecords),
  ),
  writeFile(
    path.join(options.output, "unavailable.md"),
    renderFailures(records),
  ),
  writeFile(
    path.join(options.output, "plugin-study.jsonl"),
    `${compactPlugins.map((record) => JSON.stringify(record)).join("\n")}\n`,
  ),
  writeFile(
    path.join(options.output, "repository-study.jsonl"),
    `${compactRepositories.map((record) => JSON.stringify(record)).join("\n")}\n`,
  ),
]);

console.log(
  JSON.stringify(
    {
      records: records.length,
      readme: readmeRecords.length,
      catalogOnly: catalogOnlyRecords.length,
      sourceReviewLevels: statusCounts(records, "sourceReviewLevel"),
      classifications: statusCounts(records, "classification"),
    },
    null,
    2,
  ),
);
