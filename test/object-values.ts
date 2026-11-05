import {test} from 'node:test';
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {
	objectEntries,
	objectKeys,
	objectValues,
	type ObjectKeys,
} from '../source/index.js';

interface TestInterface {
	e: string;
	f: number;
}

test('objectValues()', () => {
	const values = objectValues({
		a: 1,
		b: 'hello',
		c: true,
		[Symbol('symbolKey')]: null,
	});

	expectTypeOf(values).toEqualTypeOf<Array<number | string | boolean>>();
	assert.deepEqual(values, [1, 'hello', true]);
});

test('objectValues() - array', () => {
	const values = objectValues([1, 2]);

	expectTypeOf(values).toEqualTypeOf<number[]>();
	assert.deepEqual(values, [1, 2]);
});

test('objectValues() - array preserves negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const values = objectValues(array);

	expectTypeOf(values).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(values, [1, 'hello']);
});

test('objectValues() - array treats named own keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: string};
	array.foo = 'hello';

	const values = objectValues(array);

	expectTypeOf(values).toEqualTypeOf<number[]>();
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	const typedValue: string = values[2];

	void typedValue;
	assert.deepEqual(values, [1, 2, 'hello']);
});

test('objectValues() - array subclass prototype accessors are excluded from typing', () => {
	class ExtendedArray extends Array<number> {
		get value(): number {
			return 3;
		}
	}

	const values = objectValues(new ExtendedArray(1, 2));

	expectTypeOf(values).toEqualTypeOf<number[]>();
	assert.deepEqual(values, [1, 2]);
});

test('objectValues() - tuple', () => {
	const values = objectValues([1, 'a'] as const);

	expectTypeOf(values).toEqualTypeOf<Array<1 | 'a'>>();
	assert.deepEqual(values, [1, 'a']);
});

test('objectValues() - variadic tuple', () => {
	const values = objectValues([1, 2, 3] as [1, ...number[]]);

	expectTypeOf(values).toEqualTypeOf<number[]>();
	assert.deepEqual(values, [1, 2, 3]);
});

