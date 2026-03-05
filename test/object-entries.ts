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

test('objectEntries() - array preserves negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const entries = objectEntries(array);

	expectTypeOf<Array<[`${number}`, number | string]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['-1', 'hello']]);
});

test('objectEntries() - array treats named own keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: string};
	array.foo = 'hello';

	const entries = objectEntries(array);

	expectTypeOf<Array<[`${number}`, number]>>(entries);
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	const typedEntries: Array<['0' | '1' | 'foo', number | string]> = entries;

	void typedEntries;
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['foo', 'hello']]);
});

test('objectEntries() - array subclass prototype accessors are excluded from typing', () => {
	class ExtendedArray extends Array<number> {
		get value(): number {
			return 3;
		}
	}

	const entries = objectEntries(new ExtendedArray(1, 2));

	expectTypeOf<Array<[`${number}`, number]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 2]]);
});

test('objectEntries() - tuple', () => {
	const entries = objectEntries([1, 'a'] as const);

	expectTypeOf<Array<['0' | '1', 1 | 'a']>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 'a']]);
});

test('objectEntries() - variadic tuple', () => {
	const entries = objectEntries([1, 2, 3] as [1, ...number[]]);

	expectTypeOf<Array<[`${number}`, number]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['2', 3]]);
});

test('objectEntries() - variadic tuple preserves named extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'});
	const entries = objectEntries(tuple);

	expectTypeOf<Array<[`${number}` | 'foo', number | string]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['foo', 'hello']]);
});

test('objectEntries() - runtime still includes unsupported Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {map: Array.prototype.map});
	const entries = objectEntries(tuple);

	assert.deepEqual(entries, [['0', 1], ['1', 2], ['map', Array.prototype.map]]);
});

test('objectEntries() - runtime still includes unsupported mutable Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {sort: 'hello', fill: 'world', copyWithin: 'again'});
	const entries = objectEntries(tuple);

	assert.deepEqual(entries, [['0', 1], ['1', 2], ['sort', 'hello'], ['fill', 'world'], ['copyWithin', 'again']]);
});

test('objectEntries() - variadic tuple preserves numeric-like extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'});
	const entries = objectEntries(tuple);

	expectTypeOf<Array<[`${number}`, number | string]>>(entries);
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['-1', 'hello']]);
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
