import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isEmpty} from '../source/index.js';

test('isEmpty()', () => {
	assert.equal(isEmpty([1, 2, 3]), false);
	assert.equal(isEmpty([]), true);

	const immutable: readonly number[] = [1, 2, 3];

	if (isEmpty(immutable)) {
		// @ts-expect-error Should not change immutability
		immutable.pop();
	}

	const mutable = [1, 2, 3];

	if (!isEmpty(mutable)) {
		mutable.pop();
	}
});

test('isEmpty() does not claim the empty branch is unreachable', () => {
	// A `string[]` really can be empty, so a guard that answers `true` for one has to leave a usable type behind. A `never` branch would say the branch cannot be taken, and `never` is assignable to everything, so the branch would compile arbitrary code.
	const items: string[] = [];
	if (isEmpty(items)) {
		expectTypeOf(items.length).toEqualTypeOf<0>();
	} else {
		expectTypeOf(items.length).toEqualTypeOf<number>();
	}

	// A tuple with a fixed length is the opposite case: it can never be empty, so `never` is right.
	const tuple = [1, 2] as const;
	if (isEmpty(tuple)) {
		const unreachable: never = tuple;
		// The branch is unreachable at runtime, so the assignment above is the whole check.
		void unreachable;
	}

	// Filtering keeps a usable element type rather than a `never` one.
	const groups: string[][] = [['a'], []];
	const empty = groups.filter(isEmpty);
	assert.deepEqual(empty, [[]]);
	expectTypeOf(empty[0]!.length).toEqualTypeOf<0>();
});

test('isEmpty() with readonly arrays and unions', () => {
	// A readonly array is still an array, and a union distributes so each member is judged on its own.
	const readonlyEmpty: readonly string[] = [];
	const readonlyFull: readonly string[] = ['a'];

	assert.equal(isEmpty(readonlyEmpty), true);
	assert.equal(isEmpty(readonlyFull), false);
	if (isEmpty(readonlyEmpty)) {
		expectTypeOf(readonlyEmpty).toExtend<{readonly length: 0}>();
	}

	const maybe = [] as [] | ['a'] | ['a', 'b'];
	if (isEmpty(maybe)) {
		expectTypeOf(maybe).toEqualTypeOf<[]>();
	} else {
		expectTypeOf(maybe).toExtend<readonly ['a'] | readonly ['a', 'b']>();
	}

	// A nested array is not empty because its elements are.
	const nested: string[][] = [[]];
	assert.equal(isEmpty(nested), false);

	// A sparse array with only holes has a non-zero length.
	const sparse: number[] = [];
	sparse[3] = 1;
	assert.equal(isEmpty(sparse), false);
});

test('isEmpty() leaves a dynamically sized array usable in both branches', () => {
	// A `never[]` has a dynamic length, so it can be pushed to and is then not empty. It must not match the definite-empty-tuple shape, which would leave the `else` branch as `never` for a branch the runtime reaches.
	const neverArray: never[] = [];
	neverArray.push(undefined as never);

	if (isEmpty(neverArray)) {
		expectTypeOf(neverArray.length).toEqualTypeOf<0>();
	} else {
		expectTypeOf(neverArray).toExtend<never[]>();
	}

	assert.equal(isEmpty(neverArray), false);
	assert.equal(isEmpty([] as never[]), true);
});
