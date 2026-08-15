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
| `@songyang0603/dsh-codex-approval`   | rich approval 协议、pending correlation 与 live-session cache                             | 规划中，不进入首个发布                          |

`execpolicy` 不再公开一个近似的通用 DSH `bash` enforcement。原因是 stock DSH Bash 无法精确消费 Codex 的 `bypassSandbox`、managed network、rich approval 和 retry 语义，还可能产生第二次审批。后续由独立的 `approval`、`shell`、`sandbox`、`network` 组件精确串接；这属于组件拆分，不是降低最终目标。

完整拆分见 [docs/components.md](docs/components.md)，完成标准见 [docs/parity-standard.md](docs/parity-standard.md)。

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
```

`native:stage` 会编译当前平台 sidecar，核对 protocol 与全部上游身份，再把二进制和 SHA-256 暂存到组件自己的 native 目录。生成的二进制不会进入 Git。

安装了 DSH CLI 后，可以把本地组件作为 bundle 加进 profile：

```sh
dsh plugin --profile codex-dev add @deepseek-ai/cordis@4.0.1 ./packages/execpolicy
dsh --profile codex-dev --dump-config
```

精确版本的 Cordis peer 保证插件和 DSH 使用同一个 Context 实例。这个 bundle 会挂载 `ctx.codexExecPolicy`，并按 Codex 的本地规则发现、启动迁移和默认规则路径打开 policy。它本身只提供精确语义服务；等 `approval`、`shell`、`sandbox`、`network` 等消费者完成后，组合起来才是完整 Codex。

首个版本只发布源码；目前不宣称已经发布 npm 包或 GitHub native binary。

API 与配置示例见 [packages/execpolicy/README.md](packages/execpolicy/README.md)。

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
