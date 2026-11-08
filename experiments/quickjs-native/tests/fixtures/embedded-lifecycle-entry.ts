import '../../src/execution/intl'

const lifecycle = await import('./embedded-lifecycle')
export const dispatch = lifecycle.dispatch
export const close = lifecycle.close
