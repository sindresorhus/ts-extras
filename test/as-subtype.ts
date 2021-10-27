import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {asSubtype} from '../source/index.js';

test('isDefined()', t => {
	// To assuage the linter
	t.true(true);

	let isDefined = true;
	const foo = 'bar' as string | null;

	if (foo === null) {
		isDefined = false;
	}

	if (!isDefined) {
		expectTypeOf(foo).toMatchTypeOf<string | null>();
		asSubtype<string>(foo);
		expectTypeOf(foo).toMatchTypeOf<string>();
	}

	// Similar types
	const bar = ['bar'];
	expectTypeOf(bar).toMatchTypeOf<string[]>();
	asSubtype<[string]>(bar);
	expectTypeOf(bar).toMatchTypeOf<[string]>();
	asSubtype<['bar']>(bar);
	expectTypeOf(bar).toMatchTypeOf<['bar']>();

	// Invariant violation
	asSubtype<['foo']>(bar);
	// @ts-expect-error
	expectTypeOf(bar).toMatchTypeOf<['foo']>();

	// Never
	asSubtype<string>(bar);
	expectTypeOf(bar).toMatchTypeOf<never>();

	const _test1_ = 'string';
	asSubtype<number>('string');
	// @ts-expect-error
	expectTypeOf(_test1_).toBeNever();

	const _test2_ = 'string' as string | null;
	asSubtype<undefined>(_test2_);
	expectTypeOf(_test2_).toBeNever();

	// Attempt type expansion
	const baz = 'baz' as string | null;
	asSubtype<string>(baz);
	expectTypeOf(baz).toMatchTypeOf<string>();
	asSubtype<null | string>(baz);
	expectTypeOf(baz).toMatchTypeOf<string>();
});
