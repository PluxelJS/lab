import { defineConfig } from 'vite-plus'

export default defineConfig({
	fmt: {
		useTabs: true,
		tabWidth: 2,
		printWidth: 100,
		singleQuote: true,
		semi: false,
		ignorePatterns: [
			'**/dist/',
			'**/native/vendor/',
			'**/native/target/',
			'**/.studio-dev/',
			'**/.editor-generated/',
			'**/.wrangler/',
			'**/test-results/',
			'test-workspaces/',
			'docs/pluxel/',
			'.agents/skills/pluxel-development/',
			'**/VALIDATION_EVIDENCE.json',
		],
	},
	run: {
		tasks: {
			'lab:test': {
				command: [],
				dependsOn: [
					'@embedded-launcher/app#check-tests',
					'@report-template-studio/app#check-tests',
					'@pluxel-lab/cloudflare-worker#check-tests',
				],
				cache: false,
			},
			'lab:typecheck': {
				command: [],
				dependsOn: [
					'@embedded-launcher/app#check-types',
					'@report-template-studio/app#check-types',
					'@pluxel-lab/cloudflare-worker#check-types',
				],
				cache: false,
			},
		},
	},
})
