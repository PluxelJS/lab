# QuickJS 原生嵌入 — Embedded Launcher

状态：实施中。已加入实际链接 LLRT 的 Rust 程序、正式 lowering 插件、owner Service 与 Commands；完整演示尚未完成，准确进度和验收缺口见 [IMPLEMENTATION](IMPLEMENTATION.md)。研究期比较证据见 [RUNTIME](RUNTIME.md)。本项目不发布 npm 包。

演示一个已有原生应用如何通过 Pluxel Services 开放能力，由插件扩展查询、动作和 CLI。Launcher 只是小而直观的载体；交付重点是可复用的嵌入架构，不是完整的 Launcher 产品。

## 确定的目标

- 原生 UI，无浏览器、WebView、React 或 Workbench UI 依赖。
- 同一份插件源码：开发在 Node/Vite 内执行，必须支持真实 HMR；发布在应用内的 QuickJS-NG 执行。
- 开发插件操作真实原生应用的剪贴板、结果列表和设置，不能以 mock 替代最终演示。
- Plugin stop/start、配置更新和依赖联动由 Pluxel 在同一 JSRuntime 内处理。
- 发布包安装、更新、移除后，通过显式重建插件 JSRuntime 接纳新的包集合；原生应用保持运行。
- 原生 UI 和 CLI 使用同一个活动 Host，展示 Commands、配置、依赖、effects、日志和自定义 Services。

## 阅读入口

开始实施先读本页、STACK、RUNTIME、DESIGN 与 IMPLEMENTATION；NETWORK 在联网阶段读，DECISIONS 仅解释取舍。以下不是要求每次任务通读的清单。

1. [架构设计](DESIGN.md)：所有权、双环境交互、HMR、安装管理和运行时边界，实施时的权威设计。
2. [技术选型](STACK.md)：Rust/Iced/LLRT、JS 包、线程归属、构建和 CLI 入口。
3. [设计思考](DECISIONS.md)：方案选择、性能考虑、没有纳入首版的能力。
4. [运行时研究](RUNTIME.md)：LLRT 决策、同条件实测与已知缺陷、现代 npm 包兼容范围与嵌入门槛。
5. [联网与能力观察](NETWORK.md)：owner-bound Fetch、Wretch、运行环境网络、能力探测的事实边界。
6. [实施与验收](IMPLEMENTATION.md)：已知基础、尚未验证的缺口、实施顺序和真实验收场景。

从实施文档的当前验收缺口继续。先验证真实 LLRT 嵌入闭包及原生往返，再扩展演示。实现中若发现当前框架公共入口无法满足设计，应在所属包修复边界并补验证，不能通过项目内复制 Core、伪造 metadata 或私有源码 import 绕过。

## 演示的最小形态

一个原生窗口，包含搜索框、结果列表和紧凑的插件管理视图。输入算式显示结果并可复制；CLI 调用相同计算器；另一个插件查询原生应用提供的动作目录。管理视图展示可用插件、实际运行结果、配置，以及已安装和正在使用的包版本。

确定路线为 Rust + Iced 原生窗口 + 内嵌 LLRT，先验收 Linux；不使用 WebView，也不要求系统原生 widget 外观。LLRT 按插件生态选择，Iced 按外部事件接入、必要组件和可执行测试选择；不代表嵌入 SDK 已成熟或 UI 已实测。精确版本和有界补丁在实施时锁定，引擎/rquickjs 跟随 LLRT。其他平台不以工具包跨平台代替实测。没有 Node 的发布运行是验收条件，构建环境仍可使用 Node、Vite 和 Rolldown。

新 session 使用 [落地 Prompt](PROMPT.md)，从 IMPLEMENTATION 阶段 A 开始；无具体阻断不重新选型或维护 txiki 后端。实现后只在 IMPLEMENTATION 更新阶段状态和证据。

当前代码是工作区 private 应用和项目内 private SDK；不建立独立 SDK 仓库或通用跨语言 RPC 框架。

## 构建与原生回归

