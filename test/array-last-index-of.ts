import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {arrayLastIndexOf} from '../source/index.js';

test('arrayLastIndexOf() matches Array#lastIndexOf()', () => {
	const values = ['a', 'b', 'a'];

	assert.equal(arrayLastIndexOf(values, 'a'), 2);
	assert.equal(arrayLastIndexOf(values, 'a', 1), 0);
	assert.equal(arrayLastIndexOf(values, 'c'), -1);
	assert.equal(arrayLastIndexOf(values, 'a', -2), 0);
	// `lastIndexOf()` uses strict equality, so `NaN` is never found, unlike with `includes()`.
	assert.equal(arrayLastIndexOf([NaN], NaN), -1);
});

test('arrayLastIndexOf() searches the whole array when fromIndex is absent', () => {
	// Regression guard: `lastIndexOf(item, undefined)` reads the index as `0` and searches only the first element.
	const values = ['a', 'b', 'a'];
	assert.equal(values.lastIndexOf('a', undefined), 0);
	assert.equal(arrayLastIndexOf(values, 'a'), 2);
	assert.equal(arrayLastIndexOf(values, 'a', undefined), 0);
});

test('arrayLastIndexOf() preserves an explicit undefined fromIndex when forwarding arguments', () => {
	const values = ['a', 'b', 'a'];
	const search = (...fromIndex: [number?]) => arrayLastIndexOf(values, 'b', ...fromIndex);

	assert.equal(search(), values.lastIndexOf('b'));
	assert.equal(search(undefined), values.lastIndexOf('b', undefined));
	assert.equal(search(2), values.lastIndexOf('b', 2));
});

test('arrayLastIndexOf() accepts an item wider than the element type', () => {
	const steps = ['build', 'test', 'build'] as const;
	const step: string = 'build';
	const unknownValue: unknown = 'test';

	expectTypeOf(arrayLastIndexOf(steps, step)).toEqualTypeOf<number>();
	assert.equal(arrayLastIndexOf(steps, step), 2);
	assert.equal(arrayLastIndexOf(steps, unknownValue), 1);

	// @ts-expect-error - the builtin requires the element type
	assert.equal(steps.lastIndexOf(step), 2);
	// @ts-expect-error - a number can never be in this array
	assert.equal(arrayLastIndexOf(steps, 1), -1);
});
