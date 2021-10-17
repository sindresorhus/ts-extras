import test from 'ava';
import {assertError} from '../source/index.js';

test('assertError()', t => {
	t.notThrows(() => {
		assertError(new Error('x'));
	});

	t.throws(() => {
		assertError('x');
	}, {
		instanceOf: TypeError,
	});
});
