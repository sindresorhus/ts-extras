import {test} from 'node:test';
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectKeys, type ObjectKeys} from '../source/index.js';

type TestInterface = {
	e: string;
	f: number;
};

test('objectKeys()', () => {
	type Item = 'a' | 'b' | 'c' | '4';

	const items = objectKeys({
		a: 1,
		b: 2,
		c: 3,
		4: 4,
		[Symbol('5')]: 5,
	});

	expectTypeOf(items).toEqualTypeOf<Item[]>();
	assert.deepEqual(items, ['4', 'a', 'b', 'c']);

	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const interfaceItems = objectKeys(interfaceInput);
	expectTypeOf(interfaceItems).toEqualTypeOf<Array<keyof TestInterface>>();
	assert.deepEqual(interfaceItems, ['e', 'f']);
});

test('objectKeys() with arrays', () => {
	// `keyof` an array includes every `Array.prototype` member, but those live on the prototype and can never be own keys, so `Object.keys()` never returns them.
	const items = objectKeys([1, 2, 3]);
	expectTypeOf(items).toEqualTypeOf<`${number}`[]>();
	assert.deepEqual(items, ['0', '1', '2']);

	const tuple = objectKeys(['a', 'b'] as const);
	expectTypeOf(tuple).toEqualTypeOf<('0' | '1')[]>();
	assert.deepEqual(tuple, ['0', '1']);

	// A hole is skipped, but the type cannot know the length, so every index stays possible.
	const sparse: string[] = [];
	sparse[2] = 'c';
	const sparseKeys = objectKeys(sparse);
	expectTypeOf(sparseKeys).toEqualTypeOf<`${number}`[]>();
	assert.deepEqual(sparseKeys, ['2']);

	// Named own properties on an array are an intentional unsupported boundary: they are indistinguishable from subclass prototype members, so they are not reported. The result stays sound, just narrower than the runtime value.
	const named: string[] & {label: string} = Object.assign(['a'], {label: 'x'});
	expectTypeOf(objectKeys(named)).toEqualTypeOf<`${number}`[]>();
	assert.deepEqual(objectKeys(named).toSorted(), ['0', 'label']);
});

// See `test/object-values.ts` for the same case; `Object.keys()` on a typed array or `Buffer` yields only the element indices, never the prototype members that dominate its `keyof`.
test('objectKeys() with typed arrays and Buffer', () => {
	const bytes = new Uint8Array([1, 2]);
	const byteKeys = objectKeys(bytes);
	expectTypeOf(byteKeys).toEqualTypeOf<`${number}`[]>();
	assert.deepEqual(byteKeys, ['0', '1']);

	const buffer = Buffer.from([1, 2]);
	expectTypeOf(objectKeys(buffer)).toEqualTypeOf<`${number}`[]>();
	assert.deepEqual(objectKeys(buffer), ['0', '1']);

	// A `DataView` has no indices, so it keeps the conservative object typing.
	const dataView = new DataView(new ArrayBuffer(8));
	expectTypeOf(objectKeys(dataView)).toEqualTypeOf<Array<Exclude<keyof DataView, symbol>>>();
	assert.deepEqual(objectKeys(dataView), []);
});

// A class instance reports its methods as possible keys, and the internal-slot built-ins report everything even though `Object.keys()` returns `[]` for them. TypeScript cannot tell a declared method from a declared data property, so this is a documented boundary. The test pins it so a future change to the narrowing would be deliberate.
test('objectKeys() promises declared members that are not own enumerable keys', () => {
	class Plain {
		field = 1;
		method() {
			return 1;
		}
	}

	expectTypeOf(objectKeys(new Plain())).toEqualTypeOf<Array<'field' | 'method'>>();
	assert.deepEqual(objectKeys(new Plain()), ['field']);

	// Own but non-enumerable.
	expectTypeOf(objectKeys(new Error('boom'))).toEqualTypeOf<Array<'name' | 'message' | 'stack' | 'cause'>>();

	// Internal slots, so the runtime result really is empty.
	expectTypeOf(objectKeys(new Date())).toEqualTypeOf<Array<Exclude<keyof Date, symbol>>>();
	assert.deepEqual(objectKeys(new Date()), []);
	assert.deepEqual(objectKeys(new Map()), []);
	assert.deepEqual(objectKeys(new Set()), []);
	assert.deepEqual(objectKeys(/x/gv), []);

	// A plain object is unaffected.
	expectTypeOf(objectKeys({a: 1, b: 'x'})).toEqualTypeOf<Array<'a' | 'b'>>();
});

// Hoisted because a `declare const` cannot live inside a function body.
// The point is a value typed as `Function`.
declare const anyFunction: Function;

