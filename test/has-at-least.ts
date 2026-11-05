import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {hasAtLeast} from '../source/index.js';

test('hasAtLeast()', () => {
	assert.equal(hasAtLeast([1, 2], 2), true);
	assert.equal(hasAtLeast([1], 2), false);
	assert.equal(hasAtLeast([], 0), true);
	assert.equal(hasAtLeast([1, 2, 3], 1), true);
});

test('hasAtLeast() makes the required elements present', () => {
	const parts: string[] = 'user:admin'.split(':');

	if (hasAtLeast(parts, 2)) {
		expectTypeOf(parts).toEqualTypeOf<string[] & [string, string, ...string[]]>();
		const [name, role] = parts;
		expectTypeOf(name).toEqualTypeOf<string>();
		expectTypeOf(role).toEqualTypeOf<string>();
		// The third element is still optional.
		expectTypeOf(parts[2]).toEqualTypeOf<string | undefined>();
		assert.deepEqual([name, role], ['user', 'admin']);
	} else {
		expectTypeOf(parts).toEqualTypeOf<string[]>();
		assert.fail('the array has two elements');
	}
});

test('hasAtLeast() keeps a readonly array readonly', () => {
	const values: readonly number[] = [1, 2];

	if (hasAtLeast(values, 1)) {
		expectTypeOf(values[0]).toEqualTypeOf<number>();
		// @ts-expect-error - still readonly
		values.push(3);
	} else {
		expectTypeOf(values).toEqualTypeOf<readonly number[]>();
	}
});

test('hasAtLeast() narrows a union of tuples in both branches', () => {
	const tuple = ['a', 'b'] as [] | [string] | [string, string] | [string, string, string];

	if (hasAtLeast(tuple, 2)) {
		expectTypeOf(tuple).toEqualTypeOf<[string, string] | [string, string, string]>();
	} else {
		expectTypeOf(tuple).toEqualTypeOf<[] | [string]>();
		assert.fail('the tuple has two elements');
	}

	// A tuple whose optional elements may or may not reach the minimum stays in the false branch, which a shorter value takes. Boundary: in the true branch, its optional element still reads with `undefined`, which is imprecise but sound.
	const optional = ['a'] as [string, string?];
	if (hasAtLeast(optional, 2)) {
		expectTypeOf(optional[1]).toEqualTypeOf<string | undefined>();
		assert.fail('the tuple has one element');
	} else {
		expectTypeOf(optional).toEqualTypeOf<[string, string?]>();
	}

	const mixed = ['a'] as [string, string?] | [string, string, string];
	if (!hasAtLeast(mixed, 2)) {
		expectTypeOf(mixed).toEqualTypeOf<[string, string?]>();
	}
});

test('hasAtLeast() narrows for a minimum of zero', () => {
	const tuple = [] as [] | [string];

	if (hasAtLeast(tuple, 0)) {
		expectTypeOf(tuple).toEqualTypeOf<[] | [string]>();
	} else {
		expectTypeOf(tuple).toBeNever();
	}

	const values: string[] = [];
	if (hasAtLeast(values, 0)) {
		expectTypeOf(values).toEqualTypeOf<string[]>();
	}

	assert.equal(hasAtLeast(values, 0), true);
});

test('hasAtLeast() keeps the element types of a tuple with a rest element', () => {
	const tuple = ['a', 1] as [string, ...number[]];

	if (hasAtLeast(tuple, 2)) {
		expectTypeOf(tuple[0]).toEqualTypeOf<string>();
		expectTypeOf(tuple[1]).toEqualTypeOf<number>();
	} else {
		expectTypeOf(tuple).toEqualTypeOf<[string, ...number[]]>();
		assert.fail('the tuple has two elements');
	}
});

test('hasAtLeast() returns a boolean for a minimum that is not one non-negative integer', () => {
	const values: string[] = ['a'];
	const minimum: number = 1;

	expectTypeOf(hasAtLeast(values, minimum)).toEqualTypeOf<boolean>();
	expectTypeOf(hasAtLeast(values, 1 as 1 | 2)).toEqualTypeOf<boolean>();
	expectTypeOf(hasAtLeast(values, -1)).toEqualTypeOf<boolean>();
	expectTypeOf(hasAtLeast(values, 1.5)).toEqualTypeOf<boolean>();
	// A tuple this long would exceed TypeScript's recursion limit, so it is not built.
	expectTypeOf(hasAtLeast(values, 1000)).toEqualTypeOf<boolean>();
	if (hasAtLeast(values, 5000)) {
		expectTypeOf(values).toEqualTypeOf<string[]>();
	}

	// The largest minimum that narrows.
	if (hasAtLeast(values, 999)) {
		expectTypeOf(values[998]).toEqualTypeOf<string>();
	}

	if (!hasAtLeast(values, minimum)) {
		expectTypeOf(values).toEqualTypeOf<string[]>();
	}
});

test('hasAtLeast() narrows in a filter callback', () => {
	const groups: string[][] = [['a'], ['b', 'c'], []];
	const pairs = groups.filter(group => hasAtLeast(group, 2));

	expectTypeOf(pairs[0]![1]).toEqualTypeOf<string>();
	assert.deepEqual(pairs, [['b', 'c']]);
});
