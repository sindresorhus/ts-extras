import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayLast} from '../source/index.js';

test('arrayLast() with tuples', () => {
	const tuple = ['abc', 123, true] as const;
	const result = arrayLast(tuple);

	expectTypeOf(result).toEqualTypeOf<true>();
	assert.equal(result, true);
});

test('arrayLast() with arrays', () => {
	const array = ['a', 'b', 'c'];
	const result = arrayLast(array);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	assert.equal(result, 'c');
});

test('arrayLast() with empty arrays', () => {
	const empty: string[] = [];
	const result = arrayLast(empty);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	assert.equal(result, undefined);
});

test('arrayLast() with known empty tuple', () => {
	const empty: readonly never[] = [];

	// Test runtime value - empty array should have no elements
	assert.equal(empty.length, 0);

	// Test actual call with empty array
	const result = arrayLast(empty as readonly unknown[]);
	assert.equal(result, undefined);
});

test('arrayLast() with mixed tuple', () => {
	const mixed = [42, 'hello', false] as const;
	const result = arrayLast(mixed);

	expectTypeOf(result).toEqualTypeOf<false>();
	assert.equal(result, false);
});

test('arrayLast() with single element tuple', () => {
	const single = ['only'] as const;
	const result = arrayLast(single);

	expectTypeOf(result).toEqualTypeOf<'only'>();
	assert.equal(result, 'only');
});
