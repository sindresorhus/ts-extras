import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {isDefined} from '../source/index.js';

test('isDefined()', t => {
	t.false(isDefined(undefined));
	t.true(isDefined(null));
	t.true(isDefined(1));
	t.true(isDefined('x'));

	const fixture = [1, undefined].filter(x => isDefined(x));
	expectTypeOf(fixture).not.toBeUndefined();

	const number: number | undefined = 1;

	if (isDefined(number)) {
		expectTypeOf(number).toBeNumber();
	}
});
