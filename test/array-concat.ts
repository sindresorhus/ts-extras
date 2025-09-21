import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {arrayConcat} from '../source/index.js';

test('arrayConcat() with arrays of different types', t => {
	const strings = ['a', 'b'];
	const numbers = [1, 2];
	const result = arrayConcat(strings, numbers);

	expectTypeOf(result).toEqualTypeOf<Array<string | number>>();
	t.deepEqual(result, ['a', 'b', 1, 2]);
});

test('arrayConcat() with empty arrays', t => {
	const empty: string[] = [];
	const values = ['hello', 'world'];
	const result = arrayConcat(empty, values);

	expectTypeOf(result).toEqualTypeOf<string[]>();
	t.deepEqual(result, ['hello', 'world']);
});

test('arrayConcat() with const arrays', t => {
	const first = ['x'] as const;
	const second = [1] as const;
	const result = arrayConcat(first, second);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 1>>();
	t.deepEqual(result, ['x', 1]);
});

test('arrayConcat() with single array', t => {
	const array = [1, 2, 3];
	const result = arrayConcat(array);

	expectTypeOf(result).toEqualTypeOf<number[]>();
	t.deepEqual(result, [1, 2, 3]);
});

test('arrayConcat() with multiple arrays', t => {
	const a = [1, 2];
	const b = ['a', 'b'];
	const c = [true, false];
	const result = arrayConcat(a, b, c);

	expectTypeOf(result).toEqualTypeOf<Array<number | string | boolean>>();
	t.deepEqual(result, [1, 2, 'a', 'b', true, false]);
});

test('arrayConcat() with mixed tuples and arrays', t => {
	const tuple = ['x', 42] as const;
	const array = ['y', 'z'];
	const result = arrayConcat(tuple, array);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 42 | string>>();
	t.deepEqual(result, ['x', 42, 'y', 'z']);
});

test('arrayConcat() with five arrays', t => {
	const a = [1];
	const b = ['a'];
	const c = [true];
	const d = [undefined];
	const element = [undefined];
	const result = arrayConcat(a, b, c, d, element);

	expectTypeOf(result).toEqualTypeOf<Array<number | string | boolean | undefined>>();
	t.deepEqual(result, [1, 'a', true, undefined, undefined]);
});

test('arrayConcat() with unlimited arrays (8 arrays)', t => {
	const a = [1];
	const b = ['a'];
	const c = [true];
	const d = [undefined];
	const element = [undefined];
	const f = [Symbol('test')];
	const g = [42n];
	const h = [{}];
	const result = arrayConcat(a, b, c, d, element, f, g, h);

	expectTypeOf(result).toMatchTypeOf<Array<number | string | boolean | undefined | symbol | bigint | Record<string, unknown>>>();
	// Note: Symbol comparison needs special handling, so we check length and types instead
	t.is(result.length, 8);
	t.is(result[0], 1);
	t.is(result[1], 'a');
	t.is(result[2], true);
	t.is(result[3], undefined);
	t.is(result[4], undefined);
	t.is(typeof result[5], 'symbol');
	t.is(result[6], 42n);
	t.is(typeof result[7], 'object');
});

test('arrayConcat() with const tuples unlimited', t => {
	const tuple1 = ['x', 1] as const;
	const tuple2 = ['y', 2] as const;
	const tuple3 = ['z', 3] as const;
	const result = arrayConcat(tuple1, tuple2, tuple3);

	expectTypeOf(result).toEqualTypeOf<Array<'x' | 1 | 'y' | 2 | 'z' | 3>>();
	t.deepEqual(result, ['x', 1, 'y', 2, 'z', 3]);
});
