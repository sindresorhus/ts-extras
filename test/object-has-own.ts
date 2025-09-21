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

	// Test that inherited properties return false
	t.false(objectHasOwn(object_, 'toString'));
	t.false(objectHasOwn(object_, 'valueOf'));

	if (objectHasOwn(object_, 1) && objectHasOwn(object_, 'b') && objectHasOwn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}

	// Test that it narrows the object type
	const data: unknown = {foo: 'test'};
	if (objectHasOwn(data, 'foo')) {
		expectTypeOf(data).toMatchTypeOf<{foo: unknown}>();
		// Should be able to access the property
		t.is(typeof data.foo, 'string');
	}
});

test('objectHasOwn() with Object.create(null)', t => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	t.true(objectHasOwn(object, 'foo'));
	// No prototype, so no inherited properties
	t.false(objectHasOwn(object, 'toString'));
});

test('objectHasOwn() with symbols', t => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	t.true(objectHasOwn(object, symbol1));
	t.false(objectHasOwn(object, symbol2));

	if (objectHasOwn(object, symbol1)) {
		expectTypeOf(object).toMatchTypeOf<{[symbol1]: unknown}>();
	}
});
