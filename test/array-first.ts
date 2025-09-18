import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {arrayFirst} from '../source/index.js';

test('arrayFirst() with tuples', t => {
	const tuple = ['abc', 123, true] as const;
	const result = arrayFirst(tuple);

	expectTypeOf(result).toEqualTypeOf<'abc'>();
	t.is(result, 'abc');
});

test('arrayFirst() with arrays', t => {
	const array = ['a', 'b', 'c'];
	const result = arrayFirst(array);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	t.is(result, 'a');
});

test('arrayFirst() with empty arrays', t => {
	const empty: string[] = [];
	const result = arrayFirst(empty);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	t.is(result, undefined);
});

test('arrayFirst() with known empty tuple', t => {
	const empty = [] as const;
	const result = arrayFirst(empty);

	expectTypeOf(result).toEqualTypeOf<undefined>();
	t.is(result, undefined);
});

test('arrayFirst() with mixed tuple', t => {
	const mixed = [42, 'hello', false] as const;
	const result = arrayFirst(mixed);

	expectTypeOf(result).toEqualTypeOf<42>();
	t.is(result, 42);
});

test('arrayFirst() with single element tuple', t => {
	const single = ['only'] as const;
	const result = arrayFirst(single);

	expectTypeOf(result).toEqualTypeOf<'only'>();
	t.is(result, 'only');
});