// A function's own properties are `length`, `name` and `prototype`, none of which are enumerable, and every other member of a function type is on `Function.prototype`. A class's static side is the same for `prototype`.
test('objectKeys() does not report a function type own members', () => {
	// Explicitly annotated as `Function`, whose members are all on `Function.prototype`, so no key is reported. The value does not exist, so this is a type-only check.
	if (false) {
		expectTypeOf(objectKeys(anyFunction)).toEqualTypeOf<never[]>();
	}

	function named() {
		return 1;
	}

	assert.deepEqual(Object.keys(named), []);

	// Own enumerable properties added to the function are still reported.
	const withOwnKey = Object.assign(named, {tag: 'x'});
	assert.deepEqual(objectKeys(withOwnKey), ['tag']);
	expectTypeOf(objectKeys(withOwnKey)).toEqualTypeOf<Array<'tag'>>();

	// A plain object with a function-valued property is unaffected; that really is an own key.
	const object: {onClick: () => string} = {onClick: () => 'x'};
	expectTypeOf(objectKeys(object)).toEqualTypeOf<Array<'onClick'>>();
	assert.deepEqual(objectKeys(object), ['onClick']);
});

test('objectKeys() keeps the array path for a union that holds one', () => {
	// The overloads pick the array path from the parameter's own type, and a union that merges an array with a plain object is not one, so the array member has to be handled on its own. Its `keyof` would otherwise promise every `Array.prototype` member, none of which can ever be an own key.
	const mixed = {a: 1} as {a: number} | string[];

	expectTypeOf(objectKeys(mixed)).toEqualTypeOf<Array<'a' | `${number}`>>();
	assert.deepEqual(objectKeys({a: 1} as {a: number} | string[]), ['a']);
	assert.deepEqual(objectKeys(['a', 'b'] as string[] | {a: number}), ['0', '1']);

	// A typed array member takes its own path too.
	const withBytes = {a: 1} as {a: number} | Uint8Array;
	expectTypeOf(objectKeys(withBytes)).toEqualTypeOf<Array<'a' | `${number}`>>();
	assert.deepEqual(objectKeys(new Uint8Array([1, 2]) as Uint8Array | {a: number}), ['0', '1']);
});

test('ObjectKeys answers the keys objectKeys reports', () => {
	// The exported type is what a caller reaches for when they need the key union itself, and it has to agree with the function, including for the array member of a union.
	expectTypeOf<ObjectKeys<{a: number; b: string}>>().toEqualTypeOf<'a' | 'b'>();
	expectTypeOf<ObjectKeys<readonly ['a', 'b']>>().toEqualTypeOf<'0' | '1'>();
	expectTypeOf<ObjectKeys<string[]>>().toEqualTypeOf<`${number}`>();
	expectTypeOf<ObjectKeys<{a: number} | string[]>>().toEqualTypeOf<'a' | `${number}`>();
	expectTypeOf<ObjectKeys<{[key: symbol]: number}>>().toEqualTypeOf<never>();
});

test('objectKeys() takes a primitive string the way the builtin does', () => {
	// A string stores its characters as indexed own properties. It is the one value the array path does not match and the object path cannot describe, so it has its own path, and the wrapper accepts it as the builtin does.
	const keys = objectKeys('ab');

	expectTypeOf(keys).toEqualTypeOf<Array<`${number}`>>();
	assert.deepEqual(keys, ['0', '1']);
	assert.deepEqual(objectKeys(''), []);
	assert.deepEqual(objectKeys(String('ab')), ['0', '1']);
});

test('objectKeys() describes a boxed String as a whole interface', () => {
	// The note in the source calls this out as the exception among the boxed primitives. A boxed string does store its characters as indexed own properties, so the runtime reports indices, but it is an object and not a view, so the type answers with the whole `String` interface instead. TypeScript cannot tell a declared method from a declared data property, which is why the note calls this a boundary rather than something the type can express.
	// eslint-disable-next-line no-new-wrappers -- A boxed primitive is the case under test.
	const boxed = new String('ab');

	assert.deepEqual(objectKeys(boxed), ['0', '1'], 'the runtime reports the character indices');
	assert.deepEqual(Object.keys(boxed), ['0', '1'], 'which is the same as the builtin');

	// The type promises the whole interface, so a method name is in it even though the runtime never reports one, and the numeric index signature becomes the very indices the runtime does report.
	expectTypeOf<ObjectKeys<String>>().toEqualTypeOf<`${number}` | Exclude<keyof String, number | symbol>>();
});

test('objectKeys() reports string keys for an any value', () => {
	// Regression guard: `any` matched the array overload first and reported only numeric keys.
	const value: any = JSON.parse('{"foo": 1}');
	const keys = objectKeys(value);

	expectTypeOf(keys).toEqualTypeOf<string[]>();
	assert.equal(keys.includes('foo'), true);
});
