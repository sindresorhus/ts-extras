import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectHasIn} from '../source/index.js';

test('objectHasIn()', t => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	t.true(objectHasIn(object_, 1));
	t.true(objectHasIn(object_, 'b'));
	t.true(objectHasIn(object_, symbolKey));
	t.false(objectHasIn(object_, 'hello'));

	// Test prototype chain - toString is inherited
	t.true(objectHasIn(object_, 'toString'));
	t.true(objectHasIn(object_, 'valueOf'));

	if (objectHasIn(object_, 1) && objectHasIn(object_, 'b') && objectHasIn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}

	// Test that it narrows the object type
	const data: unknown = {foo: 'test'};
	if (objectHasIn(data, 'foo')) {
		expectTypeOf(data).toMatchTypeOf<{foo: unknown}>();
		// Should be able to access the property
		t.is(typeof data.foo, 'string');
	}
});

test('objectHasIn() guards against prototype pollution', t => {
	const object: Record<string, unknown> = {foo: 1};

	// These are always false for security
	t.false(objectHasIn(object, '__proto__'));
	t.false(objectHasIn(object, 'constructor'));

	// Even if explicitly defined
	const objectWithProto: Record<string, unknown> = {__proto__: 'value', constructor: 'value'};
	t.false(objectHasIn(objectWithProto, '__proto__'));
	t.false(objectHasIn(objectWithProto, 'constructor'));
});

test('objectHasIn() with Object.create(null)', t => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	t.true(objectHasIn(object, 'foo'));
	// No prototype, so no inherited properties
	t.false(objectHasIn(object, 'toString'));
});

test('objectHasIn() with symbols', t => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	t.true(objectHasIn(object, symbol1));
	t.false(objectHasIn(object, symbol2));

	if (objectHasIn(object, symbol1)) {
		expectTypeOf(object).toMatchTypeOf<{[symbol1]: unknown}>();
	}
});
