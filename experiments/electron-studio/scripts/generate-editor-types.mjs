import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateDtsBundle } from 'dts-bundle-generator'
import ts from 'typescript-legacy'

const root = fileURLToPath(new URL('..', import.meta.url))
function declarationEntry(name) {
	const resolved = ts.resolveModuleName(
		name,
		join(root, 'editor-types.ts'),
		{ moduleResolution: ts.ModuleResolutionKind.Bundler },
		ts.sys,
	).resolvedModule
	if (!resolved?.resolvedFileName.match(/\.d\.[cm]?ts$/))
		throw new Error(`Missing public declarations for ${name}; build the source dependencies first`)
	return resolved.resolvedFileName
}
export async function generateEditorTypes() {
	const output = join(root, '.editor-generated')
	const types = join(output, 'public', 'types')
	const valibot = await readFile(declarationEntry('valibot'), 'utf8')
	await mkdir(output, { recursive: true })
	// The declaration bundler treats .d.mts inputs as source and appends .d again.
	// Typed re-exports keep resolution on the packages' public entry points.
	await Promise.all([
		writeFile(join(output, 'valibot-form.ts'), "export * from 'valibot-form'\n"),
		writeFile(join(output, 'typst-template.ts'), "export * from '@pluxel/plugin-typst/template'\n"),
	])
	const [valibotForm, typstTemplate] = generateDtsBundle(
		[
			{
				filePath: join(output, 'valibot-form.ts'),
				libraries: { importedLibraries: ['valibot'], inlinedLibraries: ['valibot-form'] },
				output: { noBanner: true, exportReferencedTypes: false },
			},
			{
				filePath: join(output, 'typst-template.ts'),
				libraries: { importedLibraries: ['valibot'], inlinedLibraries: ['@pluxel/plugin-typst'] },
				output: { noBanner: true, exportReferencedTypes: false },
			},
		],
		{ preferredConfigPath: join(root, 'tsconfig.json') },
	)
	if (!valibotForm) throw new Error('valibot-form declaration generation produced no output')
	if (!typstTemplate) throw new Error('Typst document declaration generation produced no output')
	await mkdir(types, { recursive: true })
	await Promise.all([
		writeFile(join(types, 'valibot.d.ts'), valibot),
		writeFile(join(types, 'typst-template.d.ts'), typstTemplate),
		writeFile(join(types, 'valibot-form.d.ts'), valibotForm),
		copyFile(
			join(root, 'node_modules/tm-grammars/grammars/typst.json'),
			join(output, 'typst.json'),
		),
		copyFile(
			join(root, 'node_modules/tm-themes/themes/vitesse-light.json'),
			join(output, 'vitesse-light.json'),
		),
	])
}
if (process.argv[1] && dirname(fileURLToPath(import.meta.url)) === dirname(process.argv[1]))
	await generateEditorTypes()
