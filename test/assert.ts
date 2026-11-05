import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {assert as assertCondition} from '../source/index.js';

test('assert()', () => {
	assert.doesNotThrow(() => {
		assertCondition(true);
	});

	assert.throws(() => {
		assertCondition(false);
	}, {message: 'Assertion failed'});

	assert.throws(() => {
		assertCondition(false, 'Custom message');
	}, {message: 'Custom message'});

	const value = 'unicorn' as string | undefined;
	assertCondition(value);
	expectTypeOf(value).toExtend<string>();
});

test('assert() treats every falsy value as a failure', () => {
	// A falsy value is a failure, not just `false`, and a truthy one is not, whatever it is.
	for (const falsy of [false, 0, -0, NaN, '', null, undefined, 0n]) {
		assert.throws(() => {
			assertCondition(falsy);
		}, {name: 'Error', message: 'Assertion failed'});
	}

	for (const truthy of [true, 1, -1, 'x', '0', [], {}, Symbol('s'), 1n]) {
		assert.doesNotThrow(() => {
			assertCondition(truthy);
		});
	}
});

test('assert() keeps an explicit message, including an empty one', () => {
	// The message is used with `??`, so an empty string is a message and not a reason to fall back.
	assert.throws(() => {
		assertCondition(false, '');
	}, {message: ''});

	assert.throws(() => {
		assertCondition(false, 'Boom');
	}, {name: 'Error', message: 'Boom'});

	// A falsy condition with a message still fails, and the message is the one given.
	assert.throws(() => {
		assertCondition(0, 'Zero');
	}, {name: 'Error', message: 'Zero'});
});

test('assert() narrows whatever it is given', () => {
	const value = 'unicorn' as string | undefined;
	assertCondition(value);
	expectTypeOf(value).toEqualTypeOf<string>();

	// A generic comes through narrowed, so the caller does not need a second check.
	function check<Condition>(condition: Condition) {
		assertCondition(condition);
		return condition;
	}

	assert.equal(check(1), 1);
	assert.equal(check('a'), 'a');

	// An object condition narrows to the object, not to its truthiness.
	const object: {a: number} | undefined = {a: 1};
	assertCondition(object);
	expectTypeOf(object).toEqualTypeOf<{a: number}>();
});

test('assert() calls a message function only when the assertion fails', () => {
	let calls = 0;
	const message = () => {
		calls++;
		return 'Lazy message';
	};

	assertCondition(true, message);
	assert.equal(calls, 0);

	assert.throws(() => {
		assertCondition(false, message);
	}, {name: 'Error', message: 'Lazy message'});
	assert.equal(calls, 1);

	// An empty returned message is a message, not a reason to fall back.
	assert.throws(() => {
		assertCondition(false, () => '');
	}, {message: ''});

	// A message function that throws lets its own error through, so the failure is not hidden.
	assert.throws(() => {
		assertCondition(false, () => {
			throw new TypeError('broken message');
		});
	}, {name: 'TypeError', message: 'broken message'});

	// It narrows the same way.
	const value = 'unicorn' as string | undefined;
	assertCondition(value, () => 'Expected a value');
	expectTypeOf(value).toEqualTypeOf<string>();
});
