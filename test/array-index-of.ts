import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayIndexOf} from '../source/index.js';

test('arrayIndexOf() matches Array#indexOf()', () => {
	const values = ['a', 'b', 'a'];

	assert.equal(arrayIndexOf(values, 'a'), 0);
	assert.equal(arrayIndexOf(values, 'a', 1), 2);
	assert.equal(arrayIndexOf(values, 'c'), -1);
	assert.equal(arrayIndexOf(values, 'a', -1), 2);
	// `indexOf()` uses strict equality, so `NaN` is never found, unlike with `includes()`.
	assert.equal(arrayIndexOf([NaN], NaN), -1);
});

test('arrayIndexOf() accepts an item wider than the element type', () => {
	const levels = ['debug', 'info', 'warn'] as const;
	const level: string = 'info';
	const unknownValue: unknown = 'warn';

	expectTypeOf(arrayIndexOf(levels, level)).toEqualTypeOf<number>();
	assert.equal(arrayIndexOf(levels, level), 1);
	assert.equal(arrayIndexOf(levels, unknownValue), 2);

	// @ts-expect-error - the builtin requires the element type
	assert.equal(levels.indexOf(level), 1);
});

test('arrayIndexOf() accepts a narrower item and rejects an impossible one', () => {
	const words: string[] = ['a', 'b'];
	assert.equal(arrayIndexOf(words, 'b'), 1);

	const levels = ['debug', 'info'] as const;
	// @ts-expect-error - a number can never be in this array
	assert.equal(arrayIndexOf(levels, 1), -1);
	// A string literal is widened to `string`, as with `arrayIncludes()`, so it is accepted.
	assert.equal(arrayIndexOf(levels, 'warn'), -1);
});
