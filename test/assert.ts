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
