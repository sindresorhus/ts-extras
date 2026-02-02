import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectEntries} from '../source/index.js';

test('objectEntries()', () => {
	type Entry = ['1' | 'stringKey', number | string];

	const entries = objectEntries({
		1: 123,
		stringKey: 'someString',
		[Symbol('symbolKey')]: true,
	});

	expectTypeOf<Entry[]>(entries);
	assert.deepEqual(entries, [['1', 123], ['stringKey', 'someString']]);
});

test('objectEntries() - array', () => {
	const entries = objectEntries([1, 2]);

	expectTypeOf<Array<[`${number}`, number]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 2]]);
});

test('objectEntries() - tuple', () => {
	const entries = objectEntries([1, 'a'] as const);

	expectTypeOf<Array<['0' | '1', 1 | 'a']>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 'a']]);
});

// Optional property
{
	type Foo = {
		a?: string;
	};

	const x: Foo = {};
	const entries = objectEntries(x);
	expectTypeOf<Array<['a', string]>>(entries);

	expectTypeOf<['a', string] | undefined>(entries[0]);
}

// Interface support
{
	interface TestInterface {
		e: string;
		f: number;
	}

	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const entries = objectEntries(interfaceInput);
	expectTypeOf<Array<['e' | 'f', string | number]>>(entries);
}
