import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectHasOwn} from '../source/index.js';

test('objectHasOwn()', t => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	t.true(objectHasOwn(object_, 1));
	t.true(objectHasOwn(object_, 'b'));
	t.true(objectHasOwn(object_, symbolKey));
	t.false(objectHasOwn(object_, 'hello'));

	if (objectHasOwn(object_, 1) && objectHasOwn(object_, 'b') && objectHasOwn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}
});
