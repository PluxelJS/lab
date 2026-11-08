import { defineContextCapability, installOwnerViewCapability } from '@pluxel/core/host'
import { defineHostService } from '@pluxel/host/browser'
import type { Env } from './env'

/** Owned by one fetch invocation; NotesPlugin owns handle until its effects close. */
export interface RequestContext {
	env: Env
	trace: string[]
	handle?: (request: Request) => Promise<Response>
}

export const WorkerRequest = defineContextCapability<RequestContext>('lab.worker-request')

export function workerRequest(context: RequestContext) {
	return defineHostService({
		name: 'worker-request',
		capabilities: [
			installOwnerViewCapability(WorkerRequest, {
				createRoot: () => context,
				createView: (request) => request,
			}),
		],
		prepare({ effects }) {
			context.trace.push('host:prepared')
			effects.defer(() => {
				context.trace.push('host:closed')
			})
		},
	})
}
