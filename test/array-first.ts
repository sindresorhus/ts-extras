import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayFirst} from '../source/index.js';

test('arrayFirst() with tuples', () => {
	const tuple = ['abc', 123, true] as const;
	const result = arrayFirst(tuple);

	expectTypeOf(result).toEqualTypeOf<'abc'>();
	assert.equal(result, 'abc');
});

test('arrayFirst() with arrays', () => {
	const array = ['a', 'b', 'c'];
	const result = arrayFirst(array);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	assert.equal(result, 'a');
});

test('arrayFirst() with empty arrays', () => {
	const empty: string[] = [];
	const result = arrayFirst(empty);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	assert.equal(result, undefined);
});

test('arrayFirst() with known empty tuple', () => {
	const empty: readonly never[] = [];

	// Test runtime value - empty array should have no elements
	assert.equal(empty.length, 0);

	// Test actual call with empty array
	const result = arrayFirst(empty as readonly unknown[]);
	assert.equal(result, undefined);
});

test('arrayFirst() with mixed tuple', () => {
	const mixed = [42, 'hello', false] as const;
	const result = arrayFirst(mixed);

	expectTypeOf(result).toEqualTypeOf<42>();
	assert.equal(result, 42);
});

test('arrayFirst() with single element tuple', () => {
	const single = ['only'] as const;
	const result = arrayFirst(single);

	expectTypeOf(result).toEqualTypeOf<'only'>();
	assert.equal(result, 'only');
});
