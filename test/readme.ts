import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const readme = readFileSync(fileURLToPath(new URL('../readme.md', import.meta.url)), 'utf8');
const index = readFileSync(fileURLToPath(new URL('../source/index.ts', import.meta.url)), 'utf8');
const sourceDirectory = fileURLToPath(new URL('../source/', import.meta.url));

const entryPattern = /^- \[`(\w+)`\]\(source\/(\S+)\) - .*$/gmv;

function entries() {
	const found = [...readme.matchAll(entryPattern)].map(match => ({
		name: match[1]!,
		file: match[2]!,
		index: match.index,
	}));

	// Every check below iterates this list, so a pattern that stopped matching would empty it and leave them all passing over nothing. A readme this size cannot legitimately have no entries.
	assert.ok(found.length > 0, 'the readme pattern matched no entry at all');

	return found;
}

test('the readme lists every export exactly once', () => {
	// A type export is public too, so `export type {X} from` has to be matched as well.
	const exported = [...index.matchAll(/export (?:type )?\{(\w+)\} from/gv)].map(match => match[1]!);
	const listed = entries().map(entry => entry.name);

	assert.deepEqual([...listed].toSorted(), exported.toSorted());
});

test('every readme entry points at a real source file', () => {
	assert.ok(entries().length > 0);

	for (const {name, file} of entries()) {
		assert.ok(readFileSync(sourceDirectory + file, 'utf8').length > 0, `${name} links to missing ${file}`);
	}
});

// The categories the JSDoc block above each export declares. A comment documents the first export that follows it, which is the rule an editor follows, and a comment written on one line closes on the same line. A category is trimmed because the pattern is greedy over spaces, so a one-line comment captures a trailing one that a heading never has.
function categoriesFor(source: string): Map<string, string[]> {
	const declared = new Map<string, string[]>();
	let doc = '';
	let inDoc = false;
	for (const line of source.split('\n')) {
		if (inDoc) {
			doc += `\n${line}`;

			if (line.trim() === '*/') {
				inDoc = false;
			}

			continue;
		}

		if (line.startsWith('/**')) {
			doc = line;
			inDoc = !line.trimEnd().endsWith('*/');
			continue;
		}

		const isDeclaration = /^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|type|class|interface)\b/v.test(line);
		const name = /^export (?:declare )?(?:async )?(?:function|const|type) (\w+)\b/v.exec(line)?.[1];

		// TypeScript attaches a doc comment to the next declaration, even with a line comment between them. So a doc followed by a declaration that is not exported documents that declaration, and the export below gets no docs at all.
		if (isDeclaration && name === undefined && !line.startsWith('export ')) {
			doc = '';
			continue;
		}

		if (!name) {
			continue;
		}

		// The pattern is anchored and takes the rest of the line, so a `@category` inside an `@example` fence and a stray mention in prose are not mistaken for the tag. The leading `*` is optional because this repo's doc comments do not carry one, and without it in the alternation the check below would find nothing in any real file and pass vacuously.
		const categories = [...doc.matchAll(/^(?:\/\*\*|\s*\*)?\s*@category\s+(.+?)(?:\s*\*\/)?$/gmv)].map(match => match[1]!.trim());

		doc = '';

		// An overload set declares the same name more than once, and the later signature has no comment of its own. Recording nothing would erase what the first one said and the check would skip the entry, which is most of them here.
		if (categories.length > 0) {
			declared.set(name, categories);
		}
	}

	return declared;
}

test('categoriesFor() reads a one-line comment, an overload set, and neither fence nor prose', () => {
	const declared = categoriesFor([
		'/** @category General */',
		'export const one = 1;',
		'/**',
		' * @category Improved builtin',
		' * @category Type guard',
		' */',
		'export function two(): void;',
		'// The implementation repeats the signature and carries no comment of its own.',
		'export function two(a: number) {',
		'	return a;',
		'}',
		'/* A plain explanation, which documents nothing. */',
		'/** @category Type guard */',
		'export const three = 3;',
		'/**',
		' * @example',
		' * // @category Type guard',
		' * @category General',
		' */',
		'export const four = 4;',
		'// Use the @category General heading for this one.',
		'export const five = 5;',
		'',
	].join('\n'));

	// A doc comment on a declaration that is not exported documents that declaration, so its category must not be credited to the export below it. A comment in between does not change that.
	assert.equal(categoriesFor([
		'/** @category Type guard */',
		'type Internal = {a: number};',
		'export function leaked(): void;',
	].join('\n')).get('leaked'), undefined);
	assert.equal(categoriesFor([
		'/** @category Improved builtin */',
		'// An explanation of the helper type.',
		'type Internal = {a: number};',
		'export function misplaced(): void;',
	].join('\n')).get('misplaced'), undefined);

	assert.deepEqual(declared.get('one'), ['General']);
	assert.deepEqual(declared.get('two'), ['Improved builtin', 'Type guard']);
	assert.deepEqual(declared.get('three'), ['Type guard']);
	// A `@category` inside an example fence does not outrank the real one.
	assert.deepEqual(declared.get('four'), ['General']);
	assert.equal(declared.has('five'), false);
});

test('every readme entry sits under a heading it is categorised as', () => {
	// A function tagged with several categories is filed under the first one, which is the rule the readme follows for every builtin wrapper that is also a type guard.
	const headings = [...readme.matchAll(/^\*\*([\w ]+)\*\*$/gmv)].map(match => ({index: match.index, name: match[1]!.trim()}));

	const sectionAt = (position: number) => {
		let section = '';
		for (const heading of headings) {
			if (heading.index < position) {
				section = heading.name;
			}
		}

		return section;
	};

	for (const entry of entries()) {
		const declared = categoriesFor(readFileSync(sourceDirectory + entry.file, 'utf8'));
		const categories = declared.get(entry.name) ?? [];

		// A missing tag fails here rather than skipping the entry, so the check above cannot stop matching anything at all and still pass. Every public export is filed under a heading, so every one of them has to carry a tag for the comparison below to mean anything.
		assert.ok(categories.length > 0, `${entry.name} declares no @category`);

		const section = sectionAt(entry.index);
		assert.equal(
			categories[0],
			section,
			`${entry.name} is under "${section}" but its first category is "${categories.join(', ')}"`,
		);
	}
});
