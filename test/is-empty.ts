import test from 'ava';
import {isEmpty} from '../source/index.js';

test('isEmpty()', t => {
	t.false(isEmpty([1, 2, 3]));
	t.true(isEmpty([]));
});
