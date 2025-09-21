import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {keyIn} from '../source/index.js';

test('keyIn() narrows key type', t => {
	const object = {foo: 1, bar: 2};

	// Union type narrowing
	const key = 'foo' as 'foo' | 'bar' | 'baz';
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'bar'>();
		t.true(['foo', 'bar'].includes(key));
	}

	// String to literal narrowing
	const string = 'foo' as string;
	if (keyIn(object, string)) {
		// When key is string type, keyIn doesn't narrow it to literal types
		// @ts-expect-error - string doesn't narrow to literals
		expectTypeOf(string).toMatchTypeOf<'foo' | 'bar'>();
	}

	t.true(keyIn(object, 'foo'));
	t.false(keyIn(object, 'baz'));
});

test('keyIn() with prototype chain', t => {
	const object = {foo: 1};

	// ToString is inherited from Object.prototype
	t.true(keyIn(object, 'toString'));
	t.true(keyIn(object, 'valueOf'));
	t.true(keyIn(object, 'foo'));
	t.false(keyIn(object, 'bar'));
});

test('keyIn() guards against prototype pollution', t => {
	const object = {foo: 1};

	// These are always false for security
	t.false(keyIn(object, '__proto__'));
	t.false(keyIn(object, 'constructor'));

	// Even if explicitly defined
	const objectWithProto = {__proto__: 'value', constructor: 'value'};
	t.false(keyIn(objectWithProto, '__proto__'));
	t.false(keyIn(objectWithProto, 'constructor'));

	// Type narrowing excludes blocked keys
	const key = '__proto__' as '__proto__' | 'foo';
	if (keyIn(object, key)) {
		// Key is now narrowed to exclude '__proto__'
		expectTypeOf(key).toEqualTypeOf<'foo'>();
		t.is(key, 'foo');
	}

	// Also test with constructor
	const constructorKey = 'constructor' as 'constructor' | 'foo';
	if (keyIn(object, constructorKey)) {
		// Constructor is excluded from the narrowed type
		expectTypeOf(constructorKey).toEqualTypeOf<'foo'>();
		t.is(constructorKey, 'foo');
	}
});

test('keyIn() with symbols', t => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object = {[symbol1]: 'value'};

	t.true(keyIn(object, symbol1));
	t.false(keyIn(object, symbol2));

	const key = symbol1 as typeof symbol1 | typeof symbol2;
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<typeof symbol1>();
	}
});

test('keyIn() with Object.create(null)', t => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	t.true(keyIn(object, 'foo'));
	// No prototype, so no inherited properties
	t.false(keyIn(object, 'toString'));
});

test('keyIn() with index signatures', t => {
	const object: {[key: string]: unknown; specific: number} = {
		specific: 1,
		dynamic: 'test',
	};

	const key = 'specific' as 'specific' | 'other';

	// With index signature, all strings are valid keys
	if (keyIn(object, key)) {
		// Key is not narrowed much because of index signature
		expectTypeOf(key).toMatchTypeOf<string>();
		t.pass();
	}
});
