import type { Env } from './env'

export default {
	async fetch(request, env) {
		// build.mjs keeps initialization lazy inside this request, including ZenFS UUIDs.
		const { handleRequest } = await import('./application')
		return handleRequest(request, env)
	},
} satisfies ExportedHandler<Env>
