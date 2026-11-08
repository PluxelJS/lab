import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: { index: './src/index.ts' },
		format: 'esm',
		outDir: 'dist',
		fixedExtension: true,
		// Preserve the previous Rolldown ESM build's default platform and explicit conditions.
		platform: 'browser',
		target: false,
		deps: { neverBundle: /^@pluxel\// },
		inputOptions: { resolve: { conditionNames: ['@pluxel/source', 'import', 'default'] } },
		dts: false,
		minify: false,
		sourcemap: false,
		clean: false,
		exports: false,
	},
	run: {
		tasks: {
			compile: {
				command: 'vp pack',
				cache: { output: ['dist/**'] },
			},
			'check-types': { command: 'tsc --noEmit' },
		},
	},
})
