# Initial migration

Imported two existing applications from the public framework repository. Exact
source paths and revision are recorded in [upstream.json](upstream.json).

- `quickjs-native` owns the Rust application, private SDK, LLRT patches, plugin
  build/release tools and regression tests.
- `electron-studio` owns the Electron carrier, utility-process Host, renderer,
  example documents, native assets and application tests.

The independent workspace replaces framework-local task edges with installed
source dependencies. Editor declaration generation resolves public package types.
The Studio backend test checks public session reuse; it no longer reaches into
the private Typst compiler class to count internal workers. Framework internals
remain the responsibility of the framework test suite.

Build outputs, dependency directories, credentials and local application state
are excluded from Git. Original per-experiment implementation reports describe
their prior validation; the results below describe this migration only.

## Migration validation

Validated on Linux with Node 24.22.2, pnpm 11.28.10 and Rust 1.99.1.

| Check                                                  | Result                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Independent source install and source dependency build | Passed                                                                                 |
| QuickJS TypeScript check and tests                     | Passed; 13 tests                                                                       |
| QuickJS plugin and release builds                      | Passed; v1/v2 archives and explicit runtime baseline                                   |
| Rust test targets                                      | Passed; 13 tests, including runtime, packages, supervisor and UI state                 |
| Real embedded smoke                                    | Passed; three supervisor cycles and five revoked/fresh handle checks                   |
| LLRT compatibility matrix                              | Passed; 14 cases × 3 runtimes, 24 HTTP requests, zero live runtimes after close        |
| Electron application build and TypeScript check        | Passed                                                                                 |
| Electron HMR integration                               | Passed; old capabilities revoked, saved inputs and artifacts retained                  |
| Electron public runtime integration                    | Passed; two external clients, native PDF/PNG rendering, local IPC, restart and cleanup |
| Formatting and hk configuration                        | Passed                                                                                 |

The full Electron suite passed: 34 files, 231 tests passed and one platform-specific test skipped.
No interactive desktop-window walkthrough, Windows/macOS run or distributable
Electron packaging was performed during this migration.

## Migration fixes

- The framework source CLI now shares explicitly declared dependency/peer
  singletons only when all selected providers resolve to the same physical install.
  The pinned framework revision includes the fix and its regression tests.
- The current LLRT does not implement NumberFormat. The QuickJS entry now loads
  [FormatJS's standard polyfills](https://formatjs.github.io/docs/polyfills/intl-numberformat/)
  with English locale data before importing framework modules. The compatibility
  matrix still tests LLRT's original networking and crypto implementations.
- The native smoke uses the supervisor's current release baseline and reports
  startup diagnostics before returning failure.
- Studio declaration generation bundles typed re-exports from public packages;
  it no longer reads the framework's private TypeScript source files.
- Vite serves the explicitly linked Typst WASM assets. React, Mantine, Worksplit
  peers and Vite share their source-side installations.
- The HMR fixture lives in a temporary directory under this configured workspace,
  outside runtime-state directories excluded from file watching. Client-import
  checks match dependency paths rather than the experiment's `electron-studio` name.
