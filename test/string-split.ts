import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {stringSplit} from '../source/index.js';

test('stringSplit() with string literals', () => {
	const result = stringSplit('foo-bar-baz', '-');
	expectTypeOf(result).toEqualTypeOf<['foo', 'bar', 'baz']>();
	assert.deepEqual(result, ['foo', 'bar', 'baz']);

	const dotSplit = stringSplit('a.b.c', '.');
	expectTypeOf(dotSplit).toEqualTypeOf<['a', 'b', 'c']>();
	assert.deepEqual(dotSplit, ['a', 'b', 'c']);
});

test('stringSplit() with no delimiter match', () => {
	const result = stringSplit('hello', '-');
	expectTypeOf(result).toEqualTypeOf<['hello']>();
	assert.deepEqual(result, ['hello']);
});

test('stringSplit() with empty string', () => {
	const result = stringSplit('', '-');
	expectTypeOf(result).toEqualTypeOf<['']>();
	assert.deepEqual(result, ['']);
});

test('stringSplit() with dynamic strings', () => {
	const dynamicString = 'dynamic-content';
	const result = stringSplit(dynamicString, '-');
	expectTypeOf(result).toExtend<string[]>();
	assert.deepEqual(result, ['dynamic', 'content']);
});

test('stringSplit() use case from issue', () => {
	const placement = 'top-start' as const;
	const parts = stringSplit(placement, '-');
	expectTypeOf(parts).toEqualTypeOf<['top', 'start']>();

	const side = parts[0];
	expectTypeOf(side).toEqualTypeOf<'top'>();
	assert.equal(side, 'top');
});
