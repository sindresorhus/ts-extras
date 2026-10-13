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

test('stringSplit() accepts a regular expression delimiter', () => {
	// `String#split()` takes a regular expression and the implementation passes the argument straight through, so the call works at runtime and there is no literal delimiter to preserve. Most regular expressions have no captures, so the result is the builtin's own `string[]`, which keeps `.map()` and friends usable.
	const parts = stringSplit('a1b2c', /\d/v);

	expectTypeOf(parts).toEqualTypeOf<string[]>();
	assert.deepEqual(parts, ['a', 'b', 'c']);
	assert.deepEqual(stringSplit('a1b', /1/v), ['a', 'b']);
	assert.deepEqual(stringSplit('abc', /z/v), ['abc']);

	// A string delimiter still resolves to a tuple.
	expectTypeOf(stringSplit('a-b', '-')).toEqualTypeOf<['a', 'b']>();
});

// Returns a `string | RegExp` so the argument's own type is a union. A `declare const` cannot live inside a function body, and a `const` with an initializer is narrowed to the initializer's type.
function delimiter(): string | RegExp {
	return /\d/v;
}

test('stringSplit() accepts a delimiter typed as the union of a string and a regular expression', () => {
	// `String#split()` takes either, so a value that is one or the other is a delimiter it accepts. Neither has a literal form to preserve, so the result is `string[]`.
	const parts = stringSplit('a1b', delimiter());

	expectTypeOf(parts).toEqualTypeOf<string[]>();
	assert.deepEqual(parts, ['a', 'b']);

	const fromString = stringSplit('a1b', '1' as string | RegExp);
	expectTypeOf(fromString).toEqualTypeOf<string[]>();
	assert.deepEqual(fromString, ['a', 'b']);

	// A plain string delimiter still resolves to a tuple.
	expectTypeOf(stringSplit('a-b', '-')).toEqualTypeOf<['a', 'b']>();
	expectTypeOf(stringSplit('a1b', /\d/v)).toEqualTypeOf<string[]>();
});

test('stringSplit() takes the limit the builtin accepts', () => {
	// A limit truncates the result, so the tuple form would be a lie. An absent delimiter has no literal to work from either, and `String#split()` has no comma default, so it returns the whole string. Both are a plain `string[]`, which is what the builtin returns.
	const limited = stringSplit('a,b,c', ',', 2);

	expectTypeOf(limited).toEqualTypeOf<string[]>();
	assert.deepEqual(limited, ['a', 'b']);
	assert.deepEqual(stringSplit('a,b,c', ',', 0), []);
	assert.deepEqual(stringSplit('a,b,c', ',', 100), ['a', 'b', 'c']);

	// `String#split()` has no comma default: an absent separator returns the whole string, so the pieces are one and the result is still a plain `string[]`.
	expectTypeOf(stringSplit('abc')).toEqualTypeOf<string[]>();
	assert.deepEqual(stringSplit('abc'), ['abc']);
	assert.deepEqual(stringSplit('a,b'), ['a,b']);
	assert.deepEqual(stringSplit('abc', undefined), ['abc']);
	assert.deepEqual(stringSplit('a,b', undefined), ['a,b']);
	assert.deepEqual(stringSplit('a,b,c', undefined, 1), ['a,b,c']);
	assert.deepEqual(stringSplit('a,b,c', ',', 1), ['a']);

	// The limit is the second argument even when the separator is absent, so a string that happens to contain a digit is the one that catches a limit read as a separator. `'a,b,c'` cannot, since it has no `'1'` in it, and answers the same either way.
	assert.deepEqual(stringSplit('a1b2c', undefined, 1), ['a1b2c']);
	assert.deepEqual(stringSplit('a1b2c', undefined, 2), ['a1b2c']);
	assert.deepEqual(stringSplit('a1b2c', undefined, 0), []);
	assert.deepEqual(stringSplit('a1b2c', '1'), ['a', 'b2c']);
	assert.deepEqual(stringSplit('a1b2c', '1', 1), ['a']);
	// The same shape with a regular expression separator, and with a limit that is not an integer.
	assert.deepEqual(stringSplit('a1b2c', /\d/v, 1), ['a']);
	assert.deepEqual(stringSplit('a1b2c', undefined, 1.9), ['a1b2c']);

	// A plain literal delimiter still resolves to a tuple.
	expectTypeOf(stringSplit('a-b', '-')).toEqualTypeOf<['a', 'b']>();
	expectTypeOf(stringSplit('a-b', '-', 1)).toEqualTypeOf<string[]>();
});

test('stringSplit() contributes undefined at runtime for unmatched regular expression captures', () => {
	// An unmatched capture adds an `undefined` entry at runtime, which the `string[]` type does not describe. That is the documented cost of keeping most regular-expression splits guard-free.
	const parts = stringSplit('a-b,c', /(-)|(,)/v);

	expectTypeOf(parts).toEqualTypeOf<string[]>();
	assert.deepEqual(parts, ['a', '-', undefined, 'b', undefined, ',', 'c']);

	const limited = stringSplit('a-b,c', /(-)|(,)/v, 3);
	expectTypeOf(limited).toEqualTypeOf<string[]>();
	assert.deepEqual(limited, ['a', '-', undefined]);

	const optionalSeparator = /(-)|(,)/v as string | RegExp | undefined;
	const optionalParts = stringSplit('a-b,c', optionalSeparator);
	expectTypeOf(optionalParts).toEqualTypeOf<string[]>();
	assert.deepEqual(optionalParts, parts);
	assert.deepEqual(stringSplit('a-b,c', optionalSeparator, 0), []);

	const matchedCaptures = stringSplit('a-b-c', /(-)/v);
	expectTypeOf(matchedCaptures).toEqualTypeOf<string[]>();
	assert.deepEqual(matchedCaptures, ['a', '-', 'b', '-', 'c']);

	const stringSeparator = '-' as string | undefined;
	expectTypeOf(stringSplit('a-b-c', stringSeparator, 2)).toEqualTypeOf<string[]>();
	assert.deepEqual(stringSplit('a-b-c', stringSeparator, 2), ['a', 'b']);
});

test('stringSplit() leaves a global regular expression state unchanged', () => {
	const separator = /(-)|(,)/gv;
	separator.lastIndex = 3;

	assert.deepEqual(stringSplit('a-b,c', separator, 4), ['a', '-', undefined, 'b']);
	assert.equal(separator.lastIndex, 3);
	assert.deepEqual(stringSplit('a-b,c', separator), ['a', '-', undefined, 'b', undefined, ',', 'c']);
	assert.equal(separator.lastIndex, 3);
});
