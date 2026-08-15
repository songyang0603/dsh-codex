# README 精选插件逐项源码审查

范围固定到 `awesome-deepseek-harness@fb63172804b17befd383d658ab3b828abfbb95e5` 的 README 285 个插件条目。每节都对应一个去重后的 GitHub repo+subpath；“源码已审”只表示扫描时实际读取了固定 HEAD 的 manifest、activation、入口、测试和 workflow 候选文件，不代表运行时行为已经通过复现实验。

## dsh-telemetry-redactor

- 榜单来源：[Git & Engineering · L288](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L288)；源码：[030611/dsh-telemetry-redactor](https://github.com/030611/dsh-telemetry-redactor/tree/811b0b1abf424e57045ab5a5eaa203660ca43908)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `811b0b1abf424e57045ab5a5eaa203660ca43908`。
- 包与安装：`dsh-telemetry-redactor`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `dsh plugin --profile web add dsh-telemetry-redactor`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `sessions`；tools —；events `session-telemetry/record`, `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（3） `tests/adversarial.spec.ts`, `tests/loader-composition.spec.ts`, `tests/redactor.spec.ts`；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.test:packed`, `package.json#scripts.test:packed:clean-env`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `tests/adversarial.spec.ts`, `tests/loader-composition.spec.ts`, `tests/redactor.spec.ts`, `vitest.config.ts`, `scripts/built-smoke.mjs`（另 5 项）。

## dsh-verification-receipt

- 榜单来源：[Git & Engineering · L289](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L289)；源码：[030611/dsh-verification-receipt](https://github.com/030611/dsh-verification-receipt/tree/92f63a9022e1840b147152ae340276ad5ff5d98b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `92f63a9022e1840b147152ae340276ad5ff5d98b`。
- 包与安装：`dsh-verification-receipt`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `dsh plugin --profile web add dsh-verification-receipt`, `Repeat the first command with another profile name (for example, `headless`) when that profile also needs receipts. For local development, clone this repository, run `pnpm install --frozen-lockfile && pnpm run check`, and pass the checkout path to `dsh plugin ... add` instead of the package name.`, `如果其他 profile（例如 `headless`）也需要凭证，请换用对应 profile 名重复第一条命令。本地开发时，克隆本仓库并运行 `pnpm install --frozen-lockfile && pnpm run check`，再把 checkout 路径而不是包名传给 `dsh plugin ... add`。`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（3） `tests/composition.spec.ts`, `tests/manifest.spec.ts`, `tests/receipt.spec.ts`；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.build`, `package.json#scripts.release:smoke`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `tests/composition.spec.ts`, `tests/manifest.spec.ts`, `tests/receipt.spec.ts`, `vitest.config.ts`, `scripts/performance-smoke.mjs`（另 2 项）。

## dsh-spotlight

- 榜单来源：[UI & Experience · L163](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L163)；源码：[0xsline/dsh-spotlight](https://github.com/0xsline/dsh-spotlight/tree/dd7ef5ed160aa1a624559de16eafd4ea9406d7ed)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `dd7ef5ed160aa1a624559de16eafd4ea9406d7ed`。
- 包与安装：`@0xsline/dsh-spotlight`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "@0xsline/dsh-spotlight"`, `dsh plugin --profile web add "github:0xsline/dsh-spotlight#main"`, `pnpm install`, `dsh plugin --profile web add "link:$(pwd)"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `commandUi`, `invariants`, `remote.commands`, `remote.pluginInventory`, `sessions`；tools —；events —；commands `/spotlight`；client UI 有（1）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（10） `tests/README.md`, `tests/client.spec.ts`, `tests/discovery.spec.ts`, `tests/dom.ts`, `tests/harness.ts`, `tests/mount.spec.ts`（另 4 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `tests/README.md`, `tests/snapshots/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/client.spec.ts`, `tests/discovery.spec.ts`, `tests/dom.ts`, `tests/harness.ts`（另 18 项）。

## dsh-portable-launcher

- 榜单来源：[Infrastructure & Development · L382](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L382)；源码：[15828148/dsh-portable-launcher](https://github.com/15828148/dsh-portable-launcher/tree/da805db1f201d2dd731ca291f97862cd43c75d4a)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `da805db1f201d2dd731ca291f97862cd43c75d4a`。
- 包与安装：—；榜单 spec 未给出；文档命令 `- **Automatic dsh install** via a local `npm install --prefix` into the package folder (no global install, no system changes; China npm mirror fallback on retries)`, `- Checks for the `dsh`package; if missing, runs`npm install --prefix "<folder>\dsh-local" @deepseek-ai/dsh``, `- **自动安装 dsh**：本地 `npm install --prefix` 装进包目录（无全局安装、无系统改动；重试时自动切换国内镜像）`, `- 检查 dsh 组件：缺失时执行 `npm install --prefix "包目录\dsh-local" @deepseek-ai/dsh`（本地安装，无全局改动）`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`。

## dsh-file-mentions

- 榜单来源：[UI & Experience · L218](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L218)；源码：[a903067276-rgb/dsh-file-mentions](https://github.com/a903067276-rgb/dsh-file-mentions/tree/00d02fa73098bf9e27b345dd3a207f346b075262)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `00d02fa73098bf9e27b345dd3a207f346b075262`。
- 包与安装：`dsh-file-mentions`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:a903067276-rgb/dsh-file-mentions#main"`, `Restart `dsh web`. Requires pnpm on PATH (`dsh plugin` forwards to pnpm).`, `重启 `dsh web` 生效。需要 pnpm（`dsh plugin` 是 pnpm 转发器）。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `conversationEvents`, `sessions`, `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-hud

- 榜单来源：[UI & Experience · L217](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L217)；源码：[a903067276-rgb/dsh-hud](https://github.com/a903067276-rgb/dsh-hud/tree/d14c0a1a08152436750510487306b2f1033071b9)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `d14c0a1a08152436750510487306b2f1033071b9`。
- 包与安装：`dsh-hud`；榜单 spec 未给出；文档命令 `- DSH web (run with `npx @deepseek-ai/dsh web`)`, `dsh plugin --profile web add "github:a903067276-rgb/dsh-hud#main"`, `Requires `pnpm` on PATH (`dsh plugin`forwards to pnpm):`npm i -g pnpm` if missing,`, `double mount in `~/.dsh/cordis.patch.yml`) exists for environments without `dsh plugin``, `To test locally: symlink (or `dsh plugin --profile web link`) into the web profile's`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `slots`, `timer`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-file-mount

- 榜单来源：[Context & Search · L104](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L104)；源码：[acefun29/dsh-file-mount](https://github.com/acefun29/dsh-file-mount/tree/7ecba8e9ad959aa59d2e035960993a3cc0389920)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `7ecba8e9ad959aa59d2e035960993a3cc0389920`。
- 包与安装：`dsh-file-mount`；榜单 spec 未给出；文档命令 `npx @deepseek-ai/dsh plugin --profile web add github:acefun29/dsh-file-mount`, `npx @deepseek-ai/dsh plugin --profile web add file:../dsh-file-mount`, `npx @deepseek-ai/dsh --profile web`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events `agent/session-start`, `agent/status`, `tools/post-execute`；commands —；client UI 有（7）。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（10） `tests/client/mounted-files.spec.ts`, `tests/client/view.client.spec.tsx`, `tests/compaction.spec.ts`, `tests/file-cache.spec.ts`, `tests/harness.ts`, `tests/integration.spec.ts`（另 4 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/compaction.spec.ts`, `tests/file-cache.spec.ts`, `tests/harness.ts`, `tests/integration.spec.ts`, `tests/ranges.spec.ts`, `tests/render.spec.ts`, `tests/store.spec.ts`（另 18 项）。

## dsh-plugin-acn

- 榜单来源：[Models & Inference · L261](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L261)；源码：[acnlabs/dsh-plugin-acn](https://github.com/acnlabs/dsh-plugin-acn/tree/13f2f93d5159372cb8282545bfad45e8335e9274)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `13f2f93d5159372cb8282545bfad45e8335e9274`。
- 包与安装：`@acnlabs/dsh-plugin-acn`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:acnlabs/dsh-plugin-acn`, `dsh plugin --profile web add ./dsh-plugin-acn`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `acn_agents_search`, `acn_inbox_list`, `acn_join`, `acn_message_send`, `acn_status`, `object`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（2） `tests/config.test.js`, `tests/format.test.js`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `tests/config.test.js`, `tests/format.test.js`, `src/acn.ts`, `src/config.ts`, `src/format.ts`, `src/skill.ts`, `src/vendor-dsh.d.ts`。

## dsh-browser-runtime

- 榜单来源：[Browser & Remote · L245](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L245)；源码：[anweat/dsh-browser](https://github.com/anweat/dsh-browser/tree/570ac8b54bd152b3f1be26cc0cc068f1a4eeb001)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `570ac8b54bd152b3f1be26cc0cc068f1a4eeb001`。
- 包与安装：`@anweat/dsh-browser`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @anweat/dsh-browser`, `dsh plugin --profile web add ./dsh-browser`, ``dsh plugin --profile web add ./<path>` 并在 profile 的 `pnpm-workspace.yaml``, `- 生成登录态：`npx playwright codegen --save-storage=storageState.json`（或复用 `dsh-web-search-pro`的`scripts/save-login.mjs`），把产物路径填进 `storageStatePath`。`, `pnpm install          # 装依赖（playwright / opencli / @deepseek-ai/*）`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `browser`；tools `browser_click`, `browser_close`, `browser_install`, `browser_open`, `browser_read`, `browser_screenshot`, `browser_scroll`, `browser_status`（另 2 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `scripts/install-browser.mjs`, `src/browser-service.ts`, `src/config.ts`, `src/deps.ts`, `src/tools.ts`。

## dsh-restart

- 榜单来源：[Infrastructure & Development · L395](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L395)；源码：[anweat/dsh-restart](https://github.com/anweat/dsh-restart/tree/8d9f4947530a08e9a2967a7847ae2f906c2d7b5b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `8d9f4947530a08e9a2967a7847ae2f906c2d7b5b`。
- 包与安装：`dsh-restart`；榜单 spec 未给出；文档命令 `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `webServer`；tools `restart_harness`；events —；commands `restart`；client UI 有（15）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepack`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tsdown.config.ts`, `scripts/link-dsh-workspace.mjs`, `src/client/SettingsCard.tsx`, `src/client/context-types.ts`, `src/client/locales.ts`, `src/client/styles.ts`。

## dsh-voice-webspeech

- 榜单来源：[Input & Editing · L154](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L154)；源码：[anweat/dsh-voice-webspeech](https://github.com/anweat/dsh-voice-webspeech/tree/eb6a51ff9428c051304d978cc238a54aff782e19)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `eb6a51ff9428c051304d978cc238a54aff782e19`。
- 包与安装：`dsh-voice-webspeech`；榜单 spec 未给出；文档命令 `pnpm dsh plugin --profile web add github:anweat/dsh-voice-webspeech`, ``github:anweat/dsh-voice-webspeech#<sha>`。`, `pnpm dsh plugin --profile web add .`, `pnpm dsh plugin --profile web add ./dsh-voice-webspeech-0.1.0.tgz`, `- 卸载：`pnpm dsh plugin --profile web remove dsh-voice-webspeech`（或从 profile 依赖里删掉再 `pnpm install`）。`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（37）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepack`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tsdown.config.ts`, `scripts/check-client-bundle.mjs`, `scripts/link-dsh-workspace.mjs`, `src/client/RecorderButton.tsx`, `src/client/SettingsCard.tsx`, `src/client/backend.ts`, `src/client/context-types.ts`（另 8 项）。

## dsh-web-search-pro

- 榜单来源：[Context & Search · L131](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L131)；源码：[anweat/dsh-web-search-pro](https://github.com/anweat/dsh-web-search-pro/tree/f8f388c75d11a5fbee673a4ab010c166098a989b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `f8f388c75d11a5fbee673a4ab010c166098a989b`。
- 包与安装：`dsh-web-search-pro`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-web-search-pro   # 自动装 dsh-browser（dependency）+ 自动挂载 browser 行（本 patch）`, `dsh plugin --profile web add ./dsh-web-search-pro`, `dsh-browser 需先发布到 npm（本地测试可用 `dsh plugin --profile web add ../dsh-browser ../dsh-web-search-pro` 一条命令显式列两个）。`, ``dsh plugin --profile web add ./<path>` 并在 profile 的 `pnpm-workspace.yaml``, `\| opencli \| 小红书/Twitter/Reddit/IG/FB \| `npm i -g opencli` \|`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `browser`, `credentials`, `web`；tools `web-search-pro`, `web_cache_clear`, `web_deps`, `web_fetch_pro`, `web_history`, `web_platform_search`, `web_rule`, `web_search_pro`（另 2 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；ships an explicit persistence migration path；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `docs/README.md`, `src/index.ts`, `scripts/save-login.mjs`, `src/browser-service.ts`, `src/config.ts`, `src/deps.ts`, `src/engines.ts`, `src/extract.ts`, `src/fetch.ts`（另 6 项）。

## dsh-wordbox

- 榜单来源：[Input & Editing · L153](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L153)；源码：[arcmosin/dsh-wordbox](https://github.com/arcmosin/dsh-wordbox/tree/747a6ef921e37df2ec9d194276efcf0d615ecb04)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `747a6ef921e37df2ec9d194276efcf0d615ecb04`。
- 包与安装：`dsh-wordbox`；榜单 spec 未给出；文档命令 `Prerequisites: DeepSeek Harness `dsh web`+`pnpm`(the`dsh plugin` command forwards to pnpm, so pnpm must be on PATH).`, `npm install -g @deepseek-ai/dsh`, `dsh plugin --profile web add dsh-wordbox`, `dsh plugin --profile web add github:arcmosin/dsh-wordbox`, `dsh plugin --profile web add link:D:/path/to/dsh-wordbox`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-doctor

- 榜单来源：[Infrastructure & Development · L381](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L381)；源码：[asdf17128/dsh-doctor](https://github.com/asdf17128/dsh-doctor/tree/8b193b32c5a31d9add1870ea5525568c02588c91)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `8b193b32c5a31d9add1870ea5525568c02588c91`。
- 包与安装：`dsh-doctor`；榜单 spec 未给出；文档命令 `npx dsh-doctor`, `npx github:asdf17128/dsh-doctor`, `npx dsh-doctor                      # check the web profile`, `npx dsh-doctor --explain            # describe the tree instead of checking it`, `npx dsh-doctor --profile headless   # another profile`（另 6 项）。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools `browse`, `some-plugin`, `x`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（3） `test/checks.test.js`, `test/fix.test.js`, `test/tools.test.js`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no conventional core source entry was found in the inspected target；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `test/checks.test.js`, `test/fix.test.js`, `test/tools.test.js`, `bin/dsh-doctor.js`, `src/dump.js`, `src/explain.js`, `src/fix.js`, `src/parse.js`, `src/report.js`（另 5 项）。

## dshp

- 榜单来源：[Infrastructure & Development · L385](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L385)；源码：[asdf17128/dshp](https://github.com/asdf17128/dshp/tree/169f288bc0c041e58a4b7a12f46238692348b066)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `169f288bc0c041e58a4b7a12f46238692348b066`。
- 包与安装：`dshp`；榜单 spec 未给出；文档命令 `npx dshp ls`, `dsh plugin --profile web-试验田 add some-experimental-plugin`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（2） `test/portable.test.js`, `test/profile.test.js`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no conventional core source entry was found in the inspected target；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `test/portable.test.js`, `test/profile.test.js`, `bin/dshp.js`, `src/portable.js`, `src/profile.js`。

## Harness Desktop

- 榜单来源：[UI & Experience · L208](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L208)；源码：[baiyuscc13724-max/deepseek-harness-desktop](https://github.com/baiyuscc13724-max/deepseek-harness-desktop/tree/10f6a179015eb867a413d2a42b29cb2ff5452446)。
- 结论：`directory-or-registry`；审查层级 `source-inspected`；HEAD `10f6a179015eb867a413d2a42b29cb2ff5452446`。
- 包与安装：`deepseek-harness-desktop`；榜单 spec 未给出；文档命令 `npm install`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（10） `tests/app-state-store.test.cjs`, `tests/dsh-resolver.test.cjs`, `tests/model-routing-service.test.cjs`, `tests/official-runtime-patch.test.cjs`, `tests/plugin-marketplace-service.test.cjs`, `tests/runtime-proxy.test.cjs`（另 4 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/upstream-watch.yml`；release `.github/workflows/release.yml`, `package.json#scripts.dist`, `package.json#scripts.pack`, `package.json#scripts.verify:packaged`, `package.json#scripts.verify:release`。
- 可借鉴模式：keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/upstream-watch.yml`, `LICENSE`, `README.md`, `package.json`, `tests/app-state-store.test.cjs`, `tests/dsh-resolver.test.cjs`, `tests/model-routing-service.test.cjs`, `tests/official-runtime-patch.test.cjs`, `tests/plugin-marketplace-service.test.cjs`, `tests/runtime-proxy.test.cjs`, `tests/self-test-service.test.cjs`, `tests/theme-catalog.test.cjs`（另 20 项）。

## dsh-plugin-anydoc

- 榜单来源：[Input & Editing · L155](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L155)；源码：[beancookie/dsh-plugin-anydoc](https://github.com/beancookie/dsh-plugin-anydoc/tree/3af159ed06f62f3d2c61ab21c6a2475c71efbfa4)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3af159ed06f62f3d2c61ab21c6a2475c71efbfa4`。
- 包与安装：`dsh-plugin-anydoc`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:beancookie/dsh-plugin-anydoc`, `dsh plugin --profile web remove dsh-plugin-anydoc`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `anydoc`；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`。

## dsh-desktop-launcher

- 榜单来源：[Infrastructure & Development · L383](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L383)；源码：[becomeless/dsh-desktop-launcher](https://github.com/becomeless/dsh-desktop-launcher/tree/7211caae8fea41b5feccb2225d5680540581854e)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `7211caae8fea41b5feccb2225d5680540581854e`。
- 包与安装：—；榜单 spec 未给出；文档命令 `**和官方 DeepSeek Harness 什么关系？** 本工具只是官方的桌面入口，启动的仍是官方 `npx @deepseek-ai/dsh web`，不修改、不替代官方任何组件。`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`。

## dsh-opencodego-usage

- 榜单来源：[UI & Experience · L224](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L224)；源码：[BeiZi6/dsh-opencodego-usage](https://github.com/BeiZi6/dsh-opencodego-usage/tree/0990d71ccb0965c758b86a048a8a2614d082a14f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0990d71ccb0965c758b86a048a8a2614d082a14f`。
- 包与安装：`dsh-opencodego-usage`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:BeiZi6/dsh-opencodego-usage`, `dsh plugin --profile web remove dsh-opencodego-usage`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`, `client.js`。
- 扩展面：services `agentDefaultModel`, `credentials`, `settings`, `slots`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `index.js`, `client.js`。

## dsh-theme-plugin

- 榜单来源：[UI & Experience · L223](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L223)；源码：[BeiZi6/dsh-theme-plugin](https://github.com/BeiZi6/dsh-theme-plugin/tree/b3e7e143532c4b6df71da753d2336bb018949d2a)。
- 结论：`theme-plugin`；审查层级 `source-inspected`；HEAD `b3e7e143532c4b6df71da753d2336bb018949d2a`。
- 包与安装：`dsh-theme-plugin`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:BeiZi6/dsh-theme-plugin`, `dsh plugin --profile web remove dsh-theme-plugin`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`, `client.js`。
- 扩展面：services `slots`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `index.js`, `client.js`。

## dsh-science

- 榜单来源：[Science & Research · L414](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L414)；源码：[biociao/dsh-science](https://github.com/biociao/dsh-science/tree/ef7ef5ad4b78c8a58b2545afe33bc17d60d72f95)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `ef7ef5ad4b78c8a58b2545afe33bc17d60d72f95`。
- 包与安装：`dsh-science`；榜单 spec 未给出；文档命令 `Both engine plugins are **zero-dependency** (Node built-ins only) and register plain cordis tools. Installable either as a profile bundle (`dsh plugin add`) or as an agent preset (`科学模式`).`, `dsh plugin --profile web add dsh-science            # after npm publish`, `dsh plugin --profile web add "github:biociao/dsh-science"`, ``dsh plugin add` installs the package into the profile and its `cordis.patch.yml``, `既可作 profile bundle 安装（`dsh plugin add`），也可作 agent preset（「科学模式」）安装。`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `preset/agent.cordis.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools `artifact_list`, `artifact_reproduce`, `artifact_save`, `artifact_show`, `research_experiment`, `research_findings`, `research_hypothesis`, `research_init`（另 3 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `test/verify-bundle.sh`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `preset/agent.cordis.yml`, `engines/artifact-registry.mjs`, `engines/research-loop.mjs`, `scripts/smoke-test.mjs`, `preset/engines/artifact-registry.mjs`, `preset/engines/research-loop.mjs`, `test/verify-bundle.sh`。

## dsh-clawrouter

- 榜单来源：[Models & Inference · L257](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L257)；源码：[BlockRunAI/dsh-clawrouter](https://github.com/BlockRunAI/dsh-clawrouter/tree/0111024ea83b12d20c1eefdb3154d342156334a7)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0111024ea83b12d20c1eefdb3154d342156334a7`。
- 包与安装：`dsh-clawrouter`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-clawrouter`, `- **No wallet yet?** `npx -y @blockrun/clawrouter` generates one and prints its address. Stop it once you have the address, send it a few USDC on Base, then export the key.`, `Developing against a linked checkout (`dsh plugin add /path/to/dsh-clawrouter`) pulls this package's **devDependencies** into the profile, giving a second copy of `@deepseek-ai/dsh-llm`. `instanceof LlmError`then fails across the two copies and the harness reports every failure as`UNKNOWN` instead of its real code. Test error codes from a packed tarball (`npm pack`) rather than a link.`, `Installs the **published** package from npm into a container that has never`, `- **还没有钱包？** `npx -y @blockrun/clawrouter` 会生成一个并打印地址。记下地址后停掉它，往这个地址转几美元 USDC（Base 链），然后导出私钥。`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `attachments`, `commands`, `credentials`, `llm`, `tools`；tools `bash`, `cancelled-call`；events `tools/pre-execute`；commands `/spend`, `gate`, `review`, `spend`；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `memory-only`, `migration`。
- 测试与发布：tests 有（18） `test/docker/Dockerfile`, `test/docker/README.md`, `test/docker/smoke.sh`, `tests/adapter-composition.spec.ts`, `tests/catalog-sharing.spec.ts`, `tests/catalog.spec.ts`（另 12 项）；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；ships an explicit persistence migration path；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `test/docker/README.md`, `docs/README.zh.md`, `src/index.ts`, `tests/adapter-composition.spec.ts`, `tests/catalog-sharing.spec.ts`, `tests/catalog.spec.ts`, `tests/docs.spec.ts`, `tests/errors.spec.ts`, `tests/gate-composition.spec.ts`（另 21 项）。

## dsh-context

- 榜单来源：[Context & Search · L96](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L96)；源码：[bowenliang123/dsh-context](https://github.com/bowenliang123/dsh-context/tree/3951da0f42d03f431dc9309d01bba2fd4f4f1d75)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3951da0f42d03f431dc9309d01bba2fd4f4f1d75`。
- 包与安装：`dsh-context`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-context`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/client/index.ts`, `src/host/index.ts`。
- 扩展面：services `connection`, `locale`, `sessionQuery`, `sessions`；tools —；events —；commands —；client UI 有（17）。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 有（3） `tests/client.test.mjs`, `tests/host.test.mjs`, `tests/repro-real-react.mjs`；workflows 有（1） `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.release`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/client/index.ts`, `src/host/index.ts`, `tests/client.test.mjs`, `tests/host.test.mjs`, `tests/repro-real-react.mjs`, `scripts/build.mjs`, `src/client/cache.ts`, `src/client/categories.ts`（另 19 项）。

## dsh-web-billing

- 榜单来源：[UI & Experience · L178](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L178)；源码：[bpc-oss/dsh-web-billing](https://github.com/bpc-oss/dsh-web-billing/tree/fbe6f5069ed867d97b9f9bf4f35cc7b4b6198b63)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `fbe6f5069ed867d97b9f9bf4f35cc7b4b6198b63`。
- 包与安装：`dsh-web-billing`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:<owner>/dsh-web-billing`, `dsh plugin --profile web add dsh-web-billing`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（2） `test/balance.test.mjs`, `test/pricing.test.mjs`；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `test/balance.test.mjs`, `test/pricing.test.mjs`。

## dsh-news-briefing

- 榜单来源：[Context & Search · L128](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L128)；源码：[canghai666x/dsh-news-briefing](https://github.com/canghai666x/dsh-news-briefing/tree/c68653b486f1f82637a8db6abfba046d55b704b5)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `c68653b486f1f82637a8db6abfba046d55b704b5`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`。

## dsh-news-plugin

- 榜单来源：[Context & Search · L127](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L127)；源码：[canghai666x/dsh-news-plugin](https://github.com/canghai666x/dsh-news-plugin/tree/2303163a21e901b22e3da76eb09873f39748b11d)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `2303163a21e901b22e3da76eb09873f39748b11d`。
- 包与安装：`dsh-news-plugin`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：`index.ts`。
- 扩展面：services —；tools `dsh-news-plugin`, `news_fetch`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `index.ts`, `test-fetch.mjs`。

## dsh-web-novel-research

- 榜单来源：[Context & Search · L129](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L129)；源码：[canghai666x/dsh-web-novel-research](https://github.com/canghai666x/dsh-web-novel-research/tree/7d90809756103d36a04f9eb47cad4c0feef262a4)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `7d90809756103d36a04f9eb47cad4c0feef262a4`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`。

## dsh-web-review

- 榜单来源：[UI & Experience · L195](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L195)；源码：[CanglongCl/dsh-web-review](https://github.com/CanglongCl/dsh-web-review/tree/7d6f446842fde4a280c7302ebd53bdb9e2ab7bd4)。
- 结论：`directory-or-registry`；审查层级 `source-inspected`；HEAD `7d6f446842fde4a280c7302ebd53bdb9e2ab7bd4`。
- 包与安装：`dsh-web-review`, `eval-fixtures`, `@dsh-web-review-dev/eval-runner`, `@canglongcl/dsh-web-review`, `react-dashboard-fixture`, `eval-react-operations`, `react-profile-fixture`, `react-shop-fixture`（另 2 项）；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @canglongcl/dsh-web-review`, `pnpm install`, `after `pnpm install`). If hooks are missing, re-run:`。
- DSH/Cordis activation：—。入口：`eval/runner-plugin/src/index.ts`, `packages/dsh-web-review/src/index.ts`, `packages/dsh-web-review/src/bridge/index.ts`, `packages/dsh-web-review/src/client/index.ts`。
- 扩展面：services `agents`, `appExit`, `commandUi`, `dsh-web-review`, `function`, `loader`, `sessions`；tools —；events `agent/disposed`, `agent/pre-step`, `session/event`；commands —；client UI 有（39）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（40） `packages/dsh-web-review/tests/acceptance-history.spec.ts`, `packages/dsh-web-review/tests/annotation-context.spec.ts`, `packages/dsh-web-review/tests/annotation-editor.spec.tsx`, `packages/dsh-web-review/tests/annotation-snapshot.spec.ts`, `packages/dsh-web-review/tests/browser-comments-context-view.spec.tsx`, `packages/dsh-web-review/tests/browser-comments-context.spec.ts`（另 34 项）；workflows 有（1） `.github/workflows/release-npm.yml`；release `.github/workflows/release-npm.yml`, `package.json#scripts.build`, `package.json#scripts.build:watch`, `package.json#scripts.package:official`, `package.json#scripts.release:verify`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/release-npm.yml`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `eval/fixtures/package.json`, `eval/runner-plugin/package.json`, `packages/dsh-web-review/package.json`, `eval/fixtures/react-dashboard/baseline/package.json`, `eval/fixtures/react-operations/baseline/package.json`, `eval/fixtures/react-profile/baseline/package.json`, `eval/fixtures/react-shop/baseline/package.json`, `eval/fixtures/react-todo/baseline/package.json`, `eval/fixtures/vue-blog/baseline/package.json`, `eval/README.md`（另 30 项）。

## dsh-observation-journal

- 榜单来源：[Infrastructure & Development · L360](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L360)；源码：[Cavan-Ou/dsh-observation-journal](https://github.com/Cavan-Ou/dsh-observation-journal/tree/0fbbaf098d3cf462c4e315771b75d9a25b82ff10)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0fbbaf098d3cf462c4e315771b75d9a25b82ff10`。
- 包与安装：`dsh-observation-journal`；榜单 spec 未给出；文档命令 `dsh plugin --profile headless add <repo-or-pkg>   # or copy the repo as a local bundle`, `dsh plugin --profile headless add <仓库或包>   # 或复制仓库作本地 bundle`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（6） `tests/fixtures/session-128dec23-7e88-4631-963a-ce088581a6b2.jsonl.zstd`, `tests/fixtures/session-3dea5944-8cee-42ae-9156-80166914e18c.jsonl.zstd`, `tests/fixtures/session-41ee5351-b151-448c-84d3-d8457f1243e1.jsonl.zstd`, `tests/fixtures/session-5fe1ff3a-8f53-4b23-a206-ee6fa737512e.jsonl.zstd`, `tests/fixtures/session-abe96e0f-f603-4198-bc73-7dbbb0cb94e4.jsonl.zstd`, `tests/test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `tests/test.mjs`, `tests/fixtures/session-128dec23-7e88-4631-963a-ce088581a6b2.jsonl.zstd`, `tests/fixtures/session-3dea5944-8cee-42ae-9156-80166914e18c.jsonl.zstd`, `tests/fixtures/session-41ee5351-b151-448c-84d3-d8457f1243e1.jsonl.zstd`, `tests/fixtures/session-5fe1ff3a-8f53-4b23-a206-ee6fa737512e.jsonl.zstd`, `tests/fixtures/session-abe96e0f-f603-4198-bc73-7dbbb0cb94e4.jsonl.zstd`。

## hermes-dsh-collab

- 榜单来源：[Git & Engineering · L291](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L291)；源码：[Cavan-Ou/hermes-dsh-collab](https://github.com/Cavan-Ou/hermes-dsh-collab/tree/3a70cb3f5590ef03bc3772ca37c991273c593914)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3a70cb3f5590ef03bc3772ca37c991273c593914`。
- 包与安装：`hermes-dsh-collab`；榜单 spec 未给出；文档命令 `![DSH](https://img.shields.io/badge/DSH-0.1.0--rc.6-orange) [![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com/)`, `# via dsh plugin (bundle — recommended)`, `dsh plugin --profile headless add github:Cavan-Ou/hermes-dsh-collab`, `**Install forms:** both supported — bundle (`dsh plugin add`, official distribution path, verified on DSH 0.1.0-rc.6) and direct copy to `$DSH_HOME/skills/` (lightweight, no build).`, `**Roadmap:** bundle packaging (`dsh plugin add` support) · per-workspace failure isolation · live routing-table refresh from the observations card · English mirror of references`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `index.mjs`。

## dsh-plugin-scheduled-tasks

- 榜单来源：[Git & Engineering · L302](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L302)；源码：[Ceelog/dsh-plugins/src/plugins/dsh-plugin-scheduled-tasks](https://github.com/Ceelog/dsh-plugins/tree/982e240c6bc9caf5c40e8af662758ad937f70fef/src/plugins/dsh-plugin-scheduled-tasks)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `982e240c6bc9caf5c40e8af662758ad937f70fef`。
- 包与安装：`@opendsh/dsh-plugin-scheduled-tasks`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @opendsh/dsh-plugin-scheduled-tasks`, `(`pnpm install`inside the profile re-copies`file:` dependencies), then`。
- DSH/Cordis activation：`src/plugins/dsh-plugin-scheduled-tasks/cordis.patch.yml`, `src/plugins/dsh-plugin-scheduled-tasks/package.json → ./cordis.patch.yml`。入口：`src/plugins/dsh-plugin-scheduled-tasks/src/index.ts`, `src/plugins/dsh-plugin-scheduled-tasks/src/client/index.ts`。
- 扩展面：services `agentDefaultModel`, `agentPresets`, `agents`, `remote.tasks`, `sessionTitle`, `tasks`, `workspaceRegistry`；tools `task_create`, `task_delete`, `task_history`, `task_list`, `task_run`；events `agent/created`；commands —；client UI 有（6）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（6） `src/plugins/dsh-plugin-scheduled-tasks/tests/cron.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/executor.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/scheduler.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/store.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/time.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/tools.test.ts`；workflows 未发现 —；release `src/plugins/dsh-plugin-scheduled-tasks/package.json#scripts.release`, `src/plugins/dsh-plugin-setting-mcp/package.json#scripts.release`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`src/plugins/dsh-plugin-scheduled-tasks/package.json`, `src/plugins/dsh-plugin-scheduled-tasks/cordis.patch.yml`, `src/plugins/dsh-plugin-scheduled-tasks/README.md`, `src/plugins/dsh-plugin-scheduled-tasks/src/index.ts`, `src/plugins/dsh-plugin-scheduled-tasks/src/client/index.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/cron.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/executor.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/scheduler.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/store.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/time.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tests/tools.test.ts`, `src/plugins/dsh-plugin-scheduled-tasks/tsdown.config.ts`, `src/plugins/dsh-plugin-scheduled-tasks/vitest.config.ts`, `src/plugins/dsh-plugin-scheduled-tasks/scripts/wrap-client.mjs`（另 14 项）。

## dsh-plugin-setting-mcp

- 榜单来源：[UI & Experience · L222](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L222)；源码：[Ceelog/dsh-plugins/src/plugins/dsh-plugin-setting-mcp](https://github.com/Ceelog/dsh-plugins/tree/982e240c6bc9caf5c40e8af662758ad937f70fef/src/plugins/dsh-plugin-setting-mcp)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `982e240c6bc9caf5c40e8af662758ad937f70fef`。
- 包与安装：`@opendsh/dsh-plugin-setting-mcp`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @opendsh/dsh-plugin-setting-mcp`, `pnpm install`。
- DSH/Cordis activation：`src/plugins/dsh-plugin-setting-mcp/cordis.patch.yml`, `src/plugins/dsh-plugin-setting-mcp/package.json → ./cordis.patch.yml`。入口：`src/plugins/dsh-plugin-setting-mcp/src/index.ts`, `src/plugins/dsh-plugin-setting-mcp/src/client/index.ts`。
- 扩展面：services `loader`, `remote.mcp`；tools —；events —；commands —；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（2） `src/plugins/dsh-plugin-setting-mcp/tests/config.test.ts`, `src/plugins/dsh-plugin-setting-mcp/tests/plan.test.ts`；workflows 未发现 —；release `src/plugins/dsh-plugin-scheduled-tasks/package.json#scripts.release`, `src/plugins/dsh-plugin-setting-mcp/package.json#scripts.release`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`src/plugins/dsh-plugin-setting-mcp/package.json`, `src/plugins/dsh-plugin-setting-mcp/cordis.patch.yml`, `src/plugins/dsh-plugin-setting-mcp/README.md`, `src/plugins/dsh-plugin-setting-mcp/README.zh.md`, `src/plugins/dsh-plugin-setting-mcp/src/index.ts`, `src/plugins/dsh-plugin-setting-mcp/src/client/index.ts`, `src/plugins/dsh-plugin-setting-mcp/tests/config.test.ts`, `src/plugins/dsh-plugin-setting-mcp/tests/plan.test.ts`, `src/plugins/dsh-plugin-setting-mcp/tsdown.config.ts`, `src/plugins/dsh-plugin-setting-mcp/vitest.config.ts`, `src/plugins/dsh-plugin-setting-mcp/scripts/wrap-client.mjs`, `src/plugins/dsh-plugin-setting-mcp/src/config.ts`, `src/plugins/dsh-plugin-setting-mcp/src/errors.ts`, `src/plugins/dsh-plugin-setting-mcp/src/plan.ts`（另 8 项）。

## dsh-learn-everything

- 榜单来源：[Context & Search · L105](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L105)；源码：[cendaifeng/dsh-learn-everything](https://github.com/cendaifeng/dsh-learn-everything/tree/67cd99210c17564aff3183cae043ba7d2df085bc)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `67cd99210c17564aff3183cae043ba7d2df085bc`。
- 包与安装：`dsh-learn-everything`；榜单 spec 未给出；文档命令 `DSH_SOURCE_DIR=/absolute/path/to/dsh pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `tests/fixtures/composition.cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `agentLoop`, `commands`, `learningMode`, `systemPrompt`, `tools`；tools `sections`, `string`, `teach`；events `agent/pre-step`, `agent/status`；commands `/learn`；client UI 有（7）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（14） `SPEC.md`, `tests/composition.smoke.ts`, `tests/config.spec.ts`, `tests/fixtures/composition-driver.ts`, `tests/fixtures/composition.cordis.yml`, `tests/fixtures/learn-mock-llm.ts`（另 8 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `tests/fixtures/composition.cordis.yml`, `src/index.ts`, `src/client/index.ts`, `tests/composition.smoke.ts`, `tests/config.spec.ts`, `tests/fold.spec.ts`, `tests/learning-loop.e2e.ts`, `tests/mermaid.spec.ts`, `tests/project.spec.ts`, `tests/seed-web-session.mjs`（另 20 项）。

## dsh-grok-tui

- 榜单来源：[UI & Experience · L190](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L190)；源码：[chen-001/dsh-grok-tui](https://github.com/chen-001/dsh-grok-tui/tree/389d4a73c96375196af7f67784cd234bcb6bf54d)。
- 结论：`directory-or-registry`；审查层级 `source-inspected`；HEAD `389d4a73c96375196af7f67784cd234bcb6bf54d`。
- 包与安装：`dsh-grok-tui`；榜单 spec 未给出；文档命令 `npm install -g dsh-grok-tui`, `npx @deepseek-ai/dsh web   # 启动官方 host / start the official host`, ``grok-dsh setup` 是显式的（npm 全局安装不会静默改写你的 dsh 配置）：它把 grok-server 行写进 `~/.dsh/profiles/web/cordis.patch.yml` 并把插件软链进 profile 的 node_modules，`npx @deepseek-ai/dsh web` 随之携带 leader socket。host 已在运行时重装后需重启一次。`, ``grok-dsh setup`is explicit (a global install never silently rewrites your dsh config): it adds the grok-server row to`~/.dsh/profiles/web/cordis.patch.yml`and links the plugin into the profile's node_modules, so`npx @deepseek-ai/dsh web` carries the leader socket. Restart the host once if it is already running.`。
- DSH/Cordis activation：—。入口：`src/index.ts`。
- 扩展面：services `agentDefaultModel`, `apiProxy`, `userQuestions`；tools `ask_user_question`；events `approval/request`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（16） `tests/acp.spec.ts`, `tests/approval-coexist.spec.ts`, `tests/archive.spec.ts`, `tests/helpers.ts`, `tests/host-bridge.spec.ts`, `tests/install-profile.spec.ts`（另 10 项）；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `src/index.ts`, `tests/acp.spec.ts`, `tests/approval-coexist.spec.ts`, `tests/archive.spec.ts`, `tests/helpers.ts`, `tests/host-bridge.spec.ts`, `tests/install-profile.spec.ts`, `tests/leader.spec.ts`, `tests/m3.spec.ts`（另 19 项）。

## dsh-session-cleaner-cli

- 榜单来源：[Infrastructure & Development · L389](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L389)；源码：[ChenChen913/dsh-session-cleaner-cli](https://github.com/ChenChen913/dsh-session-cleaner-cli/tree/0dca8390cb8a15307200d8ce17f6a5d4b9482f85)。
- 结论：`directory-or-registry`；审查层级 `source-inspected`；HEAD `0dca8390cb8a15307200d8ce17f6a5d4b9482f85`。
- 包与安装：`dsh-session-cleaner-cli`；榜单 spec 未给出；文档命令 `# Option 1: run directly from GitHub via npx (no clone needed)`, `npx github:ChenChen913/dsh-session-cleaner-cli list`, `# 方式一：直接从 GitHub 用 npx 运行（无需克隆）`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（2） `.github/workflows/test.yml`, `tests/e2e.test.mjs`；workflows 有（1） `.github/workflows/test.yml`；release —。
- 可借鉴模式：keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/test.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `tests/e2e.test.mjs`, `dsh-session-cleaner.mjs`。

## dsh-harness-mcp-server

- 榜单来源：[Models & Inference · L267](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L267)；源码：[chushixixin/dsh-harness-mcp-server](https://github.com/chushixixin/dsh-harness-mcp-server/tree/4c6b464f58c417a62f28fc7e12c42dae6f7ef129)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4c6b464f58c417a62f28fc7e12c42dae6f7ef129`。
- 包与安装：`@chushixixin/dsh-harness-mcp-server`；榜单 spec 未给出；文档命令 `npm install @chushixixin/dsh-harness-mcp-server`, `corepack pnpm install`。
- DSH/Cordis activation：`cordis.yml`, `package.json → ./cordis.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `agent_run`, `brain`, `echo`, `harness_list_tools`, `task_inbox`, `task_result`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.yml`, `src/index.ts`。

## deepseek-harness-desktop

- 榜单来源：[UI & Experience · L207](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L207)；源码：[chyra-moon/deepseek-harness-desktop](https://github.com/chyra-moon/deepseek-harness-desktop/tree/5b4dd001fe8a9a83a0f2ec45ce826503ef029290)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `5b4dd001fe8a9a83a0f2ec45ce826503ef029290`。
- 包与安装：`deepseek-harness-desktop`；榜单 spec 未给出；文档命令 `npm install && npm start      # 首次使用前先执行 npm run icon 生成图标`, `- **想用最新官方版**：跑官方最新的 `npx @deepseek-ai/dsh web`，桌面版会自动复用`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.dist`, `package.json#scripts.pack`, `package.json#scripts.package:app`。
- 可借鉴模式：automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `scripts/gen-whale-path.js`, `scripts/make-icon.js`, `scripts/preview-status.js`, `scripts/scan-deps-bounded.js`, `scripts/update-dsh.js`, `src/main.js`, `src/preload.js`, `src/status-page.js`。

## dsh-report-studio

- 榜单来源：[Output & Deliverables · L308](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L308)；源码：[ciceroyang/dsh-report-studio](https://github.com/ciceroyang/dsh-report-studio/tree/e8b126b0831d372002f4e5bd4a856f1f5466d93a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `e8b126b0831d372002f4e5bd4a856f1f5466d93a`。
- 包与安装：`dsh-report-studio`；榜单 spec 未给出；文档命令 `- **No build step**: plain ESM; install via `dsh plugin`or load with a`--patch` overlay`, `dsh plugin --profile web add github:ciceroyang/dsh-report-studio`, `- **免构建**:纯 ESM,直接 `dsh plugin`安装或`--patch` 加载,无编译步骤`, `需要 Node.js ≥ 18,以及 DeepSeek Harness(`npx @deepseek-ai/dsh web` 或源码运行)。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`。
- 扩展面：services `commands`, `skills`；tools `report_generate`, `report_save`, `report_week`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`filesystem-storage`。
- 测试与发布：tests 有（6） `tests/aggregate.test.js`, `tests/extract.test.js`, `tests/receipt.test.js`, `tests/save.test.js`, `tests/sessions.test.js`, `tests/templates.test.js`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `index.js`, `tests/aggregate.test.js`, `tests/extract.test.js`, `tests/receipt.test.js`, `tests/save.test.js`, `tests/sessions.test.js`, `tests/templates.test.js`。

## dsh-plugin-colorscheme

- 榜单来源：[UI & Experience · L221](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L221)；源码：[Civitasv/dsh-plugin-colorscheme](https://github.com/Civitasv/dsh-plugin-colorscheme/tree/59c18e0eac2ed20bd58bf71d19e4d0e08f7ea80f)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `59c18e0eac2ed20bd58bf71d19e4d0e08f7ea80f`。
- 包与安装：`dsh-plugin-colorscheme`；榜单 spec 未给出；文档命令 `works out of the box. You only need `npm install && npm run build` if you`, `**If you have pnpm installed**, you can replace step 2 with`, ``dsh plugin --profile web add <absolute path to this plugin>` (equivalent to`, `the link). If pnpm is missing, install it first: `npm install -g pnpm` (or`, `源码才需要先执行 `npm install && npm run build`。`（另 2 项）。
- DSH/Cordis activation：—。入口：`src/client/index.tsx`, `src/server/index.ts`, `client.js`。
- 扩展面：services `settings`, `webServer`；tools —；events `theme/change`；commands —；client UI 有（2）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `src/client/index.tsx`, `src/server/index.ts`, `client.js`, `scripts/build.mjs`, `scripts/gen-screenshots.mjs`, `src/client/slots-augment.d.ts`, `src/server/dsh-augment.d.ts`, `src/shared/color.ts`, `src/shared/generate.ts`, `src/shared/types.ts`（另 1 项）。

## dsh-plugin-diff-review

- 榜单来源：[Git & Engineering · L300](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L300)；源码：[Civitasv/dsh-plugin-diff-review](https://github.com/Civitasv/dsh-plugin-diff-review/tree/ab9661ff89db067992803d9f760bf2dd7c80149e)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `ab9661ff89db067992803d9f760bf2dd7c80149e`。
- 包与安装：`dsh-plugin-diff-review`；榜单 spec 未给出；文档命令 `npm install`。
- DSH/Cordis activation：—。入口：`src/client/index.tsx`, `src/server/index.ts`, `client.js`。
- 扩展面：services `react`, `webServer`；tools —；events `theme/change`；commands —；client UI 有（3）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.test:package`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；contains an explicit packaging/release path。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `src/client/index.tsx`, `src/server/index.ts`, `client.js`, `scripts/build.mjs`, `scripts/e2e-test.mjs`, `scripts/git-semantics-test.mjs`, `scripts/review-package-test.mjs`, `scripts/screenshot-all.mjs`, `scripts/session-extract-test.mjs`, `scripts/split-view-test.mjs`, `src/client/review-package.ts`（另 3 项）。

## dsh-plugin-open-editor

- 榜单来源：[IDE & Clients · L230](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L230)；源码：[Civitasv/dsh-plugin-open-editor](https://github.com/Civitasv/dsh-plugin-open-editor/tree/f12f5b0c872c14cf3c7b032d7bdd8e85416786c3)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `f12f5b0c872c14cf3c7b032d7bdd8e85416786c3`。
- 包与安装：`dsh-plugin-open-editor`；榜单 spec 未给出；文档命令 `先执行 `npm install && npm run build`。`, `装了 pnpm 的话，也可以用 `dsh plugin --profile web add <本插件绝对路径>` 代替`, `第 1 步（等价于链接）。pnpm 未安装时先 `npm install -g pnpm`（或 `corepack enable`）。`。
- DSH/Cordis activation：—。入口：`src/client/index.tsx`, `src/server/index.ts`, `client.js`。
- 扩展面：services `webServer`；tools —；events —；commands —；client UI 有（2）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `src/client/index.tsx`, `src/server/index.ts`, `client.js`, `scripts/build.mjs`, `scripts/launch-smoke.mjs`, `src/client/slots-augment.d.ts`, `src/server/dsh-augment.d.ts`, `src/shared/editors.ts`, `src/shared/types.ts`。

## dsh-bash-rtk

- 榜单来源：[Git & Engineering · L285](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L285)；源码：[DeepTrial/dsh-bash-rtk](https://github.com/DeepTrial/dsh-bash-rtk/tree/cbef162d942a18729a1a8c938f8d9dbe3b72d754)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `cbef162d942a18729a1a8c938f8d9dbe3b72d754`。
- 包与安装：`@deeptrial/dsh-bash-rtk`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add <path-to-this-dir>`, `dsh plugin --profile web add https://github.com/DeepTrial/dsh-bash-rtk/archive/refs/tags/v0.1.0.tar.gz`, `pnpm install && pnpm run check    # typecheck + test + build`, `pnpm install && pnpm run check    # 类型检查 + 测试 + 构建`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（3） `tests/executor.spec.ts`, `tests/sandbox.spec.ts`, `tests/wrap.spec.ts`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `tests/executor.spec.ts`, `tests/sandbox.spec.ts`, `tests/wrap.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `src/wrap.ts`。

## dsh-trajectory-debug

- 榜单来源：[UI & Experience · L220](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L220)；源码：[devmom/dsh-trajectory-debug](https://github.com/devmom/dsh-trajectory-debug/tree/9c8a5d69bff6347c815202a7ca56b96db6aa0784)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9c8a5d69bff6347c815202a7ca56b96db6aa0784`。
- 包与安装：`dsh-trajectory-debug-workspace`, `dsh-client-ui-trajectory-debug`, `dsh-trajectory-debug-bundle`, `dsh-trajectory-debug-host`, `dsh-trajectory-debug-remotes`, `dsh-trajectory-debug`；榜单 spec 未给出；文档命令 `# DSH Plugin: Trajectory Debug Workbench (trajectory-debug)`, `corepack pnpm install       # requires corepack; Node >= 22.19`, `dsh plugin --profile web add dsh-trajectory-debug-bundle`, `dsh plugin --profile web add ./packages/trajectory-debug-bundle`, `corepack pnpm install       # 需要 corepack；Node ≥ 22.19`（另 1 项）。
- DSH/Cordis activation：`packages/trajectory-debug-bundle/cordis.patch.yml`, `packages/trajectory-debug-bundle/package.json → ./cordis.patch.yml`。入口：`packages/client-ui-trajectory-debug/src/index.ts`, `packages/trajectory-debug-host/src/index.ts`, `packages/trajectory-debug-remotes/src/index.ts`, `packages/trajectory-debug/src/index.ts`, `packages/trajectory-debug/src/service.ts`, `packages/trajectory-debug-bundle/index.js`, `packages/client-ui-trajectory-debug/src/client/index.ts`, `packages/trajectory-debug-remotes/src/client/index.ts`。
- 扩展面：services `agents`, `commands`, `ctx.logger`, `sessionProjections`, `sessions`, `tools`, `trajectoryDebug`；tools `dsh-trajectory-debug`, `forkVariant`, `sessions.fork`, `trajectory_perf`, `trajectory_search`, `trajectory_step`；events `agent/pre-step`, `trajectory-debug/paused`, `trajectory-debug/resumed`；commands —；client UI 有（9）。
- 状态/持久化信号：`database-service`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（8） `packages/trajectory-debug-host/tests/diff-engine.spec.ts`, `packages/trajectory-debug-host/tests/helpers.ts`, `packages/trajectory-debug-host/tests/model-tools.spec.ts`, `packages/trajectory-debug-host/tests/perf-analyzer.spec.ts`, `packages/trajectory-debug-host/tests/provider.spec.ts`, `packages/trajectory-debug-host/tests/replay-engine.spec.ts`（另 2 项）；workflows 未发现 —；release `package.json#scripts.check`, `package.json#scripts.check:publish`, `package.json#scripts.publish:all`, `packages/client-ui-trajectory-debug/package.json#scripts.prepublishOnly`, `packages/client-ui-trajectory-debug/package.json#scripts.publish:package`, `packages/trajectory-debug-bundle/package.json#scripts.publish:package`（另 6 项）。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `packages/client-ui-trajectory-debug/package.json`, `packages/trajectory-debug-bundle/package.json`, `packages/trajectory-debug-host/package.json`, `packages/trajectory-debug-remotes/package.json`, `packages/trajectory-debug/package.json`, `packages/trajectory-debug-bundle/cordis.patch.yml`, `packages/trajectory-debug-bundle/README.md`, `packages/client-ui-trajectory-debug/src/index.ts`, `packages/trajectory-debug-host/src/index.ts`（另 26 项）。

## dsh-reverse-skill

- 榜单来源：[Science & Research · L415](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L415)；源码：[dhicoc/dsh-reverse-skill](https://github.com/dhicoc/dsh-reverse-skill/tree/190ae9a94e2c54e6f769a574a0509f56b6b4c741)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `190ae9a94e2c54e6f769a574a0509f56b6b4c741`。
- 包与安装：`@dhicoc/dsh-reverse-skill`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)`, `npm install`, `dsh plugin add github:dhicoc/dsh-reverse-skill`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（2） `skills/case-review/tests/test_review_case.py`, `skills/tests/routing-benchmark.json`；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `CTF-Sandbox-Orchestrator/README.md`, `skills/diagram-generator/README.md`, `skills/ops/README.md`, `src/index.ts`, `skills/tests/routing-benchmark.json`, `skills/case-review/tests/test_review_case.py`。

## dsh-wuyun-liuqi

- 榜单来源：[Science & Research · L418](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L418)；源码：[dhicoc/dsh-wuyun-liuqi](https://github.com/dhicoc/dsh-wuyun-liuqi/tree/4d992738f61ef5c0c2669dd7ab707e56eec02cb1)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4d992738f61ef5c0c2669dd7ab707e56eec02cb1`。
- 包与安装：`@dhicoc/dsh-wuyun-liuqi`；榜单 spec 未给出；文档命令 `![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)`, `dsh plugin add github:dhicoc/dsh-wuyun-liuqi`, `npm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（20） `skills/tests/fixtures/.gitkeep`, `skills/tests/fixtures/dahan_boundary.json`, `skills/tests/full_chain_random_test.py`, `skills/tests/full_regression_test.py`, `skills/tests/full_scenario_test.py`, `skills/tests/golden/retrieval_golden.json`（另 14 项）；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/publish.yml`, `README.md`, `package.json`, `cordis.patch.yml`, `skills/README.md`, `skills/advanced-alignment/README.md`, `skills/perspectives/README.md`, `src/index.ts`, `_selftest.mjs`, `skills/scripts/calculate_yunqi_api.js`, `skills/tests/full_chain_random_test.py`, `skills/tests/full_regression_test.py`, `skills/tests/full_scenario_test.py`, `skills/tests/routing_scenarios.json`（另 4 项）。

## dsh4vscode

- 榜单来源：[IDE & Clients · L229](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L229)；源码：[DoggyHU/dsh4vscode](https://github.com/DoggyHU/dsh4vscode/tree/cad06963d201f34f284b18a31186b2eaabdd096d)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `cad06963d201f34f284b18a31186b2eaabdd096d`。
- 包与安装：`dsh4vscode`；榜单 spec 未给出；文档命令 `npm install`。
- DSH/Cordis activation：—。入口：`src/dsh/client.ts`。
- 扩展面：services —；tools —；events —；commands `dsh.askSelection`, `dsh.cancel`, `dsh.clearChat`, `dsh.fixSelection`, `dsh.newSession`, `dsh.newWindow`, `dsh.openChat`, `dsh.openDshWeb`（另 2 项）；client UI 未发现。
- 状态/持久化信号：`database-service`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.package`, `package.json#scripts.vscode:prepublish`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；contains an explicit packaging/release path。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`README.md`, `package.json`, `media/main.js`, `scripts/cdp-drive.mjs`, `src/extension.ts`, `src/dsh/client.ts`, `src/dsh/config.ts`, `src/dsh/controller.ts`, `src/dsh/types.ts`, `src/webview/panel.ts`。

## task-passport

- 榜单来源：[Context & Search · L109](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L109)；源码：[dongsheng123132/task-passport](https://github.com/dongsheng123132/task-passport/tree/19672b5c7c06151d8d0af6760830ee2d27371665)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `19672b5c7c06151d8d0af6760830ee2d27371665`。
- 包与安装：`task-passport`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add task-passport@0.2.2`, `claude mcp add --scope user task-passport -- npx --yes task-passport@0.2.2 mcp`, `codex mcp add task-passport -- npx --yes task-passport@0.2.2 mcp`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`。
- 扩展面：services —；tools `task_passport_checkpoint`, `task_passport_list`, `task_passport_new`, `task_passport_open`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（5） `test/core.test.mjs`, `test/e2e-uking.mjs`, `test/mcp.test.mjs`, `test/plugin-manifests.test.mjs`, `test/store.test.mjs`；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.pack:check`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `index.js`, `test/core.test.mjs`, `test/e2e-uking.mjs`, `test/mcp.test.mjs`, `test/plugin-manifests.test.mjs`, `test/store.test.mjs`, `cli.js`, `core.js`, `mcp.js`（另 1 项）。

## browser4-dsh

- 榜单来源：[Browser & Remote · L244](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L244)；源码：[dsh-external/browser4-dsh](https://github.com/dsh-external/browser4-dsh)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## cross-harness-cite

- 榜单来源：[Context & Search · L108](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L108)；源码：[dsh-external/cross-harness-cite](https://github.com/dsh-external/cross-harness-cite)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh_workflow

- 榜单来源：[Core · L84](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L84)；源码：[dsh-external/dsh_workflow](https://github.com/dsh-external/dsh_workflow/tree/44b83c182aa02d1be8a0803e8446cb495f93cd8f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `44b83c182aa02d1be8a0803e8446cb495f93cd8f`。
- 包与安装：`@dsh-external/workflow`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:dsh-external/dsh_workflow#main"`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`。
- 扩展面：services `approval`, `commands`, `dynamicWorkflows`, `jobs`, `run_workflow`, `subagents`, `systemPrompt`, `tools`（另 1 项）；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（11） `tests/author.spec.ts`, `tests/builtins.spec.ts`, `tests/capsule.spec.ts`, `tests/catalog.spec.ts`, `tests/engine.spec.ts`, `tests/plugin.spec.ts`（另 5 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/service.ts`, `tests/author.spec.ts`, `tests/builtins.spec.ts`, `tests/capsule.spec.ts`, `tests/catalog.spec.ts`, `tests/engine.spec.ts`, `tests/plugin.spec.ts`（另 18 项）。

## dsh-101

- 榜单来源：[Core · L81](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L81)；源码：[dsh-external/dsh-101](https://github.com/dsh-external/dsh-101/tree/ae6b4addadfda63e6751b1bf929665733ba60b6c)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `ae6b4addadfda63e6751b1bf929665733ba60b6c`。
- 包与安装：`@bill9109/dsh-101`, `dsh-profile-dsh-101`；榜单 spec 未给出；文档命令 `**Install:** `bash <(curl -fsSL https://raw.githubusercontent.com/bill9109/dsh-101/main/scripts/install.sh) github:bill9109/dsh-101#v0.1.7``, `This repository ships both a **bundle** (`@bill9109/dsh-101`, installable via `dsh plugin add`) and a`, `bash <(curl -fsSL https://raw.githubusercontent.com/bill9109/dsh-101/main/scripts/install.sh) github:bill9109/dsh-101#v0.1.7`, `DSH module fallback (so in-box peers resolve at runtime), then runs `dsh plugin --profile dsh-101 add``, `dsh plugin --profile dsh-101 add github:bill9109/dsh-101#v0.1.7`（另 7 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `profile/cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/app/index.ts`, `src/client/index.ts`, `src/core/index.ts`, `src/tutor/index.ts`。
- 扩展面：services `127.0.0.1`；tools `dsh-101-curator`, `dsh101_open`, `dsh101_publish`, `dsh101_read`, `dsh101_save_translation`, `dsh101_search`；events `session/event`, `theme/change`；commands —；client UI 有（8）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `profile/package.json`, `cordis.patch.yml`, `profile/cordis.patch.yml`, `src/app/index.ts`, `src/client/index.ts`, `src/core/index.ts`, `src/tutor/index.ts`, `tsdown.config.mjs`, `scripts/build.mjs`（另 19 项）。

## dsh-a2a

- 榜单来源：[Models & Inference · L260](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L260)；源码：[dsh-external/dsh-a2a](https://github.com/dsh-external/dsh-a2a/tree/4da1129c201984cda7aaffa31c9ac7fdf158eb92)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `4da1129c201984cda7aaffa31c9ac7fdf158eb92`。
- 包与安装：`@dpskh/a2a`, `@dpskh/ui-a2a`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`cordis.patch.yml`, `ui-a2a/cordis.patch.yml`, `package.json → ./cordis.patch.yml`, `ui-a2a/package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `ui-a2a/src/index.ts`, `ui-a2a/src/client/index.ts`。
- 扩展面：services `a2aDirectory`, `a2aHub`, `a2aMesh`, `agents`, `commands`, `connection`, `conversation.input.left`, `conversation.input.overlay`（另 7 项）；tools `a2a_history`, `a2a_message`, `a2a_peers`；events `a2a/change`, `a2a/delivery`, `a2a/presence-changed`；commands —；client UI 有（11）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（14） `src/hub/spec.ts`, `test/client-runtime.ts`, `test/web-react.ts`, `tests/activity.spec.ts`, `tests/commands.spec.ts`, `tests/composition.spec.ts`（另 8 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `ui-a2a/package.json`, `cordis.patch.yml`, `ui-a2a/cordis.patch.yml`, `ui-a2a/README.md`, `ui-a2a/README.zh.md`, `src/index.ts`, `ui-a2a/src/index.ts`, `ui-a2a/src/client/index.ts`, `test/client-runtime.ts`, `test/web-react.ts`（另 23 项）。

## dsh-acp

- 榜单来源：[Models & Inference · L262](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L262)；源码：[dsh-external/dsh-acp](https://github.com/dsh-external/dsh-acp)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-ads

- 榜单来源：[Fun & Lifestyle · L348](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L348)；源码：[dsh-external/dsh-ads](https://github.com/dsh-external/dsh-ads/tree/401819c43f12189c1ab94159011d61a484426370)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `401819c43f12189c1ab94159011d61a484426370`。
- 包与安装：`@dsh-external/dsh-ads`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:Nagi-ovo/dsh-ads`, `可以运行 `dsh --profile web --dump-config`确认插件已经进入最终配置。需要修改源码时，克隆仓库并在仓库目录运行`dsh plugin --profile web add .`；构建产物已经提交，不需要额外构建。使用社区 [plugin-registry](https://github.com/dsh-external/plugin-registry) 的用户也可以从「设置 → 插件」安装。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services `conversation.chat.turnTail`；tools —；events —；commands —；client UI 有（33）。
- 状态/持久化信号：`sqlite`, `json-file`, `memory-only`。
- 测试与发布：tests 有（16） `tests/catalog.spec.ts`, `tests/client.spec.tsx`, `tests/feed.spec.ts`, `tests/host.spec.ts`, `tests/locale-hot-update.spec.tsx`, `tests/locale.spec.ts`（另 10 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `contrib/README.md`, `assets/en/sources/README.md`, `src/index.ts`, `src/client/index.tsx`, `tests/catalog.spec.ts`, `tests/client.spec.tsx`, `tests/feed.spec.ts`, `tests/host.spec.ts`（另 22 项）。

## dsh-advisor

- 榜单来源：[Models & Inference · L256](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L256)；源码：[dsh-external/dsh-advisor](https://github.com/dsh-external/dsh-advisor/tree/db4b0ff36b43b944d535d43512d262769b3b55af)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `db4b0ff36b43b944d535d43512d262769b3b55af`。
- 包与安装：`dsh-advisor`；榜单 spec 未给出；文档命令 `A standalone dsh plugin bundle porting the omp "advisor"`, `dsh plugin --profile web add dsh-advisor   # <name> = your profile name`, `pnpm install                    # build the bundle (the prepare self-build)`, `dsh plugin --profile web add .  # <name> = your profile name`, `pnpm install              # registry deps + link farm (via prepare), no private-registry access`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `advisor`, `agents`, `commands`, `connection`, `llm`, `sessions`, `settings`, `typert`；tools —；events `agent/created`, `agent/disposed`, `connection/reset`, `session/disposed`, `session/event`；commands `commands`, `first`, `handler`, `s1`；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（18） `tests/advisor-card.spec.tsx`, `tests/advisor-runtime.test.ts`, `tests/advisor-store.test.ts`, `tests/client-build.test.ts`, `tests/commands.test.ts`, `tests/config.test.ts`（另 12 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`；release `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `.mstar/knowledge/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/advisor-card.spec.tsx`, `tests/advisor-runtime.test.ts`（另 24 项）。

## dsh-agent-rp

- 榜单来源：[Fun & Lifestyle · L339](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L339)；源码：[dsh-external/dsh-agent-rp](https://github.com/dsh-external/dsh-agent-rp)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-aigc-canvas

- 榜单来源：[UI & Experience · L168](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L168)；源码：[dsh-external/dsh-aigc-canvas](https://github.com/dsh-external/dsh-aigc-canvas/tree/33463eed57e0a5b56f0bd15440a82dcfba9ec216)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `33463eed57e0a5b56f0bd15440a82dcfba9ec216`。
- 包与安装：`@huanlin/dsh-plugin-aigc-canvas`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @huanlin/dsh-plugin-aigc-canvas`, `dsh plugin --profile web add link:D:\Projects\deepseek-harness\dsh-aigc-canvas`, `pnpm install          # 安装开发依赖(schemastery、typescript、vitest、tsdown)`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services `aigcCanvas`, `credentials`；tools `aigc_canvas_link`, `aigc_canvas_list_elements`, `aigc_canvas_place`, `aigc_canvas_unlink`, `aigc_get_provider_info`, `aigc_http_request`, `aigc_media_edit`, `aigc_provider_set_instructions`（另 1 项）；events —；commands —；client UI 有（9）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（4） `tests/canvas-registry.spec.ts`, `tests/provider-store.spec.ts`, `tests/tools.spec.ts`, `tests/wire.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.tsx`, `tests/canvas-registry.spec.ts`, `tests/provider-store.spec.ts`, `tests/tools.spec.ts`, `tests/wire.spec.ts`, `tsdown.config.ts`, `tsdown.prepare.config.ts`, `vitest.config.ts`, `src/canvas-registry.ts`（另 16 项）。

## dsh-alphasolve

- 榜单来源：[Git & Engineering · L292](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L292)；源码：[dsh-external/dsh-alphasolve](https://github.com/dsh-external/dsh-alphasolve)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-auto-blame

- 榜单来源：[Git & Engineering · L284](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L284)；源码：[dsh-external/dsh-auto-blame](https://github.com/dsh-external/dsh-auto-blame/tree/d8ce7d58715c0eb4678cc261e4b5bd84ee28b8da)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `d8ce7d58715c0eb4678cc261e4b5bd84ee28b8da`。
- 包与安装：`@huanlin/dsh-plugin-auto-blame`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @huanlin/dsh-plugin-auto-blame`, `dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-auto-blame"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `llm`, `sessionProjections`, `settings`；tools —；events `agent/turn-stopping`；commands —；client UI 有（4）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（3） `tests/blame-prompt.spec.ts`, `tests/projection.spec.ts`, `tests/settings.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/blame-prompt.spec.ts`, `tests/projection.spec.ts`, `tests/settings.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `src/blame-llm.ts`, `src/blame-prompt.ts`（另 7 项）。

## dsh-better-sidebar-plugin-office

- 榜单来源：[Input & Editing · L137](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L137)；源码：[dsh-external/dsh-better-sidebar-plugin-office](https://github.com/dsh-external/dsh-better-sidebar-plugin-office/tree/9b449ac78863637b8a1a2105ffa544fed9d241c2)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9b449ac78863637b8a1a2105ffa544fed9d241c2`。
- 包与安装：`@huanlin/dsh-plugin-better-sidebar-plugin-office`；榜单 spec 未给出；文档命令 `pnpm install`, `dsh plugin --profile web add @huanlin/dsh-plugin-better-sidebar-plugin-office`, `dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-better-sidebar-plugin-office"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（9）。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（2） `tests/registration.spec.ts`, `tests/xlsx-to-univer.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.tsx`, `tests/registration.spec.ts`, `tests/xlsx-to-univer.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `src/client/PptxView.tsx`, `src/client/css-modules.d.ts`, `src/client/icons.tsx`（另 4 项）。

## DSH-better-sidebar

- 榜单来源：[UI & Experience · L193](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L193)；源码：[dsh-external/DSH-better-sidebar](https://github.com/dsh-external/DSH-better-sidebar/tree/5bd961f7f1f65b2a0ddace6d2b4e7d94a2a2fc3d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5bd961f7f1f65b2a0ddace6d2b4e7d94a2a2fc3d`。
- 包与安装：`dsh-better-sidebar`；榜单 spec 未给出；文档命令 `npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-better-sidebar`, `3. 执行 `dsh plugin --profile web add dsh-better-sidebar`：登记依赖 → 识别包内 `dsh.bundle.patch`→ 自动注册进`dsh.profile.bundles` 挂载；`, `dsh plugin --profile web add dsh-better-sidebar`, `或重跑一次一键脚本；也可把 `~/.dsh/profiles/web/package.json`里的版本号改高后`pnpm install`。改完**硬刷新浏览器**（Cmd/Ctrl+Shift+R）即可（client 改动无需重启 DSH）。`, `cd ~/Code/DSH-better-sidebar && pnpm install && pnpm build`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`, `src/client/builtins/index.ts`。
- 扩展面：services `betterSidebar`, `load`, `settings`；tools —；events —；commands —；client UI 有（50）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（42） `tests/add-plugin-modal.spec.tsx`, `tests/agent-pty.spec.ts`, `tests/api-surface.spec.ts`, `tests/bottom-auto-terminal.spec.tsx`, `tests/breakpoints.spec.ts`, `tests/browser-globals.ts`（另 36 项）；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `src/client/index.tsx`, `src/client/builtins/index.ts`, `tests/add-plugin-modal.spec.tsx`, `tests/agent-pty.spec.ts`, `tests/api-surface.spec.ts`, `tests/bottom-auto-terminal.spec.tsx`（另 21 项）。

## dsh-browser-panel

- 榜单来源：[Browser & Remote · L236](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L236)；源码：[dsh-external/dsh-browser-panel](https://github.com/dsh-external/dsh-browser-panel)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-browser

- 榜单来源：[Browser & Remote · L238](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L238)；源码：[dsh-external/dsh-browser](https://github.com/dsh-external/dsh-browser/tree/2cc70cf7f448803cd8b7b6e20dd73dabdd60be97)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2cc70cf7f448803cd8b7b6e20dd73dabdd60be97`。
- 包与安装：`dsh-browser`, `dsh-browser-extension`, `@deepseek-ai/dsh-bridge-browser`；榜单 spec 未给出；文档命令 `npx @deepseek-ai/dsh web`, `Both commands load the same browser bundle from the local `web`profile. Port 3080 is used by default; if it is occupied, run`pnpm start -- --port <port>`or`npx @deepseek-ai/dsh web --port <port>`. When the DeepSeek whale icon appears in the toolbar, click it to open the side panel.`, `The bridge plugin and Chrome extension are both members of this repository's workspace. Run all commands from the repository root. For the first development installation, run `pnpm install`.`, `两种命令都会从本机 `web`profile 加载同一个浏览器 bundle。默认端口为 3080；被占用时执行`pnpm start -- --port <port>`或`npx @deepseek-ai/dsh web --port <port>`。工具栏出现 DeepSeek 鲸鱼图标后，点击即可打开侧边栏。`, `桥接插件和 Chrome 扩展都属于本仓库 workspace；所有命令均在本仓库根目录执行。首次开发安装运行 `pnpm install`。`（另 1 项）。
- DSH/Cordis activation：`packages/browser/bridge-browser/cordis.patch.yml`, `packages/browser/bridge-browser/package.json → ./cordis.patch.yml`。入口：`packages/browser/bridge-browser/src/index.ts`, `packages/browser/bridge-browser/src/server.ts`, `extensions/dsh-browser/src/background/index.ts`, `extensions/dsh-browser/src/content/index.ts`。
- 扩展面：services `apiProxy`, `sessions`, `systemPrompt`, `tools`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（26） `extensions/dsh-browser/tests/actions-security.spec.ts`, `extensions/dsh-browser/tests/authorization.spec.ts`, `extensions/dsh-browser/tests/background-tools.spec.ts`, `extensions/dsh-browser/tests/bridge.spec.ts`, `extensions/dsh-browser/tests/content-index.spec.ts`, `extensions/dsh-browser/tests/extract.spec.ts`（另 20 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `extensions/dsh-browser/package.json`, `packages/browser/bridge-browser/package.json`, `packages/browser/bridge-browser/cordis.patch.yml`, `extensions/dsh-browser/README.md`, `extensions/dsh-browser/README.zh.md`, `packages/browser/bridge-browser/src/index.ts`, `packages/browser/bridge-browser/src/server.ts`, `extensions/dsh-browser/src/background/index.ts`, `extensions/dsh-browser/src/content/index.ts`（另 24 项）。

## dsh-cc-tui

- 榜单来源：[UI & Experience · L189](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L189)；源码：[dsh-external/dsh-cc-tui](https://github.com/dsh-external/dsh-cc-tui)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-chat-thumb

- 榜单来源：[UI & Experience · L203](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L203)；源码：[dsh-external/dsh-chat-thumb](https://github.com/dsh-external/dsh-chat-thumb)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-client-ui-plan-execute

- 榜单来源：[Core · L82](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L82)；源码：[dsh-external/dsh-client-ui-plan-execute](https://github.com/dsh-external/dsh-client-ui-plan-execute)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-cot-summary

- 榜单来源：[Context & Search · L102](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L102)；源码：[dsh-external/dsh-cot-summary](https://github.com/dsh-external/dsh-cot-summary)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-data-agent

- 榜单来源：[Context & Search · L122](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L122)；源码：[dsh-external/dsh-data-agent](https://github.com/dsh-external/dsh-data-agent/tree/56871019e984aa43c01d7913013f25cee0ef2cbe)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `56871019e984aa43c01d7913013f25cee0ef2cbe`。
- 包与安装：`@yejiming/dsh-data-agent`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @yejiming/dsh-data-agent`, `dsh plugin --profile web add github:omdsh-dev/dsh-data-agent`, `dsh plugin --profile web remove @yejiming/dsh-data-agent   # removes the dependency and its layer`, ``lib/`is committed, so installing and debugging (including`dsh plugin add .`)`, `never requires a build. To rebuild the artifacts, just run `pnpm install`: all`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `preset/data-agent/agent.cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `dataAgentConnections`, `slots`, `webServer`；tools `ctx.subprocess`, `function`, `sqlcmd`；events —；commands —；client UI 有（9）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `migration`。
- 测试与发布：tests 有（4） `tests/clients.spec.ts`, `tests/connections.spec.ts`, `tests/persistence.spec.ts`, `tests/tool.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；ships an explicit persistence migration path；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `preset/data-agent/agent.cordis.yml`, `seed/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/clients.spec.ts`, `tests/connections.spec.ts`, `tests/persistence.spec.ts`, `tests/tool.spec.ts`（另 12 项）。

## dsh-deep-research

- 榜单来源：[Core · L80](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L80)；源码：[dsh-external/dsh-deep-research](https://github.com/dsh-external/dsh-deep-research/tree/c0b329e02cd0195f810a7c3608cb58701a7fe0f1)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c0b329e02cd0195f810a7c3608cb58701a7fe0f1`。
- 包与安装：`@dsh-external/dsh-deep-research`；榜单 spec 未给出；文档命令 `pnpm install        # 仅 typescript/@types/node（typecheck 用）`, `包声明了 `dsh.bundle.patch`（cordis.patch.yml），通过 `dsh plugin` 装进**任意** profile`, `dsh plugin --profile <profile> add git+https://github.com/dsh-external/dsh-deep-research.git`, ``git+https://` 形式；`dsh plugin`会提示需要`allowBuilds` 时按提示在`, `dsh plugin --profile <profile> update`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `cordis`, `deep_research`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `test/regression.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `test/regression.test.mjs`。

## dsh-deepcel

- 榜单来源：[UI & Experience · L169](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L169)；源码：[dsh-external/dsh-deepcel](https://github.com/dsh-external/dsh-deepcel)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-deeplink

- 榜单来源：[Browser & Remote · L239](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L239)；源码：[dsh-external/dsh-deeplink](https://github.com/dsh-external/dsh-deeplink)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-deepresearch

- 榜单来源：[Core · L77](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L77)；源码：[dsh-external/dsh-deepresearch](https://github.com/dsh-external/dsh-deepresearch/tree/c80511eb6a5f089af528cdf21b77c2a093bf97ff)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c80511eb6a5f089af528cdf21b77c2a093bf97ff`。
- 包与安装：`@deepseek-ai/dsh-deepresearch`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:havingautism/dsh-deepresearch`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `deepResearch.list`；tools `deep_research_add_evidence`, `deep_research_complete`, `deep_research_confirm_plan`, `deep_research_list`, `deep_research_start`, `deep_research_update_coverage`；events —；commands —；client UI 有（10）。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 有（6） `lib/types/spec.d.ts`, `lib/types/spec.d.ts.map`, `lib/types/spec.js`, `lib/types/spec.js.map`, `src/spec.ts`, `tests/deepresearch.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `src/spec.ts`, `tests/deepresearch.spec.ts`, `src/css-modules.d.ts`, `src/invariant.ts`, `src/types.ts`, `src/client/ResearchView.tsx`, `src/client/view-types.ts`, `lib/types/spec.d.ts`（另 3 项）。

## dsh-diff-viewer

- 榜单来源：[UI & Experience · L171](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L171)；源码：[dsh-external/dsh-diff-viewer](https://github.com/dsh-external/dsh-diff-viewer/tree/75ded1bc49d0d63e6541b95f37e6e3acc184344d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `75ded1bc49d0d63e6541b95f37e6e3acc184344d`。
- 包与安装：`@dsh-external/dsh-diff-viewer`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "https://github.com/lehhair/dsh-diff-viewer/releases/latest/download/dsh-external-dsh-diff-viewer.tgz"`, `⚠️ 升级注意：pnpm 会按 URL 缓存 tarball——同一 `latest`链接在出新版本后可能命中旧缓存。升级失败/装到旧版时，先`dsh plugin --profile web remove @dsh-external/dsh-diff-viewer`，再 `pnpm store prune`（或删除 `C:\Users\lehhair\AppData\Local\pnpm\store` 对应缓存）后重新安装。`, `⚠️ 不要用 `dsh plugin add "github:lehhair/dsh-diff-viewer"`直接装源码：GitHub 源码**不含构建产物**`lib/`（被 `.gitignore`忽略），而包的入口指向`lib/index.js`，启动会报"找不到文件"。源码安装只适合开发环境（见下）。`, `pnpm install && pnpm run check    # typecheck + test + build`, `dsh plugin --profile web add E:\dev\dsh-diff-viewer`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（7）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（1） `tests/diff-viewer.spec.tsx`；workflows 有（1） `.github/workflows/build-release.yml`；release `.github/workflows/build-release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/build-release.yml`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `src/client/index.tsx`, `tests/diff-viewer.spec.tsx`, `tsdown.config.ts`, `vitest.config.ts`, `src/css-modules.d.ts`, `src/client/DiffViewer.tsx`, `src/client/clipboard.ts`, `src/client/diffcard-contract.ts`（另 2 项）。

## dsh-drag-and-drop

- 榜单来源：[Input & Editing · L141](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L141)；源码：[dsh-external/dsh-drag-and-drop](https://github.com/dsh-external/dsh-drag-and-drop/tree/09088d6890866eda57adee6864cd2fbf8281f679)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `09088d6890866eda57adee6864cd2fbf8281f679`。
- 包与安装：`@omdsh-dev/dsh-drag-and-drop`；榜单 spec 未给出；文档命令 `**Install:** `dsh plugin --profile web add github:omdsh-dev/dsh-drag-and-drop``, `The plugin is a DSH **bundle** (`package.json`declares`dsh.bundle`+`dsh.client`). Install it into the `web`profile with the standard`dsh plugin`mechanism — **no DSH source changes and no`config.yaml` needed**:`, `dsh plugin --profile web add github:omdsh-dev/dsh-drag-and-drop`, `dsh plugin --profile web add /path/to/dsh-drag-and-drop`, `dsh plugin --profile web update github:omdsh-dev/dsh-drag-and-drop`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversation`；tools —；events —；commands —；client UI 有（30）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（9） `tests/directory-locator.spec.ts`, `tests/directory.spec.ts`, `tests/drop-items.spec.ts`, `tests/fingerprint.spec.ts`, `tests/locator.spec.ts`, `tests/paths.spec.ts`（另 3 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/directory-locator.spec.ts`, `tests/directory.spec.ts`, `tests/drop-items.spec.ts`, `tests/fingerprint.spec.ts`, `tests/locator.spec.ts`, `tests/paths.spec.ts`, `tests/platform-search.spec.ts`（另 19 项）。

## dsh-easy-ctx-manager

- 榜单来源：[Context & Search · L123](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L123)；源码：[dsh-external/dsh-easy-ctx-manager](https://github.com/dsh-external/dsh-easy-ctx-manager)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-emoji

- 榜单来源：[Fun & Lifestyle · L340](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L340)；源码：[dsh-external/dsh-emoji](https://github.com/dsh-external/dsh-emoji/tree/2caa1987504a24f1c6f531566e8b959383569410)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2caa1987504a24f1c6f531566e8b959383569410`。
- 包与安装：`dsh-emoji`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-emoji`, `To try a prerelease, replace the package name in the installation command with `dsh-emoji@beta`. A plain `npm install dsh-emoji` only adds the package to the current Node.js project; it does not enable the DSH plugin.`, `corepack pnpm install`, `Available on the [dshfind.com](https://dshfind.com) DSH plugin marketplace.`, `如需体验预发布版本，将安装命令中的包名替换为 `dsh-emoji@beta`。普通 `npm install dsh-emoji` 只会把包加入当前 Node.js 项目，不会启用 DSH 插件。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `llm`, `settings`, `webServer`；tools —；events `connection/reset`, `llm/stream`, `system-prompt/change`；commands —；client UI 有（8）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（10） `tests/assets.spec.ts`, `tests/catalog.spec.ts`, `tests/client.spec.ts`, `tests/integration.spec.ts`, `tests/markers.spec.ts`, `tests/package.spec.ts`（另 4 项）；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.prepack`, `package.json#scripts.release:check`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `.docs/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/assets.spec.ts`, `tests/catalog.spec.ts`, `tests/client.spec.ts`（另 23 项）。

## dsh-engram-relay

- 榜单来源：[Context & Search · L115](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L115)；源码：[dsh-external/dsh-engram-relay](https://github.com/dsh-external/dsh-engram-relay)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-explain

- 榜单来源：[Context & Search · L103](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L103)；源码：[dsh-external/dsh-explain](https://github.com/dsh-external/dsh-explain/tree/f2cd85bb85bdb88fc33763a521146c01415ed6ec)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `f2cd85bb85bdb88fc33763a521146c01415ed6ec`。
- 包与安装：`dsh-explain`；榜单 spec 未给出；文档命令 `npx @deepseek-ai/dsh@0.1.0-rc.6 plugin --profile web add github:yuezengwu/dsh-explain`, `npx @deepseek-ai/dsh@0.1.0-rc.6 web`, `pnpm install`, `dsh plugin --profile web add /absolute/path/to/dsh-explain`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversation.chat.assistant-actions`, `remote.explain`；tools —；events `session/event`；commands `/explain`, `explain`, `missing-answer-source`；client UI 有（8）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（16） `tests/button-stub.ts`, `tests/client-runtime-stub.ts`, `tests/client.spec.tsx`, `tests/config.spec.ts`, `tests/m2-core.spec.ts`, `tests/m2-store.spec.ts`（另 10 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/button-stub.ts`, `tests/client-runtime-stub.ts`, `tests/client.spec.tsx`, `tests/config.spec.ts`, `tests/m2-core.spec.ts`, `tests/m2-store.spec.ts`（另 20 项）。

## dsh-feishu-bot

- 榜单来源：[Notifications & Channels · L316](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L316)；源码：[dsh-external/dsh-feishu-bot](https://github.com/dsh-external/dsh-feishu-bot)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-feishu-notify

- 榜单来源：[Notifications & Channels · L317](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L317)；源码：[dsh-external/dsh-feishu-notify](https://github.com/dsh-external/dsh-feishu-notify)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-gh-bridge

- 榜单来源：[Git & Engineering · L281](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L281)；源码：[dsh-external/dsh-gh-bridge](https://github.com/dsh-external/dsh-gh-bridge)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-git-identity

- 榜单来源：[Git & Engineering · L280](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L280)；源码：[dsh-external/dsh-git-identity](https://github.com/dsh-external/dsh-git-identity/tree/39c608ca8e0779c93c66648ad457decffdf61903)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `39c608ca8e0779c93c66648ad457decffdf61903`。
- 包与安装：`@loserfox/git-identity`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add /path/to/dsh-git-identity`, `dsh plugin --profile headless add /path/to/dsh-git-identity`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `cordis.patch.yml`, `index.mjs`。

## dsh-github-integration

- 榜单来源：[Infrastructure & Development · L378](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L378)；源码：[dsh-external/dsh-github-integration](https://github.com/dsh-external/dsh-github-integration)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-gomoku

- 榜单来源：[Fun & Lifestyle · L349](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L349)；源码：[dsh-external/dsh-gomoku](https://github.com/dsh-external/dsh-gomoku/tree/5b27af9808f5bd8f2d753dfdf6157d86a54a4947)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5b27af9808f5bd8f2d753dfdf6157d86a54a4947`。
- 包与安装：`@yejiming/dsh-gomoku`；榜单 spec 未给出；文档命令 `Three install methods, all without a local build (the prebuilt output in `lib/`is committed, and no`prepare`/`prepack`scripts are declared). DSH's standard plugin mechanism is "bundle → profile": the plugin declares`dsh.bundle`in`package.json` and ships a patch file (`cordis.patch.yml`); you install it into any profile with `dsh plugin`.`, `dsh plugin --profile demo add @yejiming/dsh-gomoku`, `dsh plugin --profile demo add github:omdsh-dev/dsh-gomoku`, `dsh plugin --profile demo add .`, `dsh plugin --profile demo add ./yejiming-dsh-gomoku-0.0.1.tgz`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（11）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（4） `tests/e2e/session-continuity.mjs`, `tests/e2e/tab-continuity.mjs`, `tests/index.spec.ts`, `tests/store-logic.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/index.spec.ts`, `tests/store-logic.mjs`, `tests/e2e/session-continuity.mjs`, `tests/e2e/tab-continuity.mjs`, `tsdown.config.ts`, `src/css-modules.d.ts`（另 5 项）。

## dsh-hmz

- 榜单来源：[Infrastructure & Development · L364](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L364)；源码：[dsh-external/dsh-hmz](https://github.com/dsh-external/dsh-hmz)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-ica

- 榜单来源：[Notifications & Channels · L330](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L330)；源码：[dsh-external/dsh-ica](https://github.com/dsh-external/dsh-ica)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-input-history

- 榜单来源：[Input & Editing · L143](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L143)；源码：[dsh-external/dsh-input-history](https://github.com/dsh-external/dsh-input-history)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-inspect

- 榜单来源：[Git & Engineering · L290](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L290)；源码：[dsh-external/dsh-inspect](https://github.com/dsh-external/dsh-inspect/tree/9876349054f0fec33114f7f594b4901b7e9420f1)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9876349054f0fec33114f7f594b4901b7e9420f1`。
- 包与安装：`@dsh-external/dsh-inspect`；榜单 spec 未给出；文档命令 `pnpm install        # 仅 typescript/@types/node（typecheck 用）`, `包声明了 `dsh.bundle.patch`（cordis.patch.yml），通过 `dsh plugin` 装进**任意** profile`, `dsh plugin --profile <profile> add git+https://github.com/dsh-external/dsh-inspect.git`, ``git+https://` 形式；`dsh plugin`会提示需要`allowBuilds` 时按提示在`, `dsh plugin --profile <profile> update`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `array`, `checkup`, `cordis`, `dsh.bundle.patch`, `fix`, `review`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `test/regression.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `test/regression.test.mjs`。

## dsh-interpreters

- 榜单来源：[Infrastructure & Development · L365](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L365)；源码：[dsh-external/dsh-interpreters](https://github.com/dsh-external/dsh-interpreters/tree/dded3018d8f1e44142be8f845d23b7d559c8da52)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `dded3018d8f1e44142be8f845d23b7d559c8da52`。
- 包与安装：`@huanlin/dsh-plugin-interpreters`；榜单 spec 未给出；文档命令 `pnpm install          # 安装依赖（link: 指向 ~/.dsh/source/current/）`, `dsh plugin --profile web add @huanlin/dsh-plugin-interpreters`, `dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-interpreters"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `settings`；tools `python`, `run_node`, `run_python`；events `connection/reset`；commands —；client UI 有（14）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（3） `tests/client-store.spec.ts`, `tests/gateway.spec.ts`, `tests/tools.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/client-store.spec.ts`, `tests/gateway.spec.ts`, `tests/tools.spec.ts`, `vitest.config.ts`, `scripts/build-client.mjs`, `src/config.ts`, `src/gateway.ts`, `src/runner.ts`（另 6 项）。

## dsh-involute

- 榜单来源：[Git & Engineering · L295](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L295)；源码：[dsh-external/dsh-involute](https://github.com/dsh-external/dsh-involute/tree/4e6112b6b3c243e1867f876a68b16af2e2f2eb3c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4e6112b6b3c243e1867f876a68b16af2e2f2eb3c`。
- 包与安装：`@fakechris/dsh-track`；榜单 spec 未给出；文档命令 `# 1. Install the plugin (official form: published dsh; or `dsh plugin ...` if installed)`, `npx -p @deepseek-ai/dsh dsh plugin --profile web add @fakechris/dsh-track`, `# npx -p @deepseek-ai/dsh dsh plugin --profile web add github:dsh-external/dsh-track`, `cordis.patch.yml      bundle patch (auto-applied by dsh plugin add)`, `pnpm install`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `invariants`, `storage`, `tools`, `webServer`；tools `capture_thought`, `report_decision_point`, `track_attach_issue`, `track_backfill_captures`, `track_create_issue`, `track_issue_evidence`, `track_list_decisions`, `track_list_issues`（另 4 项）；events `session/event`；commands —；client UI 有（15）。
- 状态/持久化信号：`sqlite`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（21） `tests/auto-capture.spec.ts`, `tests/capture-backfill.spec.ts`, `tests/capture-dedup.spec.ts`, `tests/decisions.spec.ts`, `tests/eval-segmentation.spec.ts`, `tests/fixtures/golden/proto.json`（另 15 项）；workflows 有（1） `.github/workflows/npm-release.yml`；release `.github/workflows/npm-release.yml`, `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/npm-release.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/auto-capture.spec.ts`, `tests/capture-backfill.spec.ts`, `tests/capture-dedup.spec.ts`, `tests/decisions.spec.ts`, `tests/eval-segmentation.spec.ts`, `tests/golden-eval.spec.ts`（另 20 项）。

## dsh-kb-sieve

- 榜单来源：[Context & Search · L124](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L124)；源码：[dsh-external/dsh-kb-sieve](https://github.com/dsh-external/dsh-kb-sieve/tree/01aba653f576658974b70514573c1f6b7b4ce4df)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `01aba653f576658974b70514573c1f6b7b4ce4df`。
- 包与安装：`@dsh-external/dsh-kb-sieve`；榜单 spec 未给出；文档命令 `需要支持 `dsh plugin` 子命令的 dsh 版本）：`, `dsh plugin --profile <profile> add git+https://github.com/dsh-external/dsh-kb-sieve.git`, `dsh plugin --profile <profile> update`, `dsh plugin --profile <profile> remove @dsh-external/dsh-kb-sieve`, `# 或：从 profile 的 package.json 移除依赖后 dsh plugin --profile <profile> update`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `cordis`, `kb_build`, `kb_query`, `kb_read`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；ships an explicit persistence migration path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/build.ts`, `src/constants.ts`, `src/db.ts`, `src/extract.ts`, `src/heading.ts`, `src/query.ts`, `src/read.ts`, `src/skill-md.ts`（另 1 项）。

## dsh-lazyfish

- 榜单来源：[Fun & Lifestyle · L351](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L351)；源码：[dsh-external/dsh-lazyfish](https://github.com/dsh-external/dsh-lazyfish)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-live-stats

- 榜单来源：[UI & Experience · L185](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L185)；源码：[dsh-external/dsh-live-stats](https://github.com/dsh-external/dsh-live-stats)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-llm-fallbacks

- 榜单来源：[Models & Inference · L258](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L258)；源码：[dsh-external/dsh-llm-fallbacks](https://github.com/dsh-external/dsh-llm-fallbacks/tree/b9d78c2c2d938887fc49ba3174ac30dfec68a0d7)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `b9d78c2c2d938887fc49ba3174ac30dfec68a0d7`。
- 包与安装：`dsh-llm-fallbacks`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-llm-fallbacks   # pin a version with @<version>`, `A registry install fetches the **built package** (`dist/`) — nothing is built on the target machine. The plugin is **mount-only**: it never modifies the dsh source tree, and no patch / postinstall step exists — dsh upgrades never require re-patching. Versioning follows npm dist-tags (`latest`by default); pin an exact version with`dsh plugin --profile web add dsh-llm-fallbacks@<version>`.`, `npm install dsh-llm-fallbacks   # or: pnpm add dsh-llm-fallbacks`, `dsh plugin --profile web add github:omdsh-dev/dsh-llm-fallbacks   # pin a commit with #<sha>`, `pnpm install`（另 5 项）。
- DSH/Cordis activation：`bundle/cordis.patch.yml`, `package.json → ./bundle/cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `commands`, `connection`, `conversationEvents`, `llm`, `llm-fallbacks`, `locale`, `remote`, `sessions`（另 3 项）；tools —；events `agent/disposed`, `agent/request`, `agent/request-error`, `agent/status`, `connection/reset`；commands —；client UI 有（11）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（28） `tests/always-mode.spec.ts`, `tests/chains.spec.ts`, `tests/coexist-llm-retry.spec.ts`, `tests/command.spec.ts`, `tests/config.spec.ts`, `tests/conversation-switch.spec.tsx`（另 22 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`；release `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `package.json#scripts.release:prepare`, `package.json#scripts.release:validate`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `pnpm-workspace.yaml`, `bundle/cordis.patch.yml`, `.changes/unreleased/README.md`, `.mstar/knowledge/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/always-mode.spec.ts`（另 25 项）。

## dsh-memory-evolve

- 榜单来源：[Context & Search · L113](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L113)；源码：[dsh-external/dsh-memory-evolve](https://github.com/dsh-external/dsh-memory-evolve/tree/ce7f0faa0e0240f117c29795e9224c0d9ed18183)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `ce7f0faa0e0240f117c29795e9224c0d9ed18183`。
- 包与安装：`dsh-memory-evolve`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：`src/client/index.ts`, `src/client/canvas-grok/index.ts`。
- 扩展面：services `agents`, `inject`, `s1`, `sB`, `tools`, `webServer`；tools `modelsTab.guide.tool.body`；events `agent/status`, `connection/reset`；commands `advisor`；client UI 有（50）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（51） `tests/advisor-api.test.js`, `tests/advisor-commands.test.js`, `tests/advisor-conversation.test.js`, `tests/advisor-guard.test.js`, `tests/advisor-kinds.test.js`, `tests/advisor-observer.test.js`（另 45 项）；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `src/client/canvas-grok/README.md`, `src/client/index.ts`, `src/client/canvas-grok/index.ts`, `tests/advisor-api.test.js`, `tests/advisor-commands.test.js`, `tests/advisor-conversation.test.js`, `tests/advisor-guard.test.js`, `tests/advisor-kinds.test.js`, `tests/advisor-observer.test.js`, `tests/advisor-optin.test.js`（另 19 项）。

## dsh-message-edit

- 榜单来源：[Input & Editing · L138](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L138)；源码：[dsh-external/dsh-message-edit](https://github.com/dsh-external/dsh-message-edit/tree/e950651786e916feebe5a49c8e4ca46afdca379d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `e950651786e916feebe5a49c8e4ca46afdca379d`。
- 包与安装：`dsh-message-edit`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-message-edit`, `npm install`, `dsh plugin --profile web add -w link:/path/to/dsh-message-edit`, ``dsh plugin` 是 pnpm 转发器：`add`后会自动识别`dsh.bundle`声明并把插件收编进 profile 的`dsh.profile.bundles`，重启 dsh 即生效。本地开发建议用 `link:`（符号链接），改动源码重构建后重启即更新。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `index.mjs`, `src/client/index.ts`, `client.js`。
- 扩展面：services `agentPresets`, `sessions`；tools —；events `connection/reset`；commands —；client UI 有（8）。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `index.mjs`, `src/client/index.ts`, `client.js`, `tsdown.config.ts`, `scripts/build.mjs`, `scripts/dsh-client-preset.ts`, `src/css-modules.d.ts`, `src/shared.ts`, `src/client/InlineMessageEdit.tsx`, `src/client/MessageEditHeader.tsx`（另 2 项）。

## dsh-mnemon

- 榜单来源：[Models & Inference · L264](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L264)；源码：[dsh-external/dsh-mnemon](https://github.com/dsh-external/dsh-mnemon/tree/ade5a7b395f2d0578ae1d8807b8df7d54ac03c3c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `ade5a7b395f2d0578ae1d8807b8df7d54ac03c3c`。
- 包与安装：`dsh-mnemon`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-mnemon`, `dsh plugin --profile web add "link:/absolute/path/to/dsh-mnemon"`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`, `src/client/index.ts`。
- 扩展面：services `buildin`, `connection`；tools —；events `settings/updated`；commands `./commands.ts`；client UI 有（50）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（28） `tests/activity.spec.ts`, `tests/client-api.spec.ts`, `tests/client-apply.spec.ts`, `tests/client-interaction-surfaces.spec.tsx`, `tests/client-interaction.spec.tsx`, `tests/client-platform-boundary.spec.ts`（另 22 项）；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `docs/README.md`, `docs/en/README.md`, `src/index.ts`, `src/service.ts`, `src/client/index.ts`, `tests/activity.spec.ts`, `tests/client-api.spec.ts`（另 23 项）。

## dsh-mobile

- 榜单来源：[UI & Experience · L172](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L172)；源码：[dsh-external/dsh-mobile](https://github.com/dsh-external/dsh-mobile/tree/3c779e801e3da4abc1f920b0acdf9c785ec5de8f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3c779e801e3da4abc1f920b0acdf9c785ec5de8f`。
- 包与安装：`@dsh-external/dsh-mobile`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "https://github.com/lehhair/dsh-mobile/releases/latest/download/dsh-external-dsh-mobile.tgz"`, `⚠️ 升级注意：pnpm 会按 URL 缓存 tarball——同一 `latest`链接在新版本发布后可能命中旧缓存。装到旧版时先`dsh plugin --profile web remove @dsh-external/dsh-mobile`再重新安装（必要时`pnpm store prune`）。`, `dsh plugin --profile web add link:E:/dev/dsh-mobile`, `pnpm install        # devDeps link 到 ../dsh2026/deepseek-harness（DSH 源码，需先构建其 client 包）`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `layout`, `locale`, `sessions`；tools —；events —；commands —；client UI 有（3）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（3） `tests/apply.spec.ts`, `tests/controller.spec.ts`, `tests/settings-dialog.client.spec.ts`；workflows 有（1） `.github/workflows/build-release.yml`；release `.github/workflows/build-release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/build-release.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `src/client/index.ts`, `tests/apply.spec.ts`, `tests/controller.spec.ts`, `tests/settings-dialog.client.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `src/css-modules.d.ts`（另 1 项）。

## dsh-mobileweb-adapter

- 榜单来源：[UI & Experience · L196](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L196)；源码：[dsh-external/dsh-mobileweb-adapter](https://github.com/dsh-external/dsh-mobileweb-adapter)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-multimedia-webui-input

- 榜单来源：[Input & Editing · L144](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L144)；源码：[dsh-external/dsh-multimedia-webui-input](https://github.com/dsh-external/dsh-multimedia-webui-input)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-notebooks

- 榜单来源：[Infrastructure & Development · L366](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L366)；源码：[dsh-external/dsh-notebooks](https://github.com/dsh-external/dsh-notebooks/tree/5524c4a636908b45d1b55f2ac246d6d1b02346a9)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5524c4a636908b45d1b55f2ac246d6d1b02346a9`。
- 包与安装：`@deepseek-ai/dsh-notebooks`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:havingautism/dsh-notebooks`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `notebooks.list`；tools `notebook_add_source`, `notebook_delete`, `notebook_list`, `notebook_set_artifact`, `notebook_set_summary`, `notebook_write`；events —；commands —；client UI 有（10）。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 有（6） `lib/types/spec.d.ts`, `lib/types/spec.d.ts.map`, `lib/types/spec.js`, `lib/types/spec.js.map`, `src/spec.ts`, `tests/notebooks.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `src/spec.ts`, `tests/notebooks.spec.ts`, `src/css-modules.d.ts`, `src/invariant.ts`, `src/types.ts`, `src/client/NotebooksView.tsx`, `src/client/view-types.ts`, `lib/types/spec.d.ts`（另 3 项）。

## dsh-office

- 榜单来源：[Input & Editing · L145](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L145)；源码：[dsh-external/dsh-office](https://github.com/dsh-external/dsh-office)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-opencode-server

- 榜单来源：[Notifications & Channels · L331](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L331)；源码：[dsh-external/dsh-opencode-server](https://github.com/dsh-external/dsh-opencode-server)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-openmaic

- 榜单来源：[Science & Research · L413](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L413)；源码：[dsh-external/dsh-openmaic](https://github.com/dsh-external/dsh-openmaic)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-openpencil

- 榜单来源：[UI & Experience · L173](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L173)；源码：[dsh-external/dsh-openpencil](https://github.com/dsh-external/dsh-openpencil/tree/49b0417a6d6fe7a55056bb1a82d4c348a21a6ca6)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `49b0417a6d6fe7a55056bb1a82d4c348a21a6ca6`。
- 包与安装：`@zseven-w/dsh-openpencil`；榜单 spec 未给出；文档命令 `pnpm dlx --package=@deepseek-ai/dsh@0.1.0-rc.6 dsh plugin --profile web add @zseven-w/dsh-openpencil@latest`, `\| **[openpencil-skill](https://github.com/ZSeven-W/openpencil-skill)** \| The LLM skill plugin that teaches AI agents how to design with `op` — a companion to this DSH plugin. \|`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services `webServer`；tools `node:path`；events `locale/change`, `theme/change`；commands —；client UI 有（15）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（7） `tests/client.test.mjs`, `tests/editor-host-lifecycle.test.mjs`, `tests/editor-recovery.test.mjs`, `tests/host-service.test.mjs`, `tests/mcp-client.test.mjs`, `tests/new-tool.test.mjs`（另 1 项）；workflows 有（2） `.github/workflows/check.yml`, `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/check.yml`, `.github/workflows/publish.yml`, `LICENSE`, `README.de.md`, `README.es.md`, `README.fr.md`, `README.hi.md`, `README.id.md`, `README.ja.md`, `README.ko.md`, `README.md`, `README.pt.md`, `README.ru.md`, `README.th.md`（另 34 项）。

## dsh-paste-input

- 榜单来源：[Input & Editing · L140](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L140)；源码：[dsh-external/dsh-paste-input](https://github.com/dsh-external/dsh-paste-input)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-pet-rs

- 榜单来源：[Fun & Lifestyle · L346](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L346)；源码：[dsh-external/dsh-pet-rs](https://github.com/dsh-external/dsh-pet-rs/tree/81605ef83947c28799369a4456605c4a17513430)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `81605ef83947c28799369a4456605c4a17513430`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（2） `crates/dsh-pet-core/tests/snapshot_golden.rs`, `crates/dsh-pet-core/tests/sse_reconnect.rs`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `Cargo.toml`, `LICENSE`, `README.md`, `crates/dsh-pet-app/Cargo.toml`, `crates/dsh-pet-core/Cargo.toml`, `crates/dsh-pet-ui/Cargo.toml`, `crates/dsh-pet-core/tests/snapshot_golden.rs`, `crates/dsh-pet-core/tests/sse_reconnect.rs`。

## dsh-pi-adapter

- 榜单来源：[Models & Inference · L259](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L259)；源码：[dsh-external/dsh-pi-adapter](https://github.com/dsh-external/dsh-pi-adapter)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-plan-execute

- 榜单来源：[Core · L78](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L78)；源码：[dsh-external/dsh-plan-execute](https://github.com/dsh-external/dsh-plan-execute)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-plugin-check

- 榜单来源：[Git & Engineering · L287](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L287)；源码：[dsh-external/dsh-plugin-check](https://github.com/dsh-external/dsh-plugin-check/tree/397aa26df241aca530aa65a08484a664f7d555ad)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `397aa26df241aca530aa65a08484a664f7d555ad`。
- 包与安装：`@deepseek-ai/dsh-plugin-check`；榜单 spec 未给出；文档命令 `DSH plugin health-check tool — scans plugin repositories and diagnoses **manifest protocol / patch format / build pitfalls / hub inclusion status**, outputting compliance reports with fix suggestions. **Read-only** — it does not modify or build the checked repository.`, `- `missing-profile-install-example`: the README lacks a `dsh plugin --profile ... add` example;`, `- **Standalone build**: `npm install`(devDependencies self-contained: typescript/vitest/@types/node) →`npm run typecheck`→`npm test`→`npm run build`→`npm pack``, `- **Launch method**: `npx -p @deepseek-ai/dsh@0.1.0-rc.6 dsh web`(lib production mode; do not`install -g` globally)`, `dsh plugin --profile web add github:omdsh-dev/dsh-plugin-check`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `good`, `no-tsconfig`, `node:fs`, `plugin_check`, `tool-bundle`, `tool-plugin-check`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（8） `tests/build-check.spec.ts`, `tests/ecosystem.spec.ts`, `tests/form-registry.spec.ts`, `tests/helpers.ts`, `tests/manifest.spec.ts`, `tests/patch.spec.ts`（另 2 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `tests/build-check.spec.ts`, `tests/ecosystem.spec.ts`, `tests/form-registry.spec.ts`, `tests/helpers.ts`, `tests/manifest.spec.ts`, `tests/patch.spec.ts`, `tests/register.spec.ts`, `tests/report.spec.ts`（另 10 项）。

## dsh-plugin-radar

- 榜单来源：[Infrastructure & Development · L367](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L367)；源码：[dsh-external/dsh-plugin-radar](https://github.com/dsh-external/dsh-plugin-radar)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-prompt-studio

- 榜单来源：[Input & Editing · L139](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L139)；源码：[dsh-external/dsh-prompt-studio](https://github.com/dsh-external/dsh-prompt-studio/tree/be5e97d6ea4e882067d9f3a6385f486f7f192e92)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `be5e97d6ea4e882067d9f3a6385f486f7f192e92`。
- 包与安装：`dsh-prompt-studio`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add /path/to/dsh-prompt-studio`, ``dsh plugin --profile <name> add <path>`会把包链接进 profile 并把包名追加进`dsh.profile.bundles`。已安装的 bundle 通过 `dsh plugin --profile <name> remove dsh-prompt-studio`移除。命令行与已经运行的 Web 进程不共享内存，因此替换插件产物后需重启`dsh web` 并刷新浏览器。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `index.mjs`, `src/client/index.ts`, `client.js`。
- 扩展面：services `connection`, `conversation`, `index.mjs`, `remote`, `settings.section`, `slots`, `webServer`；tools —；events `connection/reset`, `llm/stream`, `session/created`, `system-prompt/assemble`, `system-prompt/change`；commands —；client UI 有（4）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（10） `scripts/test.mjs`, `tests/apply.spec.ts`, `tests/capture.spec.ts`, `tests/host.spec.ts`, `tests/registry-artifacts.spec.ts`, `tests/resource.spec.ts`（另 4 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `index.mjs`, `src/client/index.ts`, `scripts/test.mjs`, `tests/apply.spec.ts`, `tests/capture.spec.ts`, `tests/host.spec.ts`, `tests/registry-artifacts.spec.ts`, `tests/resource.spec.ts`, `tests/shared.spec.ts`（另 15 项）。

## dsh-qq2006

- 榜单来源：[Fun & Lifestyle · L350](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L350)；源码：[dsh-external/dsh-qq2006](https://github.com/dsh-external/dsh-qq2006)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-scout

- 榜单来源：[Infrastructure & Development · L368](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L368)；源码：[dsh-external/dsh-scout](https://github.com/dsh-external/dsh-scout/tree/40a0e89b8f8b2b72bd47df615803cbe09e8df9d0)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `40a0e89b8f8b2b72bd47df615803cbe09e8df9d0`。
- 包与安装：`@deepseek-ai/dsh-tool-scout`；榜单 spec 未给出；文档命令 `pnpm dsh plugin --profile web add /path/to/dsh-scout`, `pnpm install                    # install standalone build dependencies`, `pnpm install                    # 安装可独立构建所需依赖`。
- DSH/Cordis activation：`cordis.patch.yml`, `tests/fixtures/env-skills/cordis.yml`, `tests/fixtures/env/cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `environment_probe`, `loader-probe`, `profile-verify`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（15） `tests/apps.spec.ts`, `tests/fixtures/env-skills/cordis.yml`, `tests/fixtures/env-skills/driver.mjs`, `tests/fixtures/env/cordis.yml`, `tests/fixtures/env/driver.mjs`, `tests/hardware.spec.ts`（另 9 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `tests/fixtures/env-skills/cordis.yml`, `tests/fixtures/env/cordis.yml`, `src/index.ts`, `tests/apps.spec.ts`, `tests/hardware.spec.ts`, `tests/invariant.spec.ts`, `tests/loader-skills.spec.ts`, `tests/loader.spec.ts`（另 22 项）。

## dsh-session-cluster

- 榜单来源：[Context & Search · L110](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L110)；源码：[dsh-external/dsh-session-cluster](https://github.com/dsh-external/dsh-session-cluster)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-session-search

- 榜单来源：[Context & Search · L107](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L107)；源码：[dsh-external/dsh-session-search](https://github.com/dsh-external/dsh-session-search)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-sfw

- 榜单来源：[Fun & Lifestyle · L353](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L353)；源码：[dsh-external/dsh-sfw](https://github.com/dsh-external/dsh-sfw)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-share

- 榜单来源：[Infrastructure & Development · L369](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L369)；源码：[dsh-external/dsh-share](https://github.com/dsh-external/dsh-share/tree/9a582f840227580d40d401dc60ec0ec41d916927)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9a582f840227580d40d401dc60ec0ec41d916927`。
- 包与安装：`dsh-share`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-share`, `To try a prerelease, replace the package name in the installation command with `dsh-share@beta`. A plain `npm install dsh-share` only adds the package to the current Node.js project; it does not enable the DSH plugin.`, `dsh plugin --profile web add github:hellodigua/dsh-share#vX.Y.Z`, `dsh plugin --profile web add .`, `dsh plugin --profile web add --force .`（另 4 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversation.chat.assistant-actions`, `conversation.session.header.utilities`；tools —；events —；commands —；client UI 有（14）。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（9） `tests/card.spec.ts`, `tests/client.spec.ts`, `tests/content.spec.ts`, `tests/dom.spec.ts`, `tests/markdown.spec.ts`, `tests/package.spec.ts`（另 3 项）；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.prepack`, `package.json#scripts.release:check`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/card.spec.ts`, `tests/client.spec.ts`, `tests/content.spec.ts`, `tests/dom.spec.ts`（另 16 项）。

## dsh-skins

- 榜单来源：[UI & Experience · L201](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L201)；源码：[dsh-external/dsh-skins](https://github.com/dsh-external/dsh-skins)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-slice-agent-loop

- 榜单来源：[Models & Inference · L265](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L265)；源码：[dsh-external/dsh-slice-agent-loop](https://github.com/dsh-external/dsh-slice-agent-loop/tree/458f2210389ce1b7a80bfad0a080f85a779d4276)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `458f2210389ce1b7a80bfad0a080f85a779d4276`。
- 包与安装：`@dsh-external/dsh-slice-agent-loop`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:TT-Wang/dsh-slice-agent-loop#main"`, `Or from a local checkout: `git clone`then`dsh plugin --profile web add .``, `npm install --legacy-peer-deps   # the @deepseek-ai/* peers are unpublished`, `或本地目录:`git clone` 后 `dsh plugin --profile web add .``, `npm install --legacy-peer-deps   # @deepseek-ai/* peer 未发布`。
- DSH/Cordis activation：`cordis.patch.yml`, `presets/benchmark.agent.cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/slice/index.ts`。
- 扩展面：services `agents`, `invariants`, `run_in_background`, `sessionPersistence`, `sliceAgentLoop`, `tokenMeter`；tools `audit_echo`, `echo`, `noop`, `parallel_audit`, `probe`, `slow_tool`, `str_replace_editor`, `write`（另 1 项）；events `agent/created`, `agent/disposed`, `agent/error`, `agent/pre-step`, `agent/request`, `agent/request-error`, `agent/session-start`, `agent/status`（另 6 项）；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（10） `tests/driver-contract.spec.ts`, `tests/golden/cases.json`, `tests/golden/expected.json`, `tests/golden/gen_goldens.py`, `tests/golden/harness.ts`, `tests/inbox-ledger.spec.ts`（另 4 项）；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `presets/benchmark.agent.cordis.yml`, `src/index.ts`, `src/slice/index.ts`, `tests/driver-contract.spec.ts`, `tests/inbox-ledger.spec.ts`, `tests/lifecycle.spec.ts`, `tests/mock-adapter.ts`, `tests/parity.test.ts`（另 23 项）。

## dsh-sonar

- 榜单来源：[Infrastructure & Development · L370](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L370)；源码：[dsh-external/dsh-sonar](https://github.com/dsh-external/dsh-sonar)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-split-panes

- 榜单来源：[UI & Experience · L199](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L199)；源码：[dsh-external/dsh-split-panes](https://github.com/dsh-external/dsh-split-panes/tree/192a9a9a1bb340bbad9f186fa9b608c39ef20d31)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `192a9a9a1bb340bbad9f186fa9b608c39ef20d31`。
- 包与安装：`@dsh-external/dsh-split-panes`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add link:/path/to/dsh-split-panes`, `pnpm install        # devDeps link 到 ../dsh2026/deepseek-harness（DSH 源码，需先构建其 client 包）`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversation.panes`, `locale`, `sessions`, `slots`, `splitWithNew`；tools —；events —；commands —；client UI 有（15）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（4） `tests/apply.spec.tsx`, `tests/pane-layout-store.spec.ts`, `tests/pane-workspace.spec.tsx`, `tests/split-pane-button.spec.tsx`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `patches/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/apply.spec.tsx`, `tests/pane-layout-store.spec.ts`, `tests/pane-workspace.spec.tsx`, `tests/split-pane-button.spec.tsx`, `tsdown.config.ts`, `vitest.config.ts`（另 11 项）。

## dsh-spur

- 榜单来源：[Git & Engineering · L294](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L294)；源码：[dsh-external/dsh-spur](https://github.com/dsh-external/dsh-spur/tree/1d3dc15fd5150698ccddbcd187ef37290ec04e3a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `1d3dc15fd5150698ccddbcd187ef37290ec04e3a`。
- 包与安装：`@huanlin/dsh-plugin-spur`；榜单 spec 未给出；文档命令 `pnpm install          # 安装开发依赖`, `dsh plugin --profile web add @huanlin/dsh-plugin-spur`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（13）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（1） `tests/physics.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/physics.spec.ts`, `tsdown.config.ts`, `tsdown.prepare.config.ts`, `src/css-modules.d.ts`, `src/invariant.ts`, `src/client/Braid.tsx`, `src/client/locales.ts`（另 1 项）。

## dsh-stickers

- 榜单来源：[Fun & Lifestyle · L347](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L347)；源码：[dsh-external/dsh-stickers](https://github.com/dsh-external/dsh-stickers/tree/1703f09915db1058b6031b31e52fd404560e0a78)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `1703f09915db1058b6031b31e52fd404560e0a78`。
- 包与安装：`@dsh-external/dsh-stickers`；榜单 spec 未给出；文档命令 `pnpm install`, `dsh plugin --profile web add /absolute/path/to/dsh-stickers`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `webServer`；tools `send_sticker`；events —；commands `sticker`；client UI 有（6）。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `tests/catalog.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `wechat-submission/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/catalog.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `scripts/build-ansi.mjs`, `scripts/build-readme-thumbnails.mjs`, `scripts/build-stickers.mjs`（另 7 项）。

## dsh-stock-market

- 榜单来源：[Data & Market · L408](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L408)；源码：[dsh-external/dsh-stock-market](https://github.com/dsh-external/dsh-stock-market/tree/02278af12330102c534c843a668d1c8407dbde1b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `02278af12330102c534c843a668d1c8407dbde1b`。
- 包与安装：`dsh-stock-market`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add link:/absolute/path/to/dsh-stock-market`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `settings`；tools —；events —；commands —；client UI 有（23）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（16） `tests/client-registration.spec.ts`, `tests/investor-quotes.spec.ts`, `tests/local-storage.ts`, `tests/public-stock-api.spec.ts`, `tests/request-control.spec.ts`, `tests/rpc.spec.ts`（另 10 项）；workflows 未发现 —；release `package.json#scripts.prepack`, `package.json#scripts.verify:package`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/client-registration.spec.ts`, `tests/investor-quotes.spec.ts`, `tests/local-storage.ts`, `tests/public-stock-api.spec.ts`, `tests/request-control.spec.ts`, `tests/rpc.spec.ts`, `tests/settings.spec.tsx`, `tests/side-card-state.spec.ts`（另 18 项）。

## dsh-subagent-tree

- 榜单来源：[UI & Experience · L197](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L197)；源码：[dsh-external/dsh-subagent-tree](https://github.com/dsh-external/dsh-subagent-tree)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-suggested-replies

- 榜单来源：[Input & Editing · L152](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L152)；源码：[dsh-external/dsh-suggested-replies](https://github.com/dsh-external/dsh-suggested-replies/tree/eb7e41b82ae80d01ae09b6e2641156dc21fdd01e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `eb7e41b82ae80d01ae09b6e2641156dc21fdd01e`。
- 包与安装：`@anionex/dsh-suggested-replies`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @anionex/dsh-suggested-replies`, `dsh plugin --profile web add /absolute/path/to/dsh-suggested-replies`, `pnpm install --no-frozen-lockfile`, `DSH_HOME="$TEMP_DSH_HOME" dsh plugin --profile web add /absolute/path/to/dsh-suggested-replies`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversation.input.dock`, `settings`；tools —；events `agent/disposed`, `agent/inbox/inserted`, `session/event`；commands —；client UI 有（8）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（8） `tests/client-registration.spec.ts`, `tests/generation-gate.spec.ts`, `tests/package-layout.spec.ts`, `tests/settings-section.spec.tsx`, `tests/settings.spec.ts`, `tests/suggestion-bubbles.spec.tsx`（另 2 项）；workflows 未发现 —；release `package.json#scripts.check`, `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/client-registration.spec.ts`, `tests/generation-gate.spec.ts`, `tests/package-layout.spec.ts`, `tests/settings-section.spec.tsx`, `tests/settings.spec.ts`, `tests/suggestion-bubbles.spec.tsx`, `tests/suggestion-llm.spec.ts`（另 15 项）。

## dsh-super-injector

- 榜单来源：[Infrastructure & Development · L379](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L379)；源码：[dsh-external/dsh-super-injector](https://github.com/dsh-external/dsh-super-injector)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-tavern-plugin

- 榜单来源：[Fun & Lifestyle · L352](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L352)；源码：[dsh-external/dsh-tavern-plugin](https://github.com/dsh-external/dsh-tavern-plugin)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-teamwork

- 榜单来源：[Notifications & Channels · L332](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L332)；源码：[dsh-external/dsh-teamwork](https://github.com/dsh-external/dsh-teamwork)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-toolkit

- 榜单来源：[Core · L79](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L79)；源码：[dsh-external/dsh-toolkit](https://github.com/dsh-external/dsh-toolkit/tree/5d4628929aa2695cab7b4534670c0ca3c9cd7652)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `5d4628929aa2695cab7b4534670c0ca3c9cd7652`。
- 包与安装：`@deepseek-ai/dsh-toolkit`, `@deepseek-ai/dsh-tool-calculator`, `@deepseek-ai/dsh-tool-csv`, `@deepseek-ai/dsh-tool-diff`, `@deepseek-ai/dsh-tool-encoding`, `@deepseek-ai/dsh-tool-json`, `@deepseek-ai/dsh-tool-markdown`, `@deepseek-ai/dsh-tool-regex`（另 3 项）；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:omdsh-dev/dsh-tool-csv`, `dsh plugin --profile headless add github:omdsh-dev/dsh-tool-diff`, `dsh plugin --profile web add <path to the npm pack tarball>`, `dsh plugin --profile web add github:omdsh-dev/dsh-toolkit`, `**npm standalone mode (default, recommended)**: no DSH monorepo needed; after `npm install` (self-contained devDependencies):`（另 4 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `packages/dsh-tool-calculator/cordis.patch.yml`, `packages/dsh-tool-csv/cordis.patch.yml`, `packages/dsh-tool-diff/cordis.patch.yml`, `packages/dsh-tool-encoding/cordis.patch.yml`, `packages/dsh-tool-json/cordis.patch.yml`, `packages/dsh-tool-markdown/cordis.patch.yml`, `packages/dsh-tool-regex/cordis.patch.yml`, `packages/dsh-tool-schema/cordis.patch.yml`, `packages/dsh-tool-stat/cordis.patch.yml`, `packages/dsh-tool-time/cordis.patch.yml`, `package.json → ./cordis.patch.yml`（另 10 项）。入口：`src/index.ts`, `packages/dsh-tool-calculator/src/index.ts`, `packages/dsh-tool-csv/src/index.ts`, `packages/dsh-tool-diff/src/index.ts`, `packages/dsh-tool-encoding/src/index.ts`, `packages/dsh-tool-json/src/index.ts`, `packages/dsh-tool-markdown/src/index.ts`, `packages/dsh-tool-regex/src/index.ts`, `packages/dsh-tool-schema/src/index.ts`, `packages/dsh-tool-stat/src/index.ts`, `packages/dsh-tool-time/src/index.ts`。
- 扩展面：services `dsh-tool-time`；tools `calculator`, `compilePattern`, `csv`, `diff`, `dsh-tool-json`, `encoding`, `explain`, `json`（另 14 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（43） `packages/dsh-tool-calculator/tests/evaluate.spec.ts`, `packages/dsh-tool-calculator/tests/register.spec.ts`, `packages/dsh-tool-csv/tests/parse.spec.ts`, `packages/dsh-tool-csv/tests/query.spec.ts`, `packages/dsh-tool-csv/tests/register.spec.ts`, `packages/dsh-tool-diff/tests/csv-diff.spec.ts`（另 37 项）；workflows 未发现 —；release `package.json#scripts.prepack`, `packages/dsh-tool-calculator/package.json#scripts.prepack`, `packages/dsh-tool-csv/package.json#scripts.prepack`, `packages/dsh-tool-diff/package.json#scripts.prepack`, `packages/dsh-tool-encoding/package.json#scripts.prepack`, `packages/dsh-tool-json/package.json#scripts.prepack`（另 5 项）。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `packages/dsh-tool-calculator/package.json`, `packages/dsh-tool-csv/package.json`, `packages/dsh-tool-diff/package.json`, `packages/dsh-tool-encoding/package.json`, `packages/dsh-tool-json/package.json`, `packages/dsh-tool-markdown/package.json`, `packages/dsh-tool-regex/package.json`, `packages/dsh-tool-schema/package.json`, `packages/dsh-tool-stat/package.json`, `packages/dsh-tool-time/package.json`（另 131 项）。

## dsh-tps

- 榜单来源：[UI & Experience · L187](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L187)；源码：[dsh-external/dsh-tps](https://github.com/dsh-external/dsh-tps)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-travel-plugin

- 榜单来源：[Fun & Lifestyle · L341](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L341)；源码：[dsh-external/dsh-travel-plugin](https://github.com/dsh-external/dsh-travel-plugin)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-turn-navigator

- 榜单来源：[UI & Experience · L176](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L176)；源码：[dsh-external/dsh-turn-navigator](https://github.com/dsh-external/dsh-turn-navigator/tree/bcae07a2684205b3ebbd3976493c9084c2e882a1)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `bcae07a2684205b3ebbd3976493c9084c2e882a1`。
- 包与安装：`@deepseek-ai/dsh-turn-navigator`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add -w "/path/to/dsh-turn-navigator"`, `dsh plugin --profile web add -w github:dsh-external/dsh-turn-navigator#<reviewed-commit>`, `dsh plugin --profile web remove -w @deepseek-ai/dsh-turn-navigator`, `pnpm install --ignore-scripts`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `slots`；tools —；events —；commands —；client UI 有（8）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（5） `compat/apps/web/tests/turn-navigator.cordis.e2e.yml`, `compat/apps/web/tests/turn-navigator.e2e.ts`, `tests/browser-plugin.spec.ts`, `tests/invariant.spec.ts`, `tests/turn-navigator.spec.tsx`；workflows 未发现 —；release `package.json#scripts.check`, `package.json#scripts.check:package`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `compat/README.md`, `src/index.ts`, `src/client/index.ts`, `tests/browser-plugin.spec.ts`, `tests/invariant.spec.ts`, `tests/turn-navigator.spec.tsx`, `compat/apps/web/tests/turn-navigator.e2e.ts`, `tsdown.config.ts`（另 9 项）。

## dsh-ui-progress

- 榜单来源：[UI & Experience · L200](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L200)；源码：[dsh-external/dsh-ui-progress](https://github.com/dsh-external/dsh-ui-progress)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-ui-whale

- 榜单来源：[Fun & Lifestyle · L344](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L344)；源码：[dsh-external/dsh-ui-whale](https://github.com/dsh-external/dsh-ui-whale)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-ultra-ui

- 榜单来源：[UI & Experience · L177](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L177)；源码：[dsh-external/dsh-ultra-ui](https://github.com/dsh-external/dsh-ultra-ui/tree/d355496d2db120edbe287daff25ff4e008f9bea9)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `d355496d2db120edbe287daff25ff4e008f9bea9`。
- 包与安装：`@deepseek-ai/dsh-ultra-ui`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:havingautism/dsh-ultra-ui`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（7）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（1） `tests/tool-row.spec.tsx`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/tool-row.spec.tsx`, `src/css-modules.d.ts`, `src/invariant.ts`, `src/client/UltraToolRow.tsx`。

## dsh-vision

- 榜单来源：[Models & Inference · L251](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L251)；源码：[dsh-external/dsh-vision](https://github.com/dsh-external/dsh-vision/tree/72978aa176df8e01a685bf270a1b1d016660c492)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `72978aa176df8e01a685bf270a1b1d016660c492`。
- 包与安装：`@dsh-external/dsh-vision`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`dsh.plugin.json`。入口：`src/index.ts`。
- 扩展面：services —；tools `schemastery`, `view_image`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（2） `tests/plugin.spec.ts`, `tests/vlm.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `dsh.plugin.json`, `src/index.ts`, `tests/plugin.spec.ts`, `tests/vlm.spec.ts`, `src/vlm.ts`。

## dsh-voice-chat

- 榜单来源：[Notifications & Channels · L327](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L327)；源码：[dsh-external/dsh-voice-chat](https://github.com/dsh-external/dsh-voice-chat)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-web-panel

- 榜单来源：[UI & Experience · L194](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L194)；源码：[dsh-external/dsh-web-panel](https://github.com/dsh-external/dsh-web-panel)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-web-ui-notify

- 榜单来源：[Notifications & Channels · L328](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L328)；源码：[dsh-external/dsh-web-ui-notify](https://github.com/dsh-external/dsh-web-ui-notify/tree/865d2f6fc93f2e0d051d53df772646cb831a43ed)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `865d2f6fc93f2e0d051d53df772646cb831a43ed`。
- 包与安装：`@bill9109/dsh-web-ui-notify`；榜单 spec 未给出；文档命令 `**Install:** `dsh plugin --profile web add github:bill9109/dsh-web-ui-notify``, `The plugin is a DSH **bundle** (`package.json`declares`dsh.bundle`+`dsh.client`). Install it into the `web`profile with the standard`dsh plugin` mechanism — **no DSH source changes and no hand-written patch**:`, `dsh plugin --profile web add github:bill9109/dsh-web-ui-notify`, `Internally the command runs `pnpm add <spec>`in the profile directory and automatically appends packages that declare`dsh.bundle`to`dsh.profile.bundles`. You can also clone it and install from a local path (for development — rebuild and it takes effect):`, `dsh plugin --profile web add /path/to/dsh-web-ui-notify`（另 6 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `approval`, `locale`, `question`, `s2`, `sessions`, `settings.general.item`, `slots`；tools —；events —；commands —；client UI 有（13）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（2） `tests/browser-plugin.spec.ts`, `tests/settings-row.spec.tsx`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/browser-plugin.spec.ts`, `tests/settings-row.spec.tsx`, `tsdown.config.mjs`, `vitest.config.ts`, `scripts/build.mjs`, `scripts/verify-i18n.mjs`, `src/css-modules.d.ts`（另 3 项）。

## dsh-web-workflow-visualizer

- 榜单来源：[UI & Experience · L198](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L198)；源码：[dsh-external/dsh-web-workflow-visualizer](https://github.com/dsh-external/dsh-web-workflow-visualizer)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-webbridge

- 榜单来源：[Browser & Remote · L243](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L243)；源码：[dsh-external/dsh-webbridge](https://github.com/dsh-external/dsh-webbridge/tree/fb6fa96fed4b78f68ab0464c360dc4036105d0d8)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `fb6fa96fed4b78f68ab0464c360dc4036105d0d8`。
- 包与安装：`@bill9109/dsh-webbridge`；榜单 spec 未给出；文档命令 `**Install:** `dsh plugin --profile web add github:bill9109/dsh-webbridge``, `with the standard `dsh plugin` mechanism — **no DSH source changes and no`, `dsh plugin --profile web add github:bill9109/dsh-webbridge`, ``dsh plugin --profile web add github:bill9109/dsh-webbridge#v0.0.2`.`, `Internally the command runs `pnpm add <spec>` in the profile directory and`（另 6 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client.ts`。
- 扩展面：services —；tools `webbridge_click`, `webbridge_close_session`, `webbridge_close_tab`, `webbridge_evaluate`, `webbridge_fill`, `webbridge_find_tab`, `webbridge_list_tabs`, `webbridge_navigate`（另 3 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `tests/client.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client.ts`, `tests/client.spec.ts`, `tsdown.config.mjs`, `scripts/build.mjs`, `scripts/verify-i18n.mjs`, `src/invariant.ts`, `src/tools.ts`。

## dsh-wecom-bot

- 榜单来源：[Notifications & Channels · L324](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L324)；源码：[dsh-external/dsh-wecom-bot](https://github.com/dsh-external/dsh-wecom-bot)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dsh-weixin-bot

- 榜单来源：[Notifications & Channels · L325](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L325)；源码：[dsh-external/dsh-weixin-bot](https://github.com/dsh-external/dsh-weixin-bot)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## dshx-update-check

- 榜单来源：[Infrastructure & Development · L376](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L376)；源码：[dsh-external/dshx-update-check](https://github.com/dsh-external/dshx-update-check)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## ego-browser

- 榜单来源：[Browser & Remote · L242](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L242)；源码：[dsh-external/ego-browser](https://github.com/dsh-external/ego-browser/tree/cb4665ed79e74526f0fd4669aa1a7da34d3796c0)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `cb4665ed79e74526f0fd4669aa1a7da34d3796c0`。
- 包与安装：`@dsh-external/ego-browser`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`README.md`, `package.json`, `bin/ego-cast-worker.mjs`, `runtime/ego-linux/bin/ego-browser.mjs`, `runtime/ego-linux/src/agent-identity.mjs`, `runtime/ego-linux/src/chrome.mjs`, `runtime/ego-linux/src/cursor.mjs`, `runtime/ego-linux/src/desktop.mjs`, `runtime/ego-linux/src/paths.mjs`, `runtime/ego-linux/src/session.mjs`, `runtime/ego-linux/src/shim.mjs`, `runtime/ego-linux/src/snapshot.mjs`, `runtime/ego-linux/src/spaces-server.mjs`, `runtime/ego-linux/src/spaces-ui.mjs`（另 9 项）。

## hub

- 榜单来源：[Infrastructure & Development · L375](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L375)；源码：[dsh-external/hub](https://github.com/dsh-external/hub)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## marisa

- 榜单来源：[Infrastructure & Development · L374](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L374)；源码：[dsh-external/marisa](https://github.com/dsh-external/marisa)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## mstar-workflow

- 榜单来源：[Git & Engineering · L293](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L293)；源码：[dsh-external/mstar-workflow](https://github.com/dsh-external/mstar-workflow/tree/f031e2c26816527468e2845b965dfe46ef9de194)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `f031e2c26816527468e2845b965dfe46ef9de194`。
- 包与安装：`morning-star`, `@mstar-harness/cli`, `@mstar-harness/dsh`, `@mstar-harness/engine`, `@mstar-harness/opencode`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @mstar-harness/dsh`, `1. `npx @mstar-harness/cli init --target cursor --scope global``, `dsh plugin --profile web add .`, `dsh plugin --profile web add git+https://github.com/dsh-external/mstar-workflow.git#path:/packages/dsh`, `dsh plugin --profile web add <abs packages/dsh path>   # same profile bundle install`。
- DSH/Cordis activation：`packages/dsh/bundle/cordis.patch.yml`, `packages/dsh/tests/fixtures/cordis.yml`, `packages/dsh/package.json → ./bundle/cordis.patch.yml`。入口：`packages/cli/src/index.ts`, `packages/dsh/src/index.ts`, `packages/engine/src/index.ts`, `packages/dsh/src/service.ts`, `tools/mstar_dispatch_validate/index.ts`, `tools/mstar_iteration_gate/index.ts`, `tools/mstar_lease_verify/index.ts`, `tools/mstar_path_resolve/index.ts`, `tools/mstar_status_validate/index.ts`, `tools/mstar_worktree_check/index.ts`, `packages/cli/src/adapters/index.ts`, `packages/dsh/src/client/index.ts`。
- 扩展面：services `commands`, `jobs`, `skills`；tools `PreToolDecision.deny`, `bg-1`, `build-client`, `composeDispatchGate`, `ctx.commands`, `ctx.tools`, `node:fs`, `probe-1`（另 2 项）；events `agent/pre-step`, `fs/edit-intent`, `fs/write-intent`, `tools/pre-execute`；commands `/iteration-start`, `commands/`；client UI 有（24）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（97） `packages/cli/test/compass.test.ts`, `packages/cli/test/dispatch-cli.test.ts`, `packages/cli/test/iteration-cli.test.ts`, `packages/cli/test/lease-verify.test.ts`, `packages/cli/test/path-resolve.test.ts`, `packages/cli/test/review-cli.test.ts`（另 91 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`；release `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `package.json#scripts.cli:build`, `package.json#scripts.cli:dev`, `package.json#scripts.cli:pack`, `package.json#scripts.dsh:build`（另 12 项）。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release-prep.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `packages/cli/package.json`, `packages/dsh/package.json`, `packages/engine/package.json`, `packages/opencode/package.json`, `packages/dsh/bundle/cordis.patch.yml`, `packages/dsh/tests/fixtures/cordis.yml`, `.changes/README.md`, `.cursor-plugin/README.md`（另 29 项）。

## plugin-registry

- 榜单来源：[Infrastructure & Development · L372](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L372)；源码：[dsh-external/plugin-registry](https://github.com/dsh-external/plugin-registry/tree/6dab4de27cde6d63094ead94ec3c98a8b2332a89)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `6dab4de27cde6d63094ead94ec3c98a8b2332a89`。
- 包与安装：`@dsh-external/plugin-console`；榜单 spec 未给出；文档命令 `├── 官方插件（bundle）        loop / task-status / navbar 等——`dsh plugin --profile web add` 装进 profile 层栈`, `设置页「插件」面板管理 profile 插件安装态：**insert 插件区**（非 bundle 插件实时挂载/移除，配置 HMR 零重启）+ **已加载插件区**（`disabled` 启停持久化 + bundle 更新/卸载）+ **bundle 安装区**（pnpm add + 层栈 reconcile）。`, `dsh plugin --profile web add "github:vlln/plugin-registry#main&path:/packages/plugin/console"`, `dsh plugin --profile web add .   # 产物已入库，无需构建；当前目录即 bundle 包子目录（dsh 锚定 . 为绝对路径）`, `dsh plugin --profile web add "github:vlln/dsh-task-status#main"   # 推荐：git 源一行（产物已入库）`（另 6 项）。
- DSH/Cordis activation：`packages/plugin/console/cordis.patch.yml`, `packages/plugin/console/package.json → ./cordis.patch.yml`。入口：`packages/plugin/console/src/index.ts`, `packages/plugin/console/src/client/index.ts`。
- 扩展面：services `svcA`；tools `plugin_install`, `plugin_search`, `plugin_status`, `plugin_uninstall`；events —；commands —；client UI 有（2）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（6） `packages/plugin/console/tests/discovery/enumerate.spec.ts`, `packages/plugin/console/tests/discovery/store.spec.ts`, `packages/plugin/console/tests/discovery/tools.spec.ts`, `packages/plugin/console/tests/stubs/dsh-llm.ts`, `packages/plugin/console/tests/stubs/dsh-tools.ts`, `packages/plugin/console/tests/tsconfig.json`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `packages/plugin/console/package.json`, `packages/plugin/console/cordis.patch.yml`, `examples/README.md`, `packages/plugin/console/README.md`, `packages/plugin/console/src/index.ts`, `packages/plugin/console/src/client/index.ts`, `packages/plugin/console/tests/discovery/enumerate.spec.ts`, `packages/plugin/console/tests/discovery/store.spec.ts`, `packages/plugin/console/tests/discovery/tools.spec.ts`, `packages/plugin/console/tests/stubs/dsh-llm.ts`, `packages/plugin/console/tests/stubs/dsh-tools.ts`, `scripts/spike-hotreload.ts`（另 9 项）。

## qqbot

- 榜单来源：[Notifications & Channels · L323](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L323)；源码：[dsh-external/qqbot](https://github.com/dsh-external/qqbot)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## savemoneybenchmark

- 榜单来源：[Models & Inference · L266](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L266)；源码：[dsh-external/savemoneybenchmark](https://github.com/dsh-external/savemoneybenchmark)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## session-chatlog

- 榜单来源：[Context & Search · L111](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L111)；源码：[dsh-external/session-chatlog](https://github.com/dsh-external/session-chatlog)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## show-bash-command

- 榜单来源：[UI & Experience · L204](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L204)；源码：[dsh-external/show-bash-command](https://github.com/dsh-external/show-bash-command)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## telegram

- 榜单来源：[Notifications & Channels · L319](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L319)；源码：[dsh-external/telegram](https://github.com/dsh-external/telegram/tree/a0a9ca11e427b62217250e2e561f6ad3c49d13f2)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `a0a9ca11e427b62217250e2e561f6ad3c49d13f2`。
- 包与安装：`@loserfox/telegram`, `telegram-agent-example`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add <dir\|git-url>`, `- 卸载：`dsh plugin --profile web remove telegram`。`, `The telegram row mounts this repository's build output (`../../lib/index.js`relative to this config). To run the bridge from a DeepSeek Harness checkout instead, install the plugin there first with`dsh plugin --profile web add <dir\|git-url>` and point the row at the mounted entry.`, `telegram 一行挂载的是本仓库的构建产物（相对本配置的 `../../lib/index.js`）。要在 DeepSeek Harness checkout 里运行桥接，请先用 `dsh plugin --profile web add <dir\|git-url>` 安装插件，并把该行指向挂载后的入口。`。
- DSH/Cordis activation：`cordis.patch.yml`, `examples/telegram-agent/cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client.ts`。
- 扩展面：services `agents`, `launcherSessionQueryPath`；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（5） `tests/bridge.spec.ts`, `tests/client.spec.ts`, `tests/format.spec.ts`, `tests/plugin-apply.spec.ts`, `tests/plugin-shape.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `examples/telegram-agent/package.json`, `cordis.patch.yml`, `examples/telegram-agent/cordis.yml`, `examples/telegram-agent/README.md`, `examples/telegram-agent/README.zh.md`, `src/index.ts`, `src/client.ts`, `tests/bridge.spec.ts`, `tests/client.spec.ts`, `tests/format.spec.ts`, `tests/plugin-apply.spec.ts`, `tests/plugin-shape.spec.ts`（另 3 项）。

## tg-bot

- 榜单来源：[Notifications & Channels · L322](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L322)；源码：[dsh-external/tg-bot](https://github.com/dsh-external/tg-bot)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## toybox

- 榜单来源：[Infrastructure & Development · L377](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L377)；源码：[dsh-external/toybox](https://github.com/dsh-external/toybox)。
- 结论：`inaccessible-or-private`；审查层级 `unavailable`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：source was not reviewed because the repository could not be cloned。
- 已读取证据：—。

## turtle-ui

- 榜单来源：[UI & Experience · L205](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L205)；源码：[dsh-external/turtle-ui](https://github.com/dsh-external/turtle-ui/tree/b08ed69e4c4edbd0dcaba556fa7b5ea6cd0f91e2)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `b08ed69e4c4edbd0dcaba556fa7b5ea6cd0f91e2`。
- 包与安装：`@deepseek-ai/dsh-tui`；榜单 spec 未给出；文档命令 `(cd ../deepseek-harness && pnpm install && pnpm run build)`, `pnpm install`, `dsh plugin --profile tui add file:.`, `dsh plugin --profile tui add github:deepseek-harness/turtle-ui   # fails with the allowBuilds key`, `dsh plugin --profile tui add github:deepseek-harness/turtle-ui   # builds and activates`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `agents`, `commands`, `ctx.loader`, `llm`, `loader`, `main`, `sessionPersistence`, `sessionProjectionCache`（另 14 项）；tools `read`；events `agent-loop/config-start-failed`, `agent/created`, `agent/disposed`, `agent/error`, `agent/inbox/claimed`, `agent/inbox/discarded`, `agent/status`, `commands/change`（另 4 项）；commands `/details`, `help`, `late-success`, `plugin-check`, `plugin-error`, `plugin-fail`, `wait-plugin`；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（55） `tests/chat-helpers.spec.ts`, `tests/extension.spec.ts`, `tests/file-autocomplete.spec.ts`, `tests/harness.ts`, `tests/headless-terminal.ts`, `tests/plugin-shape.spec.ts`（另 49 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `tests/chat-helpers.spec.ts`, `tests/extension.spec.ts`, `tests/file-autocomplete.spec.ts`, `tests/harness.ts`, `tests/headless-terminal.ts`, `tests/plugin-shape.spec.ts`, `tests/prompt.spec.ts`, `tests/session-query.ts`（另 19 项）。

## ui-status-label

- 榜单来源：[Fun & Lifestyle · L354](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L354)；源码：[dsh-external/ui-status-label](https://github.com/dsh-external/ui-status-label/tree/c93917b044dad7d99346ac5ed33a8afdf3861fb6)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c93917b044dad7d99346ac5ed33a8afdf3861fb6`。
- 包与安装：`dsh-ui-status-label`；榜单 spec 未给出；文档命令 `- 依赖分两类：`@deepseek-ai/cordis`、`dsh-client-*` 等为 **peer 依赖**（由 dsh 安装提供）；`@deepseek-ai/dsh-settings`、`schemastery`为**直接依赖**（从 npm 安装）。仓库内的`pnpm-workspace.yaml` 已关闭 peer 自动安装（`autoInstallPeers: false`），clone 后直接 `pnpm install` 即可完成直接依赖。`, `本包声明了 `dsh.bundle`，`dsh plugin add`会自动激活它的`cordis.patch.yml`层（把`dsh-ui-status-label` 行插入 Web roster）。`, `dsh plugin --profile web add ./dsh-ui-status-label-0.1.0.tgz`, `dsh plugin --profile web add github:alingalingling/ui-status-label`, `dsh plugin --profile web add dsh-ui-status-label`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `conversationStatus`, `settings`；tools —；events —；commands —；client UI 有（16）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 有（4） `tests/host.spec.ts`, `tests/status-label-injector.spec.ts`, `tests/status-label-policy.spec.ts`, `tests/status-label-row.spec.tsx`；workflows 未发现 —；release `package.json#scripts.pack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/host.spec.ts`, `tests/status-label-injector.spec.ts`, `tests/status-label-policy.spec.ts`, `tests/status-label-row.spec.tsx`, `tsdown.config.ts`, `src/css-modules.d.ts`, `src/invariant.ts`, `src/schema.ts`（另 5 项）。

## zotero-harvest

- 榜单来源：[Context & Search · L118](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L118)；源码：[dsh-external/zotero-harvest](https://github.com/dsh-external/zotero-harvest/tree/9635a4f27ba186f414d3ba23042bd12ee176cddc)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9635a4f27ba186f414d3ba23042bd12ee176cddc`。
- 包与安装：`@dsh-external/zotero-harvest`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`dsh.plugin.json`。入口：`src/index.ts`, `src/fetch/index.ts`, `src/save/index.ts`。
- 扩展面：services —；tools `lit_download_links`, `lit_fetch`, `lit_paper_detail`, `lit_review_run`, `lit_save`, `lit_sufficiency_check`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（3） `tests/e2e.mjs`, `tests/real-lib-check.mjs`, `tests/smoke.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；ships an explicit persistence migration path；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `dsh.plugin.json`, `src/index.ts`, `src/fetch/index.ts`, `src/save/index.ts`, `tests/e2e.mjs`, `tests/real-lib-check.mjs`, `tests/smoke.mjs`, `src/config.ts`, `src/types.ts`, `src/audit/sufficiency.ts`, `src/fetch/providers.ts`（另 6 项）。

## zotero-wave-rag

- 榜单来源：[Context & Search · L121](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L121)；源码：[dsh-external/zotero-wave-rag](https://github.com/dsh-external/zotero-wave-rag/tree/45e2ebcf17cf247ed766648ffe7717be9f30caff)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `45e2ebcf17cf247ed766648ffe7717be9f30caff`。
- 包与安装：`@dsh-external/zotero-wave-rag`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`dsh.plugin.json`。入口：`src/index.ts`。
- 扩展面：services —；tools `zotero-wave-rag`, `zotero_compare`, `zotero_embedder`, `zotero_paper_detail`, `zotero_search`, `zotero_status`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；ships an explicit persistence migration path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `dsh.plugin.json`, `src/index.ts`, `scripts/check-zotero-dir.mjs`, `scripts/embedder.mjs`, `scripts/env.mjs`, `scripts/eval.mjs`, `scripts/ingest.mjs`, `scripts/make-test-zotero.mjs`, `scripts/preflight.mjs`, `scripts/query.mjs`, `scripts/sweep.mjs`, `scripts/verify-plugin.mjs`（另 17 项）。

## deepseek-harness-desktop

- 榜单来源：[Infrastructure & Development · L361](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L361)；源码：[Easyhoov/deepseek-harness-desktop](https://github.com/Easyhoov/deepseek-harness-desktop/tree/c337b7e5824172cf64d5860342925f89bf725ce0)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `c337b7e5824172cf64d5860342925f89bf725ce0`。
- 包与安装：`dsh-desktop`, `@dsh-desktop/balance`, `@dsh-desktop/file-changes`, `@dsh-desktop/marketplace`；榜单 spec 未给出；文档命令 `\| 🛍️ **插件商店** \| 内置社区插件商店（ZASENJC）：`/store`或 设置 → 插件 → 插件商店 浏览、搜索、一键安装/卸载；安装走官方`dsh plugin add`（npm / GitHub / monorepo 子目录 / tarball），自带 pnpm，无黑框、有实时进度，装完重启生效 \|`, `dsh plugin --profile web add <包名>`, `dsh plugin --profile web add github:<仓库>`。
- DSH/Cordis activation：`plugins/desktop-balance/cordis.patch.yml`, `plugins/desktop-file-changes/cordis.patch.yml`, `plugins/desktop-marketplace/cordis.patch.yml`, `plugins/desktop-balance/package.json → ./cordis.patch.yml`, `plugins/desktop-file-changes/package.json → ./cordis.patch.yml`, `plugins/desktop-marketplace/package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `apiProxy`, `clientModules`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（2） `.github/workflows/catalog.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found。
- 已读取证据：`.github/workflows/catalog.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `plugins/desktop-balance/package.json`, `plugins/desktop-file-changes/package.json`, `plugins/desktop-marketplace/package.json`, `plugins/desktop-balance/cordis.patch.yml`, `plugins/desktop-file-changes/cordis.patch.yml`, `plugins/desktop-marketplace/cordis.patch.yml`, `scripts/build-catalog.mjs`, `scripts/fetch-dsh-docs.mjs`, `scripts/inspect-log.mjs`（另 16 项）。

## deepseek-harness-desktop

- 榜单来源：[UI & Experience · L210](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L210)；源码：[fendouai/deepseek-harness-desktop](https://github.com/fendouai/deepseek-harness-desktop/tree/e03b88bc3e547e19372de4d41ec53f9a1f5b7f37)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `e03b88bc3e547e19372de4d41ec53f9a1f5b7f37`。
- 包与安装：`@deepseek-ai/dsh-root`, `dsh-examples`, `@deepseek-ai/website`, `@deepseek-ai/dsh`, `dsh-desktop`, `@deepseek-ai/dsh-web-frontend`, `acp-agent-example`, `headless-agent-example`（另 15 项）；榜单 spec 未给出；文档命令 `pnpm install`。
- DSH/Cordis activation：`apps/cli/config/agent-presets/code/agent.cordis.yml`, `apps/cli/config/agent-presets/cordis/agent.cordis.yml`, `apps/cli/config/agent-presets/minimal/agent.cordis.yml`, `apps/cli/config/agent-presets/standard/agent.cordis.yml`, `apps/cli/tests/fixtures/dsh-badge/cordis.yml`, `apps/cli/tests/fixtures/dsh-badge/default.cordis.yml`, `apps/cli/tests/fixtures/invalid-provider.cordis.yml`, `apps/cli/tests/fixtures/memory-mcp-base.cordis.yml`, `examples/acp-agent/advanced.cordis.yml`, `examples/acp-agent/agent-instructions.cordis.yml`, `examples/acp-agent/background-job-admission.cordis.yml`, `examples/acp-agent/both-mode.cordis.yml`（另 67 项）。入口：`packages/typert/generator/tests/fixtures/remote-model/packages/domain/src/index.ts`, `packages/typert/generator/tests/fixtures/remote-model/packages/remote/src/index.ts`, `packages/typert/generator/tests/fixtures/type-model/packages/client/src/index.ts`, `packages/typert/generator/tests/fixtures/type-model/packages/host/src/index.ts`, `packages/typert/generator/tests/fixtures/type-model/packages/write/src/index.ts`, `apps/cli/src/plugin.ts`, `packages/acp/acp/src/index.ts`, `packages/api/gateway/src/index.ts`, `packages/api/remotes/src/index.ts`, `packages/attachment/attachment-local/src/index.ts`, `packages/attachment/attachment/src/index.ts`, `packages/boot/app-boot/src/index.ts`（另 16 项）。
- 扩展面：services `127.0.0.1`, `agentDefaultModel`, `agents`, `apiProxy`, `appExit`, `attachments`, `cmdlineArgs`, `connection`（另 13 项）；tools —；events `agent/error`, `agent/inbox/claimed`, `approval/request`, `internal/plugin`, `internal/service`, `session/event`；commands —；client UI 有（50）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（100） `.github/issue-management/policy.test.mjs`, `apps/cli/tests/args.spec.ts`, `apps/cli/tests/built-bin.e2e.ts`, `apps/cli/tests/dsh-badge.snapshot.ts`, `apps/cli/tests/fixtures/dsh-badge/cordis.yml`, `apps/cli/tests/fixtures/dsh-badge/default.cordis.yml`（另 94 项）；workflows 有（15） `.github/workflows/build-exe-for-python-sdk.yml`, `.github/workflows/ci.yml`, `.github/workflows/docs-pages.yml`, `.github/workflows/e2b-e2e.yml`, `.github/workflows/e2e.yml`, `.github/workflows/expected-filenames.yml`（另 9 项）；release `.github/workflows/docs-pages.yml`, `.github/workflows/landlock-run-release.yml`, `.github/workflows/python-release.yml`, `.github/workflows/release-vendor.yml`, `.github/workflows/release.yml`, `native/landlock-run/package.json#scripts.release:assemble-prebuilds`（另 26 项）。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/build-exe-for-python-sdk.yml`, `.github/workflows/ci.yml`, `.github/workflows/docs-pages.yml`, `.github/workflows/e2b-e2e.yml`, `.github/workflows/e2e.yml`, `.github/workflows/expected-filenames.yml`, `.github/workflows/issue-lifecycle.yml`, `.github/workflows/issue-policy.yml`, `.github/workflows/landlock-run-release.yml`, `.github/workflows/landlock-run.yml`, `.github/workflows/pi-ai-provider-e2e.yml`, `.github/workflows/python-release.yml`, `.github/workflows/release-vendor.yml`, `.github/workflows/release.yml`（另 78 项）。

## dsh-memory-vault

- 榜单来源：[Context & Search · L106](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L106)；源码：[flymysql/dsh-memory](https://github.com/flymysql/dsh-memory/tree/d6afee4bb594164193b7e262d6539d0c55b54a8b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `d6afee4bb594164193b7e262d6539d0c55b54a8b`。
- 包与安装：`dsh-memory-vault`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-memory-vault`, `npm install dsh-memory-vault`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `slots`, `webServer`；tools `memory_forget`, `memory_recall`, `memory_remember`, `webServer`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-remote

- 榜单来源：[Browser & Remote · L240](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L240)；源码：[flymysql/dsh-remote](https://github.com/flymysql/dsh-remote/tree/393782c39619f37450ec3fc19920e1ff9cd19ee5)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `393782c39619f37450ec3fc19920e1ff9cd19ee5`。
- 包与安装：`dsh-remote`；榜单 spec 未给出；文档命令 `dsh plugin add dsh-remote            # add the bundle`, `(or `npm install dsh-remote`+ add`- id: dsh-remote / name: dsh-remote`in`cordis.patch.yml`).`, `# install the bundle into a profile (npm is pulled by pnpm; recommended)`, `dsh plugin --profile web add dsh-remote`, `npx --yes @deepseek-ai/dsh plugin --profile web add dsh-remote`（另 7 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `commands`, `directoryPicker`, `slots`, `webServer`, `workspaces`；tools `rw_connect`, `rw_disconnect`, `rw_exec`, `rw_info`, `rw_list_dir`, `rw_pick_workspace`, `rw_push`, `rw_read_file`（另 3 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-pet

- 榜单来源：[Fun & Lifestyle · L345](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L345)；源码：[FlytoMAYDAY80/dsh-pet](https://github.com/FlytoMAYDAY80/dsh-pet/tree/de673dd23908c69c928f3d095966bcd6b5b8128f)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `de673dd23908c69c928f3d095966bcd6b5b8128f`。
- 包与安装：`dsh-pet`；榜单 spec 未给出；文档命令 `pnpm install   # 安装依赖（Electron）`, `- **Run from source**: `pnpm install && pnpm start` (Node.js 18+, pnpm)`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.publish`。
- 可借鉴模式：contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `custom/README.md`, `main.js`, `preload.js`, `app/pixel-sprites.js`, `app/pixel.js`, `app/renderer.js`, `scripts/cdp-probe.js`。

## dsh-vision-proxy

- 榜单来源：[Models & Inference · L254](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L254)；源码：[Flyvhidbwo/dsh-vision-proxy](https://github.com/Flyvhidbwo/dsh-vision-proxy/tree/679b0efc4719ac80b14ebf9630a6e7be474ef45b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `679b0efc4719ac80b14ebf9630a6e7be474ef45b`。
- 包与安装：`dsh-vision-proxy`；榜单 spec 未给出；文档命令 `<a href="https://awesome-dsh-plugin.com"><img src="https://awesome-dsh-plugin.com/badge.svg" alt="awesome · DSH plugin" /></a>`, `dsh plugin --profile web add dsh-vision-proxy`, `dsh plugin --profile web add dsh-vision-proxy   # re-run after approving`, `**Slow npm registry in China?** `dsh plugin --profile web add dsh-vision-proxy --registry=https://registry.npmmirror.com` (the flag is forwarded to pnpm).`, `\| `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` on a fresh release day \| pnpm 11 defaults `minimumReleaseAge` to 1 day (supply-chain policy). Add `minimumReleaseAge: 0` to the profile's `pnpm-workspace.yaml`, or pass `--config.minimum-release-age=0` to `dsh plugin add`, then re-run \|`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `attachments`；tools `deepseek-vision`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `tests/core.test.js`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no conventional core source entry was found in the inspected target；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `tests/core.test.js`, `scripts/check-no-bom.js`, `scripts/postinstall.js`。

## dsh-desktop

- 榜单来源：[UI & Experience · L209](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L209)；源码：[foolgry/dsh-desktop](https://github.com/foolgry/dsh-desktop/tree/ffefabb72cfb42048350795871f1bf7d8eb022ba)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `ffefabb72cfb42048350795871f1bf7d8eb022ba`。
- 包与安装：`dsh-desktop`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（2） `.github/workflows/docs.yml`, `.github/workflows/sync-and-release.yml`；release `.github/workflows/sync-and-release.yml`, `package.json#scripts.pack`。
- 可借鉴模式：automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/docs.yml`, `.github/workflows/sync-and-release.yml`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `scripts/sync-upstream.mjs`, `src/main.ts`, `docs/.vitepress/config.ts`。

## dsh-session-cleaner

- 榜单来源：[Infrastructure & Development · L388](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L388)；源码：[fountunt/dsh-session-cleaner](https://github.com/fountunt/dsh-session-cleaner/tree/0a6c03f2900dae384fc988cfdc087e891983ec82)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0a6c03f2900dae384fc988cfdc087e891983ec82`。
- 包与安装：`dsh-session-cleaner`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-session-cleaner            # from npm`, `dsh plugin --profile web add github:fountunt/dsh-session-cleaner   # from git`, `dsh plugin --profile web add file:/path/to/dsh-session-cleaner`, `pnpm install        # peer: @deepseek-ai/cordis`, `dsh plugin --profile web add dsh-session-cleaner            # 从 npm`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`client.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `test/cleaner.test.js`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `test/cleaner.test.js`, `client.js`。

## dsh-balance-meter

- 榜单来源：[UI & Experience · L179](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L179)；源码：[Ghost011118/dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter/tree/db97c0ea49767d7e73166d8d57a13e54970533e4)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `db97c0ea49767d7e73166d8d57a13e54970533e4`。
- 包与安装：`dsh-balance-meter`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add https://github.com/Ghost011118/dsh-balance-meter`, `dsh plugin --profile web add link:$(pwd)/dsh-balance-meter`, ``dsh-autostart`) instead of launching several ad-hoc `npx dsh web``, `- 建议用单一受守护实例（如 `dsh-autostart`）运行 `dsh web`，避免临时拉起多个 `npx dsh web` 在同一个端口上互相抢占、各自读到不同凭据快照。若刚关掉一个手动实例后就遇到此报错，请确认仍由守护托管的那一个读到了 Key——余额 chip 恢复到实时总额即代表 Key 已解析。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`, `src/client/index.ts`。
- 扩展面：services `credentials`, `launchEnvironment`, `sessionProjections`, `sessions`, `slots`；tools —；events —；commands —；client UI 有（11）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/service.ts`, `src/client/index.ts`, `tsdown.config.ts`, `vitest.config.ts`, `shared/tsdown.client.ts`, `shared/web-platform.ts`, `src/cost.ts`, `src/invariant.ts`（另 5 项）。

## dsh-memory-gate

- 榜单来源：[Context & Search · L114](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L114)；源码：[GIT121995/dsh-memory-gate](https://github.com/GIT121995/dsh-memory-gate/tree/5a0b51780ac4aab72393e9d646f85c4c29ee2058)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5a0b51780ac4aab72393e9d646f85c4c29ee2058`。
- 包与安装：`dsh-memory-gate`；榜单 spec 未给出；文档命令 `npm install -g pnpm`, `dsh plugin --profile web add dsh-memory-gate`, `dsh plugin --profile web add git+https://github.com/GIT121995/dsh-memory-gate.git#v0.3.2`, `dsh plugin --profile web remove dsh-memory-gate`, `npm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`。
- 扩展面：services —；tools —；events `agent/pre-step`, `session/disposed`, `session/event`；commands `session/disposed`；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（2） `tests/repository.test.mjs`, `tests/text.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；ships an explicit persistence migration path；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/service.ts`, `tests/repository.test.mjs`, `tests/text.test.mjs`, `src/authority.ts`, `src/commands.ts`, `src/config.ts`, `src/contracts.ts`, `src/extractor.ts`, `src/harness.ts`（另 5 项）。

## arcana

- 榜单来源：[UI & Experience · L167](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L167)；源码：[GooodWei/arcana](https://github.com/GooodWei/arcana/tree/82f910c0b5e645c65c2a34be0b0e47035d0489a7)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `82f910c0b5e645c65c2a34be0b0e47035d0489a7`。
- 包与安装：`arcana`；榜单 spec 未给出；文档命令 `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `npx @deepseek-ai/dsh plugin --profile web add github:GooodWei/arcana`, `npx @deepseek-ai/dsh web`, `Install pnpm first (`dsh plugin add`invokes it internally). If dsh is installed globally,`npx @deepseek-ai/dsh`can be shortened to`dsh`.`, `需先安装 pnpm（`dsh plugin add` 内部会调用它）。已全局安装 dsh 时，`npx @deepseek-ai/dsh`可简写为`dsh`。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## context-vista

- 榜单来源：[Context & Search · L99](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L99)；源码：[GooodWei/context-vista](https://github.com/GooodWei/context-vista/tree/9d854bd925e43c2039008594c65652fa179761c3)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9d854bd925e43c2039008594c65652fa179761c3`。
- 包与安装：`context-vista`；榜单 spec 未给出；文档命令 `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `npx @deepseek-ai/dsh plugin --profile web add github:GooodWei/context-vista`, `npx @deepseek-ai/dsh web`, `Install pnpm first (`dsh plugin add`invokes it internally). If dsh is installed globally,`npx @deepseek-ai/dsh`can be shortened to`dsh`.`, `需先安装 pnpm（`dsh plugin add` 内部会调用它）。已全局安装 dsh 时，`npx @deepseek-ai/dsh`可简写为`dsh`。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `llm`, `sessionProjections`, `settings`, `tokenMeter`；tools —；events —；commands `context`；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-cost-meter

- 榜单来源：[UI & Experience · L180](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L180)；源码：[Han-1413141/dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter/tree/2908d2dca74c2978a641d65544bdfff6b54d9eff)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2908d2dca74c2978a641d65544bdfff6b54d9eff`。
- 包与安装：`dsh-cost-meter`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `Requirements: Node.js ≥ 20 + DeepSeek Harness (a version with the `dsh plugin`command;`npm install -g @deepseek-ai/dsh`).`, `**PowerShell one-click script** (copy the whole line, paste, press Enter; pnpm is provisioned automatically, git is auto-detected — no clone needed):`, `dsh plugin --profile web add github:Han-1413141/dsh-cost-meter`, `dsh plugin --profile web add https://github.com/Han-1413141/dsh-cost-meter/archive/refs/heads/master.tar.gz`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（3） `test/dump-tables.mjs`, `test/mock-balance.mjs`, `test/verify.mjs`；workflows 有（1） `.github/workflows/install-smoke.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no conventional core source entry was found in the inspected target；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/install-smoke.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `test/dump-tables.mjs`, `test/mock-balance.mjs`, `test/verify.mjs`。

## dsh-eval

- 榜单来源：[Infrastructure & Development · L387](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L387)；源码：[hccccc01333/dsh-eval](https://github.com/hccccc01333/dsh-eval/tree/47f39d7c1453de16b7ed1a3846980d0765eb1f3a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `47f39d7c1453de16b7ed1a3846980d0765eb1f3a`。
- 包与安装：`dsh-eval`；榜单 spec 未给出；文档命令 `pnpm add dsh-eval`, `dsh plugin --profile eval add dsh-eval`, `pnpm install`。
- DSH/Cordis activation：`packages/eval/cordis.patch.yml`, `packages/eval/package.json → ./cordis.patch.yml`。入口：`packages/eval/src/index.ts`。
- 扩展面：services `appExit`, `cmdlineArgs`, `llm`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（15） `packages/eval/tests/benchmark.spec.ts`, `packages/eval/tests/command.spec.ts`, `packages/eval/tests/compare.spec.ts`, `packages/eval/tests/execute.spec.ts`, `packages/eval/tests/fixtures/check-fail.mjs`, `packages/eval/tests/fixtures/check-ok.mjs`（另 9 项）；workflows 未发现 —；release `packages/eval/package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `pnpm-workspace.yaml`, `packages/eval/package.json`, `packages/eval/cordis.patch.yml`, `packages/eval/README.md`, `packages/eval/README.zh.md`, `packages/eval/src/index.ts`, `packages/eval/tests/benchmark.spec.ts`, `packages/eval/tests/command.spec.ts`, `packages/eval/tests/compare.spec.ts`, `packages/eval/tests/execute.spec.ts`, `packages/eval/tests/import.spec.ts`（另 21 项）。

## dsh-telegram-channel

- 榜单来源：[Notifications & Channels · L320](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L320)；源码：[hi-wenw/dsh-telegram-channel](https://github.com/hi-wenw/dsh-telegram-channel/tree/819010de1cca209fd8715a8e3de4d9002a217a7e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `819010de1cca209fd8715a8e3de4d9002a217a7e`。
- 包与安装：`dsh-telegram-channel`；榜单 spec 未给出；文档命令 `**发现：** [dsh-plugin topic](https://github.com/topics/dsh-plugin) · 安装：`dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel``, `安装时脚本会：写环境变量、补 `allowBuilds`、执行 `dsh plugin add`（**不会**再 insert 同名 id）。`, `dsh plugin --profile web add github:hi-wenw/dsh-telegram-channel`, `dsh plugin --profile web add D:\path\to\dsh-telegram-channel`, `npm install --legacy-peer-deps`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client.ts`。
- 扩展面：services —；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（11） `tests/apiproxy.test.ts`, `tests/apply.test.ts`, `tests/auth.test.ts`, `tests/bridge.test.ts`, `tests/catalog.test.ts`, `tests/client.test.ts`（另 5 项）；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `examples/telegram-agent/README.md`, `src/index.ts`, `src/client.ts`, `tests/apiproxy.test.ts`, `tests/apply.test.ts`, `tests/auth.test.ts`, `tests/bridge.test.ts`, `tests/catalog.test.ts`, `tests/client.test.ts`, `tests/commands.test.ts`（另 13 项）。

## dsh-auto-continue

- 榜单来源：[UI & Experience · L219](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L219)；源码：[HsiangNianian/dsh-auto-continue](https://github.com/HsiangNianian/dsh-auto-continue/tree/be19b6b6bec6f4b23ddc46364e7842710f09c28f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `be19b6b6bec6f4b23ddc46364e7842710f09c28f`。
- 包与安装：`dsh-client-auto-continue`；榜单 spec 未给出；文档命令 `<a href="https://awesome-dsh-plugin.com"><img src="https://awesome-dsh-plugin.com/badge.svg" alt="awesome · DSH plugin"></a>`, `DSH plugins install into a **profile** (`dsh web`→`web`profile). Install, restart`dsh web`, done.`, `dsh plugin --profile web add dsh-client-auto-continue`, `dsh plugin --profile web add github:HsiangNianian/dsh-auto-continue`, `This tracks the `main`branch rather than released tags — great for trying the latest changes, while the npm method above is the stable choice. Switching between install sources is just re-running`dsh plugin --profile web add <other-spec>`; the profile dependency is replaced in place.`（另 6 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `settings`；tools —；events —；commands —；client UI 有（12）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（1） `tests/simulate.mjs`；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/simulate.mjs`, `build.mjs`, `scripts/patch-expose.mjs`, `src/client/engine.ts`, `src/client/locales.ts`, `src/client/settings-card.tsx`（另 2 项）。

## dsh-balance-tide

- 榜单来源：[UI & Experience · L183](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L183)；源码：[huanyuLv/dsh-balance-tide](https://github.com/huanyuLv/dsh-balance-tide/tree/b82e77afd2bcf1f897f22f5740f487b47020addf)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `b82e77afd2bcf1f897f22f5740f487b47020addf`。
- 包与安装：`dsh-balance-tide`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-balance-tide`, `dsh plugin --profile web add https://github.com/huanyuLv/dsh-balance-tide`, `dsh plugin --profile web add file:/path/to/dsh-balance-tide`, `Restart `dsh web`to take effect. Requires`pnpm` (`npm i -g pnpm`).`, `安装后重启 `dsh web` 生效。需要 pnpm（`npm i -g pnpm`）。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.js`, `client/client.js`。
- 扩展面：services `credentials`, `sessionProjections`, `webServer`；tools —；events —；commands —；client UI 有（1）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.js`, `client/client.js`。

## harness-remote

- 榜单来源：[Notifications & Channels · L321](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L321)；源码：[Hyna-hla/harness-remote](https://github.com/Hyna-hla/harness-remote/tree/da070df1078e6c791422eb530cd579e7afe6cbc0)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `da070df1078e6c791422eb530cd579e7afe6cbc0`。
- 包与安装：`dsh-remote-access`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`dsh-remote-access/cordis.patch.yml`, `dsh-remote-access/package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `apiProxy`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `dsh-remote-access/package.json`, `dsh-remote-access/cordis.patch.yml`, `dsh-remote-access/README.md`, `dsh-remote-access/smoke-test.mjs`。

## dsh-mcp-manager

- 榜单来源：[Infrastructure & Development · L380](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L380)；源码：[hyqhyq3/dsh-mcp-manager](https://github.com/hyqhyq3/dsh-mcp-manager/tree/88ac3def0e5a76f19e27bdf7effc099a7d33bb3e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `88ac3def0e5a76f19e27bdf7effc099a7d33bb3e`。
- 包与安装：`dsh-mcp-manager`；榜单 spec 未给出；文档命令 `- DeepSeek Harness with the `web` profile (`npx @deepseek-ai/dsh web`)`, `npx -p @deepseek-ai/dsh dsh plugin --profile web add github:hyqhyq3/dsh-mcp-manager`, `- DeepSeek Harness web profile（`npx @deepseek-ai/dsh web`）`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services —；tools `connected`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-plugin-manager-registry

- 榜单来源：[Infrastructure & Development · L373](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L373)；源码：[Jesse-njx/dsh-plugin-manager-registry](https://github.com/Jesse-njx/dsh-plugin-manager-registry/tree/32dfc3fa93e327ad861d0965d1fab3654ac5929b)。
- 结论：`directory-or-registry`；审查层级 `source-inspected`；HEAD `32dfc3fa93e327ad861d0965d1fab3654ac5929b`。
- 包与安装：`@dsh-pm/registry`；榜单 spec 未给出；文档命令 `The discovery engine of `dsh pm` — find dsh plugins by merging three`, `dsh plugin add github:Jesse-njx/dsh-plugin-manager`, `// Exact lookup by name, npmName, owner/repo, github:owner/repo or https URL.`, `pnpm install            # from the monorepo root (requires packages/core to exist)`, `// 精确查找：支持名称、npmName、owner/repo、github:owner/repo 或 https URL。`（另 1 项）。
- DSH/Cordis activation：—。入口：`src/index.ts`, `src/client.ts`, `src/types/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（8） `test/awesome.test.ts`, `test/client.test.ts`, `test/fixtures/awesome-README.md`, `test/github.test.ts`, `test/helpers.ts`, `test/live.test.ts`（另 2 项）；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `src/index.ts`, `src/client.ts`, `src/types/index.ts`, `test/awesome.test.ts`, `test/client.test.ts`, `test/github.test.ts`, `test/helpers.ts`, `test/live.test.ts`, `test/merge.test.ts`, `test/npm.test.ts`（另 8 项）。

## dsh-memoria

- 榜单来源：[Context & Search · L112](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L112)；源码：[jiayan-xu/dsh-memoria](https://github.com/jiayan-xu/dsh-memoria/tree/436a55a823f77f063cfe8bec301790326115f447)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `436a55a823f77f063cfe8bec301790326115f447`。
- 包与安装：`@jhp830901/dsh-memoria`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:jiayan-xu/dsh-memoria`, `dsh plugin --profile web add @jhp830901/dsh-memoria`, `npm install -D typescript @types/node --legacy-peer-deps`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `memoria_observe`, `memoria_recall`, `memoria_remember`, `memoria_search`；events `agent/turn-stopping`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`。

## dsh-tray

- 榜单来源：[Infrastructure & Development · L403](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L403)；源码：[KAIbsb/dsh-tray](https://github.com/KAIbsb/dsh-tray/tree/8c3ee692e8164d7ca31ad85ea3d9b53b1134fe47)。
- 结论：`topic-noise-or-non-plugin`；审查层级 `source-inspected`；HEAD `8c3ee692e8164d7ca31ad85ea3d9b53b1134fe47`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no conventional core source entry was found in the inspected target；no test/spec files were found。
- 已读取证据：`.github/workflows/release.yml`, `LICENSE`, `README.md`, `docs/README.en.md`。

## dsh-pin-recall

- 榜单来源：[UI & Experience · L175](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L175)；源码：[kerwin2046/dsh-pin-recall](https://github.com/kerwin2046/dsh-pin-recall/tree/61817c21006f51bbdd6ab8dd252af56cac59b6e2)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `61817c21006f51bbdd6ab8dd252af56cac59b6e2`。
- 包与安装：`dsh-pin-recall`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add /absolute/path/to/dsh-pin-recall`, `dsh plugin --profile web add github:YOUR_USER/dsh-pin-recall`, `npm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `pinned`；tools —；events —；commands `pin`, `pins`, `recall`, `unpin`；client UI 有（2）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `scripts/build.mjs`, `src/shims.d.ts`, `src/client/PinActions.tsx`。

## dsh-better-model-selector

- 榜单来源：[UI & Experience · L164](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L164)；源码：[Khellendros97/dsh-better-model-selector](https://github.com/Khellendros97/dsh-better-model-selector/tree/4781f4c215f1ad4d55a44e1409bafe58f05b721f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4781f4c215f1ad4d55a44e1409bafe58f05b721f`。
- 包与安装：`dsh-better-model-selector`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-better-model-selector`, `3. 官方 CLI 安装 npm 版：`dsh plugin --profile web add dsh-better-model-selector``。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`database-service`, `yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-subscription-auth

- 榜单来源：[Models & Inference · L271](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L271)；源码：[Khellendros97/dsh-subscription-auth](https://github.com/Khellendros97/dsh-subscription-auth/tree/338c02ea814af0d3579bf323cff491104f16f3ea)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `338c02ea814af0d3579bf323cff491104f16f3ea`。
- 包与安装：`dsh-subscription-auth`；榜单 spec 未给出；文档命令 `**前置**：已装好 DSH（`dsh web` 能正常运行），Node.js ≥ 20，`pnpm` 可用（`dsh plugin add`内部使用；没有的话先`npm install -g pnpm`）。`, `dsh plugin --profile web add dsh-subscription-auth`, `更新：`git pull && bun scripts/build-bun.mjs`→ 重启 dsh。切回 npm 通道时：删除锚点 junction 与手动挂载行，再`dsh plugin --profile web add dsh-subscription-auth`。`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `credentials`, `settings`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（4） `tests/apply-wiring.mjs`, `tests/lib-check.mjs`, `tests/reasoning-wire.mjs`, `tests/smoke.mjs`；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `tests/apply-wiring.mjs`, `tests/lib-check.mjs`, `tests/reasoning-wire.mjs`, `tests/smoke.mjs`, `scripts/build-bun.mjs`, `src/adapter.ts`, `src/channel.ts`, `src/device-flow.ts`（另 7 项）。

## dsh-skin

- 榜单来源：[UI & Experience · L202](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L202)；源码：[KinGao294/dsh-skin](https://github.com/KinGao294/dsh-skin/tree/13554dfcb170cd0a629c0ed9b6b0cdce0b01e075)。
- 结论：`theme-plugin`；审查层级 `source-inspected`；HEAD `13554dfcb170cd0a629c0ed9b6b0cdce0b01e075`。
- 包与安装：`dsh-skin`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add -w /path/to/dsh-skin`, `This runs pnpm in `~/.dsh/profiles/web`, installs the package, and appends it`, `layer) and `dsh.client`(browser bundle) is exactly what`dsh plugin`, `--profile <name> add <package>` installs, so publishing this package to npm is`, `dsh plugin --profile web add -w @yourscope/dsh-skin`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services —；tools —；events `theme/change`；commands —；client UI 有（1）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`, `lib/types/index.d.ts`, `lib/types/client/index.d.ts`。

## dsh-file-uploads

- 榜单来源：[Input & Editing · L142](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L142)；源码：[l541402398/dsh-file-uploads](https://github.com/l541402398/dsh-file-uploads/tree/3ea46e1583eac426cc34e191ea811e71b0c8347e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3ea46e1583eac426cc34e191ea811e71b0c8347e`。
- 包与安装：`dsh-file-uploads`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:l541402398/dsh-file-uploads#v1.0.0"`, `dsh plugin --profile web add "github:l541402398/dsh-file-uploads#main"`, `dsh plugin --profile web remove dsh-file-uploads`, `- `cordis.patch.yml`：可由 `dsh plugin add`安装的`dsh.bundle` Composition。`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`index.js`, `client.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `test/upload-manager.test.js`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `index.js`, `test/upload-manager.test.js`, `client.js`。

## dsh-mcp-lens

- 榜单来源：[Context & Search · L101](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L101)；源码：[labmimors/dsh-mcp-lens](https://github.com/labmimors/dsh-mcp-lens/tree/fb5351dff01f780d033e7e0f80458fc15f33486f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `fb5351dff01f780d033e7e0f80458fc15f33486f`。
- 包与安装：`dsh-mcp-lens`；榜单 spec 未给出；文档命令 `Prerequisites: DeepSeek Harness `0.1.0-rc.6`, Node.js `^22.19.0`or`>=24.0.0`, and `pnpm`on`PATH`. The `dsh plugin` command delegates installation to pnpm.`, `dsh plugin --profile web add ./dsh-mcp-lens-0.1.0-rc.9.tgz`, `On Windows, download the same asset from the [rc.9 Release page](https://github.com/labmimors/dsh-mcp-lens/releases/tag/v0.1.0-rc.9), compare `Get-FileHash -Algorithm SHA256`with the digest shown for that asset, and pass its local path to`dsh plugin add` only if they match.`, `dsh plugin --profile web add github:labmimors/dsh-mcp-lens#v0.1.0-rc.9`, `前置要求：DeepSeek Harness `0.1.0-rc.6`、Node.js `^22.19.0`或`>=24.0.0`，并且 `pnpm`已在`PATH` 中。`dsh plugin` 会把安装交给 pnpm 执行。`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `action/index.js`。
- 扩展面：services —；tools `alpha`, `archive_logs`, `blocked_delete`, `calendar`, `calendar_create_event`, `calendar_lookup`, `createPullRequest`, `create_event`（另 32 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（9） `tests/action.spec.ts`, `tests/catalog.spec.ts`, `tests/fixture-server.ts`, `tests/integration.spec.ts`, `tests/invalidating-fixture-server.ts`, `tests/policy.spec.ts`（另 3 项）；workflows 有（3） `.github/workflows/action-smoke.yml`, `.github/workflows/pages.yml`, `.github/workflows/verify.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/action-smoke.yml`, `.github/workflows/pages.yml`, `.github/workflows/verify.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `benchmark/README.md`, `src/index.ts`, `action/index.js`, `tests/action.spec.ts`, `tests/catalog.spec.ts`, `tests/fixture-server.ts`（另 16 项）。

## dsh-attachment-upload

- 榜单来源：[Input & Editing · L156](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L156)；源码：[lbh1nb/dsh-plugins/packages/dsh-attachment-upload](https://github.com/lbh1nb/dsh-plugins/tree/db3ad640c026539ab136b8ca2a991fca9a054c62/packages/dsh-attachment-upload)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `db3ad640c026539ab136b8ca2a991fca9a054c62`。
- 包与安装：`dsh-attachment-upload`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`packages/dsh-attachment-upload/cordis.patch.yml`, `packages/dsh-attachment-upload/package.json → ./cordis.patch.yml`。入口：`packages/dsh-attachment-upload/lib/index.js`, `packages/dsh-attachment-upload/lib/client.js`。
- 扩展面：services `slots`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`packages/dsh-attachment-upload/package.json`, `packages/dsh-attachment-upload/cordis.patch.yml`, `packages/dsh-attachment-upload/README.md`, `packages/dsh-attachment-upload/lib/index.js`, `packages/dsh-attachment-upload/lib/client.js`。

## dsh-session-archive

- 榜单来源：[Context & Search · L132](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L132)；源码：[lbh1nb/dsh-plugins/packages/dsh-session-archive](https://github.com/lbh1nb/dsh-plugins/tree/db3ad640c026539ab136b8ca2a991fca9a054c62/packages/dsh-session-archive)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `db3ad640c026539ab136b8ca2a991fca9a054c62`。
- 包与安装：`dsh-session-archive`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`packages/dsh-session-archive/cordis.patch.yml`, `packages/dsh-session-archive/package.json → ./cordis.patch.yml`。入口：`packages/dsh-session-archive/lib/index.js`, `packages/dsh-session-archive/lib/client.js`。
- 扩展面：services `agents`, `slots`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`packages/dsh-session-archive/package.json`, `packages/dsh-session-archive/cordis.patch.yml`, `packages/dsh-session-archive/README.md`, `packages/dsh-session-archive/lib/index.js`, `packages/dsh-session-archive/lib/client.js`。

## dsh-steer-button

- 榜单来源：[Input & Editing · L157](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L157)；源码：[lbh1nb/dsh-plugins/packages/dsh-steer-button](https://github.com/lbh1nb/dsh-plugins/tree/db3ad640c026539ab136b8ca2a991fca9a054c62/packages/dsh-steer-button)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `db3ad640c026539ab136b8ca2a991fca9a054c62`。
- 包与安装：`dsh-steer-button`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`packages/dsh-steer-button/cordis.patch.yml`, `packages/dsh-steer-button/package.json → ./cordis.patch.yml`。入口：`packages/dsh-steer-button/lib/index.js`, `packages/dsh-steer-button/lib/client.js`。
- 扩展面：services `sessions`, `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`packages/dsh-steer-button/package.json`, `packages/dsh-steer-button/cordis.patch.yml`, `packages/dsh-steer-button/README.md`, `packages/dsh-steer-button/lib/index.js`, `packages/dsh-steer-button/lib/client.js`。

## Code2Skill

- 榜单来源：[Infrastructure & Development · L358](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L358)；源码：[leechen298/Code2Skill](https://github.com/leechen298/Code2Skill/tree/e59a74f861a0a3e05102ce525b29aca730764a40)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `e59a74f861a0a3e05102ce525b29aca730764a40`。
- 包与安装：`@leechen298/code2skill`；榜单 spec 未给出；文档命令 `npx skills add leechen298/Code2Skill \`, `dsh plugin --profile web add github:leechen298/Code2Skill#v1.1.3`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools `compute_balance`, `fetch_resource`, `lookup_catalog_item`, `lookup_topic`, `placeholder`, `publish_event`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（14） `tests/benchmark_pipeline.py`, `tests/neutral_fixture_factory.py`, `tests/test_core_export.py`, `tests/test_deepseek_harness_bundle.py`, `tests/test_mcp_probe.py`, `tests/test_pipeline.py`（另 8 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `docs/README.md`, `skills/code2skill-generate/assets/mcp-runtime-entry.mjs`, `skills/code2skill-generate/assets/portable-agent-result.mjs`, `skills/code2skill-generate/assets/portable-error-normalizer.mjs`, `skills/code2skill-generate/assets/portable-workflow-guard.mjs`, `tests/benchmark_pipeline.py`, `tests/neutral_fixture_factory.py`, `tests/test_core_export.py`, `tests/test_deepseek_harness_bundle.py`（另 4 项）。

## dsh-lan-access

- 榜单来源：[Browser & Remote · L241](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L241)；源码：[Leon0555/dsh-lan-access](https://github.com/Leon0555/dsh-lan-access/tree/5eea4062ccc8ad9de68c6cffd26492b9b31f7dad)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5eea4062ccc8ad9de68c6cffd26492b9b31f7dad`。
- 包与安装：`dsh-lan-access`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-lan-access`, `需要 pnpm（`npm i -g pnpm`）。本地开发安装可用`, ``dsh plugin --profile web add file:/path/to/dsh-lan-access`。`, `dsh plugin --profile web remove dsh-lan-access`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：—。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`。

## dsh-rigorquant

- 榜单来源：[Science & Research · L417](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L417)；源码：[linxichen/dsh-rigorquant](https://github.com/linxichen/dsh-rigorquant/tree/53d4722f55b8802844ab54fc6040b1b2a55f166d)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `53d4722f55b8802844ab54fc6040b1b2a55f166d`。
- 包与安装：`dsh-rigorquant`；榜单 spec 未给出；文档命令 `ecosystem's `dsh plugin add` path works:`, `dsh plugin --profile web add github:linxichen/dsh-rigorquant`, `(`npx -y jacobian@0.12.0 upgrade`, or the Lean toolchain via`, `package.json                dsh.bundle manifest (dsh plugin add support)`, `This repo is a community DSH plugin distribution (bundle + preset + skill`（另 3 项）。
- DSH/Cordis activation：`agent-presets/rigorquant/agent.cordis.yml`, `cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `env/pyproject.toml`, `cordis.patch.yml`, `agent-presets/rigorquant/agent.cordis.yml`, `env/README.md`。

## deepseek-harness-action

- 榜单来源：[Git & Engineering · L283](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L283)；源码：[Lixiaoyiao/deepseek-harness-action](https://github.com/Lixiaoyiao/deepseek-harness-action/tree/243926cbd3d013f07b364e188ff84826bfa6f678)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `243926cbd3d013f07b364e188ff84826bfa6f678`。
- 包与安装：`deepseek-harness-action`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：`src/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（31） `test/action-metadata.test.ts`, `test/commands.test.ts`, `test/diff.test.ts`, `test/dsh-env.test.ts`, `test/dsh-proxy.test.ts`, `test/dsh-runner.test.ts`（另 25 项）；workflows 有（4） `.github/workflows/ci-diagnose.yml`, `.github/workflows/ci.yml`, `.github/workflows/commands.yml`, `.github/workflows/review.yml`；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci-diagnose.yml`, `.github/workflows/ci.yml`, `.github/workflows/commands.yml`, `.github/workflows/review.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `dist/package.json`, `src/index.ts`, `test/action-metadata.test.ts`, `test/commands.test.ts`, `test/diff.test.ts`, `test/dsh-env.test.ts`（另 23 项）。

## dsh-pi-tui

- 榜单来源：[UI & Experience · L191](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L191)；源码：[lqhl/dsh-pi-tui](https://github.com/lqhl/dsh-pi-tui/tree/905a4cda6f66fab933d29cec67b4bbace90210c2)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `905a4cda6f66fab933d29cec67b4bbace90210c2`。
- 包与安装：`dsh-pi-tui`；榜单 spec 未给出；文档命令 `前置：官方 [`dsh`](https://github.com/deepseek-ai/deepseek-harness) CLI（`npm i -g @deepseek-ai/dsh`）与 `pnpm`。`, `dsh plugin --profile pi-tui add dsh-pi-tui   # 自动初始化 profile 并挂为 bundle`, `npm install && npm run build && npm test`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `agentDefaultModel`, `agentPresets`, `cmdlineArgs`, `commands`, `fs`, `llm`, `sessionPersistence`, `sessionProjections`（另 2 项）；tools —；events `approval/request`, `session/event`；commands `approval/request`；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（5） `test/args.test.ts`, `test/keys.test.ts`, `test/mock-terminal.ts`, `test/model.test.ts`, `test/render.test.ts`；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `NOTICE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `test/args.test.ts`, `test/keys.test.ts`, `test/mock-terminal.ts`, `test/model.test.ts`, `test/render.test.ts`, `src/app.ts`, `src/args.ts`（另 9 项）。

## dsh-web-attention-badge

- 榜单来源：[UI & Experience · L214](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L214)；源码：[Luaphes/dsh-web-attention-badge](https://github.com/Luaphes/dsh-web-attention-badge/tree/8b2ede6ccda65da20d57e5e1af995aa9e089dc04)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `8b2ede6ccda65da20d57e5e1af995aa9e089dc04`。
- 包与安装：`dsh-web-attention-badge`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-web-attention-badge`, `dsh plugin --profile web add "github:Luaphes/dsh-web-attention-badge#v0.3.1"`, `dsh plugin --profile web update dsh-web-attention-badge`, `dsh plugin --profile web remove dsh-web-attention-badge`, ``dsh plugin` registers the bundle automatically — no manual config.`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `shell.overlay`；tools —；events —；commands —；client UI 有（1）。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/npm-publish.yml`；release `.github/workflows/npm-publish.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/npm-publish.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`, `lib/types/index.d.ts`, `lib/types/client/index.d.ts`。

## dsh-tool-git

- 榜单来源：[Git & Engineering · L286](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L286)；源码：[lxj808624/dsh-tool-git](https://github.com/lxj808624/dsh-tool-git/tree/3bb1443a6291fb6437e52d8b897a1dd48db03a1b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `3bb1443a6291fb6437e52d8b897a1dd48db03a1b`。
- 包与安装：`dsh-tool-git`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-tool-git`, `dsh plugin --profile web add github:lxj808624/dsh-tool-git#v0.1.3`, `pnpm install`, ``dsh plugin add` activates the plugin as a profile layer.`, `- `package.json`中的`dsh.bundle.patch`指向`cordis.patch.yml`，因此 `dsh plugin add` 会把插件作为 profile 层激活。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/tools/index.ts`。
- 扩展面：services —；tools `bash`, `git_branch`, `git_checkout`, `git_commit`, `git_diff`, `git_fetch`, `git_log`, `git_pull`（另 6 项）；events `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（4） `tests/helpers.ts`, `tests/network.spec.ts`, `tests/safety.spec.ts`, `tests/tools.spec.ts`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/tools/index.ts`, `tests/helpers.ts`, `tests/network.spec.ts`, `tests/safety.spec.ts`, `tests/tools.spec.ts`, `tsdown.config.ts`（另 20 项）。

## dsh-subagent-cwd

- 榜单来源：[Models & Inference · L269](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L269)；源码：[lynx-gt/dsh-subagent-cwd](https://github.com/lynx-gt/dsh-subagent-cwd/tree/f6df81141006d81eb1d27bad56bbdb9d22f1c11d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `f6df81141006d81eb1d27bad56bbdb9d22f1c11d`。
- 包与安装：`dsh-subagent-cwd`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `dsh plugin --profile web add dsh-subagent-cwd`, `dsh plugin --profile web remove dsh-subagent-cwd`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services `jobs`；tools —；events `subagent/provider-added`, `subagent/provider-removed`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`。

## dsh-subagent-tools

- 榜单来源：[Models & Inference · L268](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L268)；源码：[lynx-gt/dsh-subagent-tools](https://github.com/lynx-gt/dsh-subagent-tools/tree/0c3e355a95b5dad42683e42fe245045e49ffb53b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0c3e355a95b5dad42683e42fe245045e49ffb53b`。
- 包与安装：`dsh-subagent-tools`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `dsh plugin --profile web add dsh-subagent-tools          # npm`, `# or: dsh plugin --profile web add github:lynx-gt/dsh-subagent-tools#main`, `# or: dsh plugin --profile web add ./dsh-subagent-tools  # local checkout`, `# 或：dsh plugin --profile web add github:lynx-gt/dsh-subagent-tools#main`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services `jobs`；tools `ctx.subagents.start`；events `subagent/provider-added`, `subagent/provider-removed`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`。

## dsh-sticky-note

- 榜单来源：[Input & Editing · L148](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L148)；源码：[Meredith2328/dsh-sticky-note](https://github.com/Meredith2328/dsh-sticky-note/tree/fa793c61f1b7f48029b9add2d69d63259cdeeb70)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `fa793c61f1b7f48029b9add2d69d63259cdeeb70`。
- 包与安装：`dsh-sticky-note`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-sticky-note`, `dsh plugin --profile web add file:/path/to/dsh-sticky-note`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `connection`, `slots`, `workspaces`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-git-branch-switcher

- 榜单来源：[Git & Engineering · L298](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L298)；源码：[mixin-ai/dsh-git-branch-switcher](https://github.com/mixin-ai/dsh-git-branch-switcher/tree/e8ec829fca75d73f89fe3b1ef3f95d3366b0829c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `e8ec829fca75d73f89fe3b1ef3f95d3366b0829c`。
- 包与安装：`@mixin-ai/dsh-git-branch-switcher`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:mixin-ai/dsh-git-branch-switcher#main"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`dynamic/client.js`。
- 扩展面：services `sandboxPolicy`, `shell`, `slots`, `timer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（1） `smoke.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dynamic/README.md`, `smoke.test.mjs`, `dynamic/client.js`, `dynamic/host.js`。

## dsh-mneme

- 榜单来源：[Context & Search · L116](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L116)；源码：[modusensus/dsh-mneme](https://github.com/modusensus/dsh-mneme/tree/67376b3075fac55c230272c7da65ed54324c74a0)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `67376b3075fac55c230272c7da65ed54324c74a0`。
- 包与安装：`@modusensus/dsh-mneme`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @modusensus/dsh-mneme`, `npm install`, `dsh plugin --profile web add .`, `npm install        # 安装 peer 依赖（以 devDependencies 形式，用于本地测试）`。
- DSH/Cordis activation：`dsh-mneme/cordis.patch.yml`, `dsh-mneme/package.json → ./cordis.patch.yml`。入口：`dsh-mneme/src/index.js`, `dsh-mneme/src/service.js`。
- 扩展面：services `agentDefaultModel`, `commands`, `llm`, `systemPrompt`, `tools`, `webServer`；tools `memory_list`, `memory_save`, `memory_search`, `minimum`；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（19） `.github/workflows/test.yml`, `dsh-mneme/test/api.test.js`, `dsh-mneme/test/audit.test.js`, `dsh-mneme/test/client.test.js`, `dsh-mneme/test/clustering.test.js`, `dsh-mneme/test/commands.test.js`（另 13 项）；workflows 有（1） `.github/workflows/test.yml`；release `dsh-mneme/package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；ships an explicit persistence migration path；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/test.yml`, `LICENSE`, `README.md`, `dsh-mneme/package.json`, `dsh-mneme/cordis.patch.yml`, `dsh-mneme/README.md`, `dsh-mneme/src/index.js`, `dsh-mneme/src/service.js`, `dsh-mneme/test/api.test.js`, `dsh-mneme/test/audit.test.js`, `dsh-mneme/test/client.test.js`, `dsh-mneme/test/clustering.test.js`, `dsh-mneme/test/commands.test.js`, `dsh-mneme/test/dream.test.js`（另 20 项）。

## dsh-payload-capture

- 榜单来源：[Context & Search · L125](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L125)；源码：[moeblack/dsh-payload-capture](https://github.com/moeblack/dsh-payload-capture/tree/75cd434c6b854323f0f6bdb75ea8694480082d03)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `75cd434c6b854323f0f6bdb75ea8694480082d03`。
- 包与安装：`dsh-payload-capture`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `index.mjs`。
- 扩展面：services —；tools —；events `llm/stream`；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`package.json`, `cordis.patch.yml`, `src/index.ts`, `index.mjs`, `tsdown.config.ts`, `scripts/build.mjs`, `scripts/dsh-env.mjs`。

## dsh-plugin-description

- 榜单来源：[UI & Experience · L215](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L215)；源码：[MysaDC/dsh-plugin-description](https://github.com/MysaDC/dsh-plugin-description/tree/64047f40cd023dfa1b64a74778244abbe6452e23)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `64047f40cd023dfa1b64a74778244abbe6452e23`。
- 包与安装：`dsh-plugin-description`；榜单 spec 未给出；文档命令 `\| `cordis.patch.yml`                      \| bundle 补丁:`dsh plugin add` 安装后自动应用,插入组合行(宿主行 + 浏览器名册)                                  \|`, `要求:可正常运行的 DeepSeek Harness Web profile(需要 pnpm,`dsh plugin` 依赖它)。`, `本插件是**双面 npm 包**并声明 `dsh.bundle`:`dsh plugin add` 安装后,插件管理器会把`, `npx @deepseek-ai/dsh plugin --profile web add https://github.com/MysaDC/dsh-plugin-description/releases/latest/download/dsh-plugin-description.tgz`, `npx @deepseek-ai/dsh plugin --profile web add https://github.com/MysaDC/dsh-plugin-description/releases/download/v1.2.1/dsh-plugin-description-1.2.1.tgz`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.js`, `src/client.js`。
- 扩展面：services `loader`, `locale`, `pluginDescriptions`, `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.js`, `src/client.js`, `scripts/build.mjs`, `scripts/regenerate-descriptions.mjs`。

## dsh-view-modes

- 榜单来源：[UI & Experience · L186](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L186)；源码：[NigelYao/dsh-view-modes](https://github.com/NigelYao/dsh-view-modes/tree/a57d237e03b6488875cb7cc2a90bf6a37512632d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a57d237e03b6488875cb7cc2a90bf6a37512632d`。
- 包与安装：`dsh-view-modes`；榜单 spec 未给出；文档命令 `- `pnpm`on`PATH`(required by`dsh plugin`; use `corepack enable` if needed)`, `dsh plugin --profile web add git+https://github.com/NigelYao/dsh-view-modes.git`, `dsh plugin --profile web add link:$pluginRoot`, `npx @deepseek-ai/dsh web`, `- `PATH`中可以使用`pnpm`（`dsh plugin`依赖它；缺少时可执行`corepack enable`）`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`, `client.js`。
- 扩展面：services `locale`, `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `index.mjs`, `client.js`。

## dsh-spend

- 榜单来源：[UI & Experience · L184](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L184)；源码：[nonewind/dsh-spend](https://github.com/nonewind/dsh-spend/tree/df8235c3e29b9128d29f7baa169e0cb969d690e8)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `df8235c3e29b9128d29f7baa169e0cb969d690e8`。
- 包与安装：`dsh-spend`；榜单 spec 未给出；文档命令 `The package ships a `dsh.bundle`manifest, so`dsh plugin add` mounts it as a profile layer automatically — **no manual profile editing needed**:`, `# 1. Install into the web profile (forwards to pnpm; accepts npm packages, github:owner/repo, or local paths)`, `dsh plugin --profile web add dsh-spend`, `To install from source: `dsh plugin --profile web add github:nonewind/dsh-spend`(or a local path with`-w`).`, `插件包声明了 `dsh.bundle` 清单，`dsh plugin add` 后由 CLI 自动挂载进 profile 层——**无需手动编辑任何配置文件**：`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`, `lib/knowledge.js`, `lib/stats.js`。

## dsh-chat-import

- 榜单来源：[Input & Editing · L146](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L146)；源码：[Nwflower/dsh-chat-import](https://github.com/Nwflower/dsh-chat-import/tree/eea0b4f937d92d51683620cacedac4f112000adb)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `eea0b4f937d92d51683620cacedac4f112000adb`。
- 包与安装：`dsh-chat-import`；榜单 spec 未给出；文档命令 `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `[![Listed in Awesome DSH Plugins](https://img.shields.io/badge/Listed_in-Awesome_DSH_Plugins-6A5ACD?style=for-the-badge&logo=awesome&logoColor=white)](https://github.com/Dominic789654/awesome-deepseek-harness)`, `dsh plugin --profile web add dsh-chat-import                    # npm package`, `dsh plugin --profile web add -w link:/path/to/dsh-chat-import   # local checkout (symlink)`, ``dsh plugin`folds the plugin's bundle declaration into the profile; the plugin becomes active after restarting dsh. To uninstall, remove the`import-claude` insert line from the profile's bundles and restart dsh. Already-imported sessions stay in the DSH data directory and are unaffected.`（另 4 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`。
- 扩展面：services `sessionPersistence`, `webServer`, `workspaceRegistry`；tools `import_claude`, `list_imported_sessions`, `retract_import`, `sessionId`, `webServer`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（45） `test/command.test.mjs`, `test/context-bridge.test.mjs`, `test/convert.test.mjs`, `test/discovery.test.mjs`, `test/export.test.mjs`, `test/fixtures/chatgpt-export.json`（另 39 项）；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；ships an explicit persistence migration path；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `index.mjs`, `test/command.test.mjs`, `test/context-bridge.test.mjs`, `test/convert.test.mjs`, `test/discovery.test.mjs`, `test/export.test.mjs`, `test/grokbuild.test.mjs`, `test/hermes.test.mjs`（另 14 项）。

## dsh-file-claim

- 榜单来源：[Input & Editing · L147](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L147)；源码：[Nwflower/dsh-file-claim](https://github.com/Nwflower/dsh-file-claim/tree/65aebf02cd881af9d170af692f17189bf785cb8a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `65aebf02cd881af9d170af692f17189bf785cb8a`。
- 包与安装：`dsh-file-claim`；榜单 spec 未给出；文档命令 `dsh plugin add dsh-file-claim`, `dsh plugin --profile web add -w link:<repo-path>`, `- [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import) — the sibling DSH plugin whose`, `- [awesome-dsh-plugin](https://github.com/bruc3van/awesome-dsh-plugin) — the DSH plugin ecosystem`, `dsh plugin --profile web add -w link:<仓库路径>`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`。
- 扩展面：services `agents`, `commands`, `systemPrompt`, `timer`, `tools`, `workspaceRegistry`；tools `claim_files`, `pending_show`；events `agent/created`, `agent/disposed`, `agent/status`, `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（2） `test/claim.test.mjs`, `test/index.test.mjs`；workflows 有（1） `.github/workflows/ci.yml`；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `index.mjs`, `test/claim.test.mjs`, `test/index.test.mjs`, `claim.mjs`, `.github/scripts/check-readme-sync.mjs`。

## folio

- 榜单来源：[Output & Deliverables · L306](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L306)；源码：[nyantused-cpun/folio](https://github.com/nyantused-cpun/folio/tree/44ef952a3b5ba55301bc9e43d4fda96674b64bb9)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `44ef952a3b5ba55301bc9e43d4fda96674b64bb9`。
- 包与安装：`@presales/dsh-guard`, `@folio/dsh-events`, `@folio/dsh-tools`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @presales/dsh-guard`。
- DSH/Cordis activation：`guard/cordis.patch.yml`, `plugins/folio-events/cordis.patch.yml`, `plugins/folio-tools/cordis.patch.yml`, `guard/package.json → ./cordis.patch.yml`, `plugins/folio-events/package.json → ./cordis.patch.yml`, `plugins/folio-tools/package.json → ./cordis.patch.yml`。入口：`guard/index.js`, `plugins/folio-events/index.js`, `plugins/folio-tools/index.js`。
- 扩展面：services —；tools `_cli.py`, `defineTool`, `node:fs`, `testedAt`, `version`；events `agent/disposed`, `agent/session-start`, `fs/edit-intent`, `fs/write-intent`, `session/event`, `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（64） `plugins/folio-events/test/run-check.mjs`, `plugins/folio-tools/test/run-check.mjs`, `tests/fixtures/通用_schema验收_v1.spec.yml`, `tests/test_audit_2026_07_23_fixes.py`, `tests/test_audit_2026_07_23_fixes_round2.py`, `tests/test_behavior_paths.py`（另 58 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `guard/package.json`, `plugins/folio-events/package.json`, `plugins/folio-tools/package.json`, `guard/cordis.patch.yml`, `plugins/folio-events/cordis.patch.yml`, `plugins/folio-tools/cordis.patch.yml`, `guard/README.md`, `plugins/folio-events/README.md`, `plugins/folio-tools/README.md`, `guard/index.js`, `plugins/folio-events/index.js`, `plugins/folio-tools/index.js`（另 13 项）。

## dsh-mnemon

- 榜单来源：[Context & Search · L117](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L117)；源码：[omdsh-dev/dsh-mnemon](https://github.com/omdsh-dev/dsh-mnemon/tree/ade5a7b395f2d0578ae1d8807b8df7d54ac03c3c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `ade5a7b395f2d0578ae1d8807b8df7d54ac03c3c`。
- 包与安装：`dsh-mnemon`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-mnemon`, `dsh plugin --profile web add "link:/absolute/path/to/dsh-mnemon"`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`, `src/client/index.ts`。
- 扩展面：services `buildin`, `connection`；tools —；events `settings/updated`；commands `./commands.ts`；client UI 有（50）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（28） `tests/activity.spec.ts`, `tests/client-api.spec.ts`, `tests/client-apply.spec.ts`, `tests/client-interaction-surfaces.spec.tsx`, `tests/client-interaction.spec.tsx`, `tests/client-platform-boundary.spec.ts`（另 22 项）；workflows 有（1） `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/publish.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `docs/README.md`, `docs/en/README.md`, `src/index.ts`, `src/service.ts`, `src/client/index.ts`, `tests/activity.spec.ts`, `tests/client-api.spec.ts`（另 23 项）。

## deepseek-harness-acp

- 榜单来源：[Models & Inference · L263](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L263)；源码：[openma-ai/deepseek-harness-acp](https://github.com/openma-ai/deepseek-harness-acp/tree/f1f60c3f30544d91d36944a2385c98636e4c0ec2)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `f1f60c3f30544d91d36944a2385c98636e4c0ec2`。
- 包与安装：`@openma/deepseek-harness-acp`；榜单 spec 未给出；文档命令 `\| Install \| `npm i -g @openma/deepseek-harness-acp`\|`dsh plugin --profile acp add -w @openma/deepseek-harness-acp` \|`, `npm install -g @openma/deepseek-harness-acp`, `npm install -g @deepseek-ai/dsh`, `dsh plugin --profile acp add -w @openma/deepseek-harness-acp`, `npm install         # dev deps include the harness packages (types + tests)`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `profile-root.cordis.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/bridge/index.ts`。
- 扩展面：services `agentDefaultModel`, `agentPresets`, `approval`, `commands`, `credentials`, `llm`, `permission`, `permissionPresets`（另 3 项）；tools —；events `agent/error`, `agent/inbox/claimed`, `approval/request`, `llm/adapters-updated`, `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（7） `test/e2e.test.ts`, `test/harness.test.ts`, `test/history.test.ts`, `test/prompt.test.ts`, `test/settings.test.ts`, `test/translate.test.ts`（另 1 项）；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.pack:local`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `profile-root.cordis.yml`, `src/index.ts`, `src/bridge/index.ts`, `test/e2e.test.ts`, `test/harness.test.ts`, `test/history.test.ts`, `test/prompt.test.ts`, `test/settings.test.ts`（另 15 项）。

## deepseek-harness-tui

- 榜单来源：[UI & Experience · L192](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L192)；源码：[openma-ai/deepseek-harness-tui](https://github.com/openma-ai/deepseek-harness-tui/tree/636ae5b61cb11a95be9eba90b5747e8974731468)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `636ae5b61cb11a95be9eba90b5747e8974731468`。
- 包与安装：`@openma/deepseek-harness-tui`；榜单 spec 未给出；文档命令 `dsh plugin --profile tui add @openma/deepseek-harness-tui`, `npm install --global @openma/deepseek-harness-tui`, `\| \| dsh plugin (recommended) \| Standalone \|`, `The global npm install provides the TUI binary. Standalone mode also needs the`, `Install the SDK, set `DSH_RUNTIME_BIN`, or use dsh plugin mode.`（另 2 项）。
- DSH/Cordis activation：`npm/cordis.patch.yml`, `npm/package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（6） `scripts/check-release-tag.test.mjs`, `scripts/jsonrpc-line-transport.test.mjs`, `scripts/package-native.test.mjs`, `scripts/plugin-runner.test.mjs`, `tests/cli_help.rs`, `tests/tcp_attach.rs`；workflows 有（1） `.github/workflows/package-npm.yml`；release `.github/workflows/package-npm.yml`, `npm/package.json#scripts.test`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no conventional core source entry was found in the inspected target。
- 已读取证据：`.github/workflows/package-npm.yml`, `Cargo.toml`, `LICENSE`, `README.en.md`, `README.md`, `npm/package.json`, `npm/cordis.patch.yml`, `npm/README.md`, `scripts/check-release-tag.mjs`, `scripts/check-release-tag.test.mjs`, `scripts/jsonrpc-line-transport.test.mjs`, `scripts/package-native.mjs`, `scripts/package-native.test.mjs`, `scripts/plugin-runner-harness.mjs`（另 5 项）。

## dsh-plans

- 榜单来源：[Agents & Orchestration · L91](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L91)；源码：[Optim-Agent/dsh-plans](https://github.com/Optim-Agent/dsh-plans/tree/2bac9907edc7d6a0b5f57360204230c6f6257c42)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2bac9907edc7d6a0b5f57360204230c6f6257c42`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`agent.cordis.yml`。入口：—。
- 扩展面：services `tools`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `agent.cordis.yml`, `lib/plan-subagents.js`。

## dsh-bookmarks

- 榜单来源：[Context & Search · L97](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L97)；源码：[penguin-oo/dsh-bookmarks](https://github.com/penguin-oo/dsh-bookmarks/tree/691b93721f51e7fed5769cc4715694aa62582023)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `691b93721f51e7fed5769cc4715694aa62582023`。
- 包与安装：`dsh-bookmarks`；榜单 spec 未给出；文档命令 `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com/) [![ci](https://github.com/penguin-oo/dsh-bookmarks/actions/workflows/ci.yml/badge.svg)](https://github.com/penguin-oo/dsh-bookmarks/actions/workflows/ci.yml)`, `dsh plugin --profile web add dsh-bookmarks`, `dsh plugin --profile web add file:./        # relative file spec, anchored to your cwd`, `npm install            # zod + esbuild (dev only)`, `dsh plugin --profile web add file:./`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/client/index.jsx`。
- 扩展面：services `remote.bookmarks`；tools —；events `connection/reset`；commands —；client UI 有（1）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/client/index.jsx`, `scripts/build-client.mjs`, `scripts/e2e-screenshot.mjs`, `scripts/smoke.mjs`。

## dsh-doublecheck

- 榜单来源：[Git & Engineering · L299](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L299)；源码：[PerryLink/dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck/tree/427a59e74c75ddd50d93830814809f701d9f212a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `427a59e74c75ddd50d93830814809f701d9f212a`。
- 包与安装：`dsh-doublecheck`；榜单 spec 未给出；文档命令 `dsh plugin --profile <name> add dsh-doublecheck`, `dsh plugin --profile <name> add ./dsh-doublecheck-0.6.0.tgz`, `dsh plugin --profile <name> add "github:PerryLink/dsh-doublecheck#v0.6.0"`, `dsh plugin --profile <name> remove dsh-doublecheck`, `pnpm install --ignore-workspace`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/grill/index.ts`, `src/guard/index.ts`。
- 扩展面：services `commands`, `fs`, `invariants`, `sessionProjections`, `subagents`, `workflowEngine`；tools `catalog-1`, `catalog-2`, `catalog-3`, `doublecheck_report`, `doublecheck_skills`, `edit`, `edit-4`, `read`（另 4 项）；events `agent/turn-stopping`, `doublecheck/reminder`, `doublecheck/report`, `doublecheck/review`, `doublecheck/spec`, `tools/post-execute`, `tools/pre-execute`；commands `doublecheck`, `doublecheck/state`；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（16） `tests/command.spec.ts`, `tests/evidence.spec.ts`, `tests/fixtures/report-loop.json`, `tests/fixtures/review-loop.json`, `tests/grill.spec.ts`, `tests/guard.spec.ts`（另 10 项）；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/publish.yml`；release `.github/workflows/publish.yml`, `package.json#scripts.pack:check`, `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `LICENSE`, `README.es.md`, `README.hi.md`, `README.md`, `README.pt.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/grill/index.ts`, `src/guard/index.ts`（另 25 项）。

## dsh-mcp-panel

- 榜单来源：[Infrastructure & Development · L390](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L390)；源码：[PerryLink/dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel/tree/76b9040550ae5491429cdbceca8e0addab685a25)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `76b9040550ae5491429cdbceca8e0addab685a25`。
- 包与安装：`dsh-mcp-panel`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:PerryLink/dsh-mcp-panel#v0.3.0`, `dsh plugin --profile web add dsh-mcp-panel@0.3.0`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`, `src/client/index.ts`。
- 扩展面：services `commands`, `jobs`, `loader`, `mcpPanel`, `mcpStatus`, `remote.mcpPanel`, `systemPrompt`；tools `bash`, `ctx.jobs`, `mcp__`, `mcp__foreign__thing`, `mcp__github__create_issue`, `mcp__github__list_repos`, `mcp__github__to_ol_a1b2c3d4e5f6`, `mcp__my_server__do_work`（另 9 项）；events `mcp/status`；commands `mcp`；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（11） `tests/aggregate.spec.ts`, `tests/client-registration.spec.ts`, `tests/command-i18n.spec.ts`, `tests/command.spec.ts`, `tests/grouping.spec.ts`, `tests/harness.ts`（另 5 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.es.md`, `README.hi.md`, `README.md`, `README.pt.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/service.ts`（另 26 项）。

## dsh-memento

- 榜单来源：[Context & Search · L126](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L126)；源码：[PerryLink/dsh-memento](https://github.com/PerryLink/dsh-memento/tree/24aa872fa8a52ccdf49f95780ce3de7a82c09c98)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `24aa872fa8a52ccdf49f95780ce3de7a82c09c98`。
- 包与安装：`dsh-memento`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-memento      # or ./dsh-memento / a tarball / a GitHub URL`, `dsh plugin --profile <name> add ./dsh-memento        # local checkout (no build step)`, `dsh plugin --profile <name> add dsh-memento          # paquete npm (publicado desde 0.2.0)`, `dsh plugin --profile <name> add git+https://github.com/PerryLink/dsh-memento.git   # instalación desde GitHub`, `dsh plugin --profile <name> remove dsh-memento       # uninstall: DB + session logs are kept`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.mjs`, `client/client.js`。
- 扩展面：services `commands`, `dsh-memento-panel`, `memory`, `sessionQuery`, `webServer`；tools `memory`, `memory_recall`；events `approval/request`, `internal/service`, `session/event`；commands `commands`；client UI 有（2）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（13） `test/budget.test.mjs`, `test/coverage-report.test.mjs`, `test/extract.test.mjs`, `test/fixtures.test.mjs`, `test/gate.test.mjs`, `test/helpers/fixtures.mjs`（另 7 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；ships an explicit persistence migration path；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.es.md`, `README.hi.md`, `README.md`, `README.pt.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `index.mjs`, `test/budget.test.mjs`, `test/coverage-report.test.mjs`（另 16 项）。

## url-manager-mcp

- 榜单来源：[Context & Search · L120](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L120)；源码：[Piccolo123/url-manager-mcp](https://github.com/Piccolo123/url-manager-mcp/tree/cf699fee258f0730882e423d52efaeeb3a301926)。
- 结论：`mcp-server-or-tool`；审查层级 `source-inspected`；HEAD `cf699fee258f0730882e423d52efaeeb3a301926`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：当前证据不足，未抽取实现模式。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `pyproject.toml`。

## url-manager

- 榜单来源：[Context & Search · L119](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L119)；源码：[Piccolo123/url-manager](https://github.com/Piccolo123/url-manager/tree/33d612035cf681c3e36899cef68025ed0cf11638)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `33d612035cf681c3e36899cef68025ed0cf11638`。
- 包与安装：—；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `filesystem-storage`。
- 测试与发布：tests 有（1） `hermes-agent/tests/test_url_manager_skill.py`；workflows 未发现 —；release —。
- 可借鉴模式：keeps implementation tests in the source repository。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `hermes-agent/tests/test_url_manager_skill.py`。

## @picgo/dsh-plugin

- 榜单来源：[Input & Editing · L150](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L150)；源码：[PicGo/dsh-plugin](https://github.com/PicGo/dsh-plugin/tree/2f7dd01339325641af489715a1e4948e4d204afa)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2f7dd01339325641af489715a1e4948e4d204afa`。
- 包与安装：`@picgo/dsh-plugin`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @picgo/dsh-plugin`, `pnpm install`, `The `release`workflow runs typecheck, tests, and build before publishing, and refuses to publish if the tag does not match`package.json`. Prerelease tags pick their own dist-tag (`-beta.x`→`beta`, `-alpha.x`→`alpha`, anything else prerelease → `next`), so `npm install @picgo/dsh-plugin` never resolves to a prerelease.`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `picgo_upload`；events —；commands `true`；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（4） `src/__tests__/command.test.ts`, `src/__tests__/picgo.test.ts`, `src/__tests__/skill.test.ts`, `src/__tests__/tool.test.ts`；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.push-release`, `package.json#scripts.release`, `package.json#scripts.release:beta`, `package.json#scripts.release:dry`, `package.json#scripts.release:major`（另 1 项）。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/__tests__/command.test.ts`, `src/__tests__/picgo.test.ts`, `src/__tests__/skill.test.ts`, `src/__tests__/tool.test.ts`, `tsdown.config.ts`, `src/command.ts`, `src/picgo.ts`, `src/skill.ts`（另 1 项）。

## dsh-quickstart

- 榜单来源：[Infrastructure & Development · L384](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L384)；源码：[qzhqzh/dsh-quickstart](https://github.com/qzhqzh/dsh-quickstart/tree/7c66fcc2f470aa15637f2b4eaf0d61e57319221c)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `7c66fcc2f470aa15637f2b4eaf0d61e57319221c`。
- 包与安装：`dsh-quickstart`；榜单 spec 未给出；文档命令 `No more typing `npx @deepseek-ai/dsh web` and waiting for the page by hand — this`, `npm i -g dsh-quickstart`, `npm i -g @deepseek-ai/dsh`, `\| `--command <cmd>`\|`dsh`\| Command used to start dsh (e.g.`npx @deepseek-ai/dsh`) \|`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（1） `test/smoke.js`；workflows 未发现 —；release —。
- 可借鉴模式：keeps implementation tests in the source repository。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `test/smoke.js`, `bin/dsh-quickstart.js`。

## dsh-us-stocks

- 榜单来源：[Data & Market · L409](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L409)；源码：[Realyujie/dsh-us-stocks](https://github.com/Realyujie/dsh-us-stocks/tree/289b8e534d769b49f2e54fade3217312d3691d8e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `289b8e534d769b49f2e54fade3217312d3691d8e`。
- 包与安装：`dsh-us-stocks`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-us-stocks`, `If it is not — which is the case when Harness was started through `npx`, since the binary then only exists in the npx cache — call it through `npx` instead:`, `npx @deepseek-ai/dsh plugin --profile web add dsh-us-stocks`, `Every command below works the same way: prefix it with `npx @deepseek-ai/dsh`in place of`dsh`, or install the CLI globally once with `npm install -g @deepseek-ai/dsh` and use the short form throughout.`, `dsh plugin --profile web update dsh-us-stocks`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/tools/index.ts`。
- 扩展面：services —；tools `get_analyst_view`, `get_financials`, `get_history`, `get_news`, `get_quote`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（4） `tests/cache.spec.ts`, `tests/errors.spec.ts`, `tests/stringify.spec.ts`, `tests/tools.spec.ts`；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/tools/index.ts`, `tests/cache.spec.ts`, `tests/errors.spec.ts`, `tests/stringify.spec.ts`, `tests/tools.spec.ts`, `vitest.config.ts`, `scripts/benchmark.mjs`, `scripts/build.mjs`（另 13 项）。

## loongport-dsh

- 榜单来源：[Models & Inference · L273](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L273)；源码：[SailingLoong/loongport-dsh](https://github.com/SailingLoong/loongport-dsh/tree/ff92e6ebb8ef11f9598be44b920f2bcfbba6d3bb)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `ff92e6ebb8ef11f9598be44b920f2bcfbba6d3bb`。
- 包与安装：`loongport`；榜单 spec 未给出；文档命令 `dsh plugin --profile <profile> add loongport`, `LOONGPORT_API_KEY='your-api-key' npx loongport dsh setup \`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`, `src/host/index.ts`。
- 扩展面：services —；tools —；events `connection/reset`；commands —；client UI 有（7）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（12） `tests/bundle-manifest.test.ts`, `tests/cli-boundary.test.ts`, `tests/cli.test.ts`, `tests/client-entry.test.ts`, `tests/client-store.test.ts`, `tests/directory-merge.test.ts`（另 6 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.tsx`, `src/host/index.ts`, `tests/bundle-manifest.test.ts`, `tests/cli-boundary.test.ts`, `tests/cli.test.ts`, `tests/client-entry.test.ts`, `tests/client-store.test.ts`, `tests/directory-merge.test.ts`（另 19 项）。

## dsh-design-studio

- 榜单来源：[UI & Experience · L174](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L174)；源码：[Sal7one/DSH-Design-Studio](https://github.com/Sal7one/DSH-Design-Studio/tree/c08abef3856ef56ed34fcf903466b7dd08eb219e)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c08abef3856ef56ed34fcf903466b7dd08eb219e`。
- 包与安装：`@sal7one/dsh-design-studio`；榜单 spec 未给出；文档命令 ``dsh plugin add` once, and the tool, the preview route, the prompt section and the`, `(`npx @deepseek-ai/dsh web`) and a source checkout (`pnpm dsh web`).`, `# 1. start the harness (if not running): npx @deepseek-ai/dsh web`, `dsh plugin --profile web add "github:sal7two/dsh-design-studio#main"`, `dsh plugin --profile web add -w /absolute/path/to/dsh-design-studio`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`dynamic/client.js`。
- 扩展面：services `agents`, `attachments`, `credentials`, `fs`, `llm`, `sessions`, `slots`, `subagents`（另 4 项）；tools `client.js`, `design_studio`；events `fs/observed`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dynamic/README.md`, `examples/_presets/README.md`, `dynamic/client.js`, `dynamic/host.js`, `examples/homelab-command-center/js/app.js`, `examples/pulseboard/js/app.js`, `examples/tic-tac-toe/js/app.js`。

## dsh-adb

- 榜单来源：[Infrastructure & Development · L394](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L394)；源码：[SamXiaBing/dsh-adb](https://github.com/SamXiaBing/dsh-adb/tree/d0e38c8876640ce049cbf7529964b44de4003d82)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `d0e38c8876640ce049cbf7529964b44de4003d82`。
- 包与安装：`dsh-adb`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-adb`, `Or install directly from GitHub: `dsh plugin --profile web add github:SamXiaBing/dsh-adb``, `npm install            # add --include=dev when NODE_ENV=production`, `或从 GitHub 直装：`dsh plugin --profile web add github:SamXiaBing/dsh-adb``, `npm install            # 本机 NODE_ENV=production 时加 --include=dev`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `jobs`, `subprocess`；tools `adb_connect`, `adb_devices`, `adb_disconnect`, `adb_file`, `adb_install`, `adb_logcat`, `adb_perf_snapshot`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（1） `test/parsers.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `docs/research/README.md`, `src/index.ts`, `test/parsers.test.mjs`, `src/adb.ts`, `src/parsers/devices.ts`, `src/parsers/logcat.ts`, `src/parsers/perf.ts`, `src/tools/devices.ts`, `src/tools/file.ts`（另 3 项）。

## sandbase-harness

- 榜单来源：[Infrastructure & Development · L362](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L362)；源码：[sandbaseai/sandbase-harness](https://github.com/sandbaseai/sandbase-harness/tree/f450ee337db848b3a4b92476563e9d7de4016cae)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `f450ee337db848b3a4b92476563e9d7de4016cae`。
- 包与安装：`managed-agents`；榜单 spec 未给出；文档命令 `Run this project as a DSH plugin instead of treating `dsh-plugin` as discovery`, `dsh plugin --profile web add managed-agents`, `The unscoped `managed-agents` name on npm is not this project. Until an`, `tagged GitHub source release shown above. Do not run `npx managed-agents` or`, ``npm install managed-agents`.`。
- DSH/Cordis activation：`examples/deepseek-harness/cordis.yml`, `package.json → ./examples/deepseek-harness/cordis.yml`。入口：`src/index.ts`, `src/core/index.ts`, `src/mcp/index.ts`, `src/sdk/index.ts`, `src/types/index.ts`。
- 扩展面：services —；tools `user`；events —；commands —；client UI 有（44）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`, `migration`。
- 测试与发布：tests 有（88） `docs/spec/README.md`, `docs/spec/architecture.md`, `docs/spec/claude-managed-agents-gap.md`, `docs/spec/design.md`, `docs/spec/requirements.md`, `docs/spec/settings-v2.md`（另 82 项）；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/pr-check.yml`；release `package.json#scripts.package:check`, `package.json#scripts.release:check`, `package.json#scripts.smoke:release`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；ships an explicit persistence migration path；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/pr-check.yml`, `LICENSE`, `README.md`, `package.json`, `examples/deepseek-harness/cordis.yml`, `docs/spec/README.md`, `docs/README.md`, `examples/basic/README.md`, `src/index.ts`, `src/core/index.ts`, `src/mcp/index.ts`, `src/sdk/index.ts`, `src/types/index.ts`（另 30 项）。

## sandbase-skills

- 榜单来源：[Infrastructure & Development · L363](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L363)；源码：[sandbaseai/sandbase-skills](https://github.com/sandbaseai/sandbase-skills/tree/41b6525944e7d0f658cbd5e7491ce3d2bfadb4d4)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `41b6525944e7d0f658cbd5e7491ce3d2bfadb4d4`。
- 包与安装：`@sandbaseai/dsh-skills`；榜单 spec 未给出；文档命令 `npx skills add sandbaseai/sandbase-skills --skill twitter-intelligence --agent codex`, `npx skills add sandbaseai/sandbase-skills --skill <skill-name> --agent codex`, `npx skills add sandbaseai/sandbase-skills --skill <skill-name> --agent codex --global`, `npx skills add sandbaseai/sandbase-skills --list`, `- **OpenClaw, Hermes, Amp, Devin** — via `npx skills add``。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 有（4） `tests/install-dsh.test.mjs`, `tests/test_install_dsh.py`, `tests/test_readme_inventory.py`, `tests/test_skillpack.py`；workflows 未发现 —；release `package.json#scripts.package:check`, `package.json#scripts.validate`。
- 可借鉴模式：keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.de.md`, `README.es.md`, `README.fr.md`, `README.ja.md`, `README.ko.md`, `README.md`, `README.pt-BR.md`, `README.zh-CN.md`, `package.json`, `tests/install-dsh.test.mjs`, `bin/sandbase-dsh-skills.mjs`, `tests/test_install_dsh.py`, `tests/test_readme_inventory.py`（另 1 项）。

## dsh-sampling-sliders

- 榜单来源：[Models & Inference · L275](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L275)；源码：[Semidia/dsh-sampling-sliders](https://github.com/Semidia/dsh-sampling-sliders/tree/659d38cad7d1c7a83239934f8b31b4fb1870f928)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `659d38cad7d1c7a83239934f8b31b4fb1870f928`。
- 包与安装：`dsh-sampling-sliders`；榜单 spec 未给出；文档命令 `npm install && npm run build`, `# 2. 装进 profile（本地目录方式，或 pnpm add link:）`, `dsh plugin --profile web add link:D:/path/to/dsh-sampling-sliders`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `settings`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`。

## dsh-service-control

- 榜单来源：[Models & Inference · L276](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L276)；源码：[Semidia/dsh-service-control](https://github.com/Semidia/dsh-service-control/tree/e7750e97ab9b8dcc4089ba9d9fef8e30750be241)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `e7750e97ab9b8dcc4089ba9d9fef8e30750be241`。
- 包与安装：`dsh-service-control`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `appExit`, `div`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `lib/index.js`, `lib/client.js`。

## dsh-notify-windows

- 榜单来源：[Notifications & Channels · L329](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L329)；源码：[SeverusZh/dsh-notify-windows](https://github.com/SeverusZh/dsh-notify-windows/tree/1643197b50608ea8c3e0fc10c9b2d8caa264cac3)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `1643197b50608ea8c3e0fc10c9b2d8caa264cac3`。
- 包与安装：`dsh-notify-windows`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-notify-windows`, `- **Hot-update after code changes?** Re-run the install script (the versioned directory name busts the module cache); for npm installs run `dsh plugin --profile web update dsh-notify-windows` and restart the host.`, `- **更新插件代码后如何热更新？** 重新执行安装脚本（版本目录名变化即热加载）；用 npm 安装时执行 `dsh plugin --profile web update dsh-notify-windows` 后重启宿主。`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：uses lifecycle/event integration instead of core patches。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `scripts/smoke-test.mjs`。

## dsh-plugin-subagent-director

- 榜单来源：[Models & Inference · L270](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L270)；源码：[SeverusZh/dsh-plugin-subagent-director](https://github.com/SeverusZh/dsh-plugin-subagent-director/tree/a8e41b14774cbc015092259df4a542aecec4d04d)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `a8e41b14774cbc015092259df4a542aecec4d04d`。
- 包与安装：`dsh-plugin-subagent-director`；榜单 spec 未给出；文档命令 `dsh plugin --profile <name> add dsh-plugin-subagent-director`, `npm install`。
- DSH/Cordis activation：—。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `conversation.composer.dock`, `jobs`, `llm`, `settings`, `systemPrompt`, `webServer`；tools —；events `connection/reset`, `subagent/provider-added`, `subagent/provider-removed`；commands —；client UI 有（9）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（9） `test/client-store.test.ts`, `test/delegation-mode.test.ts`, `test/envelope.test.ts`, `test/remote-bridge.test.ts`, `test/route-resolver.test.ts`, `test/settings-schema.test.ts`（另 3 项）；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `src/index.ts`, `src/client/index.ts`, `test/client-store.test.ts`, `test/delegation-mode.test.ts`, `test/envelope.test.ts`, `test/remote-bridge.test.ts`, `test/route-resolver.test.ts`, `test/settings-schema.test.ts`, `test/subagent-model.test.ts`, `test/tool-schema.test.ts`, `test/toolfilter-capability.test.ts`（另 17 项）。

## dsh-yolo-mode

- 榜单来源：[Git & Engineering · L301](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L301)；源码：[SeverusZh/dsh-yolo-mode](https://github.com/SeverusZh/dsh-yolo-mode/tree/029795dce408f445d5fc3a4e327f8cdee4bd71d4)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `029795dce408f445d5fc3a4e327f8cdee4bd71d4`。
- 包与安装：`dsh-yolo-mode`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-yolo-mode`, `dsh plugin --profile web add <项目绝对路径>`。
- DSH/Cordis activation：—。入口：`src/client/index.js`。
- 扩展面：services `connection`, `conversation.input.left`, `shell.overlay`；tools —；events `connection/reset`；commands —；client UI 有（9）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（5） `test/client.test.mjs`, `test/judge.test.mjs`, `test/policy.test.mjs`, `test/remote-bridge.test.mjs`, `test/settings.test.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `src/client/index.js`, `test/client.test.mjs`, `test/judge.test.mjs`, `test/policy.test.mjs`, `test/remote-bridge.test.mjs`, `test/settings.test.mjs`, `scripts/build-client.mjs`, `src/client/locales.js`, `src/client/presets.js`, `src/client/store-logic.js`, `src/client/store.js`（另 3 项）。

## dsh-turn-index

- 榜单来源：[UI & Experience · L212](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L212)；源码：[Simon314620/dsh-turn-index](https://github.com/Simon314620/dsh-turn-index/tree/a324ecde201a219448c23c1c8bbd872bdab512b4)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a324ecde201a219448c23c1c8bbd872bdab512b4`。
- 包与安装：`dsh-turn-index`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-turn-index`, `dsh plugin --profile web add https://github.com/Simon314620/dsh-turn-index/archive/refs/tags/v0.1.1.tar.gz`, `dsh plugin --profile web add file:D:/path/to/dsh-turn-index`, `dsh plugin --profile web remove dsh-turn-index`, `移除后重启 `dsh web`并硬刷新（Ctrl+Shift+R）。回滚方式同上：卸载后重装旧版本即可（如`dsh plugin --profile web add dsh-turn-index@<旧版>`）。浏览器侧偏好（折叠状态等）仅存于 localStorage，卸载后是无害残留，可在开发者工具中清除。`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `k1`, `slots.inject:`；tools —；events —；commands —；client UI 有（1）。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（1） `tests/edge.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `tests/edge.mjs`, `smoke.mjs`。

## dsh-clippy

- 榜单来源：[Fun & Lifestyle · L338](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L338)；源码：[sjh9714/clippy-harness](https://github.com/sjh9714/clippy-harness/tree/21a77d8d1daa3429636305b56cfb2d0258286c2c)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `21a77d8d1daa3429636305b56cfb2d0258286c2c`。
- 包与安装：`dsh-clippy`；榜单 spec 未给出；文档命令 `npx @deepseek-ai/dsh plugin --profile web add dsh-clippy`, `npx @deepseek-ai/dsh plugin --profile web add link:/path/to/clippy-harness/plugin`。
- DSH/Cordis activation：`plugin/cordis.patch.yml`, `plugin/plugin/cordis.patch.yml`, `plugin/plugin/plugin/cordis.patch.yml`, `plugin/package.json → ./cordis.patch.yml`, `plugin/plugin/package.json → ./cordis.patch.yml`, `plugin/plugin/plugin/package.json → ./cordis.patch.yml`。入口：`plugin/src/index.ts`, `plugin/plugin/src/index.ts`, `plugin/plugin/plugin/src/index.ts`, `plugin/src/service.ts`, `plugin/plugin/src/service.ts`, `plugin/plugin/plugin/src/service.ts`, `plugin/src/client/index.ts`, `plugin/plugin/src/client/index.ts`, `plugin/plugin/plugin/src/client/index.ts`。
- 扩展面：services —；tools —；events `session/disposed`, `session/event`；commands —；client UI 有（33）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`。
- 测试与发布：tests 有（3） `plugin/plugin/plugin/src/state.test.ts`, `plugin/plugin/src/state.test.ts`, `plugin/src/state.test.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `plugin/package.json`, `plugin/plugin/package.json`, `plugin/plugin/plugin/package.json`, `plugin/cordis.patch.yml`, `plugin/plugin/cordis.patch.yml`, `plugin/plugin/plugin/cordis.patch.yml`, `plugin/src/index.ts`, `plugin/plugin/src/index.ts`, `plugin/plugin/plugin/src/index.ts`, `plugin/src/service.ts`, `plugin/plugin/src/service.ts`（另 23 项）。

## dsh-movein

- 榜单来源：[Infrastructure & Development · L359](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L359)；源码：[sjh9714/dsh-movein](https://github.com/sjh9714/dsh-movein/tree/8829c3dd767dbda884c13be6dd5335463664047e)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `8829c3dd767dbda884c13be6dd5335463664047e`。
- 包与安装：`dsh-movein`, `dsh-movein-permissions`；榜单 spec 未给出；文档命令 `npx dsh-movein            # dry run, shows the moving estimate`, `npx dsh-movein --apply    # actually move in`, `Or install it as a DSH plugin and ask the agent to do the move for you:`, `dsh plugin --profile web add dsh-movein`, `npx dsh-movein            # 预演，先看搬家清单`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `plugin/cordis.patch.yml`, `package.json → ./cordis.patch.yml`, `plugin/package.json → ./cordis.patch.yml`。入口：`plugin/index.js`, `shell/index.mjs`。
- 扩展面：services —；tools `movein_from_claude_code`；events `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（2） `plugin/test.mjs`, `test/test.mjs`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `package.json`, `demo/package.json`, `plugin/package.json`, `cordis.patch.yml`, `plugin/cordis.patch.yml`, `plugin/README.md`, `plugin/index.js`, `shell/index.mjs`, `plugin/test.mjs`, `test/test.mjs`, `bin/cli.mjs`（另 1 项）。

## dsh-passwords

- 榜单来源：[Infrastructure & Development · L391](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L391)；源码：[slywalker2006/dsh-passwords](https://github.com/slywalker2006/dsh-passwords/tree/5af345b4dea8f297fbfdf214418f1f051ffcd09d)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5af345b4dea8f297fbfdf214418f1f051ffcd09d`。
- 包与安装：`dsh-passwords`；榜单 spec 未给出；文档命令 `🏅 已收录于 [Awesome DeepSeek Harness](https://github.com/0xsline/awesome-deepseek-harness) 生态索引（Infrastructure & Development）与 [Awesome DSH Plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 插件精选列表（Development & Runtime）。`, `npm install           # 装依赖`, `npm install -g @deepseek-ai/dsh`, `npm install`, `pnpm add /opt/dsh-passwords`（另 1 项）。
- DSH/Cordis activation：`cordis.yml`, `package.json → ./cordis.yml`。入口：`src/index.ts`, `src/plugin.ts`, `src/client/index.tsx`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（2）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `migration`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；ships an explicit persistence migration path。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.yml`, `src/index.ts`, `src/plugin.ts`, `src/client/index.tsx`, `scripts/build-client.mjs`, `src/auth.ts`, `src/cli.ts`, `src/config.ts`, `src/db.ts`, `src/encrypt.ts`, `src/gateway.ts`（另 2 项）。

## dsh-milestone

- 榜单来源：[UI & Experience · L211](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L211)；源码：[SnowCrescenter-tech/dsh-milestone](https://github.com/SnowCrescenter-tech/dsh-milestone/tree/c238f8c5d4afe153ede8559e5f7e3d1a652b6327)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c238f8c5d4afe153ede8559e5f7e3d1a652b6327`。
- 包与安装：`dsh-milestone`；榜单 spec 未给出；文档命令 `dsh plugin --profile demo add dsh-milestone`, `dsh plugin --profile demo add "github:SnowCrescenter-tech/dsh-milestone#main"`, `npx @deepseek-ai/dsh web    # → http://127.0.0.1:3080`, `npx @deepseek-ai/dsh web   # → http://127.0.0.1:3080`, `- Browser binaries: `npx playwright install chromium` if the first run`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（49）。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（35） `qa/surface.spec.ts`, `src/client/MilestoneRail.actions.test.tsx`, `src/client/MilestoneRail.badge.test.tsx`, `src/client/MilestoneRail.bookmark.test.tsx`, `src/client/MilestoneRail.current.test.tsx`, `src/client/MilestoneRail.deeplink.test.tsx`（另 29 项）；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `qa/README.md`, `src/index.ts`, `src/client/index.ts`, `src/test/renderRail.tsx`, `src/test/runtime-client.ts`, `src/test/setup.ts`, `src/test/smoke.test.ts`, `src/test/snapshot-fixture.test.ts`, `src/test/snapshot-fixture.ts`（另 20 项）。

## dsh-collaboration

- 榜单来源：[Agents & Orchestration · L90](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L90)；源码：[Socialist-Sister/dsh-collaboration](https://github.com/Socialist-Sister/dsh-collaboration/tree/9a7cf4bade959d58a2551324e2dfb5884bc61c31)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9a7cf4bade959d58a2551324e2dfb5884bc61c31`。
- 包与安装：`dsh-collaboration`, `@dsh-collaboration/team`, `@dsh-collaboration/tool-model-compare`, `@dsh-collaboration/tool-team`, `@dsh-collaboration/tool-vision`；榜单 spec 未给出；文档命令 `pnpm add -w @dsh-collaboration/team @dsh-collaboration/tool-team @dsh-collaboration/tool-model-compare @dsh-collaboration/tool-vision`, `pnpm install      # install dependencies`, `pnpm install      # 安装依赖`。
- DSH/Cordis activation：`config/agent-presets/collaboration/agent.cordis.yml`。入口：`packages/host/team/src/index.ts`, `packages/tools/tool-model-compare/src/index.ts`, `packages/tools/tool-team/src/index.ts`, `packages/tools/tool-vision/src/index.ts`。
- 扩展面：services `attachments`, `collaborationTeam`, `fs`, `sandboxPolicy`, `systemPrompt`；tools `model_compare`, `roundtable`, `team_call`, `team_close`, `team_message`, `team_status`, `tool-model-compare`, `tool-team`（另 2 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions。
- 明显缺口：no test/spec files were found；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `packages/host/team/package.json`, `packages/tools/tool-model-compare/package.json`, `packages/tools/tool-team/package.json`, `packages/tools/tool-vision/package.json`, `config/agent-presets/collaboration/agent.cordis.yml`, `packages/host/team/README.md`, `packages/tools/tool-model-compare/README.md`, `packages/host/team/src/index.ts`（另 7 项）。

## dsh-smooth-stream

- 榜单来源：[UI & Experience · L225](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L225)；源码：[SpookySandwich/dsh-smooth-stream](https://github.com/SpookySandwich/dsh-smooth-stream/tree/2a9cc67d292d6a14a89ad68dca06ac7eea346a06)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2a9cc67d292d6a14a89ad68dca06ac7eea346a06`。
- 包与安装：`dsh-smooth-stream`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:SpookySandwich/dsh-smooth-stream`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `modules`, `slots`, `timer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `plugin.client.js`。

## dsh-builtin-toggles

- 榜单来源：[UI & Experience · L216](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L216)；源码：[Starfie1d1272/dsh-builtin-toggles](https://github.com/Starfie1d1272/dsh-builtin-toggles/tree/cbec814dee8162b1eb652469b140f6d81d7dd710)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `cbec814dee8162b1eb652469b140f6d81d7dd710`。
- 包与安装：`dsh-builtin-toggles`；榜单 spec 未给出；文档命令 `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)`, `dsh plugin --profile web add dsh-builtin-toggles`, `dsh plugin --profile web remove dsh-builtin-toggles`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `webRuntime`；tools —；events —；commands —；client UI 有（15）。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（11） `tests/baseline-verifier.spec.ts`, `tests/catalog.spec.ts`, `tests/client-inspector.spec.ts`, `tests/eligibility.spec.ts`, `tests/index.spec.ts`, `tests/inspection.spec.ts`（另 5 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/compatibility.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`, `package.json#scripts.pack:check`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/compatibility.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/baseline-verifier.spec.ts`, `tests/catalog.spec.ts`, `tests/client-inspector.spec.ts`, `tests/eligibility.spec.ts`（另 22 项）。

## mirage-dsh

- 榜单来源：[Infrastructure & Development · L404](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L404)；源码：[strukto-ai/mirage/typescript/packages/dsh](https://github.com/strukto-ai/mirage/tree/c32855fd91d8efe88b73b5a612d549da71863a12/typescript/packages/dsh)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c32855fd91d8efe88b73b5a612d549da71863a12`。
- 包与安装：`@struktoai/mirage-dsh`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：`typescript/packages/dsh/cordis.patch.yml`, `typescript/packages/dsh/package.json → ./cordis.patch.yml`。入口：`typescript/packages/dsh/src/index.ts`, `typescript/packages/dsh/src/service.ts`, `typescript/packages/dsh/src/plugin/service.ts`。
- 扩展面：services `mirage`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `memory-only`。
- 测试与发布：tests 有（5） `typescript/packages/dsh/src/fs.test.ts`, `typescript/packages/dsh/src/integration.test.ts`, `typescript/packages/dsh/src/service.test.ts`, `typescript/packages/dsh/src/shell.test.ts`, `typescript/packages/dsh/src/spill.test.ts`；workflows 有（6） `.github/workflows/pre-commit.yml`, `.github/workflows/test_cli.yml`, `.github/workflows/test_install.yml`, `.github/workflows/test_integ.yml`, `.github/workflows/test_python.yml`, `.github/workflows/test_typescript.yml`；release `typescript/package.json#scripts.build`, `typescript/package.json#scripts.mirage`, `typescript/package.json#scripts.release`, `typescript/package.json#scripts.test`, `typescript/package.json#scripts.typecheck`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`typescript/packages/dsh/package.json`, `typescript/packages/dsh/cordis.patch.yml`, `typescript/packages/dsh/src/index.ts`, `typescript/packages/dsh/src/service.ts`, `typescript/packages/dsh/tsup.config.ts`, `typescript/packages/dsh/src/errors.ts`, `typescript/packages/dsh/src/fs.test.ts`, `typescript/packages/dsh/src/fs.ts`, `typescript/packages/dsh/src/integration.test.ts`, `typescript/packages/dsh/src/service.test.ts`, `typescript/packages/dsh/src/shell.test.ts`, `typescript/packages/dsh/src/shell.ts`, `typescript/packages/dsh/src/spill.test.ts`, `typescript/packages/dsh/src/spill.ts`（另 4 项）。

## dsh-cost-meter

- 榜单来源：[UI & Experience · L181](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L181)；源码：[Sttrevens/dsh-cost-meter](https://github.com/Sttrevens/dsh-cost-meter/tree/cd86d737de3c5ec75d4e9a909d81605b7b983b1f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `cd86d737de3c5ec75d4e9a909d81605b7b983b1f`。
- 包与安装：`@steven-wu/dsh-cost-meter`；榜单 spec 未给出；文档命令 `The package declares a `dsh.bundle`manifest, so`dsh plugin add` installs it`, `dsh plugin --profile web add @steven-wu/dsh-cost-meter`, `dsh plugin --profile web add file:/path/to/dsh-cost-meter`, `happens only through `dsh plugin --profile … add`.`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `sessionCost`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.d.ts`, `lib/client.js`, `lib/index.d.ts`。

## dsh-test-runner

- 榜单来源：[Git & Engineering · L297](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L297)；源码：[suimi8/dsh-test-runner](https://github.com/suimi8/dsh-test-runner/tree/89f89ed8d50c94c73adb7d818988cdab74c5acde)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `89f89ed8d50c94c73adb7d818988cdab74c5acde`。
- 包与安装：`dsh-test-runner`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add ./dsh-test-runner        # 本地目录`, `dsh plugin --profile web add github:you/dsh-test-runner`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`。
- 扩展面：services `fs`, `isConcurrencySafe`, `sandboxPolicy`, `shell`, `tools`；tools `dsh-test-runner`, `inject`, `test_run`, `timeout_ms`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `index.js`。

## dsh-pdf

- 榜单来源：[Fun & Lifestyle · L343](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L343)；源码：[sunshine-lang/dsh-pdf](https://github.com/sunshine-lang/dsh-pdf/tree/bfb4231ab6ca748871d679bb2895631262a9685f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `bfb4231ab6ca748871d679bb2895631262a9685f`。
- 包与安装：`dsh-pdf`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:sunshine-lang/dsh-pdf"`, `dsh plugin --profile web add dsh-pdf`, `dsh plugin --profile web add ./dsh-pdf`, `Note: pnpm installs the dependencies of a `link:`-style local dependency only if you add them to the profile yourself. A registry/GitHub install handles them automatically:`, `dsh plugin --profile web add @deepseek-ai/dsh-tools @deepseek-ai/cordis @deepseek-ai/schemastery pdfjs-dist`（另 2 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `pdf_read`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 有（2） `tests/fixtures/sample.pdf`, `tests/fixtures/w3-dummy.pdf`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `test-bounds.ts`, `test-integration.ts`, `src/pdf.ts`, `tests/fixtures/sample.pdf`, `tests/fixtures/w3-dummy.pdf`。

## dsh-weather

- 榜单来源：[Fun & Lifestyle · L342](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L342)；源码：[sunshine-lang/dsh-weather](https://github.com/sunshine-lang/dsh-weather/tree/9f85d87ac58402d5864aa7bdbd8346c136589458)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9f85d87ac58402d5864aa7bdbd8346c136589458`。
- 包与安装：`dsh-weather`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:sunshine-lang/dsh-weather"`, `dsh plugin --profile web add dsh-weather`, `dsh plugin --profile web add ./dsh-weather`, `Note: pnpm installs the dependencies of a `link:`-style local dependency only if you add them to the profile yourself. A registry/GitHub install handles them automatically:`, `dsh plugin --profile web add @deepseek-ai/dsh-tools @deepseek-ai/cordis @deepseek-ai/schemastery`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services —；tools `get_weather`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/weather.ts`。

## dsh-plugin-vision

- 榜单来源：[Models & Inference · L252](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L252)；源码：[tdf1995/dsh-plugin-vision](https://github.com/tdf1995/dsh-plugin-vision/tree/6b814157e82af5e8c8c68dec54901ad694d02ee8)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `6b814157e82af5e8c8c68dec54901ad694d02ee8`。
- 包与安装：`dsh-plugin-vision`；榜单 spec 未给出；文档命令 `npm i -D dsh-plugin-vision`, `npm install            # 安装 peer dependencies`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services `fs`, `shell`, `subprocess`, `timer`, `tools`, `webServer`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `scripts/load-test.mjs`, `scripts/sim-client.mjs`。

## dsh-im-hub

- 榜单来源：[Notifications & Channels · L326](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L326)；源码：[ThreeBody6666/dsh-im-hub](https://github.com/ThreeBody6666/dsh-im-hub/tree/1de471e732292f562654796d3d680dbd554770a3)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `1de471e732292f562654796d3d680dbd554770a3`。
- 包与安装：`dsh-im-hub`；榜单 spec 未给出；文档命令 `dsh plugin --profile im add dsh-im-hub`, `dsh plugin --profile im add link:D:/projects/dsh-im-hub`, `dsh plugin --profile im add link:D:/projects/dsh-im-hub   # install from checkout`, `dsh plugin --profile im add link:D:/projects/dsh-im-hub   # 从源码安装`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（5） `test/client-slot.test.mjs`, `test/disable-skin.overlay.yml`, `test/feishu-ws-frame.test.js`, `test/probe.overlay.yml`, `test/v2-mock.overlay.yml`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `test/client-slot.test.mjs`, `test/feishu-ws-frame.test.js`, `docs/feishu_research/analyze.js`, `docs/feishu_research/fetch.js`, `docs/feishu_research/node_ws_config.ts`, `docs/feishu_research/node_ws_enum.ts`, `docs/feishu_research/node_ws_index.ts`, `docs/feishu_research/node_ws_types.ts`, `test/disable-skin.overlay.yml`（另 2 项）。

## dsh-web-search-exa

- 榜单来源：[Context & Search · L130](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L130)；源码：[TonyDua/dsh-web-search-exa](https://github.com/TonyDua/dsh-web-search-exa/tree/083706bae60af8e1f3776b02448f17c140c3f571)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `083706bae60af8e1f3776b02448f17c140c3f571`。
- 包与安装：`@tonydua/dsh-web-search-exa`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @tonydua/dsh-web-search-exa`, `dsh plugin --profile web add ../plugins/dsh-web-search-exa`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `test/index.test.js`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository。
- 明显缺口：no conventional core source entry was found in the inspected target；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `test/index.test.js`。

## dsh-agent-team-gui

- 榜单来源：[Agents & Orchestration · L92](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L92)；源码：[toolclub/agent_team_gui](https://github.com/toolclub/agent_team_gui/tree/aff4adfb4a11a2fed515b81040b3392696d9ac1c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `aff4adfb4a11a2fed515b81040b3392696d9ac1c`。
- 包与安装：`dsh-agent-team-gui`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add -w github:toolclub/dsh-agent-team-gui#v0.1.0`, `dsh plugin --profile web add -w ./dsh-agent-team-gui`, `dsh plugin --profile web add -w ./dsh-agent-team-gui/dsh-agent-team-gui-0.1.0.tgz`, `dsh plugin --profile web add -w github:toolclub/dsh-agent-team-gui#<commit-sha>`, `Expected: pnpm is allowed to run `prepare`, builds the package, and reports it as added.`（另 4 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `agents`, `connection`, `conversation.input.right`, `llm`, `storageDomain`, `subagents`, `systemPrompt`；tools `dispatch_to_squad`, `systemPrompt`；events —；commands —；client UI 有（2）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（6） `src/spec.ts`, `tests/client-controller.spec.ts`, `tests/helpers.ts`, `tests/import-export.spec.ts`, `tests/rpc.spec.ts`, `tests/service.spec.ts`；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `src/spec.ts`, `tests/client-controller.spec.ts`, `tests/helpers.ts`, `tests/import-export.spec.ts`, `tests/rpc.spec.ts`, `tests/service.spec.ts`, `tsdown.config.ts`, `vitest.host.config.ts`（另 4 项）。

## billion-context-dsh

- 榜单来源：[Context & Search · L98](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L98)；源码：[Tyan66666/billion-context-dsh](https://github.com/Tyan66666/billion-context-dsh/tree/7bcfff86275dd8fee3eb310d3232e0e3ad3d8597)。
- 结论：`claimed-plugin-unverified-activation`；审查层级 `source-inspected`；HEAD `7bcfff86275dd8fee3eb310d3232e0e3ad3d8597`。
- 包与安装：`billion-context-dsh`；榜单 spec 未给出；文档命令 `<code>npm install billion-context-dsh</code>`, `npm install billion-context-dsh`, `npm install`。
- DSH/Cordis activation：—。入口：`src/index.ts`。
- 扩展面：services `commands`, `llm`, `systemPrompt`, `tools`；tools `acp_status`, `autoCommand`, `commands`, `compress`, `ctx.commands`, `decompress`, `search_context`, `tools`；events `agent/pre-step`, `internal/service`；commands `/acp`, `agent/pre-step`, `autoNudge`, `commands`；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（8） `tests/config.test.ts`, `tests/helpers.ts`, `tests/mount-probe.test.ts`, `tests/nudge.test.ts`, `tests/region.test.ts`, `tests/state.test.ts`（另 2 项）；workflows 有（1） `.github/workflows/pages.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found。
- 已读取证据：`.github/workflows/pages.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `docs/README.md`, `src/index.ts`, `tests/config.test.ts`, `tests/helpers.ts`, `tests/mount-probe.test.ts`, `tests/nudge.test.ts`, `tests/region.test.ts`, `tests/state.test.ts`, `tests/tools.test.ts`（另 11 项）。

## dsh-outline

- 榜单来源：[UI & Experience · L213](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L213)；源码：[urzeye/dsh-outline](https://github.com/urzeye/dsh-outline/tree/4678ff557cc1bc55d3042e3d87d06951d8d74c76)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4678ff557cc1bc55d3042e3d87d06951d8d74c76`。
- 包与安装：`dsh-outline`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)`, `以下命令均通过 `dsh plugin`转发给 profile 目录内的 pnpm。安装后需重启`dsh web` 生效（插件的 host 部分在 DSH 启动时加载）。`, `dsh plugin --profile web add dsh-outline`, `dsh plugin --profile web add ./dsh-outline-0.1.2.tgz`, `dsh plugin --profile web add /path/to/dsh-outline   # 或相对路径 ./dsh-outline`（另 3 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（10）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（5） `tests/dom-anchor.spec.ts`, `tests/markdown-heading.spec.ts`, `tests/outline-manager.spec.ts`, `tests/outline-source.spec.ts`, `tests/outline-tree.spec.ts`；workflows 有（2） `.github/workflows/ci.yml`, `.github/workflows/release.yml`；release `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `dsh.plugin.json`, `src/index.ts`, `src/client/index.tsx`, `tests/dom-anchor.spec.ts`, `tests/markdown-heading.spec.ts`, `tests/outline-manager.spec.ts`, `tests/outline-source.spec.ts`（另 16 项）。

## dsh-llm-fallback

- 榜单来源：[Models & Inference · L274](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L274)；源码：[Visol-456/dsh-llm-fallback](https://github.com/Visol-456/dsh-llm-fallback/tree/ea0a2509cc211466d19688541e36fc5baa05c7ea)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `ea0a2509cc211466d19688541e36fc5baa05c7ea`。
- 包与安装：`@visol-456/dsh-llm-fallback`；榜单 spec 未给出；文档命令 `npm i @visol-456/dsh-llm-fallback`, `### A. `dsh plugin add`（推荐）`, `dsh plugin --profile web add @visol-456/dsh-llm-fallback`, `发布不足 24 小时的包会被 pnpm 的 `minimumReleaseAge` 拦截（`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`）；失败的 `pnpm add`还可能改动官方仓库的`pnpm-workspace.yaml`（用 `git restore pnpm-workspace.yaml` 恢复）。当天安装要么等 24 小时，要么走上面的 junction 方式。`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `connection`, `sessions`, `settings`, `webServer`；tools —；events `agent/request`, `agent/request-error`, `connection/reset`, `internal/dispatch`, `session/created`, `tools/change`；commands —；client UI 有（6）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（9） `tests/circuit.spec.ts`, `tests/fallback.spec.ts`, `tests/invariant.spec.ts`, `tests/loader-composition.spec.ts`, `tests/section.client.spec.tsx`, `tests/settings.spec.ts`（另 3 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/circuit.spec.ts`, `tests/fallback.spec.ts`, `tests/invariant.spec.ts`, `tests/loader-composition.spec.ts`, `tests/section.client.spec.tsx`, `tests/settings.spec.ts`, `tests/transport-recovery.spec.ts`, `tests/support/client-runtime.ts`（另 11 项）。

## dsh-suite

- 榜单来源：[Infrastructure & Development · L398](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L398)；源码：[whyihaveyou/dsh-suite](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`dsh-suite`, `@dsh-suite/all`, `create-dsh-plugin`, `@dsh-suite/preset-center`, `@dsh-suite/plugin-manager`, `@dsh-suite/plugin-notify`, `@dsh-suite/plugin-session-export`, `@dsh-suite/plugin-team-board`（另 1 项）；榜单 spec 未给出；文档命令 `npx @deepseek-ai/dsh plugin --profile web add @dsh-suite/plugin-manager`, `\| [dsh-plugin-dev](https://github.com/omdsh-dev/dsh-plugin-dev) \| 10 \| ⚪ unknown \| DSH plugin-dev pitfalls archive (skill + docs) \|`, `\| [dsh-expression](https://github.com/yyh-001/dsh-expression) \| 4 \| ⚪ unknown \| dsh-expression — DSH plugin (tools) \|`, `\| [dsh-prompt-persona](https://github.com/Xilin3/dsh-prompt-persona) \| 4 \| ⚪ unknown \| DSH plugin: edit the system prompt (deployment persona) from the Settings page, with live preview. \|`, `\| [dsh-plugin-graph](https://github.com/erduotong/dsh-plugin-graph) \| 2 \| 🟢 ok \| dsh-plugin-graph — DSH plugin (tools) \|`（另 7 项）。
- DSH/Cordis activation：`packages/all/cordis.patch.yml`, `packages/create-dsh-plugin/templates/events/cordis.patch.yml`, `packages/create-dsh-plugin/templates/tool/cordis.patch.yml`, `packages/create-dsh-plugin/templates/webui/cordis.patch.yml`, `packages/plugins/plugin-manager/cordis.patch.yml`, `packages/plugins/plugin-notify/cordis.patch.yml`, `packages/plugins/plugin-session-export/cordis.patch.yml`, `packages/plugins/plugin-team-board/cordis.patch.yml`, `packages/preset-center/cordis.patch.yml`, `packages/preset-center/presets/copy-polish/agent.cordis.yml`, `packages/preset-center/presets/daily-report/agent.cordis.yml`, `packages/preset-center/presets/xiaohongshu-notes/agent.cordis.yml`（另 9 项）。入口：`packages/plugins/plugin-notify/src/index.ts`, `packages/plugins/plugin-session-export/src/index.ts`, `packages/plugins/plugin-team-board/src/index.ts`, `packages/create-dsh-plugin/templates/events/src/index.ts`, `packages/create-dsh-plugin/templates/tool/src/index.ts`, `packages/create-dsh-plugin/templates/webui/src/index.ts`, `packages/plugins/plugin-manager/lib/index.js`, `packages/plugins/plugin-manager/lib/client.js`。
- 扩展面：services `run_in_background`, `slots`, `tokenMeter`, `tools`；tools `ctx.sessions`, `ctx.tools.register`, `events`, `export_session`, `my-tool`, `task_claim`, `task_create`, `task_delete`（另 4 项）；events `session/event`, `tools/change`, `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`sqlite`, `yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（1） `packages/create-dsh-plugin/test/smoke.test.mjs`；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`, `LICENSE`, `README.en.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `packages/all/package.json`, `packages/create-dsh-plugin/package.json`, `packages/preset-center/package.json`（另 62 项）。

## create-dsh-plugin

- 榜单来源：[Infrastructure & Development · L399](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L399)；源码：[whyihaveyou/dsh-suite/packages/create-dsh-plugin](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327/packages/create-dsh-plugin)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`create-dsh-plugin`, `{{PKG_NAME}}`；榜单 spec 未给出；文档命令 `npm init dsh-plugin [project-dir] [options]      # npm init <x> → npx create-<x>`, `npx create-dsh-plugin [project-dir] [options]`, `npx create-dsh-plugin my-plugin -t tool`, `npx create-dsh-plugin my-events -t events --yes --verify`, `npx create-dsh-plugin my-webui -t webui -n my-webui --tool-name my_note --verify`（另 7 项）。
- DSH/Cordis activation：`packages/create-dsh-plugin/templates/events/cordis.patch.yml`, `packages/create-dsh-plugin/templates/tool/cordis.patch.yml`, `packages/create-dsh-plugin/templates/webui/cordis.patch.yml`, `packages/create-dsh-plugin/templates/events/package.json → ./cordis.patch.yml`, `packages/create-dsh-plugin/templates/tool/package.json → ./cordis.patch.yml`, `packages/create-dsh-plugin/templates/webui/package.json → ./cordis.patch.yml`。入口：`packages/create-dsh-plugin/templates/events/src/index.ts`, `packages/create-dsh-plugin/templates/tool/src/index.ts`, `packages/create-dsh-plugin/templates/webui/src/index.ts`。
- 扩展面：services —；tools `events`, `my-tool`, `tools`, `verify-tool`；events `session/event`, `tools/change`, `tools/pre-execute`；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `packages/create-dsh-plugin/test/smoke.test.mjs`；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`packages/create-dsh-plugin/package.json`, `packages/create-dsh-plugin/templates/events/package.json`, `packages/create-dsh-plugin/templates/tool/package.json`, `packages/create-dsh-plugin/templates/webui/package.json`, `packages/create-dsh-plugin/templates/events/cordis.patch.yml`, `packages/create-dsh-plugin/templates/tool/cordis.patch.yml`, `packages/create-dsh-plugin/templates/webui/cordis.patch.yml`, `packages/create-dsh-plugin/templates/events/src/index.ts`, `packages/create-dsh-plugin/templates/tool/src/index.ts`, `packages/create-dsh-plugin/templates/webui/src/index.ts`, `packages/create-dsh-plugin/test/smoke.test.mjs`, `packages/create-dsh-plugin/src/args.js`, `packages/create-dsh-plugin/src/cli.js`, `packages/create-dsh-plugin/src/generate.js`（另 8 项）。

## plugin-manager

- 榜单来源：[Infrastructure & Development · L400](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L400)；源码：[whyihaveyou/dsh-suite/packages/plugins/plugin-manager](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327/packages/plugins/plugin-manager)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`@dsh-suite/plugin-manager`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `│                   (spawn 官方 `dsh plugin add`；inject webServer + loader)`, `- 浏览器不能跑 `dsh plugin add` → 安装必须走 host 侧服务（spawn 官方 CLI，复用安装机制）。`, `- **F3 一键安装**：点 Install → 确认框（包名/repo/star/license，未知 license 标黄）→ host spawn `dsh plugin add` → 成功绿勾+「需重启生效」/ 失败红叉+日志 / 超时提示。每卡 [📋] 复制 installCmd。`, `npx -y @deepseek-ai/dsh plugin --profile web add @dsh-suite/plugin-manager`（另 2 项）。
- DSH/Cordis activation：`packages/plugins/plugin-manager/cordis.patch.yml`, `packages/plugins/plugin-manager/package.json → ./cordis.patch.yml`。入口：`packages/plugins/plugin-manager/lib/index.js`, `packages/plugins/plugin-manager/lib/client.js`。
- 扩展面：services `slots`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`packages/plugins/plugin-manager/package.json`, `packages/plugins/plugin-manager/cordis.patch.yml`, `packages/plugins/plugin-manager/README.md`, `packages/plugins/plugin-manager/lib/index.js`, `packages/plugins/plugin-manager/lib/client.js`。

## plugin-notify

- 榜单来源：[Notifications & Channels · L334](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L334)；源码：[whyihaveyou/dsh-suite/packages/plugins/plugin-notify](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327/packages/plugins/plugin-notify)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`@dsh-suite/plugin-notify`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `DSH plugin: push turn-completion / error / approval notifications to IM webhooks`, `dsh plugin --profile <name> add @dsh-suite/plugin-notify`, `（本地开发：`dsh plugin --profile <name> add ./packages/plugins/plugin-notify`）`。
- DSH/Cordis activation：`packages/plugins/plugin-notify/cordis.patch.yml`, `packages/plugins/plugin-notify/package.json → ./cordis.patch.yml`。入口：`packages/plugins/plugin-notify/src/index.ts`。
- 扩展面：services —；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`packages/plugins/plugin-notify/package.json`, `packages/plugins/plugin-notify/cordis.patch.yml`, `packages/plugins/plugin-notify/src/index.ts`, `packages/plugins/plugin-notify/README.md`。

## plugin-session-export

- 榜单来源：[Output & Deliverables · L311](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L311)；源码：[whyihaveyou/dsh-suite/packages/plugins/plugin-session-export](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327/packages/plugins/plugin-session-export)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`@dsh-suite/plugin-session-export`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `DSH plugin: export the append-only session log as **human-readable Markdown / HTML**, grouped by`, `dsh plugin --profile <name> add @dsh-suite/plugin-session-export`, `（本地开发：`dsh plugin --profile <name> add ./packages/plugins/plugin-session-export`）`。
- DSH/Cordis activation：`packages/plugins/plugin-session-export/cordis.patch.yml`, `packages/plugins/plugin-session-export/package.json → ./cordis.patch.yml`。入口：`packages/plugins/plugin-session-export/src/index.ts`。
- 扩展面：services `tools`；tools `ctx.sessions`, `export_session`, `tools`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`packages/plugins/plugin-session-export/package.json`, `packages/plugins/plugin-session-export/cordis.patch.yml`, `packages/plugins/plugin-session-export/src/index.ts`, `packages/plugins/plugin-session-export/README.md`, `packages/plugins/plugin-session-export/scripts/render-smoke.mjs`。

## plugin-team-board

- 榜单来源：[Infrastructure & Development · L401](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L401)；源码：[whyihaveyou/dsh-suite/packages/plugins/plugin-team-board](https://github.com/whyihaveyou/dsh-suite/tree/a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327/packages/plugins/plugin-team-board)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a1896bb3f7feb0a4cbe3cd6a402624ee5b71a327`。
- 包与安装：`@dsh-suite/plugin-team-board`；榜单 spec 未给出；文档命令 `[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`, `DSH plugin: a shared, durable task board for multi-agent / subagent collaboration. Shared state is`, `dsh plugin --profile <name> add @dsh-suite/plugin-team-board`, `（本地开发：`dsh plugin --profile <name> add ./packages/plugins/plugin-team-board`）`, `- ✅ 真实装载：`dsh plugin add`→`--dump-config`含`team-board` 行 → headless boot`。
- DSH/Cordis activation：`packages/plugins/plugin-team-board/cordis.patch.yml`, `packages/plugins/plugin-team-board/package.json → ./cordis.patch.yml`。入口：`packages/plugins/plugin-team-board/src/index.ts`。
- 扩展面：services `tools`；tools `ctx.tools.register`, `task_claim`, `task_create`, `task_delete`, `task_list`, `task_update`；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（6） `.github/workflows/ci.yml`, `.github/workflows/compat.yml`, `.github/workflows/daily-preview.yml`, `.github/workflows/pages.yml`, `.github/workflows/refresh.yml`, `.github/workflows/x-digest.yml`；release `.github/workflows/pages.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：no test/spec files were found。
- 已读取证据：`packages/plugins/plugin-team-board/package.json`, `packages/plugins/plugin-team-board/cordis.patch.yml`, `packages/plugins/plugin-team-board/src/index.ts`, `packages/plugins/plugin-team-board/README.md`, `packages/plugins/plugin-team-board/scripts/board-smoke.mjs`, `packages/plugins/plugin-team-board/src/board.ts`。

## dsh-builtin-browser

- 榜单来源：[Browser & Remote · L237](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L237)；源码：[wqty123/dsh-browser](https://github.com/wqty123/dsh-browser/tree/eca8f887bfa2f74d80535c7685cac5643913fc52)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `eca8f887bfa2f74d80535c7685cac5643913fc52`。
- 包与安装：`dsh-builtin-browser`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-builtin-browser  # from npm once published`, `dsh plugin --profile web add <path-to-this-repo>`, `dsh plugin --profile web add dsh-builtin-browser   # 发布到 npm 后`, `dsh plugin --profile web add <本仓库路径>`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/tool-browser/index.ts`。
- 扩展面：services `browser`, `electronViewHost`；tools `browser_close_tab`, `browser_content`, `browser_execute`, `browser_list_tabs`, `browser_open`, `browser_reset`, `browser_screenshot`, `browser_snapshot`（另 1 项）；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/tool-browser/index.ts`, `src/browser-electron/entry.ts`, `src/browser-electron/host-main.ts`, `src/browser-electron/provider.ts`, `src/browser-electron/remote-host.ts`, `src/browser/runtime.ts`, `src/browser/types.ts`, `src/types/electron-shim.d.ts`。

## dsh-review-loop

- 榜单来源：[Git & Engineering · L296](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L296)；源码：[wuxiangru915/dsh-review-loop](https://github.com/wuxiangru915/dsh-review-loop/tree/fc67d8ae8d5989fd35625b7305f5c2634cc6b85b)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `fc67d8ae8d5989fd35625b7305f5c2634cc6b85b`。
- 包与安装：`@dsh-plugin/dsh-review-loop`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:wuxiangru915/dsh-review-loop`, `pnpm install && pnpm build`, `dsh plugin --profile web add /path/to/dsh-review-loop`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`。
- 扩展面：services `agents`, `sessions`, `webServer`；tools —；events —；commands `review`；client UI 有（1）。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 有（1） `tests/review-loop.spec.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `tests/review-loop.spec.ts`, `tsdown.config.ts`, `vitest.config.ts`, `src/checkpoint.ts`, `src/git.ts`, `src/http.ts`, `src/review.ts`, `src/client/review-panel.tsx`。

## dsh-equip-engine

- 榜单来源：[Core · L85](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L85)；源码：[wuykjl/dsh-equip-engine](https://github.com/wuykjl/dsh-equip-engine/tree/95110d4d27d6806377a9c97f7e3be8fe4fec73b6)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `95110d4d27d6806377a9c97f7e3be8fe4fec73b6`。
- 包与安装：`dsh-equip-engine`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:wuykjl/dsh-equip-engine`, `# → dsh plugin add Anionex/agent-vision-toolkit`, `# → dsh plugin add tt-a1i/archify`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/plugin.js`。
- 扩展面：services `commands`；tools —；events —；commands `equip`, `equip-mix`；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（1） `src/equip.test.js`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/plugin.js`, `scripts/clean-orphans.js`, `scripts/enrich-signals.js`, `scripts/extract-awesome.js`, `scripts/fix-ids.js`, `scripts/fix-p0-data.js`, `scripts/gen-manifests.js`, `scripts/gen-relations.js`, `scripts/gen-store-manifests.js`, `scripts/parse-status.js`（另 13 项）。

## dsh-atomgit

- 榜单来源：[Git & Engineering · L282](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L282)；源码：[xiongjiamu/dsh-atomgit](https://github.com/xiongjiamu/dsh-atomgit/tree/2ae91bf975d8f13389e78fcdd26d1654e1613f5a)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2ae91bf975d8f13389e78fcdd26d1654e1613f5a`。
- 包与安装：`dsh-atomgit`；榜单 spec 未给出；文档命令 `npm install -g @hust-open-atom-club/atomgit-cli`, `dsh plugin --profile web add ./dsh-atomgit`, `# or from a remote: dsh plugin --profile web add github:you/dsh-atomgit#<sha>`, `# 或从远端:dsh plugin --profile web add github:you/dsh-atomgit#<sha>`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services `atomgitAuth`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`。

## dsh-grok-geo

- 榜单来源：[Science & Research · L416](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L416)；源码：[xuboboo/dsh-grok-geo](https://github.com/xuboboo/dsh-grok-geo/tree/541aeededc6e6683e0e5cce0481efce1412bfb20)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `541aeededc6e6683e0e5cce0481efce1412bfb20`。
- 包与安装：`dsh-grok-geo`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:xuboboo/dsh-grok-geo"`, `dsh plugin --profile web add C:/path/to/dsh-grok-geo`, ``dsh plugin --profile web add @deepseek-ai/dsh-mcp-client`）。`, `dsh plugin --profile grok-test add .              # 装进临时 profile`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `filesystem-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `assets/skill/README.md`, `lib/index.js`。

## dsh-gui

- 榜单来源：[IDE & Clients · L232](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L232)；源码：[xuboboo/dsh-gui](https://github.com/xuboboo/dsh-gui/tree/390c888727116349e676502dd5cccf018bb7f6c6)。
- 结论：`client-or-launcher`；审查层级 `source-inspected`；HEAD `390c888727116349e676502dd5cccf018bb7f6c6`。
- 包与安装：`@deepseek-ai/dsh-client-ui-settings-token-usage`；榜单 spec 未给出；文档命令 `本客户端基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（官方，MIT）桌面版构建。从源码构建需要 Node.js 环境（仅构建时需要，运行无需）——此场景才需要 `Install Node.js, then run: pnpm install`。`。
- DSH/Cordis activation：—。入口：`client-plugins/ui-settings-token-usage/src/index.ts`, `client-plugins/ui-settings-token-usage/src/client/index.ts`。
- 扩展面：services `connection`, `settings.section`；tools —；events `connection/reset`；commands —；client UI 有（15）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`LICENSE`, `README.md`, `client-plugins/ui-settings-token-usage/package.json`, `patches/README.md`, `client-plugins/ui-settings-token-usage/README.md`, `client-plugins/ui-settings-token-usage/src/index.ts`, `client-plugins/ui-settings-token-usage/src/client/index.ts`, `client-plugins/ui-settings-token-usage/tsdown.config.ts`, `client-plugins/ui-settings-token-usage/src/invariant.ts`, `client-plugins/ui-settings-token-usage/src/client/HomepageSection.tsx`, `client-plugins/ui-settings-token-usage/src/client/UsageSection.tsx`, `client-plugins/ui-settings-token-usage/src/client/locales.ts`, `client-plugins/ui-settings-token-usage/src/client/store.ts`。

## dsh-xiaohongshu-viral-note

- 榜单来源：[Output & Deliverables · L312](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L312)；源码：[xuboboo/dsh-xiaohongshu-viral-note](https://github.com/xuboboo/dsh-xiaohongshu-viral-note/tree/a10ed9ceb6a25653f7ce58c5fecd08a636e06baa)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a10ed9ceb6a25653f7ce58c5fecd08a636e06baa`。
- 包与安装：`dsh-xiaohongshu-viral-note`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:xuboboo/dsh-xiaohongshu-viral-note"`, `dsh plugin --profile web add C:/path/to/dsh-xiaohongshu-viral-note`, ``dsh plugin --profile web add @deepseek-ai/dsh-mcp-client`）。`, `dsh plugin --profile xhs-test add .            # 装进临时 profile`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `migration`。
- 测试与发布：tests 有（59） `assets/skill/tests/conftest.py`, `assets/skill/tests/contract/test_api.py`, `assets/skill/tests/contract/test_async_jobs.py`, `assets/skill/tests/contract/test_complete_skill.py`, `assets/skill/tests/contract/test_enterprise_api.py`, `assets/skill/tests/contract/test_mcp.py`（另 53 项）；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；ships an explicit persistence migration path；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `assets/skill/pyproject.toml`, `cordis.patch.yml`, `assets/skill/migrations/README.md`, `assets/skill/README.md`, `lib/index.js`, `assets/skill/tests/conftest.py`, `assets/skill/tests/contract/test_api.py`, `assets/skill/tests/contract/test_async_jobs.py`, `assets/skill/tests/contract/test_complete_skill.py`, `assets/skill/tests/contract/test_enterprise_api.py`, `assets/skill/tests/contract/test_mcp.py`（另 6 项）。

## dsh-plugin-quote-reply

- 榜单来源：[Input & Editing · L149](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L149)；源码：[yangYzc/dsh-plugin-quote-reply](https://github.com/yangYzc/dsh-plugin-quote-reply/tree/18094498a3f62a6e93da666115e2a4a2f021d483)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `18094498a3f62a6e93da666115e2a4a2f021d483`。
- 包与安装：`dsh-plugin-quote-reply`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-plugin-quote-reply`, `dsh plugin --profile web add "github:<your-name>/dsh-plugin-quote-reply"`, `npm install        # 安装依赖`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services —；tools —；events —；commands —；client UI 有（5）。
- 状态/持久化信号：`yaml-settings`, `json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.tsx`, `tsdown.client.config.ts`, `tsdown.config.ts`, `scripts/wrap-client.mjs`, `src/client/SelectionToolbar.tsx`, `src/client/locales.ts`, `src/client/selection-store.ts`, `src/client/slots.d.ts`。

## DSH-for-VSC

- 榜单来源：[IDE & Clients · L231](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L231)；源码：[yauntyour/DSH-for-VSC](https://github.com/yauntyour/DSH-for-VSC/tree/c608acde14925c0db0aa8adbf179847f8e9ab137)。
- 结论：`topic-noise-or-non-plugin`；审查层级 `source-inspected`；HEAD `c608acde14925c0db0aa8adbf179847f8e9ab137`。
- 包与安装：`dsh-for-vsc`；榜单 spec 未给出；文档命令 `- DSH CLI：`dsh`在 PATH 中，或可通过`npx @deepseek-ai/dsh` 运行（二选一，见[自动检测](#自动检测)）`, `npm install`, `2. 否则回退为 `npx @deepseek-ai/dsh web`。`, `npm install        # 安装依赖（typescript / @types/vscode / vsce）`。
- DSH/Cordis activation：—。入口：—。
- 扩展面：services —；tools —；events —；commands `dsh.open`, `dsh.openExternal`, `dsh.reload`, `dsh.restartServer`, `dsh.startServer`, `dsh.stopServer`；client UI 未发现。
- 状态/持久化信号：`json-file`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release `package.json#scripts.package`, `package.json#scripts.vscode:prepublish`。
- 可借鉴模式：contains an explicit packaging/release path。
- 明显缺口：no recognized dsh.bundle.patch or Cordis activation manifest was found；no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `src/extension.ts`。

## DSH-Multimodal

- 榜单来源：[Models & Inference · L255](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L255)；源码：[yauntyour/DSH-Multimodal](https://github.com/yauntyour/DSH-Multimodal/tree/b0795a47a899c7d148e7299420a000928188780f)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `b0795a47a899c7d148e7299420a000928188780f`。
- 包与安装：`dsh-multimodal`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add <本插件路径或 tgz>`, `dsh plugin --profile headless add <本插件路径或 tgz>`, `npm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.tsx`。
- 扩展面：services `agentDefaultModel`, `agents`, `connection`；tools —；events `llm/stream`；commands —；client UI 有（9）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（10） `tests/chain.spec.ts`, `tests/config.spec.ts`, `tests/describe.spec.ts`, `tests/models.spec.ts`, `tests/process.spec.ts`, `tests/prompt-wrap.spec.ts`（另 4 项）；workflows 未发现 —；release `package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.tsx`, `tests/chain.spec.ts`, `tests/config.spec.ts`, `tests/describe.spec.ts`, `tests/models.spec.ts`, `tests/process.spec.ts`, `tests/prompt-wrap.spec.ts`, `tests/register.spec.ts`, `tests/rpc.spec.ts`（另 18 项）。

## dsh-lark-meeting-notifier

- 榜单来源：[Notifications & Channels · L318](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L318)；源码：[yeruizhi/dsh-lark-meeting-notifier](https://github.com/yeruizhi/dsh-lark-meeting-notifier/tree/9254c621a4c8de43fd771d130791c65a224e7a45)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `9254c621a4c8de43fd771d130791c65a224e7a45`。
- 包与安装：`dsh-lark-meeting-notifier`；榜单 spec 未给出；文档命令 `[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4D6BFE.svg)](https://github.com/topics/dsh-plugin)`, `dsh plugin --profile web add github:yeruizhi/dsh-lark-meeting-notifier`, `然后重启 `dsh web`（或 `npx @deepseek-ai/dsh web`）。页面右侧会出现「🕐 会议」小胶囊。`, `npm install -g @larksuite/cli`, `\| 面板显示「lark-cli 未安装」 \| 缺少 `@larksuite/cli`\|`npm install -g @larksuite/cli` \|`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`, `client.js`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `index.js`, `client.js`。

## dsh-workloads

- 榜单来源：[Infrastructure & Development · L371](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L371)；源码：[yewenyell-lang/dsh-workloads](https://github.com/yewenyell-lang/dsh-workloads/tree/bb9270ac1535bc20802951d1de607dc1da659f32)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `bb9270ac1535bc20802951d1de607dc1da659f32`。
- 包与安装：`dsh-workloads-local-ui1`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:yewenyell-lang/dsh-workloads#v0.3.0`, `The package declares `dsh.bundle.patch`, so `dsh plugin`automatically adds it to`dsh.profile.bundles`. Its [`cordis.patch.yml`](cordis.patch.yml) mounts the Host Registry, local-process Provider, Web API, and Runtime Center with legacy migration disabled by default. Restart the existing DSH Web process and refresh the browser after installation.`, `dsh plugin --profile web remove dsh-workloads-local-ui1`, `包声明了 `dsh.bundle.patch`，`dsh plugin`会自动把它加入`dsh.profile.bundles`。安装后重启已有 DSH Web 进程并刷新浏览器。`。
- DSH/Cordis activation：`cordis.patch.yml`, `dsh.plugin.json`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（5） `test/bundle-smoke.mjs`, `test/client-register.mjs`, `test/registry-smoke.mjs`, `test/smoke-server.mjs`, `test/tool-adapter-smoke.mjs`；workflows 有（1） `.github/workflows/ci.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps implementation tests in the source repository；automates repository checks in GitHub Actions。
- 明显缺口：no conventional core source entry was found in the inspected target；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/ci.yml`, `LICENSE`, `README.md`, `README.zh-CN.md`, `package.json`, `cordis.patch.yml`, `dsh.plugin.json`, `test/bundle-smoke.mjs`, `test/client-register.mjs`, `test/registry-smoke.mjs`, `test/smoke-server.mjs`, `test/tool-adapter-smoke.mjs`。

## dsh-deepseek-quota

- 榜单来源：[UI & Experience · L170](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L170)；源码：[yingjunnan/dsh-deepseek-quota](https://github.com/yingjunnan/dsh-deepseek-quota/tree/2ab23501ab972a450663b87b7d343a3e19f8e707)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `2ab23501ab972a450663b87b7d343a3e19f8e707`。
- 包与安装：`dsh-deepseek-quota`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-deepseek-quota`, `The package declares `dsh.bundle`, so `dsh plugin` automatically adds it to the profile's bundle layers (no manual patch editing). Then:`, `dsh plugin --profile web add .`, `该包声明了 `dsh.bundle`，`dsh plugin` 会自动把它加进 profile 的 bundle 层（无需手动改配置）。之后：`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `dshHomePath`, `function`, `sessionPersistence`；tools —；events `session/event`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；uses lifecycle/event integration instead of core patches。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`, `lib/pricing.js`。

## ysr666/dsh-vision-router

- 榜单来源：[Models & Inference · L253](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L253)；源码：[ysr666/dsh-vision-router](https://github.com/ysr666/dsh-vision-router/tree/a1dcdeabaaacd7a7cb095342837f070a968d3739)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `a1dcdeabaaacd7a7cb095342837f070a968d3739`。
- 包与安装：`dsh-vision-router`；榜单 spec 未给出；文档命令 `<a href="https://awesome-dsh-plugin.com"><img src="https://awesome-dsh-plugin.com/badge.svg" alt="awesome · DSH plugin" /></a>`, `- **One command install.** The package ships its own composition patch (`dsh.bundle.patch`): `dsh plugin add` wires the row, the admission wrapper and the attachment limits automatically — zero manual file edits. Taking over the official DeepSeek route is an optional setting (stealth mode, off by default).`, `Recommended for normal npm/npx installs (the same launch style used by the DSH README):`, `npx @deepseek-ai/dsh plugin --profile web add dsh-vision-router`, `npx @deepseek-ai/dsh web`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`index.js`。
- 扩展面：services `attachments`, `credentials`, `fs`, `settings`, `skills`, `webServer`；tools `vision_activate`；events `agent/pre-step`, `agent/request`, `llm/adapters-updated`；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（2） `tests/client.test.js`, `tests/core.test.js`；workflows 有（4） `.github/workflows/ci.yml`, `.github/workflows/npm-publish.yml`, `.github/workflows/release.yml`, `.github/workflows/star-history.yml`；release `.github/workflows/npm-publish.yml`, `.github/workflows/release.yml`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；registers model-facing tools through a named extension surface；uses lifecycle/event integration instead of core patches；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/npm-publish.yml`, `.github/workflows/release.yml`, `.github/workflows/star-history.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `presets/README.md`, `index.js`, `tests/client.test.js`, `tests/core.test.js`。

## dsh-plugin-cost

- 榜单来源：[UI & Experience · L182](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L182)；源码：[yweilai77-dev/dsh-plugin-cost](https://github.com/yweilai77-dev/dsh-plugin-cost/tree/c66cc922577109a77120f3965cae469e8b4fd338)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `c66cc922577109a77120f3965cae469e8b4fd338`。
- 包与安装：`dsh-plugin-cost`；榜单 spec 未给出；文档命令 `- **安装方式已验证**：本地目录 / tarball（`pnpm pack`）/ `github:yweilai77-dev/dsh-plugin-cost`三种均通过`dsh plugin add` 实测（全新 profile → 启动 → 插件生效）`, `dsh plugin --profile web add github:yweilai77-dev/dsh-plugin-cost`, `\| 安装 \| `dsh plugin --profile web add github:yweilai77-dev/dsh-plugin-cost` \|`, `\| 升级 \| 重新执行上面的 `add`（或改用固定 commit：`github:yweilai77-dev/dsh-plugin-cost#<sha>`） \|`, `\| 彻底卸载 \| `dsh plugin --profile web remove dsh-plugin-cost`+ 重启`dsh web` \|`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`lib/index.js`, `lib/client.js`。
- 扩展面：services `remote.cost`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point。
- 明显缺口：no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`README.md`, `package.json`, `cordis.patch.yml`, `lib/index.js`, `lib/client.js`。

## dsh-plugin-workshop

- 榜单来源：[UI & Experience · L188](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L188)；源码：[yyyyukari/dsh-plugin-workshop](https://github.com/yyyyukari/dsh-plugin-workshop/tree/5169bed1e9dcf471f0ce61ef2d190aaa0be93375)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `5169bed1e9dcf471f0ce61ef2d190aaa0be93375`。
- 包与安装：`@dsh-external/dsh-plugin-workshop`；榜单 spec 未给出；文档命令 `# 🧩 DSH Plugin Workshop (dsh-plugin-workshop)`, `# package.json, so `dsh plugin add` auto-adds it to the profile's`, `dsh plugin --profile web add "github:yyyyukari/dsh-plugin-workshop"`, `\| Find DSH plugins \| Default view is the plugin-topic list (repos tagged `topic:dsh-plugin`) \|`, `- [x] v1.2 Smart install / uninstall: bundle-type via official `dsh plugin add`+ activation row, preset-type via`.agent-presets`, uninstall reverses the path (tested end-to-end)`（另 5 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`remote/worker/src/index.js`, `src/client/index.js`。
- 扩展面：services `slots`；tools —；events —；commands —；client UI 有（1）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（1） `remote/test/harness.mjs`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.en.md`, `README.md`, `package.json`, `cordis.patch.yml`, `remote/README.md`, `remote/worker/src/index.js`, `src/client/index.js`, `remote/test/harness.mjs`, `scripts/build.mjs`。

## @zhaoolee/dsh-notes

- 榜单来源：[UI & Experience · L206](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L206)；源码：[zhaoolee/notes](https://github.com/zhaoolee/notes/tree/90ca5f7a8a73f0486560d85cb37df18a32d61382)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `90ca5f7a8a73f0486560d85cb37df18a32d61382`。
- 包与安装：`notes`, `@zhaoolee/dsh-notes`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add @zhaoolee/dsh-notes`, `dsh plugin --profile web update @zhaoolee/dsh-notes --latest`, `npm install`, `npx -p @deepseek-ai/dsh dsh plugin --profile web add /绝对路径/dsh-plugin`。
- DSH/Cordis activation：`dsh-plugin/cordis.patch.yml`, `dsh-plugin/package.json → ./cordis.patch.yml`。入口：`dsh-plugin/src/index.ts`, `server/index.ts`。
- 扩展面：services —；tools `notes_export_conversation`；events —；commands —；client UI 有（19）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（33） `backend/tests/ai-feedback.test.ts`, `backend/tests/api-feedback.test.ts`, `backend/tests/auth-feedback.test.ts`, `backend/tests/dev-entrypoint-feedback.test.ts`, `backend/tests/notes-export-api-skill-feedback.test.ts`, `backend/tests/quota-feedback.test.ts`（另 27 项）；workflows 有（2） `.github/workflows/deploy-pages.yml`, `.github/workflows/docker-publish.yml`；release `.github/workflows/deploy-pages.yml`, `.github/workflows/docker-publish.yml`, `dsh-plugin/package.json#scripts.prepack`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/deploy-pages.yml`, `.github/workflows/docker-publish.yml`, `README.md`, `package.json`, `dsh-plugin/package.json`, `dsh-plugin/cordis.patch.yml`, `TOOLS/README.md`, `dsh-plugin/README.md`, `DOCS/references/smartisan-notes-android-4.2.1/README.md`, `dsh-plugin/src/index.ts`, `server/index.ts`, `backend/tests/ai-feedback.test.ts`, `backend/tests/api-feedback.test.ts`, `backend/tests/auth-feedback.test.ts`（另 23 项）。

## dsh-context-doctor

- 榜单来源：[Context & Search · L100](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L100)；源码：[Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor/tree/4a91502c106f7fed86981421c740566abf309977)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `4a91502c106f7fed86981421c740566abf309977`。
- 包与安装：`dsh-context-doctor`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add "github:Zhenyu98/dsh-context-doctor#main"`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/client/index.ts`。
- 扩展面：services `webServer`；tools `context-doctor`, `context_audit`；events —；commands —；client UI 有（12）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（5） `tests/analyze.test.ts`, `tests/plugin.test.ts`, `tests/routes.test.ts`, `tests/scan.test.ts`, `tests/tokens.test.ts`；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；keeps implementation tests in the source repository。
- 明显缺口：no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `package.json`, `cordis.patch.yml`, `src/index.ts`, `src/client/index.ts`, `tests/analyze.test.ts`, `tests/plugin.test.ts`, `tests/routes.test.ts`, `tests/scan.test.ts`, `tests/tokens.test.ts`, `tsdown.client.ts`, `tsdown.config.ts`, `scripts/setup-dsh-deps.mjs`（另 8 项）。

## dsh-catppuccin

- 榜单来源：[UI & Experience · L165](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L165)；源码：[zhijun-dai/Catppuccin-dsh-theme](https://github.com/zhijun-dai/Catppuccin-dsh-theme/tree/1dadda020082b02d565c0c5561877bd04f2836e5)。
- 结论：`theme-plugin`；审查层级 `source-inspected`；HEAD `1dadda020082b02d565c0c5561877bd04f2836e5`。
- 包与安装：`dsh-catppuccin`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:zhijun-dai/Catppuccin-dsh-theme`, `dsh plugin --profile web add -w /path/to/Catppuccin-dsh-theme`, `dsh plugin --profile web add dsh-catppuccin`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `scripts/gen-themes.mjs`。

## solarized-dsh-theme

- 榜单来源：[UI & Experience · L166](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L166)；源码：[zhijun-dai/Solarized-dsh-theme](https://github.com/zhijun-dai/Solarized-dsh-theme/tree/a1afee78635cc79f92103b349554bbbd13f329cb)。
- 结论：`theme-plugin`；审查层级 `source-inspected`；HEAD `a1afee78635cc79f92103b349554bbbd13f329cb`。
- 包与安装：`@yuquexianzhou/solarized-dsh-theme`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add github:zhijun-dai/Solarized-dsh-theme`, `dsh plugin --profile web add -w /path/to/Solarized-dsh-theme`, `dsh plugin --profile web add @yuquexianzhou/solarized-dsh-theme`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：—。
- 扩展面：services —；tools —；events `theme/change`；commands —；client UI 有（1）。
- 状态/持久化信号：`json-file`, `browser-local-storage`。
- 测试与发布：tests 未发现 —；workflows 未发现 —；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；uses lifecycle/event integration instead of core patches。
- 明显缺口：no conventional core source entry was found in the inspected target；no test/spec files were found；no GitHub Actions workflow was found；no explicit release workflow or publish script was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `scripts/gen-client.mjs`。

## easyeda-agent

- 榜单来源：[Infrastructure & Development · L393](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L393)；源码：[zhoushoujianwork/easyeda-agent](https://github.com/zhoushoujianwork/easyeda-agent/tree/bc381b6faf216fb61d8b3ccec46ce13e445c3f94)。
- 结论：`skill`；审查层级 `source-inspected`；HEAD `bc381b6faf216fb61d8b3ccec46ce13e445c3f94`。
- 包与安装：`easyeda-agent-connector`, `easyeda-agent-mcp`；榜单 spec 未给出；文档命令 —。
- DSH/Cordis activation：—。入口：`extension/src/index.ts`, `mcp/src/server.mjs`, `extension/src/beautify/index.ts`。
- 扩展面：services —；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`json-file`, `browser-local-storage`, `memory-only`。
- 测试与发布：tests 有（23） `extension/src/actions.test.ts`, `extension/src/transport-identity.test.ts`, `extension/src/util.test.ts`, `internal/spec/spec.go`, `internal/spec/spec_test.go`, `mcp/test/core.test.mjs`（另 17 项）；workflows 未发现 —；release `extension/package.json#scripts.build`, `extension/package.json#scripts.package`, `extension/package.json#scripts.release`。
- 可借鉴模式：keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`NOTICE`, `README.en.md`, `README.md`, `extension/package.json`, `mcp/package.json`, `chat/README.md`, `extension/README.md`, `extension/src/index.ts`, `mcp/src/server.mjs`, `extension/src/beautify/index.ts`, `mcp/test/core.test.mjs`, `mcp/test/integration.test.mjs`, `extension/ws-file-server.mjs`, `extension/config/esbuild.common.ts`（另 25 项）。

## dsh-llm-oauth

- 榜单来源：[Models & Inference · L272](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L272)；源码：[ziyou979/dsh-llm-oauth](https://github.com/ziyou979/dsh-llm-oauth/tree/362312e5d01cccb5fc74fda130875d500dbaf78c)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `362312e5d01cccb5fc74fda130875d500dbaf78c`。
- 包与安装：`dsh-llm-oauth`；榜单 spec 未给出；文档命令 `Standalone **OAuth / subscription-plan** LLM plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Install it into your own profile with `dsh plugin add` — it does **not** patch the Harness repo.`, `dsh plugin --profile web add github:ziyou979/dsh-llm-oauth`, `dsh plugin --profile web add ./dsh-llm-oauth`, `pnpm install`, `DeepSeek Harness 的**独立 OAuth / 订阅套餐** LLM 插件。用 `dsh plugin add` 装进自己的 profile，即可登录并使用订阅模型。这是独立仓库，**不改** DeepSeek Harness 本体。`（另 1 项）。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/index.ts`, `src/service.ts`, `src/client/index.ts`。
- 扩展面：services `commands`, `settings`, `webServer`；tools —；events —；commands —；client UI 有（5）。
- 状态/持久化信号：`yaml-settings`, `json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 有（5） `tests/catalog.spec.ts`, `tests/command.spec.ts`, `tests/exports.spec.ts`, `tests/service.spec.ts`, `tests/store.spec.ts`；workflows 未发现 —；release `package.json#scripts.prepublishOnly`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；keeps implementation tests in the source repository；contains an explicit packaging/release path。
- 明显缺口：no GitHub Actions workflow was found。
- 已读取证据：`LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `src/index.ts`, `src/service.ts`, `src/client/index.ts`, `tests/catalog.spec.ts`, `tests/command.spec.ts`, `tests/exports.spec.ts`, `tests/service.spec.ts`, `tests/store.spec.ts`（另 20 项）。

## dsh-recommend

- 榜单来源：[Infrastructure & Development · L386](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L386)；源码：[zp-home/dsh-recommend](https://github.com/zp-home/dsh-recommend/tree/c720299617d6967e0100b4cd717faa6bf25b9fd1)。
- 结论：`plugin-collection`；审查层级 `source-inspected`；HEAD `c720299617d6967e0100b4cd717faa6bf25b9fd1`。
- 包与安装：`dsh-recommend`；榜单 spec 未给出；文档命令 `dsh plugin --profile web add dsh-recommend`, `dsh plugin --profile web add github:zp-home/dsh-recommend`, `dsh plugin --profile web add D:\路径\dsh-recommend`, `npm install        # 开发依赖（react/typescript/tsdown）`, `# 本地预览（任意静态服务器，例如 npx serve 或 python -m http.server）`（另 1 项）。
- DSH/Cordis activation：`.github/ISSUE_TEMPLATE/submit-plugin.yml`, `cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/client/index.ts`, `src/host/index.ts`。
- 扩展面：services —；tools `dsh-recommend`, `rank_plugins`, `recommend_plugins`, `search_plugins`, `sync_registry`；events —；commands —；client UI 有（3）。
- 状态/持久化信号：`json-file`, `filesystem-storage`, `memory-only`。
- 测试与发布：tests 未发现 —；workflows 有（2） `.github/workflows/sync.yml`, `.github/workflows/validate.yml`；release —。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；separates server integration from client UI code；registers model-facing tools through a named extension surface；automates repository checks in GitHub Actions。
- 明显缺口：no test/spec files were found；no explicit release workflow or publish script was found。
- 已读取证据：`.github/workflows/sync.yml`, `.github/workflows/validate.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `cordis.patch.yml`, `.github/ISSUE_TEMPLATE/submit-plugin.yml`, `scripts/README.md`, `site/README.md`, `src/client/index.ts`, `src/host/index.ts`, `tsdown.config.ts`, `scripts/fetch.mjs`（另 7 项）。

## dsh-computer-use

- 榜单来源：[Browser & Remote · L246](https://github.com/0xsline/awesome-deepseek-harness/blob/fb63172804b17befd383d658ab3b828abfbb95e5/README.md#L246)；源码：[ZRui-C/dsh-computer-use](https://github.com/ZRui-C/dsh-computer-use/tree/0b0a0844018b56a6a8e95aefea6529004b8341c4)。
- 结论：`dsh-plugin`；审查层级 `source-inspected`；HEAD `0b0a0844018b56a6a8e95aefea6529004b8341c4`。
- 包与安装：`dsh-computer-use`；榜单 spec 未给出；文档命令 `With either method, authorize **Accessibility** and **Screen Recording**, select **Install** under **DSH Plugin**, then restart the running DSH Host.`, `dsh plugin --profile web add --save-exact file:/path/to/DSH\ Computer\ Use.app/Contents/Resources/Plugin`, `pnpm install`。
- DSH/Cordis activation：`cordis.patch.yml`, `package.json → ./cordis.patch.yml`。入口：`src/service.ts`, `src/browser/index.ts`, `src/native/index.ts`。
- 扩展面：services `computerUse`；tools —；events —；commands —；client UI 未发现。
- 状态/持久化信号：`yaml-settings`, `json-file`, `memory-only`。
- 测试与发布：tests 有（24） `native/macos-helper/Tests/DSHComputerUseCoreTests/CoordinateConversionTests.swift`, `native/macos-helper/Tests/DSHComputerUseCoreTests/DSHProfileManifestInspectorTests.swift`, `native/macos-helper/Tests/DSHComputerUseCoreTests/KeyChordParsingTests.swift`, `native/macos-helper/Tests/DSHComputerUseCoreTests/NodeMergerTests.swift`, `native/macos-helper/Tests/DSHComputerUseCoreTests/OCRConversionTests.swift`, `native/macos-helper/Tests/DSHComputerUseCoreTests/PermissionGatedTests.swift`（另 18 项）；workflows 有（3） `.github/workflows/ci.yml`, `.github/workflows/publish-site.yml`, `.github/workflows/release.yml`；release `.github/workflows/publish-site.yml`, `.github/workflows/release.yml`, `package.json#scripts.package:dmg`, `package.json#scripts.prepublishOnly`, `package.json#scripts.release:macos`, `package.json#scripts.test:native`。
- 可借鉴模式：declares a machine-visible DSH/Cordis activation layer；keeps an identifiable server/plugin entry point；keeps implementation tests in the source repository；automates repository checks in GitHub Actions；contains an explicit packaging/release path。
- 明显缺口：本次静态审查未发现结构性缺口；这不等于已验证运行时质量。
- 已读取证据：`.github/workflows/ci.yml`, `.github/workflows/publish-site.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `README.zh.md`, `package.json`, `pnpm-workspace.yaml`, `cordis.patch.yml`, `native/macos-helper/README.md`, `src/service.ts`, `src/browser/index.ts`, `src/native/index.ts`, `tests/actions.test.ts`（另 24 项）。
