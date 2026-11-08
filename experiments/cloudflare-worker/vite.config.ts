import { defineConfig } from 'vite-plus'

export default defineConfig({
	run: {
		tasks: {
			compile: { command: 'node build.mjs', cache: false },
			'check-types': { command: 'tsc --noEmit', cache: false },
			'check-tests': {
				command: 'node --test tests/worker.test.mjs',
				dependsOn: ['compile'],
				cache: false,
			},
			'check-deploy': {
				command: 'wrangler deploy --dry-run --outdir .wrangler/dry-run',
				cache: false,
			},
		},
	},
})
