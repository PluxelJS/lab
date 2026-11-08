import { definePluxelVitestConfig } from '@pluxel/test/vitest'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { searchForWorkspaceRoot } from 'vite'
export default definePluxelVitestConfig({
	resolve: { dedupe: ['react', 'react-dom'] },
	server: {
		fs: {
			allow: [
				searchForWorkspaceRoot(import.meta.dirname),
				dirname(fileURLToPath(import.meta.resolve('@pluxel/plugin-typst/package.json'))),
			],
		},
	},
	test: {
		// Files start real Hosts, native Typst workers and QuickJS heaps.
		maxWorkers: 2,
		include: ['tests/**/*.test.{ts,tsx}'],
		testTimeout: 60000,
		hookTimeout: 60000,
	},
	pluxel: { include: ['src/**/*.ts', 'tests/**/*.ts'] },
})
