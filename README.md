# Pluxel Lab

Explore Pluxel across execution environments. Each experiment owns its application,
build, tests and runtime resources, and uses the framework's public package exports.

| Experiment                                               | Execution environment                                                 | What to inspect                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [QuickJS native](experiments/quickjs-native/README.md)   | Rust/Iced with embedded LLRT/QuickJS-NG; Node/Vite during development | Native capabilities, plugin lifecycle, HMR and explicit runtime replacement   |
| [Electron studio](experiments/electron-studio/README.md) | Electron renderer/main process and a utility-process Pluxel Host      | Local IPC, independent UI and backend updates, document sessions and shutdown |

Browser and Web Worker hosts are future experiment directions. They are not part
of the current runnable collection. Framework unit and compatibility tests remain
in [Pluxel](https://github.com/PluxelJS/pluxel).

## Setup

These experiments currently consume unpublished framework packages. Use the public
Pluxel checkout recorded in [upstream.json](upstream.json) and the existing
`pluxel source` workflow. The checkout remains a separate Git repository and
workspace; its machine-local path is never committed here.

```sh
git clone https://github.com/PluxelJS/lab.git
git clone https://github.com/PluxelJS/pluxel.git
cd lab
mise trust
mise install
revision=$(node --input-type=module -e "import data from './upstream.json' with { type: 'json' }; console.log(data.revision)")
git -C ../pluxel checkout "$revision"
git -C ../pluxel submodule update --init --recursive
cd ../pluxel
mise trust
mise install
mise exec -- vp install --frozen-lockfile
mise exec -- vp run @pluxel/cli#compile
cd ../lab
rustup toolchain install 1.99.1 --profile minimal
mise exec -- node ../pluxel/packages/cli/bin/pluxel.mjs source install --frozen-lockfile
```

`source install` installs the framework and experiment dependencies, builds the
required framework artifacts, and connects local docs and the development skill.
The first full build includes the Typst native compiler and requires Rust 1.99.1
plus the platform's C/C++ build tools. Each experiment documents additional native
requirements. To install without native compilation, use `source install --no-build`
and then explicitly build the source packages needed for your chosen experiment.

For framework development, register a different checkout with
`pluxel source register /absolute/path/to/pluxel`; record its revision when sharing
results. Run `pluxel source doctor` to inspect the resulting binding.

## Run and verify

From this repository root after setup:

```sh
vp run build:quickjs
vp run build:electron
vp run typecheck
vp run test
```

Use `vp run dev:quickjs` or `vp run dev:electron` for the corresponding desktop
application. QuickJS additionally needs its pinned LLRT checkout prepared with
`node experiments/quickjs-native/build/prepare-llrt.mjs`.

The CI smoke job covers the QuickJS experiment's TypeScript tests and Electron's
small Node tests. Native execution, Electron UI and release packaging have separate
commands in each experiment; they require their native environment.

## Provenance and maintenance

The initial experiments were imported from the paths and `importRevision` recorded
in [upstream.json](upstream.json). Their source, assets, licenses, regression tests
and historical implementation notes moved together. Historical validation notes
retain their original scope; migration validation is recorded in
[MIGRATION.md](MIGRATION.md).

The `revision` field pins the framework checkout used for validation, including
the source CLI's support for shared peer dependencies. `pluxel.sources.jsonc`
explicitly shares React, React DOM, Mantine, Worksplit's router/layout peers and Vite.

New experiments should demonstrate a distinct runtime or embedding boundary and
include a small reproducible entry point. Keep application-specific bridges in
their experiment. Fix framework behavior in Pluxel and consume it through public
exports here.

Code retains the [AGPL-3.0-only license](LICENSE); third-party assets and patches
retain their accompanying notices.
