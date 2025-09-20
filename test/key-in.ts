import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {keyIn} from '../source/index.js';

test('keyIn() narrows key type', t => {
	const obj = {foo: 1, bar: 2};

	// Union type narrowing
	const key = 'foo' as 'foo' | 'bar' | 'baz';
	if (keyIn(obj, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'bar'>();
		t.true(['foo', 'bar'].includes(key));
	}

	// String to literal narrowing
	const string: string = 'foo';
	if (keyIn(obj, string)) {
		expectTypeOf(string).toEqualTypeOf<'foo' | 'bar'>();
	}

	t.true(keyIn(obj, 'foo'));
	t.false(keyIn(obj, 'baz'));
});

test('keyIn() with prototype chain', t => {
	const obj = {foo: 1};

	// toString is inherited from Object.prototype
	t.true(keyIn(obj, 'toString'));
	t.true(keyIn(obj, 'valueOf'));
	t.true(keyIn(obj, 'foo'));
	t.false(keyIn(obj, 'bar'));
});

test('keyIn() guards against prototype pollution', t => {
	const obj = {foo: 1};

	// These are always false for security
	t.false(keyIn(obj, '__proto__'));
	t.false(keyIn(obj, 'constructor'));

	// Even if explicitly defined
	const objWithProto = {'__proto__': 'value', constructor: 'value'};
	t.false(keyIn(objWithProto, '__proto__'));
	t.false(keyIn(objWithProto, 'constructor'));

	// Type narrowing excludes blocked keys
	const key = '__proto__' as '__proto__' | 'foo';
	if (keyIn(obj, key)) {
		// key is now narrowed to exclude '__proto__'
		expectTypeOf(key).toEqualTypeOf<'foo'>();
		t.is(key, 'foo');
	}

	// Also test with constructor
	const constructorKey = 'constructor' as 'constructor' | 'toString';
	if (keyIn(obj, constructorKey)) {
		// constructor is excluded from the narrowed type
		expectTypeOf(constructorKey).toEqualTypeOf<'toString'>();
		t.is(constructorKey, 'toString');
	}
});

test('keyIn() with symbols', t => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const obj = {[symbol1]: 'value'};

	t.true(keyIn(obj, symbol1));
	t.false(keyIn(obj, symbol2));

	const key = symbol1 as typeof symbol1 | typeof symbol2;
	if (keyIn(obj, key)) {
		expectTypeOf(key).toEqualTypeOf<typeof symbol1>();
	}
});

test('keyIn() with Object.create(null)', t => {
	const obj = Object.create(null) as {foo?: number};
	obj.foo = 1;

	t.true(keyIn(obj, 'foo'));
	// No prototype, so no inherited properties
	t.false(keyIn(obj, 'toString'));
});

test('keyIn() with index signatures', t => {
	const obj: {[key: string]: unknown; specific: number} = {
		specific: 1,
		dynamic: 'test',
	};

	const key = 'specific' as 'specific' | 'other';

	// With index signature, all strings are valid keys
	if (keyIn(obj, key)) {
		// Key is not narrowed much because of index signature
		expectTypeOf(key).toMatchTypeOf<string>();
		t.pass();
	}
});