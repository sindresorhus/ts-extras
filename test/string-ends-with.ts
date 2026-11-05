import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {stringEndsWith} from '../source/index.js';

test('stringEndsWith() matches String#endsWith()', () => {
	assert.equal(stringEndsWith('index.ts', '.ts'), true);
	assert.equal(stringEndsWith('index.js', '.ts'), false);
	assert.equal(stringEndsWith('anything', ''), true);
	assert.equal(stringEndsWith('index.tsx', '.ts', 8), true);
	assert.equal(stringEndsWith('index.ts', '.ts', 7), false);
});

test('stringEndsWith() narrows a union of literals in both branches', () => {
	type File = 'index.ts' | 'index.js' | 'readme.md';

	function check(file: File) {
		if (stringEndsWith(file, '.ts')) {
			expectTypeOf(file).toEqualTypeOf<'index.ts'>();
			return 'typescript';
		}

		expectTypeOf(file).toEqualTypeOf<'index.js' | 'readme.md'>();
		return 'other';
	}

	assert.equal(check('index.ts'), 'typescript');
	assert.equal(check('readme.md'), 'other');
});

test('stringEndsWith() keeps the whole union in the false branch when no member matches', () => {
	const file = 'readme.md' as 'index.ts' | 'readme.md';

	if (stringEndsWith(file, '.js')) {
		expectTypeOf(file).toBeNever();
	} else {
		expectTypeOf(file).toEqualTypeOf<'index.ts' | 'readme.md'>();
	}
});

test('stringEndsWith() narrows a wide string to a template literal', () => {
	const id: string = 'userId';

	if (stringEndsWith(id, 'Id')) {
		expectTypeOf(id).toEqualTypeOf<`${string}Id`>();
	} else {
		expectTypeOf(id).toEqualTypeOf<string>();
	}
});

test('stringEndsWith() returns a boolean for a search string that is not one literal', () => {
	type File = 'index.ts' | 'readme.md';
	const file = 'readme.md' as File;

	const suffix = '.md' as '.ts' | '.md';
	expectTypeOf(stringEndsWith(file, suffix)).toEqualTypeOf<boolean>();
	if (!stringEndsWith(file, suffix)) {
		expectTypeOf(file).toEqualTypeOf<File>();
	}

	const wideSuffix: string = '.ts';
	expectTypeOf(stringEndsWith(file, wideSuffix)).toEqualTypeOf<boolean>();

	const templateSuffix = '.md' as `${string}d`;
	expectTypeOf(stringEndsWith(file, templateSuffix)).toEqualTypeOf<boolean>();

	// An end position cuts the string, so the suffix is not at the end of it.
	expectTypeOf(stringEndsWith(file, '.ts', 5)).toEqualTypeOf<boolean>();
});

test('stringEndsWith() narrows in a filter callback', () => {
	const files = ['index.ts', 'readme.md', 'cli.ts'] as const;
	const sources = files.filter(file => stringEndsWith(file, '.ts'));

	expectTypeOf(sources).toEqualTypeOf<Array<'index.ts' | 'cli.ts'>>();
	assert.deepEqual(sources, ['index.ts', 'cli.ts']);
});

test('stringEndsWith() does not narrow for a branded literal suffix', () => {
	type File = 'index.ts' | 'readme.md';
	const suffix = '.ts' as '.ts' & {readonly brand: unique symbol};

	function check(file: File) {
		if (stringEndsWith(file, suffix)) {
			expectTypeOf(file).toEqualTypeOf<File>();
			return true;
		}

		expectTypeOf(file).toEqualTypeOf<File>();
		return false;
	}

	assert.equal(check('index.ts'), true);
	assert.equal(check('readme.md'), false);

	const files: File[] = ['index.ts', 'readme.md'];
	const sources = files.filter(file => stringEndsWith(file, suffix));
	expectTypeOf(sources).toEqualTypeOf<File[]>();
	assert.deepEqual(sources, ['index.ts']);
});
