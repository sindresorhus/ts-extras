import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isEmpty} from '../source/index.js';

test('isEmpty()', () => {
	assert.equal(isEmpty([1, 2, 3]), false);
	assert.equal(isEmpty([]), true);

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
