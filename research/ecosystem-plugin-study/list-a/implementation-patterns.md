# 从插件实现反推 dsh-codex 的组件设计

这份结论来自逐仓库源码检查，不来自榜单文案本身。下面只把“结构怎样工作”当作参考；插件自述的能力、测试数量和真实运行时正确性是三件不同的事。

## 1. 一个安装包可以有两个运行面，但只能有一个清晰的能力所有者

[dsh-context-doctor@4a91502](https://github.com/Zhenyu98/dsh-context-doctor/tree/4a91502c106f7fed86981421c740566abf309977) 是目前最清楚的 server/client 参考之一：

- `src/index.ts` 是服务端 Cordis 插件，声明 `inject`，注册 `context_audit` 工具，并只在 `webServer` 可用时注入 HTTP route。
- `src/client/index.ts` 是浏览器插件，注册 locale、store，并通过 `conversation.input.context` slot 安装 UI。
- 两侧共享的是显式数据契约，不是浏览器直接读取服务端内部对象。

对 dsh-codex 的意义：像 approval 这种同时需要后台状态机和 Web 交互的能力，可以作为一个用户安装包发布，但内部必须保持 `protocol/service/client` 三层；最终决策和 pending 生命周期只有 service 拥有，UI 只是客户端。

## 2. 用 `ctx.inject` 表达可选组合，用 `ctx.effect` 表达可回收副作用

成熟插件通常不假设整个 Web profile 永远存在。context-doctor 延迟等待 `webServer`；[dsh-codex-connect@2c99d17](https://github.com/franksong2702/dsh-codex-connect/tree/2c99d177db51bfa18683b4e3c13d125ec0200367) 只有在相应服务出现时才注册 Web OAuth route、search provider 和 image tool，并给长期资源安装 disposer。

对 dsh-codex 的意义：每个 Codex 组件应声明最小强依赖；CLI/headless/Web 差异通过延迟注入组合，不在核心状态机里出现 `if (web)` 分支。卸载完成必须意味着该组件启动的 waiter、listener、route 和后台任务已经真正收敛。

## 3. Cordis service 是状态所有权边界，tool 是薄协议适配层

插件生态里比较可靠的工具不是把全部业务塞进 `execute()`：

- context-doctor 把审计计算与 HTTP/UI 投影分离。
- [dsh-mneme@67376b3](https://github.com/modusensus/dsh-mneme/tree/67376b3075fac55c230272c7da65ed54324c74a0) 用独立 service 管理 SQLite、迁移和记忆生命周期，再暴露 `memory_save/search/list` 等工具。
- [task-passport@19672b5](https://github.com/dongsheng123132/task-passport/tree/19672b5c7c06151d8d0af6760830ee2d27371665) 把 checkpoint 存储作为中立域能力，再给 DSH、Claude Code、Codex 和 MCP 各自做入口。

对 dsh-codex 的意义：`shell`、`approval`、`session`、`context`、`tool registry` 都应先成为有明确状态/副作用所有者的 service；模型工具只是其一个 adapter。这样可分别验证 Codex 语义、DSH 工具 wire 和 UI 投影，不会把三种 parity 混为一谈。

## 4. Codex bridge 插件证明了“提供 Codex 模型”不等于“复刻 Codex”

dsh-codex-connect 的 patch 只插入 `llm-openai-codex`，默认关闭 search/image，可选注册 provider-native OAuth、搜索和图片工具。它有完整 server/client、pack check、CI 和设置页，但 Codex agent loop、上下文管理、权限、session、exec sandbox 仍不在这个插件中。

这是对 dsh-codex 很重要的负面边界：可以借鉴其 package、invariant、provider、secret-safe UI 和 release 做法，但不能把 provider bridge 计入 Codex runtime parity。我们的组件账本仍必须逐项对应 Codex 上游子系统。

## 5. 原始 wire 语义应留在能无损表达它的边界

生态插件大多只处理普通 JSON，因此 TypeScript 足够；它们不能解决 Codex Rust wire 中 `i64/usize` 与 JavaScript number 的信息损失。dsh-codex approval 使用 Rust protocol sidecar 不是“为了 native 而 native”，而是把 serde、整数范围和 canonicalization 留在真正拥有这些语义的边界。TypeScript service 接收已经无损解析的值并负责 DSH 生命周期。

这个判断与生态经验并不冲突：插件化决定怎样组合，原生 sidecar 决定怎样不损失上游语义。

## 6. 持久化需要按权威程度分层

源码里能看到三类状态：

- 权威长期状态：mneme、memory-gate、chat-import 使用 SQLite/FTS、schema 或 migration。
- 可交换的文件状态：task-passport 使用机器可读 checkpoint 与乐观锁；file-claim 使用 claim/heartbeat/stale takeover 保护并发工作区。
- 纯 UI 偏好：context-doctor、spotlight 等使用 browser local storage 或轻量设置。

对 dsh-codex 的意义：session、approval rule、exec history 等权威状态不能因为实现方便落进浏览器 local storage；浏览器只保存展示偏好。文件/SQLite schema 应有版本、迁移、原子写和冲突策略。

## 7. 跨 agent 数据应采用“中立模型 + 每来源 codec”

[dsh-chat-import@eea0b4f](https://github.com/Nwflower/dsh-chat-import/tree/eea0b4f937d92d51683620cacedac4f112000adb) 对 13 种 coding-agent history 使用来源 adapter，导入到 DSH session，并保留反向同步边界；仓库有 45 个测试文件和 migration 信号。task-passport 则用一个中立 checkpoint 在多个 harness 间传递任务状态。

对 dsh-codex 的意义：Codex session parity 应拆成 canonical session domain 与 Codex JSONL/event codec，而不是让 DSH session schema直接冒充 Codex schema。导入、resume、fork、compact 可以分别做 contract fixture 和 round-trip differential test。

## 8. 并发控制必须进入 tool/event 执行路径，而不只是做一个 UI 提醒

[dsh-file-claim@65aebf0](https://github.com/Nwflower/dsh-file-claim/tree/65aebf02cd881af9d170af692f17189bf785cb8a) 同时监听 agent lifecycle 和 `tools/pre-execute`，并提供 claim/pending 工具；[dsh-turn-rewind@27ebefa](https://github.com/Anionex/dsh-turn-rewind/tree/27ebefa76a2d39b0ecb8f6f92b33946b4a575500) 依赖 change-ledger service，在 agent pre-step 和 Web UI 两侧投影同一份可回退状态。

对 dsh-codex 的意义：approval、sandbox、execpolicy 必须卡在真正执行 effect 的路径；仅渲染“需要批准”或记录日志不等于实施了权限语义。组件卸载、重复 request id、取消和竞争结算都要有确定规则。

## 9. 大工具目录应采用渐进披露，而不是把所有 schema 塞进上下文

[dsh-mcp-lens@fb5351d](https://github.com/labmimors/dsh-mcp-lens/tree/fb5351dff01f780d033e7e0f80458fc15f33486f) 把远端大 catalog 收敛成稳定的 search/call 接口，连接延迟建立并使用有界缓存。这里值得借鉴的是上下文预算机制，而不是把 MCP 名称换成 Codex tool 名称。

对 dsh-codex 的意义：未来 tool registry 可把“发现工具”和“执行工具”拆开，同时保证已经被模型选中的工具以精确 schema 调用；缓存、连接失败和 schema 变更必须进入 session/context 语义测试。

## 10. 多组件仓库应按状态/副作用所有权分包，再用 preset 组合

[dsh-collaboration@9a7cf4b](https://github.com/Socialist-Sister/dsh-collaboration/tree/9a7cf4bade959d58a2551324e2dfb5884bc61c31) 将 team host、team tools、model-compare、vision 分成独立 packages，再由 agent preset 组合；[dsh-plans@2bac990](https://github.com/Optim-Agent/dsh-plans/tree/2bac9907edc7d6a0b5f57360204230c6f6257c42) 则说明有些能力本质上是 agent/prompt/workflow composition，并不需要伪装成 TypeScript runtime service。

对 dsh-codex 的意义：当前 `packages/<component>` 方向正确。组件只有在拥有独立语义、状态或 effect 时才新建 package；“安装这些组件得到 Codex”属于 profile/preset 层。不要把所有包重新聚合成一个无边界的 `codex-core`，也不要把一份 prompt preset 宣称成 agent-loop parity。

## 11. 发布链要验证用户拿到的 tarball，而不只验证源码树

[dsh-market](https://github.com/dsh-market/dsh-market) 有 CI 与 tag release；dsh-codex-connect 有 build/test/typecheck/pack check 和 `prepublishOnly`；多个质量较好的插件把 GitHub SHA/tag fallback、npm 包和本地 link 分开说明。

对 dsh-codex 的意义：继续保持每组件独立 `files`、`prepack`、archive profile smoke 和固定上游 provenance。源码测试属于 GitHub 仓库，用户 tarball 只携带运行产物、bundle、README、LICENSE/NOTICE；“tarball 不含 tests”与“项目没有 conformance tests”不能混为一谈。

## 12. 社区 checker 是启发式，不是规范来源

[dsh-plugin-check@397aa26](https://github.com/omdsh-dev/dsh-plugin-check/tree/397aa26df241aca530aa65a08484a664f7d555ad) 的优点是按 registry/skill/collection/bundle/tool-bundle 分流，有扫描预算、路径 containment、patch/core-row 和构建陷阱检查；但它也带有项目自己的组织命名与发布假设，例如把 `src` 视作发布归档必需项。

对 dsh-codex 的意义：可以借鉴“机器可检查、按形态分流、预算有界”，不能照抄其政策。dsh-codex 的最终裁判仍是固定 DSH Loader 行为、固定 Codex oracle、公开 package contract 和本仓库 parity standard。

## 13. UI 应走稳定 slot/service seam，不应以 DOM 猴子补丁作为能力核心

context-doctor 和 dsh-market 都通过 client runtime 的 locale/store/slot seam 安装设置页、输入区组件或 overlay。这种做法可以随 bundle 生命周期卸载，也能写 client-level test。Topic 里还有大量换肤、DOM 注入和独立桌面壳；它们可以作为展示灵感，但不适合承载 approval、session 或 permission 等权威语义。

对 dsh-codex 的意义：未来 Codex-style TUI/Web 只是消费组件 service/event 的客户端。即使视觉完全复刻，也不能反向拥有 agent 状态。

## 14. 研究结果对当前仓库的直接约束

README 精选层 285 个条目中，225 个能完成固定 HEAD 源码检查，60 个指向当前账号不可见的仓库。225 个可读目标里，静态扫描发现 189 个具有可识别 activation，138 个有 test/spec 文件，74 个有 GitHub Actions，90 个有保守识别的 release/prepack/publish 信号（发布脚本或文件名明确指向发布的 workflow）。也就是说，“出现在精选列表”并不能替代组件级质量证明；特别是测试、发布归档和持续集成不能从榜单描述推断。

综合这些实现，dsh-codex 后续组件应继续满足：

1. 一个 package 对应一个可单独说清的 Codex 能力所有者；组合关系进入 profile/preset。
2. 服务端、wire/native、client 可以同包发布，但源码和 contract 必须分层。
3. tool/UI/event 都是 domain service 的 adapter，不能重复实现一份“近似语义”。
4. 可选依赖用 `ctx.inject`，副作用用 owner-visible disposer；卸载必须等待 quiescence。
5. authority state 使用原子文件或带 migration 的数据库；UI storage 只保存偏好。
6. 每个 parity 声明同时需要上游 oracle、DSH Loader、归档安装和 composition evidence。
7. provider bridge、主题、skill、MCP companion、desktop client 都可以进入生态目录，但不能被计入 Codex component parity。
