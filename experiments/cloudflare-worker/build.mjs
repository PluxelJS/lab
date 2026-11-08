import { rolldown } from 'rolldown'
import { createPluginSemanticsPlugin, configSourcePlugin } from '@pluxel/rolldown/plugins'
import { rm } from 'node:fs/promises'

const root = import.meta.dirname
await rm(`${root}/dist`, { recursive: true, force: true })
const bundle = await rolldown({
	cwd: root,
	input: 'src/worker.ts',
	platform: 'browser',
	resolve: { conditionNames: ['workerd', 'browser', 'import', 'default'] },
	plugins: [createPluginSemanticsPlugin({ root }).plugin, configSourcePlugin()],
})
try {
	const result = await bundle.write({
		file: `${root}/dist/worker.mjs`,
		format: 'esm',
		// Preserve request-time initialization as a lazy function in a single module.
		// Separate ESM chunks would evaluate ZenFS in workerd's restricted global scope.
		codeSplitting: false,
	})
	for (const chunk of result.output) {
		if (chunk.type === 'chunk') {
			// Rolldown retains a self-reference for an inlined dynamic import in its metadata.
			const imports = [...chunk.imports, ...chunk.dynamicImports].filter(
				(name) => name !== chunk.fileName,
			)
			if (imports.length) throw new Error(`Worker must be self-contained: ${imports}`)
		}
	}
} finally {
	await bundle.close()
}
