import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertNever} from '../source/index.js';

test('assertNever()', () => {
	assert.throws(() => {
		assertNever('unexpected' as never);
	}, {
		message: 'Unreachable: `unexpected`',
	});

	assert.throws(() => {
		assertNever(null as never);
	}, {
		message: 'Unreachable: `null`',
	});

	assert.throws(() => {
		assertNever(undefined as never);
	}, {
		message: 'Unreachable: `undefined`',
	});

	assert.throws(() => {
		assertNever({} as never);
	}, {
		message: 'Unreachable: `[object Object]`',
	});

	assert.throws(() => {
		assertNever(Symbol('x') as never);
	}, {
		message: 'Unreachable: `Symbol(x)`',
	});

	assert.throws(() => {
		assertNever(Object.create(null) as never);
	}, {
		message: 'Unreachable: `[object Object]`',
	});
});