test('objectValues() - variadic tuple preserves named extra keys', () => {
	const values = objectValues(Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'}));

	expectTypeOf(values).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(values, [1, 2, 'hello']);
});

test('objectValues() - runtime still includes unsupported Array member-name shadows', () => {
	const values = objectValues(Object.assign([1, 2] as [1, 2], {map: Array.prototype.map}));

	assert.deepEqual(values, [1, 2, Array.prototype.map]);
});

test('objectValues() - runtime still includes unsupported mutable Array member-name shadows', () => {
	const values = objectValues(Object.assign([1, 2] as [1, 2], {sort: 'hello', fill: 'world', copyWithin: 'again'}));

	assert.deepEqual(values, [1, 2, 'hello', 'world', 'again']);
});

test('objectValues() - variadic tuple preserves numeric-like extra keys', () => {
	const values = objectValues(Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'}));

	expectTypeOf(values).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(values, [1, 2, 'hello']);
});

test('objectValues() - interface', () => {
	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const values = objectValues(interfaceInput);
	expectTypeOf(values).toEqualTypeOf<Array<string | number>>();
	assert.deepEqual(values, ['a', 1]);
});

test('objectValues() - optional property', () => {
	type Foo = {
		a?: string;
	};

	const x: Foo = {};
	const values = objectValues(x);
	expectTypeOf(values).toEqualTypeOf<string[]>();
	assert.deepEqual(values, []);
});

// Typed arrays and `Buffer` are indexed collections rather than arrays, but `Object.values()` treats them the same way: only the element values come back. Everything else on their `keyof` (`byteLength`, `subarray`, the rest of the prototype) lives on the prototype, so it can never be an own value.
test('objectValues() - typed arrays and Buffer', () => {
	const bytes = new Uint8Array([1, 2]);
	const byteValues = objectValues(bytes);
	expectTypeOf(byteValues).toEqualTypeOf<number[]>();
	assert.deepEqual(byteValues, [1, 2]);

	const bigints = new BigInt64Array([1n, 2n]);
	expectTypeOf(objectValues(bigints)).toEqualTypeOf<bigint[]>();
	assert.deepEqual(objectValues(bigints), [1n, 2n]);

	const buffer = Buffer.from([1, 2]);
	expectTypeOf(objectValues(buffer)).toEqualTypeOf<number[]>();
	assert.deepEqual(objectValues(buffer), [1, 2]);

	// A `DataView` is an `ArrayBufferView` but has no indices, so it is not an indexed collection and keeps the conservative object typing. The runtime result is empty.
	const dataView = new DataView(new ArrayBuffer(8));
	expectTypeOf(objectValues(dataView)).not.toEqualTypeOf<never[]>();
	assert.deepEqual(objectValues(dataView), []);
});

test('objectValues() does not add `undefined` for an optional property', () => {
	// Regression: `Object.values()` skips an absent key, so the `undefined` an optional property implies is never returned. Keeping it broke this common pattern, which v1.3.0 accepted.
	const counts: Partial<Record<'a' | 'b', number>> = {a: 1, b: 2};
	const values = objectValues(counts);

	expectTypeOf(values).toEqualTypeOf<number[]>();
	assert.equal(values.reduce((sum, count) => sum + count, 0), 3);

	// Boundary: without `exactOptionalPropertyTypes`, TypeScript cannot tell `a?: string` from `a?: string | undefined`, so an explicit `undefined` value is not described.
	const object: {a?: string} = {a: undefined};
	expectTypeOf(objectValues(object)).toEqualTypeOf<string[]>();
	assert.deepEqual(objectValues(object), [undefined]);

	// A generic input stays readable.
	function total<Type extends Partial<Record<'a' | 'b', number>>>(value: Type): number {
		let sum = 0;
		for (const count of objectValues(value)) {
			sum += count;
		}

		return sum;
	}

	assert.equal(total(counts), 3);

	// A required property is unaffected.
	expectTypeOf(objectValues({a: 1, b: 'x'})).toEqualTypeOf<Array<number | string>>();
});

test('objectValues() - a plain object is not mistaken for an ArrayBufferView', () => {
	// `{buffer, byteLength, byteOffset}` is structurally an `ArrayBufferView`, but a real view also stores its elements as indexed own properties, which this does not. Treating it as one would report no values at all for an object that has three.
	type Header = {buffer: ArrayBuffer; byteLength: number; byteOffset: number};
	const header: Header = {buffer: new ArrayBuffer(8), byteLength: 8, byteOffset: 0};

	const values = objectValues(header);
	expectTypeOf(values).toEqualTypeOf<Array<ArrayBuffer | number>>();
	assert.deepEqual(objectKeys(header), ['buffer', 'byteLength', 'byteOffset']);
	assert.equal(values.length, 3);
});

test('object utilities preserve named fields on array-like buffer descriptors', () => {
	type Header = {buffer: ArrayBuffer; byteLength: number; byteOffset: number; length: number; [index: number]: number};
	type HeaderKey = `${number}` | 'buffer' | 'byteLength' | 'byteOffset' | 'length';
	const header: Header = {
		0: 42, buffer: new ArrayBuffer(8), byteLength: 8, byteOffset: 0, length: 1,
	};
	const values = objectValues(header);
	const keys = objectKeys(header);
	const entries = objectEntries(header);

	expectTypeOf(values).toEqualTypeOf<Array<ArrayBuffer | number>>();
	expectTypeOf(keys).toEqualTypeOf<HeaderKey[]>();
	expectTypeOf(entries).toEqualTypeOf<Array<[HeaderKey, ArrayBuffer | number]>>();
	expectTypeOf<ObjectKeys<Header>>().toEqualTypeOf<HeaderKey>();
	assert.deepEqual(values, [42, header.buffer, 8, 0, 1]);
	assert.deepEqual(keys, ['0', 'buffer', 'byteLength', 'byteOffset', 'length']);
	assert.deepEqual(entries, Object.entries(header));
});

test('objectValues() keeps the value types of a union', () => {
	// `keyof` a union is the intersection of its members' keys, but the values have to be gathered per member. Indexing the whole union with a key no single member has would degrade to `unknown`, which would force every caller to cast.
	const object = {a: 1} as {a: number} | {b: string};
	const values = objectValues(object);

	expectTypeOf(values).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(objectValues({a: 1} as {a: number} | {b: string}), [1]);
	assert.deepEqual(objectValues({b: 'x'} as {a: number} | {b: string}), ['x']);
});

test('objectValues() reports no values for a type whose only keys are symbols', () => {
	// `Object.keys()` skips symbols, and `objectKeys()` reports no keys here, so `objectValues()` must not report a value either. Indexing the type with the `never` key set would resolve to the symbol index signature's value type, which would claim a value for a value that has none.
	const object: {[key: symbol]: number} = {[Symbol('a')]: 1};

	expectTypeOf(objectKeys(object)).toEqualTypeOf<never[]>();
	expectTypeOf(objectValues(object)).toEqualTypeOf<never[]>();
	assert.deepEqual(objectValues(object), []);
});

test('objectValues() keeps the array path for a union that holds one', () => {
	const mixed = {a: 1} as {a: number} | string[];

	expectTypeOf(objectValues(mixed)).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(objectValues({a: 1} as {a: number} | string[]), [1]);
	assert.deepEqual(objectValues(['a'] as string[] | {a: number}), ['a']);

	const withBytes = {a: 1} as {a: number} | Uint8Array;
	expectTypeOf(objectValues(withBytes)).toEqualTypeOf<Array<number>>();
});

test('objectValues() takes a primitive string the way the builtin does', () => {
	const values = objectValues('ab');

	expectTypeOf(values).toEqualTypeOf<string[]>();
	assert.deepEqual(values, ['a', 'b']);
	assert.deepEqual(objectValues(''), []);
});
