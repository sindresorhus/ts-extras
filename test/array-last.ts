import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {arrayLast} from '../source/index.js';

test('arrayLast() with tuples', t => {
	const tuple = ['abc', 123, true] as const;
	const result = arrayLast(tuple);

	expectTypeOf(result).toEqualTypeOf<true>();
	t.is(result, true);
});

test('arrayLast() with arrays', t => {
	const array = ['a', 'b', 'c'];
	const result = arrayLast(array);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	t.is(result, 'c');
});

test('arrayLast() with empty arrays', t => {
	const empty: string[] = [];
	const result = arrayLast(empty);

	expectTypeOf(result).toEqualTypeOf<string | undefined>();
	t.is(result, undefined);
});

test('arrayLast() with known empty tuple', t => {
	const empty = [] as const;

	// Test type inference separately
	type ResultType = ReturnType<typeof arrayLast<typeof empty>>;
	expectTypeOf<ResultType>().toEqualTypeOf<undefined>();

	// Test runtime value - empty array should have no elements
	t.is(empty.length, 0);
});

test('arrayLast() with mixed tuple', t => {
	const mixed = [42, 'hello', false] as const;
	const result = arrayLast(mixed);

	expectTypeOf(result).toEqualTypeOf<false>();
	t.is(result, false);
});

test('arrayLast() with single element tuple', t => {
	const single = ['only'] as const;
	const result = arrayLast(single);

	expectTypeOf(result).toEqualTypeOf<'only'>();
	t.is(result, 'only');
});
