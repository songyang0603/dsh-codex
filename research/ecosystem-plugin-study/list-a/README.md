# awesome-deepseek-harness 插件级源码研究（List A）

研究源固定为 [0xsline/awesome-deepseek-harness@fb63172804b17befd383d658ab3b828abfbb95e5](https://github.com/0xsline/awesome-deepseek-harness/tree/fb63172804b17befd383d658ab3b828abfbb95e5)。本目录研究的是榜单里的每一个实现，而不是 awesome-list 的收录规则。

## 覆盖范围

- README 精选层：285 个 repo+subpath，277 个仓库。
- CATALOG 自动层：1332 个原始条目；扣除 README 重合后 1124 个 repo+subpath。
- 总计：1409 个唯一 repo+subpath、1344 个 GitHub 仓库。
- 扫描结果：源码已审 1218；仅仓库元数据 0；不可访问/空仓库 191。

CATALOG 自称“998 个 topic 仓库 + 12 个手动补充”，但当前文件实际包含 1007 个 topic 表格行；本研究以可复核的 Markdown 行数为准，并保留这一源数据矛盾。

## 读什么、没有声称什么

每个可访问目标都固定到扫描时 HEAD，检查 package manifest、`dsh.bundle.patch` / Cordis patch / legacy plugin manifest、核心 TypeScript/JavaScript 入口、测试文件、GitHub Actions / release 脚本、安装文档，并静态抽取服务、工具、事件、命令、客户端 UI 和持久化信号。扩展点名称是有界正则得到的静态候选，不等于运行时注册集。静态扫描不能替代真实 DSH Loader、模型调用或端到端 UI 复现，因此本目录使用 `source-inspected`，不使用“运行验证通过”。

## 文件

- `plugin-study.jsonl`：1409 个逐 repo+subpath 的完整、可机器读取记录。
- `repository-study.jsonl`：1344 个逐仓库记录，含固定 SHA 与仓库级 workflow/release/license/lockfile。
- `readme-plugin-reviews.md`：README 285 个精选条目的逐项详细审查。
- `catalog-only-directory.md`：1124 个 CATALOG-only 条目的自动目录与明确分类。
- `implementation-patterns.md`：从真实插件实现反推对 dsh-codex 有用的设计模式。
- `unavailable.md`：私有、404、空仓库、缺失 subpath 等没有完成源码审查的条目。
- `scripts/`：从固定 awesome checkout 重建 inventory、联网扫描、渲染报告和离线验证公开产物。全部中间 inventory/scan/cache 写进 `generated/`，该目录已被 `.gitignore` 排除。

## 复现

```sh
git clone https://github.com/0xsline/awesome-deepseek-harness.git /tmp/awesome-deepseek-harness
git -C /tmp/awesome-deepseek-harness checkout fb63172804b17befd383d658ab3b828abfbb95e5
node scripts/build-inventory.mjs --awesome /tmp/awesome-deepseek-harness --output generated
node scripts/scan-repositories.mjs --inventory generated/inventory.all.jsonl --output generated --scope all --concurrency 4
node scripts/render-study.mjs --inventory generated/inventory.all.jsonl --scan generated/plugin-scan.all.jsonl --repository-scan generated/repository-scan.all.jsonl --summary generated/inventory-summary.json --output .
node scripts/verify-study.mjs
```

扫描器使用有界并发、repo 级缓存和临时目录清理。普通仓库走 shallow partial clone；大仓库可回退到 `tree:0` 稀疏树、codeload 或 GitHub tree/raw。重新运行会复用成功结果，并重试瞬时网络失败。

## 分类总览

```json
{
  "claimed-plugin-unverified-activation": 79,
  "client-or-launcher": 36,
  "directory-or-registry": 30,
  "dsh-plugin": 837,
  "inaccessible-or-private": 191,
  "mcp-server-or-tool": 11,
  "plugin-collection": 106,
  "skill": 72,
  "theme-plugin": 27,
  "topic-noise-or-non-plugin": 20
}
```

README 详细层共 285 条；CATALOG-only 自动层共 1124 条。
