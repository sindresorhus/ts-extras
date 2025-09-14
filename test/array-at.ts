import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {arrayAt} from '../source/index.js';

test('arrayAt() tuple typing and runtime', t => {
	const tuple = ['a', 123, true] as const;

	// Types
	expectTypeOf(arrayAt(tuple, -1)).toEqualTypeOf<true | undefined>();
	expectTypeOf(arrayAt(tuple, 0)).toEqualTypeOf<'a' | undefined>();
	expectTypeOf(arrayAt(tuple, 1)).toEqualTypeOf<123 | undefined>();

	// Runtime
	t.is(arrayAt(tuple, -1), true);
	t.is(arrayAt(tuple, 0), 'a');
	t.is(arrayAt(tuple, 1), 123);
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	const outOfBounds = arrayAt(tuple, 999);
	t.is(outOfBounds, undefined);
});

test('arrayAt() with arrays', t => {
	const array: Array<string | number> = ['a', 123, 'b'];
	expectTypeOf(arrayAt(array, -1)).toEqualTypeOf<string | number | undefined>();

	t.is(arrayAt(array, -1), 'b');
	t.is(arrayAt(array, 1), 123);
});

test('arrayAt() with non-literal index', t => {
	const tuple = ['a', 123, true] as const;
	const i: number = Math.random() > 0.5 ? 0 : 2;
	expectTypeOf(arrayAt(tuple, i)).toEqualTypeOf<'a' | 123 | true | undefined>();
	t.pass();
});

test('arrayAt() empty array', t => {
	const empty = [] as const;
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	const emptyResult = arrayAt(empty, -1);
	expectTypeOf(emptyResult).toEqualTypeOf<undefined>();
	t.is(emptyResult, undefined);
});

test('arrayAt() with negative indices', t => {
	const tuple = ['a', 'b', 'c'] as const;
	t.is(arrayAt(tuple, -1), 'c');
	t.is(arrayAt(tuple, -2), 'b');
	t.is(arrayAt(tuple, -3), 'a');
	t.is(arrayAt(tuple, -4), undefined);
});
