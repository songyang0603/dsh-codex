# dsh-codex

[English](README.md) | **简体中文**

> 把 OpenAI Codex 重建为精确、可独立安装的 DeepSeek Harness 组件。

`dsh-codex` 将 Codex 拆成职责清晰的 DSH 插件，再把这些插件组合成 coding agent。运行时由 DSH 自己承载：组件不会调用 `codex` 二进制，也不会把 Codex 当成 subagent 委托任务。

每个已完成组件都复现 OpenAI Codex 固定提交 [`086396f`](https://github.com/openai/codex/tree/086396f7f60347b74c82784d5dfaf4fb2d3bda12) 中一个定义明确的边界。原则很简单：组件可以小，但声明边界内的行为必须精确。

仓库仍在持续开发。目前有三个基础组件通过验证；只安装它们还**不能**得到完整 Codex agent。

## 为什么做 dsh-codex？

DeepSeek Harness 以可组合插件为核心。`dsh-codex` 利用这种架构，把 Codex 子系统变成拥有明确状态、生命周期、安装方式和 conformance 边界的 DSH 服务。

这样可以：

- 一次安装、验证一个 Codex 能力；
- 在不同 DSH coding-agent profile 中复用同一个组件；
- 替换或组合组件，而不把行为藏进单体 wrapper；
- 把每个已完成边界与固定上游实现逐项比较；
- 最终构建 DSH 原生 coding agent，而不是原生 Codex 二进制的桥接器。

## 已完成组件

| 组件                                                                        | 提供的能力                                                                      | 状态                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| [`@songyang0603/dsh-codex-execpolicy`](packages/execpolicy)                 | Codex policy/config 发现、命令分类、approval requirement 推导、迁移与规则持久化 | `0.1.0` · macOS arm64 源码 `parity_verified` |
| [`@songyang0603/dsh-codex-approval`](packages/approval)                     | 无损 rich approval 协议、pending 请求关联、取消和 live-session approval cache   | `0.1.0` · macOS arm64 源码 `parity_verified` |
| [`@songyang0603/dsh-codex-apply-patch-engine`](packages/apply-patch-engine) | apply-patch 解析、调用识别、校验、本地变更与有序 committed delta                | `0.1.0` · macOS arm64 源码 `parity_verified` |

Codex 的完整拆分见[组件地图](docs/components.md)，`parity_verified` 的完成标准见[精确性标准](docs/parity-standard.md)。

## 快速开始

需要 Node.js 22.19+、pnpm 10.19、Rust 1.95.0 和 DeepSeek Harness `0.1.0-rc.6`。

```bash
git clone https://github.com/songyang0603/dsh-codex.git
cd dsh-codex
pnpm install
pnpm native:stage
pnpm build
```

把三个已完成组件安装到同一个本地 DSH profile：

```bash
dsh plugin --profile codex-dev add ./packages/execpolicy
dsh plugin --profile codex-dev add ./packages/approval
dsh plugin --profile codex-dev add ./packages/apply-patch-engine
dsh --profile codex-dev --dump-config
```

这些 bundle 会挂载三个 Cordis 服务：

```text
ctx.codexExecPolicy
ctx.codexApproval
ctx.codexApplyPatch
```

`native:stage` 会编译当前平台的 Rust sidecar，核对协议和固定上游源码身份，再写入包内二进制与 SHA-256 文件。生成的二进制不会提交到 Git。

目前组件只从源码使用；尚未宣称发布 npm 包或 GitHub native binary。

## 工作方式

```text
固定 Codex 源码
      │
      ├── 原生语义引擎（Rust）
      │       └── 精确上游类型与行为
      │
      ├── DSH 组件包（TypeScript + Cordis）
      │       └── 生命周期、IPC、校验与服务所有权
      │
      ├── canonical composition profile（开发中）
      │       └── shell、sandbox、network、provider、session 与 UI
      │
      └── 独立 conformance 套件
              └── 固定上游 oracle ↔ 生产组件
```

当 TypeScript 重写容易引入语义漂移时，组件使用 native sidecar。DSH 包负责进程生命周期并暴露类型化 Cordis 服务；approval、sandbox、network 和执行顺序由独立消费者组件拥有，避免双重提示或隐藏 bypass。

每个可安装包都有自己的 `dsh.bundle.patch`、profile row、编译入口、说明、许可声明和精确 peer。仓库根目录是组件 workspace，不是一个可安装的全家桶 bundle。

## 当前精确性证据

| 边界                 | 独立比较                                                                                   | 包与运行时检查                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Execpolicy           | runtime `68/68`；config stack `6/6`；host discovery `11/11`；migration/persistence `16/16` | 18 个 TypeScript/native/真实 Loader 测试，以及全新 DSH rc.6 归档 smoke test        |
| Approval             | 上游/固定源码 `43/43`；DSH adapter contract `10/10`                                        | 49 个包测试，以及全新 DSH rc.6 add/activate/remove profile 测试                    |
| Apply-patch 语义引擎 | 固定上游 96 个测试全部通过；差分 oracle `23/23`                                            | 10 个 native 测试、6 个 TypeScript/native/真实 Loader 测试和全新归档 mutation 测试 |

Oracle 由固定上游源码编译，候选输出不会充当自己的 oracle。精确命令、身份、哈希、失败记录和排除范围位于 [`conformance/*/STATUS.md`](conformance) 与 [`upstreams.lock.json`](upstreams.lock.json)。

平台支持刻意保持窄范围：本项目目前只面向 macOS。上表是已经执行的 macOS arm64 源码证据；macOS x64 在运行独立 parity corpus 之前只作为构建/打包兼容通道。Linux 与 Windows 不在当前支持声明内。

## 当前边界与路线图

`dsh-codex` 还不是完整 Codex 替代品。Canonical composition 仍需精确实现并串接：

- model provider 与 freeform tool transport；
- canonical shell 执行与 sandbox retry；
- managed network 与 network approval；
- instructions、sessions、compaction、memory 与 subagents；
- hooks、events、TurnDiff、CLI 与 UI。

当前 apply-patch 包是精确语义/文件系统引擎，还不是模型可见的 `apply_patch` 工具。Execpolicy 也不会直接 gate stock DSH Bash：stock Bash 无法在不产生可观察差异的前提下消费 Codex `bypassSandbox`、rich approval、managed network 与 retry 语义。

最终目标仍是通过 DSH 组件得到完整 Codex 行为。未完成的 composition 会被明确记录为未完成，不会用低保真实现替代。

## 仓库内容

```text
crates/                 原生语义引擎
packages/<component>/   可独立安装的 DSH 插件
conformance/<boundary>/ 独立上游 oracle 与小型 corpus
docs/                   架构、包契约与精确性边界
research/               固定版本的 DSH 生态插件实现研究
scripts/                pin 校验、打包与 native staging
upstreams.lock.json     机器可读的 Git/npm 身份
```

临时 JSONL、Cargo target、包构建产物和 native binary 不会提交。小型 corpus 与只用于测试的上游 instrumentation 会保留，让贡献者能够复现 parity 声明。

## 开发

```bash
pnpm check
```

重量级 conformance workflow 会单独运行，因为它们需要编译固定的 Codex 上游 crate。每个组件的命令和 API 见：

- [Execpolicy](packages/execpolicy/README.md)
- [Approval](packages/approval/README.md)
- [Apply-patch 语义引擎](packages/apply-patch-engine/README.md)

## 参与贡献

欢迎提交 Issue 和 Pull Request。新组件应拥有一个清晰子系统边界，可以独立安装，遵守 DSH 生命周期语义，固定上游身份，并在声明 parity 前提供可复现的 conformance 证据。

建议先阅读[组件包契约](docs/component-package-contract.md)、[组件地图](docs/components.md)和 [DSH 生态兼容性研究](docs/ecosystem-compatibility.md)。

## 上游与独立性

本项目是独立社区项目，与 OpenAI 或 DeepSeek 不存在隶属、背书或赞助关系。

OpenAI Codex 与 DeepSeek Harness 是彼此独立的上游项目。这里使用它们的名称，是为了标识研究和集成对象，并不表示官方身份。

## 许可

Apache-2.0。参见 [LICENSE](LICENSE)、[NOTICE](NOTICE)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 [UPSTREAMS.md](UPSTREAMS.md)。
