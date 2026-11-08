# Cloudflare Worker

在 Cloudflare 的 `workerd` 中运行真正的 Pluxel Host，用两个插件实现一个 KV 笔记 API。
这个实验验证边缘请求的执行环境：插件依赖、配置校验、原生平台 binding、并发请求隔离和关闭顺序。
它使用 `@pluxel/host/browser` 与 Core 的公开导出，不需要 `nodejs_compat`。

## 运行

先按[仓库 README](../../README.md#setup)完成克隆、固定框架 revision、安装 mise 工具和编译上游 CLI。
只运行这个实验时，跳过 Rust 安装及完整 `source install`，在 Lab 根目录执行：

```sh
mise exec -- node ../pluxel/packages/cli/bin/pluxel.mjs source install --no-build --frozen-lockfile
mise exec -- node ../pluxel/packages/cli/bin/pluxel.mjs source build --package @pluxel/host --package @pluxel/rolldown
mise exec -- vp run dev:cloudflare
```

Wrangler 前台启动本地 `workerd`，显示实际地址；Ctrl+C 关闭。以下使用默认地址：

```sh
curl -i http://localhost:8787/
curl -i -X PUT http://localhost:8787/notes/hello \
  -H 'Content-Type: application/json' --data '{"text":"你好，Pluxel"}'
curl -i http://localhost:8787/notes/hello
curl -i -X DELETE http://localhost:8787/notes/hello
```

`wrangler dev` 使用本地 KV，数据放在本实验的 `.wrangler/` 下，不连接云端 namespace。
`wrangler.json` 的 KV ID 是本地演示占位值，`workers_dev` 默认为 `false`。
`NAMESPACE` 决定 KV key 前缀，`MAX_NOTE_LENGTH` 限制笔记字符串长度（1–4096 个 UTF-16 code units）。
修改变量后由新的请求 Host 读取；非法配置会拒绝启动并返回 500，不会采用替代值。

## 执行链路

| 文件                                     | 职责                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [src/worker.ts](src/worker.ts)           | 在 `fetch` 内首次加载应用；模块级不保存请求、binding 或 Host              |
| [src/application.ts](src/application.ts) | 每个请求创建 Host，提供配置，检查启动报告，调用处理器并等待关闭           |
| [src/request.ts](src/request.ts)         | 将本次请求的 binding 和处理器注册位置作为 Host service 提供给插件         |
| [src/notes.ts](src/notes.ts)             | `NotesPlugin` 通过构造器依赖 `NoteStoragePlugin`，后者直接使用原生 KV API |
| [build.mjs](build.mjs)                   | 执行 Pluxel 插件与配置 lowering，输出一个自包含 Worker 模块               |

Host 只自动启动 `NotesPlugin`，存储插件由依赖关系启动。业务请求在插件图启动成功后执行。
返回的 JSON 已缓冲；`await using` 在响应返回前关闭 Host，包括业务异常和启动被拒绝的路径。
KV namespace 由 Cloudflare 提供，Host 借用它；关闭 Host 不删除 KV 数据。

响应的 `X-Pluxel-Lifecycle` 用于观察这个实验的生命周期：

```text
host:prepared, storage:started, notes:started, notes:closed, storage:closed, host:closed
```

处理器注册在插件的 effects 关闭时撤销。所有请求都有各自的服务、配置和插件实例；共享的只有已加载代码。
预期的输入错误返回 400/404/405，Host 或未处理的业务失败返回 500，并记录服务端错误。
`host:closed` 标记本实验 service 的清理回调执行；它不是所有潜在资源都成功关闭的通用证明。

## 为什么必须延迟初始化

当前上游 ZenFS 在模块初始化时创建默认文件系统并调用 `crypto.randomUUID()`。
`workerd` 禁止在请求外执行这项操作，因此静态导入整个应用会在 Worker 加载时失败。

这里同时保留两个条件：`worker.ts` 在 `fetch` 内动态导入应用，Rolldown 使用
`codeSplitting: false` 将该导入编译成同一文件里的惰性初始化函数。单纯拆成另一个 ESM chunk
仍会触发模块求值限制。Wrangler 的 `no_bundle: true` 保留已经验证的产物。
没有改写平台全局对象，也没有复制或修改 Pluxel 的运行时。

这是当前固定框架版本的构建约束。升级框架或打包器时运行并发冷启动测试，以实际 `workerd` 结果为准。
相关平台行为见 [Fetch handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)
和 [Wrangler 自定义构建](https://developers.cloudflare.com/workers/wrangler/bundling/)。

## 验证

从 Lab 根目录运行：

```sh
vp run @pluxel-lab/cloudflare-worker#check-types
vp run @pluxel-lab/cloudflare-worker#check-tests
vp run @pluxel-lab/cloudflare-worker#check-deploy
```

`check-tests` 先构建，再由 Miniflare 启动真实 `workerd`，通过 HTTP 请求测试最终产物和原生本地 KV。
7 组集成用例覆盖并发冷启动、KV 读写删除与跨请求保存、并发响应隔离、输入拒绝、部署变量、非法配置和缺失 binding。
每个用例都会释放 Miniflare；失败测试保留预期的服务端诊断。`check-deploy` 仅执行 Wrangler dry run。
这三项已接入仓库 CI。

2026-11-08 本地验证：框架 revision 见 [upstream.json](../../upstream.json)，Node 24.22.2、
Miniflare 5.20261103.0-beta、workerd 1.20261103.1、Wrangler 4.157.0。
类型检查和 7 组测试通过；dry run 产物约 1.16 MiB，gzip 272 KiB。

## 实验边界

这是请求级 Host 的可运行示例。尚未验证 Cloudflare 云端部署、套餐 CPU 配额或每次创建 Host 的生产成本。
没有流式响应、`waitUntil` 后台任务、定时触发器或 Durable Object；这些场景需要各自明确 Host 的所有者与寿命。
Host 的配置、文件系统和插件状态不承担业务持久化，笔记通过 KV 保存。
本地测试中的立即可读不代表云端强一致；[Workers KV 使用最终一致性](https://developers.cloudflare.com/kv/concepts/how-kv-works/#consistency)。

如需部署，应先创建自己的 KV namespace，替换占位 ID，配置自己的 route 或 `workers_dev`，
并为这个可写 API 增加适合应用的访问控制，然后再执行 `wrangler deploy`。
本仓库和 CI 都不会执行远程部署。
