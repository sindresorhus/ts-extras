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

test('arrayConcat() widens for a spread of non-tuple arrays', () => {
	// A spread rest cannot be enumerated as a tuple, but the runtime still concatenates every one of the extra arrays, so their element types are widened into the result and not dropped.
	const extras: string[][] = [['x'], ['y']];
	const result = arrayConcat([1, 2], ...extras);

	expectTypeOf(result).toEqualTypeOf<Array<number | string>>();
	assert.deepEqual(result, [1, 2, 'x', 'y']);

	const tupleFirst = arrayConcat(['x'] as const, ...extras);
	expectTypeOf(tupleFirst).toEqualTypeOf<Array<'x' | string>>();
	assert.deepEqual(tupleFirst, ['x', 'x', 'y']);

	// The element types of a typed rest are widened, not discarded.
	const typedRest: boolean[][] = [[true]];
	expectTypeOf(arrayConcat([1], ...typedRest)).toEqualTypeOf<Array<number | boolean>>();
});

test('arrayConcat() preserves the tuple shape of a single array', () => {
	// The single-array overload keeps the tuple structure of a `const` tuple rather than widening it to an array of its element type.
	const tuple = ['x', 1, true] as const;
	const result = arrayConcat(tuple);

	expectTypeOf(result).toEqualTypeOf<['x', 1, true]>();
	assert.deepEqual(result, ['x', 1, true]);

	// A plain array is still an array, and is not made readonly.
	const array: string[] = ['a'];
	const fromArray = arrayConcat(array);
	expectTypeOf(fromArray).toEqualTypeOf<string[]>();
	fromArray.push('b');
	assert.deepEqual(fromArray, ['a', 'b']);
});

test('arrayConcat() accepts the scalar arguments the native concat accepts', () => {
	// `Array#concat()` appends a scalar argument as a single element, and the implementation does the same, so the parameter type accepts a scalar too. The native `[1, 2].concat('a')` compiles, so a stronger version of it should too.
	const result = arrayConcat([1, 2], 'a');
	// The scalar keeps its literal, the way the single-array overload keeps a tuple's.
	expectTypeOf(result).toEqualTypeOf<Array<number | 'a'>>();
	assert.deepEqual(result, [1, 2, 'a']);

	assert.deepEqual(arrayConcat([1, 2], 5), [1, 2, 5]);
	assert.deepEqual(arrayConcat([1, 2], [3], 'a', [4]), [1, 2, 3, 'a', 4]);

	// A spread of a dynamic array of scalars lands on the same path.
	const scalars = ['a', 'b'];
	assert.deepEqual(arrayConcat([1, 2], ...scalars), [1, 2, 'a', 'b']);

	// The documented shapes are unchanged.
	const strings = ['a', 'b'];
	const numbers = [1, 2];
	expectTypeOf(arrayConcat(strings, numbers)).toEqualTypeOf<Array<string | number>>();
	expectTypeOf(arrayConcat(['x'] as const, [1] as const)).toEqualTypeOf<Array<1 | 'x'>>();
	expectTypeOf(arrayConcat([], ['hello'])).toEqualTypeOf<string[]>();

	assert.deepEqual(arrayConcat([1, 2], undefined as undefined), [1, 2, undefined]);
	assert.deepEqual(arrayConcat([1], null), [1, null]);
	const symbol = Symbol('a');
	assert.deepEqual(arrayConcat([1], symbol), [1, symbol]);

	// A non-primitive is not accepted, because `Array#concat()` spreads an object carrying `Symbol.isConcatSpreadable` instead of appending it, so the result would not be the one element the type promises. The native's own parameter type excludes that shape as well.
	if (false) {
		const spreadable = {
			length: 2, 0: 'x', 1: 'y', [Symbol.isConcatSpreadable]: true,
		};
		// @ts-expect-error - a spreadable object is spread, not appended.
		arrayConcat([1], spreadable);

		// @ts-expect-error - a plain object is not a scalar either.
		arrayConcat([1], {a: 1});
	}
});

test('arrayConcat() does not preserve properties that concat does not copy', () => {
	const metadata = Symbol('metadata');
	const original = Object.assign([1, 2], {label: 'original', [metadata]: true});
	const result = arrayConcat(original);

	expectTypeOf(result).toEqualTypeOf<number[]>();
	assert.deepEqual(result, [1, 2]);
	assert.equal(Object.hasOwn(result, 'label'), false);
	assert.equal(Object.hasOwn(result, metadata), false);
	assert.equal(original.label, 'original');

	const tuple = Object.assign(['x', 1] as const, {label: 'tuple'});
	const tupleResult = arrayConcat(tuple);
	// TypeScript widens an augmented tuple when its array portion is spread.
	expectTypeOf(tupleResult).toEqualTypeOf<Array<'x' | 1>>();
	assert.deepEqual(tupleResult, ['x', 1]);
	assert.equal(Object.hasOwn(tupleResult, 'label'), false);
});

test('arrayConcat() preserves optional and variadic tuples without modifying their input', () => {
	const optional: readonly ['x', number?] = ['x'];
	const optionalResult = arrayConcat(optional);
	expectTypeOf(optionalResult).toEqualTypeOf<['x', number?]>();
	assert.deepEqual(optionalResult, ['x']);
	assert.notEqual(optionalResult, optional);

	const variadic: readonly ['x', ...number[]] = ['x', 1, 2];
	const variadicResult = arrayConcat(variadic);
	expectTypeOf(variadicResult).toEqualTypeOf<['x', ...number[]]>();
	variadicResult.push(3);
	assert.deepEqual(variadicResult, ['x', 1, 2, 3]);
	assert.deepEqual(variadic, ['x', 1, 2]);

	const sparse = [1, , 3];
	const sparseResult = arrayConcat(sparse);
	assert.equal(sparseResult.length, 3);
	assert.equal(1 in sparseResult, false);
	assert.deepEqual(sparseResult, sparse);
});

test('arrayConcat() preserves holes across multiple arrays and scalar arguments', () => {
	const first = [1, , 3];
	const second = [, 'last'];
	const marker = Symbol('marker');
	const result = arrayConcat(first, marker, second);

	expectTypeOf(result).toEqualTypeOf<Array<number | string | typeof marker | undefined>>();
	assert.deepEqual(result, [1, , 3, marker, , 'last']);
	assert.equal(1 in result, false);
	assert.equal(4 in result, false);
	assert.equal(result[3], marker);
	assert.deepEqual(first, [1, , 3]);
	assert.deepEqual(second, [, 'last']);
});
