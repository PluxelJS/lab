import { createHost } from '@pluxel/host/browser'
import type { Env } from './env'
import { NotesPlugin, NoteStoragePlugin } from './notes'
import { workerRequest, type RequestContext } from './request'

export async function handleRequest(request: Request, env: Env): Promise<Response> {
	const context: RequestContext = { env, trace: [] }
	let response: Response
	try {
		await using host = await createHost({
			plugins: [NoteStoragePlugin, NotesPlugin],
			services: [workerRequest(context)],
			config: {
				records: [
					{ owner: NoteStoragePlugin.nodeAddress(), config: { namespace: env.NAMESPACE } },
					{ owner: NotesPlugin.nodeAddress(), config: { maxLength: env.MAX_NOTE_LENGTH } },
				],
			},
			policy: { autoStart: [NotesPlugin.nodeAddress()] },
		})
		const report = await host.start()
		if (
			report.core.status !== 'committed' ||
			!report.core.summary.lifecycleReport.ok ||
			report.reconciliation.length > 0 ||
			!context.handle
		) {
			console.error('Pluxel startup rejected', JSON.stringify(await host.status()))
			throw new Error('Pluxel plugins did not start')
		}
		response = await context.handle(request)
	} catch (error) {
		console.error('Pluxel request failed', error)
		response = Response.json({ error: 'host_failed' }, { status: 500 })
	}
	// The async disposal above has settled before this diagnostic header is exposed.
	response.headers.set('X-Pluxel-Lifecycle', context.trace.join(', '))
	return response
}
