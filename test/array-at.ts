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
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
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
	const i: number = Math.random() > 0.5 ? 0 : 2;
	expectTypeOf(arrayAt(tuple, i)).toEqualTypeOf<'a' | 123 | true | undefined>();
	assert.ok(true);
});

test('arrayAt() empty array', () => {
	const empty = [] as const;
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
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
});
