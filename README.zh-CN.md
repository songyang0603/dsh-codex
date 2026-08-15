# dsh-codex

本项目把 Codex 拆成一个个可独立安装的 DeepSeek Harness（DSH）组件，再由这些组件组装出 Codex 等价的 coding agent。

它不会调用原生 `codex` 二进制，也不会把 Codex 当成一次性 subagent。运行时由 DSH 自己承载；每个组件都对齐固定的 Codex 上游快照：
`086396f7f60347b74c82784d5dfaf4fb2d3bda12`。

## 原则：做成一个，精确一个

组件可以把边界划清楚，但不能在边界内部降低标准。只有上游实现、独立 oracle、DSH 真实 Loader、失败语义和适用平台证据都闭合后，组件才能标记为 `parity_verified`。不会用“基本可用”“大致兼容”代替完成。

目前的组件：

| 包                                   | 职责                                                                                      | 状态                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `@songyang0603/dsh-codex-execpolicy` | policy/config 装载、命令分类、approval requirement 推导、canonical migration 与规则持久化 | `0.1.0`；macOS arm64 源码组件 `parity_verified` |
| `@songyang0603/dsh-codex-approval`   | 无损 rich approval 协议、pending correlation 与 live-session cache                        | `0.1.0`；macOS arm64 源码组件 `parity_verified` |

`execpolicy` 不再公开一个近似的通用 DSH `bash` enforcement。原因是 stock DSH Bash 无法精确消费 Codex 的 `bypassSandbox`、managed network、rich approval 和 retry 语义，还可能产生第二次审批。后续由独立的 `approval`、`shell`、`sandbox`、`network` 组件精确串接；这属于组件拆分，不是降低最终目标。

完整拆分见 [docs/components.md](docs/components.md)，组件目录与状态所有权约定见
[docs/component-package-contract.md](docs/component-package-contract.md)，完成标准见
[docs/parity-standard.md](docs/parity-standard.md)。

## DSH 生态与安装契约

这是组件 monorepo，不是一个不透明的单体插件。每个可独立安装的包都必须拥有自己的 `dsh.bundle.patch`、唯一 profile row、编译入口、包内说明和精确 DSH peer；测试与 conformance 源码保留在 GitHub 供贡献者复现，但不会进入面向用户的 npm/tarball 归档。

仓库根目录目前不伪装成“安装一次就得到全部 Codex”的 bundle。在版本化 canonical composition profile 完成之前，不应把 `github:songyang0603/dsh-codex` 当成整套组件的安装命令。从源码使用时显式安装对应 package；未来 registry 发布按组件分别发布 npm 包，含 native 的组件提供预编译平台产物。

这些规则来自对两个公开 awesome 列表及 `dsh-plugin` topic catalog 中每个可访问目标的固定 SHA 源码研究，并结合官方 rc.6 行为。逐插件覆盖、实现记录、社区安装器之间的冲突以及本项目实际采用的规则见 [docs/ecosystem-compatibility.md](docs/ecosystem-compatibility.md)。

## approval 当前证据

approval `0.1.0` 的 macOS arm64 源码组件已经达到 `parity_verified`：独立上游/固定源码比较 `43/43`，DSH 自有 adapter contract `10/10`。它强制让原始 app-server JSON 先进入直接依赖固定 Codex crate 的 Rust serde，因此能无损保留 `i64::MAX` 与 64 位 `usize::MAX`，同时拒绝相邻 overflow 值。49 个包测试覆盖跨 thread pending 隔离、恶意 backend fail-closed、多 variant decision 拒绝和超过旧 8 MiB 上限的合法请求；全新 DSH rc.6 profile 还从归档核对并启动 package-local native，验证同 owner 请求被替换后旧 token 不能误批新请求，再完成卸载。

该边界只包含 rich command-approval wire、pending correlation/cancellation、通用 live-session approval cache，以及 execpolicy amendment 的持久化先于本次放行。rich UI、canonical shell/sandbox/network consumer、完整 app-server turn transport，以及未实跑的 Linux/Windows 都不在这项完成声明内。

## execpolicy 当前证据

`0.1.0` 的 macOS arm64 源码组件已经达到 `parity_verified`，并通过四组独立、由固定 Codex 源码编译出的差分 oracle：

- runtime policy requirement：`68/68`；
- materialized config stack：`6/6`；
- 真实 host config discovery：`11/11`；
- startup migration 与规则持久化：`16/16`。

Rust engine 直接依赖固定 revision 的 Codex 公共 crates；必须适配的 `codex-core` 私有行为带有显著修改声明，并与同一 commit 的临时 instrumented build 对照。候选实现不会充当自己的 oracle。

组件还通过了 18 个 TypeScript/native/真实 Loader 测试。独立 smoke test 会先把组件打成归档，再把归档和精确版本的 Cordis peer 安装到全新的 DSH `0.1.0-rc.6` profile；它会核对归档中的 native 与 SHA-256，随后真实启动并卸载 bundle，且无法退回仓库内的编译产物。

这些是有明确语料和平台边界的本地证据，不代表完整 coding agent 已经完成。Linux、macOS、Windows 的 CI 配置只有真正跑过以后才算对应平台证据。命令、哈希、曾经失败的尝试和未覆盖范围都记录在 `conformance/*/STATUS.md`。

## 从源码使用

需要 Node.js 22.19+、pnpm 10.19 和 Rust 1.95.0。

```sh
pnpm install
pnpm native:stage
pnpm --filter @songyang0603/dsh-codex-execpolicy build
pnpm --filter @songyang0603/dsh-codex-approval build
```

`native:stage` 会编译当前平台 sidecar，核对 protocol 与全部上游身份，再把二进制和 SHA-256 暂存到组件自己的 native 目录。生成的二进制不会进入 Git。

安装了 DSH CLI 后，可以把本地组件作为 bundle 加进 profile：

```sh
dsh plugin --profile codex-dev add ./packages/execpolicy
dsh plugin --profile codex-approval-dev add ./packages/approval
dsh --profile codex-dev --dump-config
```

精确版本的 Cordis peer 会通过 DSH profile 自身的依赖回退解析，保证插件和 DSH 使用同一个 Context 实例。这个 bundle 会挂载 `ctx.codexExecPolicy`，并按 Codex 的本地规则发现、启动迁移和默认规则路径打开 policy。它本身只提供精确语义服务；等 `approval`、`shell`、`sandbox`、`network` 等消费者完成后，组合起来才是完整 Codex。

首个版本只发布源码；目前不宣称已经发布 npm 包或 GitHub native binary。

API 与配置示例见 [packages/execpolicy/README.md](packages/execpolicy/README.md) 和 [packages/approval/README.md](packages/approval/README.md)。

## 文件组织

```text
crates/                 原生语义 engine
packages/<component>/   可独立安装的 DSH 组件
conformance/<boundary>/ 独立上游 oracle 与小型固定 corpus
docs/                   架构、组件账本、证据边界
scripts/                上游 pin 校验与 native 暂存
upstreams.lock.json     Git/npm 身份锁定
```

临时 JSONL、Cargo target、编译产物和本机二进制都不会提交。小型 conformance corpus 与 oracle instrumentation 属于可复现源码，会保留给开源贡献者。

本项目是独立社区项目，与 OpenAI 或 DeepSeek 不存在隶属、背书或赞助关系。
