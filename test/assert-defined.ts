import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {assertDefined} from '../source/index.js';

test('assertError()', t => {
	t.notThrows(() => {
		assertDefined('defined');
	});

	t.throws(() => {
		assertDefined(null);
	}, {
		instanceOf: TypeError,
	});

	const maybeDefined = 'defined' as string | null | undefined;
	assertDefined(maybeDefined);
	expectTypeOf(maybeDefined).toMatchTypeOf<string>();
});
