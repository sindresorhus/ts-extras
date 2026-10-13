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

	expectTypeOf(entries).toEqualTypeOf<Entry[]>();
	assert.deepEqual(entries, [['1', 123], ['stringKey', 'someString']]);
});

test('objectEntries() - array', () => {
	const entries = objectEntries([1, 2]);

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number]>>();
	assert.deepEqual(entries, [['0', 1], ['1', 2]]);
});

test('objectEntries() - array preserves negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const entries = objectEntries(array);

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number | string]>>();
	assert.deepEqual(entries, [['0', 1], ['-1', 'hello']]);
});

test('objectEntries() - array treats named own keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: string};
	array.foo = 'hello';

	const entries = objectEntries(array);

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number]>>();
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

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number]>>();
	assert.deepEqual(entries, [['0', 1], ['1', 2]]);
});

test('objectEntries() - tuple', () => {
	const entries = objectEntries([1, 'a'] as const);

	expectTypeOf(entries).toEqualTypeOf<Array<['0' | '1', 1 | 'a']>>();
	assert.deepEqual(entries, [['0', 1], ['1', 'a']]);
});

test('objectEntries() - variadic tuple', () => {
	const entries = objectEntries([1, 2, 3] as [1, ...number[]]);

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number]>>();
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['2', 3]]);
});

test('objectEntries() - variadic tuple preserves named extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'});
	const entries = objectEntries(tuple);

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}` | 'foo', number | string]>>();
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

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, number | string]>>();
	assert.deepEqual(entries, [['0', 1], ['1', 2], ['-1', 'hello']]);
});

test('objectEntries() - optional property', () => {
	type Foo = {
		a?: string;
	};

	const x: Foo = {};
	const entries = objectEntries(x);
	expectTypeOf(entries).toEqualTypeOf<Array<['a', string]>>();
	expectTypeOf(entries[0]).toEqualTypeOf<['a', string] | undefined>();
	assert.deepEqual(entries, []);
});

test('objectEntries() - interface support', () => {
	interface TestInterface {
		e: string;
		f: number;
	}

	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const entries = objectEntries(interfaceInput);
	expectTypeOf(entries).toEqualTypeOf<Array<['e' | 'f', string | number]>>();
	assert.deepEqual(entries, [['e', 'a'], ['f', 1]]);
});

// See `test/object-values.ts` for the same case; only the element indices and values are own entries of a typed array or `Buffer`, never the prototype members that dominate their `keyof`.
test('objectEntries() with typed arrays and Buffer', () => {
	const bytes = new Uint8Array([1, 2]);
	const byteEntries = objectEntries(bytes);
	expectTypeOf(byteEntries).toEqualTypeOf<Array<[`${number}`, number]>>();
	assert.deepEqual(byteEntries, [['0', 1], ['1', 2]]);

	const bigints = new BigInt64Array([1n]);
	expectTypeOf(objectEntries(bigints)).toEqualTypeOf<Array<[`${number}`, bigint]>>();
	assert.deepEqual(objectEntries(bigints), [['0', 1n]]);

	// A `DataView` has no indices, so it keeps the conservative object typing.
	const dataView = new DataView(new ArrayBuffer(8));
	expectTypeOf(objectEntries(dataView)).not.toEqualTypeOf<Array<[`${number}`, never]>>();
	assert.deepEqual(objectEntries(dataView), []);
});

test('objectEntries() does not add `undefined` for an optional property', () => {
	// Regression: see the same test in `test/object-values.ts`.
	const counts: Partial<Record<'a' | 'b', number>> = {a: 1};
	const entries = objectEntries(counts);

	expectTypeOf(entries).toEqualTypeOf<Array<['a' | 'b', number]>>();
	assert.deepEqual(entries.map(([key, count]) => `${key}${count.toFixed(0)}`), ['a1']);

	// A required property is unaffected.
	expectTypeOf(objectEntries({a: 1, b: 'x'})).toEqualTypeOf<Array<['a' | 'b', number | string]>>();
});

test('objectEntries() keeps the value types of a union', () => {
	// The key side is already gathered per member, so the value side has to be too. Indexing the whole union would degrade the values to `unknown`.
	const object = {a: 1} as {a: number} | {b: string};
	const entries = objectEntries(object);

	expectTypeOf(entries).toEqualTypeOf<Array<['a' | 'b', number | string]>>();
	assert.deepEqual(objectEntries({a: 1} as {a: number} | {b: string}), [['a', 1]]);
	assert.deepEqual(objectEntries({b: 'x'} as {a: number} | {b: string}), [['b', 'x']]);
});

test('objectEntries() reports no entries for a type whose only keys are symbols', () => {
	const object: {[key: symbol]: number} = {[Symbol('a')]: 1};

	// An empty array of entries: the key and the value are both unnameable, which is the honest description of a value `Object.entries()` returns no rows for.
	expectTypeOf(objectEntries(object)).toEqualTypeOf<Array<[never, never]>>();
	assert.deepEqual(objectEntries(object), []);
});

test('objectEntries() keeps the array path for a union that holds one', () => {
	const mixed = {a: 1} as {a: number} | string[];

	expectTypeOf(objectEntries(mixed)).toEqualTypeOf<Array<[`${number}` | 'a', number | string]>>();
	assert.deepEqual(objectEntries({a: 1} as {a: number} | string[]), [['a', 1]]);
	assert.deepEqual(objectEntries(['a'] as string[] | {a: number}), [['0', 'a']]);
});

test('objectEntries() takes a primitive string the way the builtin does', () => {
	const entries = objectEntries('ab');

	expectTypeOf(entries).toEqualTypeOf<Array<[`${number}`, string]>>();
	assert.deepEqual(entries, [['0', 'a'], ['1', 'b']]);
	assert.deepEqual(objectEntries(''), []);
});

test('objectEntries() reports string keys for an any value', () => {
	// Regression guard: `any` matched the array overload first and reported only numeric keys.
	const value: any = JSON.parse('{"foo": 1}');
	const entries = objectEntries(value);

	expectTypeOf(entries).toEqualTypeOf<Array<[string, any]>>();
	assert.deepEqual(entries, [['foo', 1]]);
});
