import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {expectTypeOf} from 'expect-type';
import {arrayIsArray} from '../source/index.js';

test('arrayIsArray() matches Array.isArray()', () => {
	for (const value of [[], [1], Array.from({length: 2}), runInNewContext('[1, 2]'), new Proxy([], {})]) {
		assert.equal(arrayIsArray(value), true);
	}

	for (const value of [undefined, null, 'ab', {length: 0}, new Uint8Array(1), new Set([1])]) {
		assert.equal(arrayIsArray(value), false);
	}
});

test('arrayIsArray() keeps a readonly array type', () => {
	function check(value: string | readonly string[]) {
		if (arrayIsArray(value)) {
			expectTypeOf(value).toEqualTypeOf<readonly string[]>();
			return value.length;
		}

		expectTypeOf(value).toEqualTypeOf<string>();
		return -1;
	}

	assert.equal(check(['a', 'b']), 2);
	assert.equal(check('ab'), -1);
});

test('arrayIsArray() keeps the element type of a mutable array', () => {
	function check(value: number | number[]) {
		if (arrayIsArray(value)) {
			expectTypeOf(value).toEqualTypeOf<number[]>();
			return value;
		}

		expectTypeOf(value).toEqualTypeOf<number>();
		return [value];
	}

	assert.deepEqual(check(1), [1]);
});

test('arrayIsArray() narrows unknown and other wide types to their array part', () => {
	const value: unknown = ['a'];
	if (arrayIsArray(value)) {
		expectTypeOf(value).toEqualTypeOf<unknown[]>();
	} else {
		expectTypeOf(value).toEqualTypeOf<unknown>();
	}

	const object: object = [1];
	if (arrayIsArray(object)) {
		expectTypeOf(object).toEqualTypeOf<object & unknown[]>();
	}

	const iterable = ['a'] as Iterable<string> | number;
	if (arrayIsArray(iterable)) {
		expectTypeOf(iterable).toEqualTypeOf<Iterable<string> & unknown[]>();
	} else {
		// An iterable that is not an array also takes this branch.
		expectTypeOf(iterable).toEqualTypeOf<Iterable<string> | number>();
	}

	// A structural object member can hold an array with extra properties, so its array intersection remains possible.
	const shape = {a: 1} as string[] | {a: number};
	if (arrayIsArray(shape)) {
		expectTypeOf(shape).toEqualTypeOf<string[] | ({a: number} & unknown[])>();
	} else {
		expectTypeOf(shape).toEqualTypeOf<{a: number}>();
	}
});

test('arrayIsArray() keeps any', () => {
	const value: any = [1];
	if (arrayIsArray(value)) {
		expectTypeOf(value).toEqualTypeOf<any>();
	}
});

test('arrayIsArray() preserves structural types that can hold a tuple', () => {
	function checkEmpty(value: {length: 0}) {
		if (arrayIsArray(value)) {
			expectTypeOf(value).toEqualTypeOf<{length: 0} & unknown[]>();
			return true;
		}

		expectTypeOf(value).toEqualTypeOf<{length: 0}>();
		return false;
	}

	type SingleItem = ArrayLike<string> & {length: 1};
	function checkSingle(value: SingleItem) {
		if (arrayIsArray(value)) {
			expectTypeOf(value).toEqualTypeOf<SingleItem & unknown[]>();
			return value.length;
		}

		return 0;
	}

	const empty: [] = [];
	const tuple: [string] = ['hello'];
	assert.equal(checkEmpty(empty), true);
	assert.equal(checkEmpty({length: 0}), false);
	assert.equal(checkSingle(tuple), 1);
	assert.equal(checkSingle({0: 'hello', length: 1}), 0);
});

test('arrayIsArray() filters structural array-like types', () => {
	type SingleItem = ArrayLike<string> & {length: 1};
	const tuple: [string] = ['hello'];
	const values: Array<SingleItem | null> = [tuple, {0: 'hello', length: 1}, null];
	const direct = values.filter(arrayIsArray);
	const wrapped = values.filter(value => arrayIsArray(value));

	expectTypeOf(direct).toEqualTypeOf<Array<SingleItem & unknown[]>>();
	expectTypeOf(wrapped).toEqualTypeOf<Array<SingleItem & unknown[]>>();
	assert.deepEqual(direct, [tuple]);
	assert.deepEqual(wrapped, direct);
});

test('arrayIsArray() narrows when passed directly to filter', () => {
	const values: Array<string | number[]> = ['a', [1], [2, 3]];
	const direct = values.filter(arrayIsArray);
	const wrapped = values.filter(value => arrayIsArray(value));

	expectTypeOf(direct).toEqualTypeOf<number[][]>();
	expectTypeOf(wrapped).toEqualTypeOf<number[][]>();
	assert.deepEqual(direct, [[1], [2, 3]]);
	assert.deepEqual(wrapped, direct);
});

test('arrayIsArray() keeps a deferred part for an unconstrained type parameter', () => {
	// Boundary: the part for a bare `T` cannot be computed until `T` is known, so the result is not assignable to `T[]`. This is documented. The builtin compiles here only because it answers `any[]`.
	function arrify<T>(value: T | T[]): T[] {
		// @ts-expect-error - `T[] | ArrayMembers<T>` is not assignable to `T[]`.
		return arrayIsArray(value) ? value : [value];
	}

	// A constrained type parameter resolves.
	function arrifyConstrained<T extends string | number>(value: T | T[]): T[] {
		return arrayIsArray(value) ? value : [value];
	}

	assert.deepEqual(arrify('a'), ['a']);
	assert.deepEqual(arrifyConstrained(['a']), ['a']);
});
