import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { Miniflare } from 'miniflare'

const config = JSON.parse(await readFile(new URL('../wrangler.json', import.meta.url), 'utf8'))
const contents = await readFile(new URL('../dist/worker.mjs', import.meta.url), 'utf8')
const completeLifecycle = [
	'host:prepared',
	'storage:started',
	'notes:started',
	'notes:closed',
	'storage:closed',
	'host:closed',
].join(', ')

async function start(t, { vars = {}, kv = true } = {}) {
	const logs = []
	const runtime = new Miniflare({
		host: '127.0.0.1',
		port: 0,
		handleStructuredLogs: (log) => logs.push(log),
		workers: [
			{
				config: {
					name: config.name,
					compatibilityDate: config.compatibility_date,
					compatibilityFlags: config.compatibility_flags ?? [],
					manifest: {
						mainModule: 'worker.mjs',
						modules: { 'worker.mjs': { type: 'esm', contents } },
					},
					env: {
						...Object.fromEntries(
							Object.entries({ ...config.vars, ...vars }).map(([key, value]) => [
								key,
								typeof value === 'string' ? { type: 'text', value } : { type: 'json', value },
							]),
						),
						...(kv ? { NOTES: { type: 'kv', id: 'notes-test' } } : {}),
					},
				},
			},
		],
	})
	t.after(async () => {
		await runtime.dispose()
		for (const log of logs.filter((log) => log.level === 'error')) t.diagnostic(log.message)
	})
	const origin = await runtime.ready
	return { runtime, request: (path, init) => fetch(new URL(path, origin), init) }
}

function assertClosed(response, status = 200) {
	assert.equal(response.status, status)
	assert.equal(response.headers.get('X-Pluxel-Lifecycle'), completeLifecycle)
}

const put = (text) => ({
	method: 'PUT',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ text }),
})

test('concurrent cold requests initialize the bundle and close separate plugin graphs', async (t) => {
	const { request } = await start(t)
	const responses = await Promise.all(Array.from({ length: 8 }, () => request('/')))
	for (const response of responses) {
		assertClosed(response)
		assert.equal((await response.json()).demo, 'Pluxel on Cloudflare Workers')
	}
})

test('native KV survives Host disposal and supports read/write/delete across requests', async (t) => {
	const { request, runtime } = await start(t)
	const written = await request('/notes/hello', put('你好，Pluxel 🌏'))
	assertClosed(written)
	assert.deepEqual(await written.json(), { id: 'hello', text: '你好，Pluxel 🌏' })
	const kv = await runtime.getKVNamespace('NOTES')
	assert.equal(await kv.get('lab:hello'), '你好，Pluxel 🌏')
	const read = await request('/notes/hello')
	assertClosed(read)
	assert.deepEqual(await read.json(), { id: 'hello', text: '你好，Pluxel 🌏' })
	const removed = await request('/notes/hello', { method: 'DELETE' })
	assertClosed(removed, 204)
	assert.equal(await removed.text(), '')
	assert.equal(await kv.get('lab:hello'), null)
	const missing = await request('/notes/hello')
	assertClosed(missing, 404)
	assert.deepEqual(await missing.json(), { error: 'not_found' })
})

test('concurrent requests keep response handlers and KV values isolated', async (t) => {
	const { request } = await start(t)
	await Promise.all(
		Array.from({ length: 8 }, async (_, index) => {
			const id = `note-${index}`
			const text = `value-${index}`
			const response = await request(`/notes/${id}`, put(text))
			assertClosed(response)
			assert.deepEqual(await response.json(), { id, text })
			const read = await request(`/notes/${id}`)
			assertClosed(read)
			assert.deepEqual(await read.json(), { id, text })
		}),
	)
})

test('HTTP input failures leave KV untouched and still release the Host', async (t) => {
	const { request, runtime } = await start(t)
	for (const body of ['{', '{}', '{"text":""}', '{"text":12}', '{"text":"ok","extra":true}']) {
		const response = await request('/notes/rejected', { method: 'PUT', body })
		assertClosed(response, 400)
		assert.match((await response.json()).error, /^invalid_(json|note)$/)
	}
	const badPath = await request('/notes/a/b', put('no'))
	assertClosed(badPath, 404)
	await badPath.arrayBuffer()
	const badMethod = await request('/notes/rejected', { method: 'POST' })
	assertClosed(badMethod, 405)
	assert.equal(badMethod.headers.get('Allow'), 'GET, PUT, DELETE')
	await badMethod.arrayBuffer()
	assert.deepEqual((await (await runtime.getKVNamespace('NOTES')).list()).keys, [])
})

test('deployment vars reach both validated plugin configurations', async (t) => {
	const { request, runtime } = await start(t, { vars: { NAMESPACE: 'custom', MAX_NOTE_LENGTH: 3 } })
	const response = await request('/notes/small', put('abc'))
	assertClosed(response)
	await response.arrayBuffer()
	const rejected = await request('/notes/large', put('abcd'))
	assertClosed(rejected, 400)
	assert.deepEqual(await rejected.json(), { error: 'invalid_note' })
	const kv = await runtime.getKVNamespace('NOTES')
	assert.equal(await kv.get('custom:small'), 'abc')
	assert.equal(await kv.get('lab:small'), null)
	assert.equal(await kv.get('custom:large'), null)
})

test('invalid plugin configuration rejects startup and closes prepared resources', async (t) => {
	const { request, runtime } = await start(t, { vars: { MAX_NOTE_LENGTH: 0 } })
	const response = await request('/notes/rejected', put('no'))
	assert.equal(response.status, 500)
	assert.deepEqual(await response.json(), { error: 'host_failed' })
	const lifecycle = response.headers.get('X-Pluxel-Lifecycle')
	assert.equal(lifecycle, 'host:prepared, storage:started, storage:closed, host:closed')
	assert.deepEqual((await (await runtime.getKVNamespace('NOTES')).list()).keys, [])
})

test('missing platform binding fails explicitly without an in-memory substitute', async (t) => {
	const { request } = await start(t, { kv: false })
	const response = await request('/')
	assert.equal(response.status, 500)
	assert.deepEqual(await response.json(), { error: 'host_failed' })
	assert.equal(response.headers.get('X-Pluxel-Lifecycle'), 'host:prepared, host:closed')
})
