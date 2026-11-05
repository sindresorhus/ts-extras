import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isNonEmpty} from '../source/index.js';

test('isNonEmpty()', () => {
	assert.equal(isNonEmpty([1, 2, 3]), true);
	assert.equal(isNonEmpty([]), false);
	assert.equal(isNonEmpty([undefined]), true);
	// A sparse array with only holes still has a length.
	assert.equal(isNonEmpty(Array(1)), true);
});

test('isNonEmpty() makes the first element present', () => {
	const items: string[] = ['a'];

	if (isNonEmpty(items)) {
		// With `noUncheckedIndexedAccess`, this is `string | undefined` without the guard.
		expectTypeOf(items[0]).toEqualTypeOf<string>();
		// The array stays mutable.
		items.push('b');
	} else {
		expectTypeOf(items).toEqualTypeOf<string[]>();
	}

	assert.deepEqual(items, ['a', 'b']);
});

test('isNonEmpty() keeps a readonly array readonly', () => {
	const items: readonly number[] = [1];

	if (isNonEmpty(items)) {
		expectTypeOf(items[0]).toEqualTypeOf<number>();
		// @ts-expect-error - still readonly
		items.push(2);
	} else {
		expectTypeOf(items).toEqualTypeOf<readonly number[]>();
	}
});

test('isNonEmpty() narrows a union of tuples in both branches', () => {
	const tuple = ['a'] as [] | [string] | [string, number];

	if (isNonEmpty(tuple)) {
		expectTypeOf(tuple).toEqualTypeOf<[string] | [string, number]>();
	} else {
		expectTypeOf(tuple).toEqualTypeOf<[]>();
		assert.fail('the tuple is not empty');
	}

	// A tuple with a required element is already non-empty, so it is unchanged.
	const rest = ['a'] as [string, ...number[]];
	if (isNonEmpty(rest)) {
		expectTypeOf(rest).toEqualTypeOf<[string, ...number[]]>();
	}

	// A fixed non-empty tuple makes the false branch unreachable.
	const definite = [1, 2] as const;
	if (isNonEmpty(definite)) {
		expectTypeOf(definite).toEqualTypeOf<readonly [1, 2]>();
	} else {
		expectTypeOf(definite).toBeNever();
	}
});

test('isNonEmpty() narrows when passed directly to filter', () => {
	const groups: string[][] = [['a'], [], ['b', 'c']];
	const direct = groups.filter(isNonEmpty);
	const wrapped = groups.filter(group => isNonEmpty(group));

	expectTypeOf(direct).toEqualTypeOf<Array<string[] & [string, ...string[]]>>();
	expectTypeOf(wrapped).toEqualTypeOf<Array<string[] & [string, ...string[]]>>();
	expectTypeOf(direct[0]![0]).toEqualTypeOf<string>();
	assert.deepEqual(direct, [['a'], ['b', 'c']]);
	assert.deepEqual(wrapped, direct);
});
