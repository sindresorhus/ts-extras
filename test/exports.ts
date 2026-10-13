/* eslint-disable require-unicode-regexp, regexp/sort-character-class-elements -- These patterns read the source as text, where a `v` flag and reordering only add noise. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const sourceDirectory = fileURLToPath(new URL('../source/', import.meta.url));
const index = readFileSync(sourceDirectory + 'index.ts', 'utf8');

// Modules that are internal by design and are not part of the public surface.
const internalModules: ReadonlySet<string> = new Set(['internal-types', 'internal-proto', 'describe-value']);

function sourceFiles(): string[] {
	return readdirSync(sourceDirectory).filter(file => file.endsWith('.ts') && !file.startsWith('.'));
}

/**
Every exported name of a public module, and every name the entry point re-exports.
*/
function names(text: string, patterns: RegExp[]): string[] {
	const found: string[] = [];

	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern)) {
			found.push(match[1]!);
		}
	}

	return found;
}

function moduleExports(file: string): string[] {
	return names(readFileSync(sourceDirectory + file, 'utf8'), [
		/^export (?:declare )?(?:async )?function (\w+)/gm,
		/^export const (\w+)/gm,
		/^export type (\w+)/gm,
		/^export class (\w+)/gm,
	]);
}

function indexExports(): Array<{name: string; from: string}> {
	const entries: Array<{name: string; from: string}> = [];

	for (const match of index.matchAll(/export (?:type )?\{([\w\s,]+)\} from '\.\/(\S+?)'/g)) {
		for (const raw of match[1]!.split(',')) {
			const name = raw.trim();
			if (name !== '') {
				entries.push({name, from: match[2]!});
			}
		}
	}

	return entries;
}

test('every public module export is re-exported from the entry point', () => {
	const exported = new Set(indexExports().map(entry => entry.name));
	const missing: string[] = [];

	for (const file of sourceFiles()) {
		if (internalModules.has(file.replace(/\.ts$/, ''))) {
			continue;
		}

		for (const name of moduleExports(file)) {
			if (!exported.has(name)) {
				missing.push(`${file} exports ${name}`);
			}
		}
	}

	assert.deepEqual(missing, []);
});

test('the entry point re-exports nothing that no module exports', () => {
	const declared = new Set(sourceFiles().flatMap(file => moduleExports(file)));
	const orphan = indexExports().filter(entry => !declared.has(entry.name)).map(entry => entry.name);

	assert.deepEqual(orphan, []);
});

test('the entry point re-exports nothing from an internal module', () => {
	// An internal module is not public, so re-exporting from one puts something on the surface that the readme never lists and the other two checks accept, since the name is declared somewhere.
	const leaked = indexExports().filter(entry => internalModules.has(entry.from.replace(/\.js$/, ''))).map(entry => `${entry.name} from ${entry.from}`);

	assert.deepEqual(leaked, []);
});

test('every entry point re-export comes from a module that exists', () => {
	// A path that names no file passes both checks above: nothing is declared there, and nothing is missing from it either.
	const files = new Set(sourceFiles().map(file => file.replace(/\.ts$/, '')));
	const missing = indexExports().filter(entry => !files.has(entry.from.replace(/\.js$/, ''))).map(entry => entry.from);

	assert.deepEqual(missing, []);
});
