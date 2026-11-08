import './intl'

// The dependency chunks may use Intl during module evaluation.
const [{ transport }, { createSession }, { documentStorage }, plugins] = await Promise.all([
	import('./embedded-transport'),
	import('./session'),
	import('./storage'),
	import('../plugins'),
])
const session = createSession(
	transport,
	{
		configStorage: documentStorage(transport, 'config'),
		stateStorage: documentStorage(transport, 'state'),
	},
	Object.values(plugins),
)
export const dispatch = session.dispatch
export const close = session.close
