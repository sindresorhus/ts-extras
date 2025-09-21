/* eslint-disable @typescript-eslint/no-empty-object-type */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {safeCastTo} from '../source/index.js';

test('safeCastTo()', () => {
	type Foo = {
		a: string;
		b?: number;
	};

	const EmptyObject = {};
	const foo: Foo = {
		a: '',
		b: 0,
	};

	assert.equal(EmptyObject, safeCastTo(EmptyObject));
	assert.equal(foo, safeCastTo(foo));

	expectTypeOf({}).toEqualTypeOf<{}>();
	expectTypeOf(safeCastTo({})).toEqualTypeOf<{}>();
	expectTypeOf({}).not.toEqualTypeOf<Partial<Foo>>();
	expectTypeOf(safeCastTo({})).not.toEqualTypeOf<Partial<Foo>>();
	expectTypeOf(safeCastTo<Partial<Foo>>({})).toEqualTypeOf<Partial<Foo>>();
	expectTypeOf(safeCastTo<Partial<Foo>>({}).a).toEqualTypeOf<string | undefined>();
	expectTypeOf(safeCastTo<Partial<Foo>>({}).b).toEqualTypeOf<number | undefined>();

	expectTypeOf(foo).toEqualTypeOf<Foo>();
	expectTypeOf(safeCastTo(foo)).toEqualTypeOf<Foo>();
	expectTypeOf(safeCastTo<Partial<Foo>>(foo)).not.toEqualTypeOf<Foo>();
	expectTypeOf(safeCastTo<Partial<Foo>>(foo)).toEqualTypeOf<Partial<Foo>>();

	// @ts-expect-error
	safeCastTo<Foo>({});
	// @ts-expect-error
	safeCastTo<Required<Foo>>(foo);
});
