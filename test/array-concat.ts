import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayConcat} from '../source/index.js';

test('arrayConcat() with arrays of different types', () => {
	const strings = ['a', 'b'];
	const numbers = [1, 2];
	const result = arrayConcat(strings, numbers);

	expectTypeOf(result).toEqualTypeOf<Array<string | number>>();
	assert.deepEqual(result, ['a', 'b', 1, 2]);
});

test('arrayConcat() with empty arrays', () => {
	const empty: string[] = [];
	const values = ['hello', 'world'];
	const result = arrayConcat(empty, values);

	expectTypeOf(result).toEqualTypeOf<string[]>();
	assert.deepEqual(result, ['hello', 'world']);
});

test('arrayConcat() with const arrays', () => {
	const first = ['x'] as const;
	const second = [1] as const;
	const result = arrayConcat(first, second);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 1>>();
	assert.deepEqual(result, ['x', 1]);
});

test('arrayConcat() with single array', () => {
	const array = [1, 2, 3];
	const result = arrayConcat(array);

	expectTypeOf(result).toEqualTypeOf<number[]>();
	assert.deepEqual(result, [1, 2, 3]);
});

test('arrayConcat() with multiple arrays', () => {
	const a = [1, 2];
	const b = ['a', 'b'];
	const c = [true, false];
	const result = arrayConcat(a, b, c);

	expectTypeOf(result).toEqualTypeOf<Array<number | string | boolean>>();
	assert.deepEqual(result, [1, 2, 'a', 'b', true, false]);
});

test('arrayConcat() with mixed tuples and arrays', () => {
	const tuple = ['x', 42] as const;
	const array = ['y', 'z'];
	const result = arrayConcat(tuple, array);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 42 | string>>();
	assert.deepEqual(result, ['x', 42, 'y', 'z']);
});

test('arrayConcat() with five arrays', () => {
	const a = [1];
	const b = ['a'];
	const c = [true];
	const d = [undefined];
	const element = [undefined];
	const result = arrayConcat(a, b, c, d, element);

	expectTypeOf(result).toEqualTypeOf<Array<number | string | boolean | undefined>>();
	assert.deepEqual(result, [1, 'a', true, undefined, undefined]);
});

test('arrayConcat() with unlimited arrays (8 arrays)', () => {
	const a = [1];
	const b = ['a'];
	const c = [true];
	const d = [undefined];
	const element = [undefined];
	const f = [Symbol('test')];
	const g = [42n];
	const h = [{}];
	const result = arrayConcat(a, b, c, d, element, f, g, h);

	// Note: Symbol comparison needs special handling, so we check length and types instead
	assert.equal(result.length, 8);
	assert.equal(result[0], 1);
	assert.equal(result[1], 'a');
	assert.equal(result[2], true);
	assert.equal(result[3], undefined);
	assert.equal(result[4], undefined);
	assert.equal(typeof result[5], 'symbol');
	assert.equal(result[6], 42n);
	assert.equal(typeof result[7], 'object');
});

test('arrayConcat() with const tuples unlimited', () => {
	const tuple1 = ['x', 1] as const;
	const tuple2 = ['y', 2] as const;
	const tuple3 = ['z', 3] as const;
	const result = arrayConcat(tuple1, tuple2, tuple3);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 1 | 'y' | 2 | 'z' | 3>>();
	assert.deepEqual(result, ['x', 1, 'y', 2, 'z', 3]);
});
