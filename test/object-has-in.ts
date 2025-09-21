import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectHasIn} from '../source/index.js';

test('objectHasIn()', () => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	assert.equal(objectHasIn(object_, 1), true);
	assert.equal(objectHasIn(object_, 'b'), true);
	assert.equal(objectHasIn(object_, symbolKey), true);
	assert.equal(objectHasIn(object_, 'hello'), false);

	// Test prototype chain - toString is inherited
	assert.equal(objectHasIn(object_, 'toString'), true);
	assert.equal(objectHasIn(object_, 'valueOf'), true);

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
		expectTypeOf(data).toExtend<{foo: unknown}>();
		// Should be able to access the property
		assert.equal(typeof data.foo, 'string');
	}
});

test('objectHasIn() guards against prototype pollution', () => {
	const object: Record<string, unknown> = {foo: 1};

	// These are always false for security
	assert.equal(objectHasIn(object, '__proto__'), false);
	assert.equal(objectHasIn(object, 'constructor'), false);

	// Even if explicitly defined
	const objectWithProto: Record<string, unknown> = {__proto__: 'value', constructor: 'value'};
	assert.equal(objectHasIn(objectWithProto, '__proto__'), false);
	assert.equal(objectHasIn(objectWithProto, 'constructor'), false);
});

test('objectHasIn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(objectHasIn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(objectHasIn(object, 'toString'), false);
});

test('objectHasIn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	assert.equal(objectHasIn(object, symbol1), true);
	assert.equal(objectHasIn(object, symbol2), false);

	if (objectHasIn(object, symbol1)) {
		expectTypeOf(object).toExtend<{[symbol1]: unknown}>();
	}
});
