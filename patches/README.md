# Dependency patches

This QuickJS Emscripten patch was imported unchanged from the Pluxel revision recorded in
[`upstream.json`](../upstream.json). Their versions are declared in
`pnpm-workspace.yaml`. Worksplit's router/layout patches and shared React dependencies
are owned by the linked framework checkout. Its public native-dependency check
validates those dependencies before Studio builds or starts.

The QuickJS native experiment's LLRT patch remains in its own `patches/` directory
and is applied by its pinned runtime preparation script.
