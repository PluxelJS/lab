import { defineConfig } from 'vite-plus'
const pluginBuilds = ['@embedded-launcher/sdk#compile']

export default defineConfig({
	run: {
		tasks: {
			'compile-plugins': {
				command: 'node build/plugins.mjs',
				dependsOn: pluginBuilds,
				cache: { output: ['dist/**'] },
			},
			'compile-release': {
				command: 'node build/release.mjs',
				dependsOn: pluginBuilds,
				cache: { output: ['release/**'] },
			},
			'check-types': { command: 'tsc --noEmit', dependsOn: pluginBuilds },
			'check-tests': { command: 'vp test run', dependsOn: pluginBuilds, cache: false },
		},
	},
})
