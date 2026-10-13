import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {assertDefined} from '../source/index.js';

test('assertDefined()', () => {
	assert.doesNotThrow(() => {
		assertDefined('defined');
	});

	assert.throws(() => {
		assertDefined(undefined);
	}, {name: 'TypeError', message: 'Expected a defined value, got `undefined`'});

	// `assertDefined` rejects only `undefined`, so `null` passes. Use `assertPresent` to reject both.
	assert.doesNotThrow(() => {
		assertDefined(null);
	});

	assert.throws(() => {
		assertDefined(undefined, 'Custom message');
	}, {message: 'Custom message'});

	const maybeDefined = 'defined' as string | undefined;
	assertDefined(maybeDefined);
	expectTypeOf(maybeDefined).toExtend<string>();
});

test('assertDefined() rejects only undefined and keeps a custom message', () => {
	// Every falsy value that is not `undefined` passes, since the guard is about presence and not truthiness, and a message that is an empty string is a message.
	for (const value of [null, 0, -0, NaN, '', false, 0n, Symbol('s'), {}, []]) {
		assert.doesNotThrow(() => {
			assertDefined(value);
		});
	}

	assert.throws(() => {
		assertDefined(undefined);
	}, {name: 'TypeError', message: 'Expected a defined value, got `undefined`'});

	assert.throws(() => {
		assertDefined(undefined, '');
	}, {name: 'TypeError', message: ''});

	// A generic comes through narrowed, so the caller does not need a second check.
	function check<Value>(value: Value | undefined) {
		assertDefined(value);
		return value;
	}

	assert.equal(check(1), 1);
	assert.equal(check(null), null);

	// A nullable value keeps its `null`, since only `undefined` is removed.
	const nullable = 'x' as string | null | undefined;
	assertDefined(nullable);
	expectTypeOf(nullable).toEqualTypeOf<string | null>();
});

test('assertDefined() removes undefined from an explicit type argument', () => {
	const value = 1 as number | undefined;
	assertDefined<number | undefined>(value);

	expectTypeOf(value).toEqualTypeOf<number>();
	assert.equal(value.toFixed(1), '1.0');

	const nullable = null as string | null | undefined;
	assertDefined<string | null | undefined>(nullable);
	expectTypeOf(nullable).toEqualTypeOf<string | null>();
	assert.equal(nullable, null);
});

test('assertDefined() excludes undefined from an unknown value', () => {
	const value: unknown = 'defined';
	assertDefined<unknown>(value);

	expectTypeOf(value).toEqualTypeOf<{} | null>();
	assert.equal(value, 'defined');
});

test('assertDefined() removes undefined from a generic return value', () => {
	function required<Value>(value: Value) {
		assertDefined<Value>(value);
		return value;
	}

	expectTypeOf(required<number | undefined>(1)).toEqualTypeOf<number>();
	expectTypeOf(required<number | null | undefined>(null)).toEqualTypeOf<number | null>();
	assert.equal(required<number | undefined>(1), 1);
	assert.equal(required<number | null | undefined>(null), null);
	assert.throws(() => {
		required<number | undefined>(undefined);
	}, TypeError);
});

test('assertDefined() keeps defined falsy literal types and rejects an explicit undefined type', () => {
	type DefinedFalsy = null | false | 0 | '' | 0n;
	for (const value of [null, false, 0, '', 0n] as Array<DefinedFalsy | undefined>) {
		assertDefined<DefinedFalsy | undefined>(value);
		expectTypeOf(value).toEqualTypeOf<DefinedFalsy>();
		assert.notEqual(value, undefined);
	}

	assert.throws(() => {
		assertDefined<undefined>(undefined);
	}, {name: 'TypeError', message: 'Expected a defined value, got `undefined`'});
});

test('assertDefined() narrows an inferred unknown while preserving object and function values', () => {
	const unknownValue: unknown = null;
	assertDefined(unknownValue);
	expectTypeOf(unknownValue).toEqualTypeOf<{} | null>();
	assert.equal(unknownValue, null);

	const object = {readonlyValue: 1} as {readonly readonlyValue: 1} | undefined;
	assertDefined<typeof object>(object);
	expectTypeOf(object).toEqualTypeOf<{readonly readonlyValue: 1}>();
	assert.equal(object.readonlyValue, 1);

	const callback = (() => 'defined') as (() => string) | undefined;
	assertDefined<typeof callback>(callback);
	expectTypeOf(callback).toEqualTypeOf<() => string>();
	assert.equal(callback(), 'defined');
});
