# Coding agent entry

This repository contains execution-environment experiments consuming Pluxel through
public package exports. Read the target experiment's README and package scripts.
`upstream.json` records the imported framework revision and original paths.

After `pluxel source install`, use `.agents/skills/pluxel-development/SKILL.md`
and `docs/pluxel/` for framework development and console workflows. Fix framework
issues in its own checkout; do not import private source paths or copy its runtime.

Each experiment owns its runtime resources and data. Inspect active instances
before edits and use the existing dev console's HMR pause/apply/resume workflow
when changing a running application. Preserve explicit failure and shutdown results.

Use package scripts and Vite tasks for operations, mise for tools, and hk for
checks. Shared task dependencies only name packages in this workspace; upstream
artifacts are built by `pluxel source build` in the registered checkout.

Keep tests and documentation with their experiment. Report exactly which Node,
native and desktop checks ran. Preserve historical validation notes as historical
evidence, and record new evidence separately.

<!-- pluxel:development -->

For Pluxel development, use .agents/skills/pluxel-development/SKILL.md to select the declared development target, operate its console and read the relevant documentation.
Before multi-file or continuous edits to a running application, follow the dev-console HMR batch workflow: pause, edit and check, apply, then verify. Keep failed updates paused; resume only if the prior mode was auto and verification succeeds.
Missing generated resources: Git users run their upstream CLI's source install; npm users install dependencies then run vp exec pluxel workspace setup.
Keep upstream instructions in their source; maintain only project-specific constraints here.
<!-- /pluxel:development -->
