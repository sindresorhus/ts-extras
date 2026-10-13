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

type Nested = {
	a: string;
	nested: {b: number};
	list: number[];
};

type WithUnion = 'a' | 'b';

test('safeCastTo() refuses every cast that is not an assignment', () => {
	// The point of the function is that the argument has to be assignable to the type argument, so every one of these is a compile error rather than the `as` cast it replaces. The set is measured, not guessed: an excess property is allowed, because plain TypeScript allows it too.
	if (false) {
		// @ts-expect-error - `unknown` is not assignable to anything narrower.
		safeCastTo<{a: string}>({} as unknown);

		// @ts-expect-error - a missing property.
		safeCastTo<Nested>({a: 'x'});

		// @ts-expect-error - a property of the wrong type.
		safeCastTo<Nested>({a: 1, nested: {b: 1}, list: []});

		// @ts-expect-error - `null` is not assignable to a non-nullable object.
		safeCastTo<Nested>(null);

		// @ts-expect-error - `undefined` is not assignable either.
		safeCastTo<Nested>(undefined);

		// @ts-expect-error - a member of a union is not the whole union.
		safeCastTo<WithUnion>('c');

		// @ts-expect-error - a tuple of the wrong length.
		safeCastTo<[string, string, string]>(['a', 'b']);

		// @ts-expect-error - a string is not a number.
		safeCastTo<number>('a' as string);

		// @ts-expect-error - a literal of the wrong value.
		safeCastTo<{a: 1}>({a: 2});
	}

	// Every cast that is an assignment is fine, and the value comes back untouched. An excess property is one of them, because plain TypeScript allows it for a non-fresh value.
	const value = {a: 'x', nested: {b: 1}, list: [1]};
	assert.equal(safeCastTo<Nested>(value), value);
	assert.equal(safeCastTo<{a: string; extra: number}>({a: 'x', extra: 1}).a, 'x');
	assert.equal(safeCastTo<{a: string}>({a: 'x', extra: 1} as {a: string; extra: number}).a, 'x');
	assert.equal(safeCastTo<Nested>({a: 'x', nested: {b: 1}, list: []}).a, 'x');
	assert.equal(safeCastTo<'a'>('a'), 'a');
	assert.equal(safeCastTo<null>(null), null);
	assert.equal(safeCastTo<undefined>(undefined), undefined);
	assert.equal(safeCastTo<readonly string[]>(['a'])[0], 'a');
});

test('safeCastTo() keeps the argument type it is given', () => {
	// A generic comes through as itself, so the value is usable without a second cast.
	function identity<Value>(value: Value) {
		return safeCastTo<Value>(value);
	}

	assert.equal(identity(1), 1);
	assert.equal(identity('a'), 'a');

	// A union argument is not narrowed to one member.
	const union = safeCastTo<WithUnion>('a');
	expectTypeOf(union).toEqualTypeOf<WithUnion>();

	// An optional property stays optional rather than becoming required or `undefined`.
	const optional = safeCastTo<Partial<Nested>>({});
	expectTypeOf(optional.a).toEqualTypeOf<string | undefined>();
});
