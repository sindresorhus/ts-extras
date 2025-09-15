import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {stringSplit} from '../source/index.js';

test('stringSplit() with string literals', t => {
	const result = stringSplit('foo-bar-baz', '-');
	expectTypeOf(result).toEqualTypeOf<['foo', 'bar', 'baz']>();
	t.deepEqual(result, ['foo', 'bar', 'baz']);

	const dotSplit = stringSplit('a.b.c', '.');
	expectTypeOf(dotSplit).toEqualTypeOf<['a', 'b', 'c']>();
	t.deepEqual(dotSplit, ['a', 'b', 'c']);
});

test('stringSplit() with no delimiter match', t => {
	const result = stringSplit('hello', '-');
	expectTypeOf(result).toEqualTypeOf<['hello']>();
	t.deepEqual(result, ['hello']);
});

test('stringSplit() with empty string', t => {
	const result = stringSplit('', '-');
	expectTypeOf(result).toEqualTypeOf<['']>();
	t.deepEqual(result, ['']);
});

test('stringSplit() with dynamic strings', t => {
	const dynamicString = 'dynamic-content';
	const result = stringSplit(dynamicString, '-');
	expectTypeOf(result).toMatchTypeOf<string[]>();
	t.deepEqual(result, ['dynamic', 'content']);
});

test('stringSplit() use case from issue', t => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const placement = 'top-start' as const;
	const parts = stringSplit(placement, '-');
	expectTypeOf(parts).toEqualTypeOf<['top', 'start']>();

	const side = parts[0];
	expectTypeOf(side).toEqualTypeOf<'top'>();
	t.is(side, 'top');
});
