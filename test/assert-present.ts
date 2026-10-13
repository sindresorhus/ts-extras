import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {assertPresent} from '../source/index.js';

test('assertPresent()', () => {
	assert.doesNotThrow(() => {
		assertPresent('present');
	});

	assert.throws(() => {
		assertPresent(null);
	}, {name: 'TypeError', message: 'Expected a present value, got `null`'});

	// The default message names the value, so it differs for `undefined`.
	assert.throws(() => {
		assertPresent(undefined);
	}, {name: 'TypeError', message: 'Expected a present value, got `undefined`'});

	assert.throws(() => {
		assertPresent(null, 'Custom message');
	}, {message: 'Custom message'});

	const maybePresent = 'present' as string | undefined | null;
	assertPresent(maybePresent);
	expectTypeOf(maybePresent).toExtend<string>();
});

test('assertPresent() rejects both nullish values and keeps a custom message', () => {
	// Every falsy value that is not nullish passes, since the guard is about presence and not truthiness, and a message that is an empty string is a message.
	for (const value of [0, -0, NaN, '', false, 0n, Symbol('s'), {}, []]) {
		assert.doesNotThrow(() => {
			assertPresent(value);
		});
	}

	for (const value of [null, undefined]) {
		assert.throws(() => {
			assertPresent(value);
		}, {name: 'TypeError'});
	}

	assert.throws(() => {
		assertPresent(null, '');
	}, {name: 'TypeError', message: ''});

	// A generic comes through narrowed, so the caller does not need a second check.
	function check<Value>(value: Value | null | undefined) {
		assertPresent(value);
		return value;
	}

	assert.equal(check(1), 1);
	assert.equal(check(0), 0);

	// A nullable value loses both nullish members.
	const nullable = 'x' as string | null | undefined;
	assertPresent(nullable);
	expectTypeOf(nullable).toEqualTypeOf<string>();
});
