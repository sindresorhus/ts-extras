import test from 'ava';
import {isEmpty} from '../source/index.js';

test('isEmpty()', t => {
	t.false(isEmpty([1, 2, 3]));
	t.true(isEmpty([]));

	const immutable: readonly number[] = [1, 2, 3];

	if (isEmpty(immutable)) {
		// @ts-expect-error Should not change immutability
		immutable.pop(); // eslint-disable-line @typescript-eslint/no-unsafe-call
	}

	const mutable = [1, 2, 3];

	if (!isEmpty(mutable)) {
		mutable.pop();
	}
});
