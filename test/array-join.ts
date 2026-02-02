import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayJoin} from '../source/index.js';

test('arrayJoin() with literal tuple', () => {
	const result = arrayJoin(['foo', 'bar', 'baz'], '-');
	expectTypeOf(result).toEqualTypeOf<'foo-bar-baz'>();
	assert.equal(result, 'foo-bar-baz');
});

test('arrayJoin() with dot delimiter', () => {
	const result = arrayJoin(['a', 'b', 'c'], '.');
	expectTypeOf(result).toEqualTypeOf<'a.b.c'>();
	assert.equal(result, 'a.b.c');
});

test('arrayJoin() with single element', () => {
	const result = arrayJoin(['foo'], '-');
	expectTypeOf(result).toEqualTypeOf<'foo'>();
	assert.equal(result, 'foo');
});

test('arrayJoin() with empty array', () => {
	const result = arrayJoin([], '-');
	expectTypeOf(result).toEqualTypeOf<''>();
	assert.equal(result, '');
});

test('arrayJoin() with empty delimiter', () => {
	const result = arrayJoin(['a', 'b', 'c'], '');
	expectTypeOf(result).toEqualTypeOf<'abc'>();
	assert.equal(result, 'abc');
});

test('arrayJoin() with numbers', () => {
	const result = arrayJoin([1, 2, 3], '.');
	expectTypeOf(result).toEqualTypeOf<'1.2.3'>();
	assert.equal(result, '1.2.3');
});

test('arrayJoin() with mixed types', () => {
	const result = arrayJoin(['foo', 1, true], '-');
	expectTypeOf(result).toEqualTypeOf<'foo-1-true'>();
	assert.equal(result, 'foo-1-true');
});

test('arrayJoin() with dynamic array', () => {
	const dynamic: string[] = ['a', 'b', 'c'];
	const result = arrayJoin(dynamic, '-');
	expectTypeOf(result).toEqualTypeOf<string>();
	assert.equal(result, 'a-b-c');
});

test('arrayJoin() with nullish values', () => {
	const result = arrayJoin(['foo', undefined, 'bar'], '.');
	expectTypeOf(result).toEqualTypeOf<'foo..bar'>();
	assert.equal(result, 'foo..bar');
});

test('arrayJoin() with as const', () => {
	const parts = ['foo', 'bar'] as const;
	const result = arrayJoin(parts, '-');
	expectTypeOf(result).toEqualTypeOf<'foo-bar'>();
	assert.equal(result, 'foo-bar');
});
