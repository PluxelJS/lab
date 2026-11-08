import { BasePlugin, Plugin } from '@pluxel/core'
import * as v from 'valibot'
import { WorkerRequest } from './request'

const StorageConfig = v.object({
	namespace: v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[a-z0-9_-]+$/)),
})

const NotesConfig = v.object({
	maxLength: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4096)),
})

@Plugin()
export class NoteStoragePlugin extends BasePlugin {
	private readonly config = this.configs.use(StorageConfig)
	private readonly request = this.ctx.require(WorkerRequest)

	protected override init() {
		if (!this.request.env.NOTES || typeof this.request.env.NOTES.get !== 'function')
			throw new Error('The NOTES KV binding is required')
		this.request.trace.push('storage:started')
		this.ctx.effects.defer(() => {
			this.request.trace.push('storage:closed')
		})
	}

	get(id: string) {
		return this.request.env.NOTES.get(`${this.config.namespace}:${id}`)
	}

	put(id: string, text: string) {
		return this.request.env.NOTES.put(`${this.config.namespace}:${id}`, text)
	}

	delete(id: string) {
		return this.request.env.NOTES.delete(`${this.config.namespace}:${id}`)
	}
}

@Plugin()
export class NotesPlugin extends BasePlugin {
	private readonly config = this.configs.use(NotesConfig)

	constructor(private readonly storage: NoteStoragePlugin) {
		super()
	}

	protected override init() {
		const context = this.ctx.require(WorkerRequest)
		context.trace.push('notes:started')
		context.handle = (request) => this.handle(request)
		this.ctx.effects.defer(() => {
			context.handle = undefined
			context.trace.push('notes:closed')
		})
	}

	private async handle(request: Request): Promise<Response> {
		const { pathname } = new URL(request.url)
		if (pathname === '/' && request.method === 'GET')
			return Response.json({
				demo: 'Pluxel on Cloudflare Workers',
				routes: ['GET /notes/:id', 'PUT /notes/:id {"text":"..."}', 'DELETE /notes/:id'],
			})
		const match = /^\/notes\/([a-zA-Z0-9_-]{1,64})$/.exec(pathname)
		if (!match) return Response.json({ error: 'not_found' }, { status: 404 })
		const id = match[1]!
		switch (request.method) {
			case 'GET': {
				const text = await this.storage.get(id)
				return text === null
					? Response.json({ error: 'not_found' }, { status: 404 })
					: Response.json({ id, text })
			}
			case 'PUT': {
				let input: unknown
				try {
					input = await request.json()
				} catch {
					return Response.json({ error: 'invalid_json' }, { status: 400 })
				}
				const parsed = v.safeParse(
					v.strictObject({
						text: v.pipe(v.string(), v.minLength(1), v.maxLength(this.config.maxLength)),
					}),
					input,
				)
				if (!parsed.success) return Response.json({ error: 'invalid_note' }, { status: 400 })
				await this.storage.put(id, parsed.output.text)
				return Response.json({ id, text: parsed.output.text })
			}
			case 'DELETE':
				await this.storage.delete(id)
				return new Response(null, { status: 204 })
			default:
				return Response.json(
					{ error: 'method_not_allowed' },
					{
						status: 405,
						headers: { Allow: 'GET, PUT, DELETE' },
					},
				)
		}
	}
}
