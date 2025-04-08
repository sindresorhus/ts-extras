import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {assertDefined} from '../source/index.js';

test('assertDefined()', t => {
	t.notThrows(() => {
		assertDefined('defined');
	});

	t.throws(() => {
		assertDefined(undefined);
	}, {
		instanceOf: TypeError,
	});

	const maybeDefined = 'defined' as string | undefined;
	assertDefined(maybeDefined);
	expectTypeOf(maybeDefined).toMatchTypeOf<string>();
});
