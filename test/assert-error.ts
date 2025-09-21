import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertError} from '../source/index.js';

test('assertError()', () => {
	assert.doesNotThrow(() => {
		assertError(new Error('x'));
	});

	assert.throws(() => {
		assertError('x');
	}, TypeError);
});
