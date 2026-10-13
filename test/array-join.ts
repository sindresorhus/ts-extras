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

test('arrayJoin() accepts what Array#join stringifies', () => {
	// `Array#join()` runs every element through `String()`, so an object, an array, or a `Date` is accepted, and there is no literal to preserve for any of them, so there is no tuple to promise either. The one element it cannot stringify is a `Symbol`, which still throws, and a call that may hold one is still rejected.
	expectTypeOf(arrayJoin([new Date(0)], '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin([new Date(0)], '-'), new Date(0).toString());

	expectTypeOf(arrayJoin([['a', 'b']], '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin([['a', 'b']], '-'), 'a,b');

	expectTypeOf(arrayJoin([{toString: () => 'x'}], '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin([{toString: () => 'x'}], '-'), 'x');

	// The literal forms still resolve to a literal.
	expectTypeOf(arrayJoin(['a', 'b'] as const, '-')).toEqualTypeOf<'a-b'>();
	expectTypeOf(arrayJoin(['a', 'b'], '-')).toEqualTypeOf<'a-b'>();
	expectTypeOf(arrayJoin(['foo', 'bar', 'baz'], '-')).toEqualTypeOf<'foo-bar-baz'>();

	// A `Symbol` throws at runtime, as it does for the builtin, so the type does not claim otherwise.
	if (false) {
		// @ts-expect-error - `Array#join()` throws on a `Symbol` element.
		arrayJoin([Symbol('a')], '-');

		// @ts-expect-error - a `Symbol` anywhere in the elements throws too.
		arrayJoin([1, Symbol('a')], '-');
	}

	assert.throws(() => {
		arrayJoin([Symbol('a')] as unknown as string[], '-');
	}, TypeError);
});

test('arrayJoin() keeps a template literal for a widened number', () => {
	// This matches what TypeScript gives a template literal with a `number` in it. `NaN` and the infinities are outside `${number}`, which is the same limitation TypeScript has.
	const major: number = 1;
	const minor: number = 2;
	const version: `${number}.${number}` = arrayJoin([major, minor], '.');
	assert.equal(version, '1.2');

	const id: number = 3;
	expectTypeOf(arrayJoin(['user', id], ':')).toEqualTypeOf<`user:${number}`>();

	// A numeric literal still resolves, and so does every other element, whose template does cover its whole text.
	expectTypeOf(arrayJoin([1, 2] as const, '-')).toEqualTypeOf<'1-2'>();
	expectTypeOf(arrayJoin([1, 2.5] as const, '-')).toEqualTypeOf<'1-2.5'>();
	expectTypeOf(arrayJoin(['a', 'b'] as const, '-')).toEqualTypeOf<'a-b'>();
	expectTypeOf(arrayJoin([true, false] as const, '-')).toEqualTypeOf<'true-false'>();
	expectTypeOf(arrayJoin([1n, 2n] as const, '-')).toEqualTypeOf<'1-2'>();
	assert.equal(arrayJoin([1, 2] as const, '-'), '1-2');
});

test('arrayJoin() does not promise a joined string an optional element cannot produce', () => {
	// A tuple with an optional element has more than one length, so the runtime joins only the elements that are there: `['a']` joins to `'a'`, which the promised union does not contain. An explicit `undefined` element is different, and still exact, because the join puts an empty string where it is.
	const optional: readonly ['a', 'b'?] = ['a'];
	expectTypeOf(arrayJoin(optional, '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin(optional, '-'), 'a');
	assert.equal(arrayJoin(['a', 'b'] as ['a', 'b'?], '-'), 'a-b');
	assert.equal(arrayJoin(['a', 'b'], '-'), 'a-b');

	expectTypeOf(arrayJoin(['a', undefined] as const, '-')).toEqualTypeOf<'a-'>();
	assert.equal(arrayJoin(['a', undefined] as const, '-'), 'a-');

	// A fixed tuple and an array are unaffected.
	expectTypeOf(arrayJoin(['a', 'b'] as const, '-')).toEqualTypeOf<'a-b'>();
	expectTypeOf(arrayJoin(['a', 'b'] as string[], '-')).toEqualTypeOf<string>();
});

test('arrayJoin() joins each member of a union of tuples', () => {
	// Regression guard: a union of fixed tuples with different lengths also has a union length, but each member is still exact.
	const pick = (short: boolean): readonly ['a', 'b'] | readonly ['c'] => short ? ['c'] : ['a', 'b'];

	expectTypeOf(arrayJoin(pick(false), '-')).toEqualTypeOf<'a-b' | 'c'>();
	assert.equal(arrayJoin(pick(false), '-'), 'a-b');
	assert.equal(arrayJoin(pick(true), '-'), 'c');
});

test('arrayJoin() does not promise a joined string a rest element cannot produce', () => {
	// A tuple with a rest element has a `number` length, and the rest can be empty, so the result must not promise a delimiter the runtime never writes: `['a']` joins to `'a'`, which is not in `` `a-${string}` ``. A missing tail is the same case as a missing optional element.
	const restTail = ['a'] as readonly ['a', ...'b'[]];
	expectTypeOf(arrayJoin(restTail, '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin(restTail, '-'), 'a');
	assert.equal(arrayJoin(['a', 'b'] as readonly ['a', ...'b'[]], '-'), 'a-b');

	const restHead = ['z'] as readonly [...'a'[], 'z'];
	expectTypeOf(arrayJoin(restHead, '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin(restHead, '-'), 'z');

	const restOptional = ['a'] as readonly ['a', 'b'?, ...string[]];
	expectTypeOf(arrayJoin(restOptional, '-')).toEqualTypeOf<string>();
	assert.equal(arrayJoin(restOptional, '-'), 'a');

	// A tuple with a definite length is unaffected, whether or not it is the only case.
	expectTypeOf(arrayJoin(['a', 'b'] as const, '-')).toEqualTypeOf<'a-b'>();
	expectTypeOf(arrayJoin(['a', undefined] as const, '-')).toEqualTypeOf<'a-'>();
});

test('arrayJoin() takes the separator the builtin defaults to', () => {
	// `Array#join()` defaults its separator to a comma, and the pieces are then still known exactly, so an argument that is simply not there gives the same literal answer.
	expectTypeOf(arrayJoin(['a', 'b'] as const)).toEqualTypeOf<'a,b'>();
	const list: string[] = ['a', 'b'];
	expectTypeOf(arrayJoin(list)).toEqualTypeOf<string>();
	expectTypeOf(arrayJoin([1, 2] as const)).toEqualTypeOf<'1,2'>();

	assert.equal(arrayJoin(['a', 'b']), 'a,b');
	assert.equal(arrayJoin([]), '');
	assert.equal(arrayJoin([1]), '1');
	// eslint-disable-next-line unicorn/require-array-join-separator -- The builtin default is the point.
	assert.equal([1, 2, 3].join(), '1,2,3');

	// A separator that is there still wins, including an empty string.
	assert.equal(arrayJoin(['a', 'b'], ''), 'ab');
	assert.equal(arrayJoin(['a', 'b'], undefined), 'a,b');
	assert.equal(arrayJoin([1, 2], '|'), '1|2');
});

test('arrayJoin() accepts an optional separator value', () => {
	const join = (separator: string | undefined) => arrayJoin(['a', 'b'], separator);

	expectTypeOf(join(undefined)).toEqualTypeOf<string>();
	assert.equal(join(undefined), 'a,b');
	assert.equal(join('-'), 'a-b');
});