先完成 [Lab 安装](../../README.md#setup)，再从 Lab 根执行（构建需要 Node/pnpm、Rust 和网络以取得固定 LLRT 源码）：

```sh
node experiments/quickjs-native/build/prepare-llrt.mjs
vp run @embedded-launcher/app#build:plugins
vp run @embedded-launcher/app#build:release
cargo +1.99.1 run --locked --manifest-path experiments/quickjs-native/native/Cargo.toml --bin embedded-smoke
cargo +1.99.1 test --locked --manifest-path experiments/quickjs-native/native/Cargo.toml --tests
cargo +1.99.1 run --locked --manifest-path experiments/quickjs-native/native/Cargo.toml --bin compatibility-check -- experiments/quickjs-native/dist
```

原生 smoke 使用 `release/runtime` 中的正式包基线，再用 `dist/lifecycle.mjs` 检查旧句柄撤回；它直接链接 LLRT。Rust tests 覆盖监督器、包管理、运行时和 UI 状态；compatibility-check 检查固定的标准 API 与 npm 包矩阵。桌面窗口和开发 HMR 的验收需要另外启动应用。

SDK 产物由本工作区的 `@embedded-launcher/sdk#compile` 生成。插件与发布构建通过 Vite Task 等待 SDK；框架产物由安装步骤中的 `pluxel source install` 准备。

固定的 LLRT 提供部分 Intl API。嵌入入口先加载 [FormatJS NumberFormat 及其依赖](https://formatjs.github.io/docs/polyfills/intl-numberformat/)，再求值 Host 和插件模块，满足文件系统对 `Intl.NumberFormat` 的要求。当前带 `en` locale 数据；其他语言需显式加入数据。`dist/closure.json` 记录实际 polyfill 包版本和初始化方式。

## 当前开发窗口与 CLI

完成上述插件构建后，从项目目录执行：

```sh
node dev.mjs
```

它启动或连接真实原生应用，通过 Unix socket 借用原生能力，再由 Vite 装配插件。关闭 Node 开发进程后窗口保留；重新运行会建立新执行会话。业务插件与普通 helper 直接 HMR；稳定 SDK 修改需先 `vp run build:sdk` 并重启 Node。

另一个终端从仓库根使用相同 profile：

```sh
cargo +1.99.1 run --locked --manifest-path experiments/quickjs-native/native/Cargo.toml --bin embedded-launcher -- cli --profile "$PWD/experiments/quickjs-native/.pluxel/dev" -- calc '1/3'
vp exec pluxel dev instances --root "$PWD/experiments/quickjs-native"
```

在线配置和启停使用发现出的 instance 与 `dev/inspect.ts`，遵循[开发控制台](https://github.com/PluxelJS/pluxel/blob/dc532cffb074441b6c07050ea5fcf79bb4439a4a/docs/development/dev-console.md)。插件管理、包管理和联网的完整验收仍以 IMPLEMENTATION 为准。

## 发布演示

从项目目录构建（`zip` 必须在构建机 PATH 中）：

```sh
vp run build:release
cargo +1.99.1 build --locked --manifest-path native/Cargo.toml --bin embedded-launcher
cargo +1.99.1 run --locked --manifest-path native/Cargo.toml --bin embedded-launcher -- --plugins "$PWD/release/runtime" --profile "$PWD/.pluxel/production"
```

分发原生 `embedded-launcher` 可执行文件与 `release/runtime/` 即可；运行机不需要 Node/pnpm 或仓库源码，但需要 Linux 桌面环境及二进制所链接的系统库。构建机的 Cargo target 目录可由 `cargo metadata --format-version 1 --no-deps --manifest-path native/Cargo.toml` 查询，不能假定是项目内 `target/`。当前验证使用开发构建，未声称已完成优化发行构建或跨发行版兼容。

简短演示：输入 `1/3` 并回车复制；在 Plugins 改 precision、停止/启动插件；输入 `web delectus` 查询公开 HTTPS 示例；在 Activity 查看限定范围的能力使用；在 Packages 用 Install ZIP 选择 `release/packages/demo-2.0.0.zip`，观察待应用，再 Apply changes。安装不替换当前运行时，应用后计算结果副标题从 v1 变为 v2，窗口保留。Remove 同样需要 Apply；Select previous 只是选择上一集合，仍需显式应用。

开发验收可在发现准确 instance 后运行：

```sh
node tests/development-acceptance.mjs /absolute/path/embedded-launcher /absolute/path/profile INSTANCE_ID
```

脚本操作正在运行的真实 UI、Vite Host 和 Wayland 剪贴板，需 `wl-paste`；会临时修改并还原两个业务源码文件，精度配置改为 4。完整边界与尚未验证的场景见 IMPLEMENTATION。
