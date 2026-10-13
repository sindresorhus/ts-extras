import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayAt} from '../source/index.js';

test('arrayAt() tuple typing and runtime', () => {
	const tuple = ['a', 123, true] as const;

	// Types
	expectTypeOf(arrayAt(tuple, -1)).toEqualTypeOf<true | undefined>();
	expectTypeOf(arrayAt(tuple, 0)).toEqualTypeOf<'a' | undefined>();
	expectTypeOf(arrayAt(tuple, 1)).toEqualTypeOf<123 | undefined>();

	// Runtime
	assert.equal(arrayAt(tuple, -1), true);
	assert.equal(arrayAt(tuple, 0), 'a');
	assert.equal(arrayAt(tuple, 1), 123);
	const outOfBounds = arrayAt(tuple, 999);
	assert.equal(outOfBounds, undefined);
});

test('arrayAt() with arrays', () => {
	const array: Array<string | number> = ['a', 123, 'b'];
	expectTypeOf(arrayAt(array, -1)).toEqualTypeOf<string | number | undefined>();

	assert.equal(arrayAt(array, -1), 'b');
	assert.equal(arrayAt(array, 1), 123);
});

test('arrayAt() with non-literal index', () => {
	const tuple = ['a', 123, true] as const;
	// The annotation keeps the type at `number` instead of narrowing to the literal `0`.
	const i: number = 0;
	expectTypeOf(arrayAt(tuple, i)).toEqualTypeOf<'a' | 123 | true | undefined>();

	// At runtime the literal index still selects the matching element.
	assert.equal(arrayAt(tuple, 0), 'a');
	assert.equal(arrayAt(tuple, 2), true);
	assert.equal(arrayAt(tuple, 9), undefined);
});

test('arrayAt() empty array', () => {
	const empty = [] as const;
	const emptyResult = arrayAt(empty, -1);
	expectTypeOf(emptyResult).toEqualTypeOf<undefined>();
	assert.equal(emptyResult, undefined);
});

test('arrayAt() with negative indices', () => {
	const tuple = ['a', 'b', 'c'] as const;
	assert.equal(arrayAt(tuple, -1), 'c');
	assert.equal(arrayAt(tuple, -2), 'b');
	assert.equal(arrayAt(tuple, -3), 'a');
	assert.equal(arrayAt(tuple, -4), undefined);

	// The note in the source says a negative index other than `-1` is not resolved for a tuple, so `-2` reports the whole element union even though the runtime answers `'b'`. Resolving it needs the tuple's length, which is not knowable for a type with a rest element.
	expectTypeOf(arrayAt(tuple, -1)).toEqualTypeOf<'c' | undefined>();
	expectTypeOf(arrayAt(tuple, -2)).toEqualTypeOf<'a' | 'b' | 'c' | undefined>();
	expectTypeOf(arrayAt(tuple, -3)).toEqualTypeOf<'a' | 'b' | 'c' | undefined>();
});

test('arrayAt() resolves -1 for a tuple with a rest element', () => {
	// A tuple with a leading or middle rest has a `number` length, but it always ends in its trailing fixed element, so `-1` resolves to that element and not to the whole element union.
	type Middle = readonly [string, ...number[], boolean];
	const middle: Middle = ['a', 1, true];

	expectTypeOf(arrayAt(middle, -1)).toEqualTypeOf<boolean | undefined>();
	assert.equal(arrayAt(middle, -1), true);

	// A leading rest always ends in its trailing element.
	type Leading = readonly [...string[], number];
	const leading: Leading = ['a', 'b', 1];

	expectTypeOf(arrayAt(leading, -1)).toEqualTypeOf<number | undefined>();
	assert.equal(arrayAt(leading, -1), 1);

	// A plain array is unaffected, since the element type is the last element type too.
	const array: Array<string | number> = ['a', 1, 'b'];
	expectTypeOf(arrayAt(array, -1)).toEqualTypeOf<string | number | undefined>();
	assert.equal(arrayAt(array, -1), 'b');

	// A fixed tuple is unaffected.
	const tuple = ['a', 123, true] as const;
	expectTypeOf(arrayAt(tuple, -1)).toEqualTypeOf<true | undefined>();
	assert.equal(arrayAt(tuple, -1), true);
});

test('arrayAt() does not claim a fractional index is out of bounds', () => {
	// `Array#at()` truncates a fractional index toward zero, so `at(1.5)` reads index `1`. Indexing a tuple with a non-integer gives `undefined` in the type system, which is the one member that cannot be there, so a fractional index gives the whole element union instead.
	const tuple = ['a', 1, true] as const;

	expectTypeOf(arrayAt(tuple, 1.5)).toEqualTypeOf<'a' | 1 | true | undefined>();
	assert.equal(arrayAt(tuple, 1.5), 1);
	assert.equal(arrayAt(tuple, 1.9), 1);
	assert.equal(arrayAt(tuple, 0.5), 'a');

	// A negative fraction truncates toward zero too, and `at(-0.5)` reads index `0`.
	expectTypeOf(arrayAt(tuple, -0.5)).toEqualTypeOf<'a' | 1 | true | undefined>();
	assert.equal(arrayAt(tuple, -0.5), 'a');

	// An integer index, an out-of-bounds one, and a widened index are unaffected.
	expectTypeOf(arrayAt(tuple, 1)).toEqualTypeOf<1 | undefined>();
	expectTypeOf(arrayAt(tuple, -1)).toEqualTypeOf<true | undefined>();
	expectTypeOf(arrayAt(tuple, 9)).toEqualTypeOf<undefined>();

	const dynamic: number = 1;
	expectTypeOf(arrayAt(tuple, dynamic)).toEqualTypeOf<'a' | 1 | true | undefined>();
},
);

test('arrayAt() handles fractional indices written in exponential notation', () => {
	const tuple = ['first', 1, true] as const;
	const positive = arrayAt(tuple, 1e-7);
	const negative = arrayAt(tuple, -1e-7);

	expectTypeOf(positive).toEqualTypeOf<'first' | 1 | true | undefined>();
	expectTypeOf(negative).toEqualTypeOf<'first' | 1 | true | undefined>();
	assert.equal(positive, 'first');
	assert.equal(negative, 'first');
	assert.equal(arrayAt(tuple, 1.5e-7), 'first');
	assert.equal(arrayAt(tuple, -1.5e-7), 'first');

	const subnormal = arrayAt(tuple, 5e-324);
	expectTypeOf(subnormal).toEqualTypeOf<'first' | 1 | true | undefined>();
	assert.equal(subnormal, 'first');

	const index = 1e-7 as 1e-7 | 1;
	expectTypeOf(arrayAt(tuple, index)).toEqualTypeOf<'first' | 1 | true | undefined>();
	assert.equal(arrayAt(tuple, index), 'first');
	assert.equal(arrayAt(tuple, 1e21), undefined);
});
