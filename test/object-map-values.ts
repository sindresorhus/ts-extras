import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectMapValues} from '../source/index.js';

test('objectMapValues() maps values with correct types', () => {
	const object = {a: 1, b: 2, c: 3} as const;

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string; b?: string; c?: string}>();
	assert.deepEqual(mapped, {a: '1', b: '2', c: '3'});
});

test('objectMapValues() keeps object result keys conservative with {strict: false}', () => {
	const object = {a: 1, b: 2};

	const mapped = objectMapValues(object, value => value * 2, {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<{a?: number; b?: number}>();
	assert.deepEqual(mapped, {a: 2, b: 4});
});

test('objectMapValues() accepts boolean strict options', () => {
	const strict = Math.random() > 0.5;
	const mapped = objectMapValues({a: 1}, value => String(value), {strict});
	const expectedMapped: {a?: string} | {a: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {a: '1'});
});

test('objectMapValues() accepts optional boolean strict options objects', () => {
	const options: {strict?: boolean} = {};
	const mapped = objectMapValues({a: 1}, value => String(value), options);
	const expectedMapped: {a?: string} | {a: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {a: '1'});
});

test('objectMapValues() provides key to callback', () => {
	const object = {x: 10, y: 20};

	const mapped = objectMapValues(object, (value, key) => `${key}=${value}`);

	expectTypeOf(mapped).toEqualTypeOf<{x?: string; y?: string}>();
	assert.deepEqual(mapped, {x: 'x=10', y: 'y=20'});
});

test('objectMapValues() with mixed value types', () => {
	const object = {name: 'hello', count: 42};

	const mapped = objectMapValues(object, value => typeof value);
	const expectedMapped: {name?: string; count?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {name: 'string', count: 'number'});
});

test('objectMapValues() with empty object', () => {
	const object = {} as const;

	const mapped = objectMapValues(object, value => value);

	assert.deepEqual(mapped, {});
});

test('objectMapValues() is conservative about object keys by default', () => {
	const object = {a: 1, b: 2};

	const mapped = objectMapValues(object, value => value * 2);

	expectTypeOf(mapped.a).toEqualTypeOf<number | undefined>();
	expectTypeOf(mapped.b).toEqualTypeOf<number | undefined>();
	assert.deepEqual(mapped, {a: 2, b: 4});
});

test('objectMapValues() preserves optionality', () => {
	const object: {a: number; b?: string} = {a: 1, b: 'hello'};

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string; b?: string}>();
	assert.deepEqual(mapped, {a: '1', b: 'hello'});

	// Missing optional key is not in the result
	const partial: {a: number; b?: string} = {a: 1};
	const mappedPartial = objectMapValues(partial, value => String(value));
	assert.deepEqual(mappedPartial, {a: '1'});
});

test('objectMapValues() callback preserves undefined for optional keys', () => {
	const object = {value: undefined} as {value?: string};

	objectMapValues(object, value => {
		expectTypeOf(value).toEqualTypeOf<string | undefined>();
		return value?.toUpperCase() ?? '';
	});
});

test('objectMapValues() with numeric keys', () => {
	const object = {1: 'a', 2: 'b'} as const;

	const mapped = objectMapValues(object, value => value.toUpperCase());

	expectTypeOf(mapped).toEqualTypeOf<{'1'?: string; '2'?: string}>();
	assert.deepEqual(mapped, {1: 'A', 2: 'B'});
});

test('objectMapValues() excludes symbol keys', () => {
	const symbolKey = Symbol('sym');
	const object: {a: number; [key: symbol]: string} = {a: 1, [symbolKey]: 'hello'};

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string}>();
	assert.deepEqual(mapped, {a: '1'});
});

test('objectMapValues() callback key type is correct', () => {
	const object = {x: 1, y: 2};

	objectMapValues(object, (_value, key) => {
		expectTypeOf(key).toEqualTypeOf<'x' | 'y'>();
		return key;
	});
});

test('objectMapValues() rejects non-existent keys', () => {
	const object = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => value);

	// @ts-expect-error - Key not present
	void mapped.c;
});

test('objectMapValues() with interface', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, value => String(value));
	const expectedMapped: Partial<Record<string, string>> = mapped;

	void expectedMapped;
	expectTypeOf(mapped['name']).toEqualTypeOf<string | undefined>();
	expectTypeOf(mapped['age']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() with interface stays conservative in loose mode', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};
	const mapped = objectMapValues(user, value => String(value), {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<Partial<Record<string, string>>>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() stays conservative for non-record strict results', () => {
	const mapped = objectMapValues(new Map([['a', 1]]), value => String(value));
	const expectedMapped: Partial<Record<string, string>> = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {});
	assert.equal(mapped['size'], undefined);
});

test('objectMapValues() preserves callback typing for interface inputs', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return `${key}=${String(value)}`;
	});

	assert.deepEqual(mapped, {name: 'name=Alice', age: 'age=30'});
});

test('objectMapValues() preserves conservative callback typing for interface inputs in loose mode', () => {
	interface User {
		name: string;
		age: number;
	}

	const user: User = {name: 'Alice', age: 30};

	objectMapValues(user, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return `${key}=${String(value)}`;
	}, {strict: false});
});

test('objectMapValues() callback typing is conservative for class inputs', () => {
	class Example {
		value = 1;

		method(): number {
			return 2;
		}
	}

	objectMapValues(new Example(), (value, key) => {
		expectTypeOf(value).toEqualTypeOf<unknown>();
		expectTypeOf(key).toEqualTypeOf<string>();
		return `${key}=${String(value)}`;
	});
});

test('objectMapValues() callback includes own function-valued object properties', () => {
	const object = {
		count: 1,
		fn() {
			return 2;
		},
	};

	objectMapValues(object, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | (() => number)>();
		expectTypeOf(key).toEqualTypeOf<'count' | 'fn'>();
		return key;
	});
});

test('objectMapValues() does not map prototype methods at runtime', () => {
	const object = new class {
		value = 1;

		method(): void {}
	}();

	const mapped = objectMapValues(object, value => String(value));

	assert.deepEqual(mapped, {value: '1'});
	assert.equal('method' in mapped, false);
});

test('objectMapValues() does not map prototype getters at runtime', () => {
	const object = new class {
		get value(): number {
			return 1;
		}
	}();

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped['value']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('value' in mapped, false);
});

test('objectMapValues() stays conservative for structurally typed getter aliases', () => {
	const user: {name: string} = new class {
		get name(): string {
			return 'Alice';
		}
	}();

	const mapped = objectMapValues(user, value => String(value));

	expectTypeOf(mapped['name']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('name' in mapped, false);
});

test('objectMapValues() stays conservative for structurally typed getter aliases in loose mode', () => {
	const user: {name: string} = new class {
		get name(): string {
			return 'Alice';
		}
	}();

	const mapped = objectMapValues(user, value => String(value), {strict: false});
	expectTypeOf(mapped).toEqualTypeOf<{name?: string}>();

	assert.deepEqual(mapped, {});
	assert.equal('name' in mapped, false);
});

test('objectMapValues() stays conservative for structural method aliases in loose mode', () => {
	const value: {name: string; method(): number} = new class {
		name = 'Alice';

		method(): number {
			return 1;
		}
	}();

	const mapped = objectMapValues(value, entry => String(entry), {strict: false});
	expectTypeOf(mapped).toEqualTypeOf<{name?: string; method?: string}>();

	assert.deepEqual(mapped, {name: 'Alice'});
	assert.equal('method' in mapped, false);
});

test('objectMapValues() keeps plain data-object results conservative in loose mode', () => {
	const user = {name: 'Alice', age: 30};

	const mapped = objectMapValues(user, value => String(value), {strict: false});

	expectTypeOf(mapped).toEqualTypeOf<{name?: string; age?: string}>();
	assert.deepEqual(mapped, {name: 'Alice', age: '30'});
});

test('objectMapValues() does not map writable prototype accessors at runtime', () => {
	class Example {
		get value(): number {
			return 1;
		}

		set value(newValue: number) {
			void newValue;
		}
	}

	const mapped = objectMapValues(new Example(), value => String(value));

	expectTypeOf(mapped['value']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {});
	assert.equal('value' in mapped, false);
});

test('objectMapValues() distributes over disjoint union objects', () => {
	const object: {a: 1} | {b: 2} = Math.random() > 0.5 ? {a: 1} : {b: 2};

	objectMapValues(object, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | 2>();
		expectTypeOf(key).toEqualTypeOf<'a' | 'b'>();
		return String(value);
	});

	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<{a?: string} | {b?: string}>();
	assert.ok(('a' in mapped && mapped.a === '1') || ('b' in mapped && mapped.b === '2'));
});

test('objectMapValues() distributes over array or object unions', () => {
	const object: string[] | {a: number} = Math.random() > 0.5 ? ['x'] : {a: 1};

	objectMapValues(object, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<string | number>();
		expectTypeOf(key).toEqualTypeOf<`${number}` | 'a'>();
		return String(value);
	});

	const mapped = objectMapValues(object, value => String(value));

	const expectedMapped: string[] | {a?: string} = mapped;

	void expectedMapped;
	assert.ok((Array.isArray(mapped) && mapped[0] === 'x') || (!Array.isArray(mapped) && mapped.a === '1'));
});

test('objectMapValues() - array', () => {
	const mapped = objectMapValues([1, 2], value => value * 2);

	expectTypeOf<number[]>(mapped);
	assert.deepEqual(mapped, [2, 4]);
});

test('objectMapValues() - array callback types', () => {
	objectMapValues([1, 2], (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value;
	});
});

test('objectMapValues() - typed arrays use indexed callback typing', () => {
	const array = new Uint8Array([1, 2]);
	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value + 1;
	});
	const expectedMapped: Partial<Record<number, number>> = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: 2, 1: 3});
});

test('objectMapValues() - Buffer uses indexed callback typing', () => {
	const buffer = Buffer.from([1, 2]);
	const mapped = objectMapValues(buffer, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return value.toString();
	});
	const expectedMapped: Partial<Record<number, string>> = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: '1', 1: '2'});
});

test('objectMapValues() - array-like objects with extra keys stay on the object path', () => {
	const value: {readonly length: number; readonly [index: number]: string; kind: string} = {0: 'a', length: 1, kind: 'letters'};
	const mapped = objectMapValues(value, (entry, key) => {
		expectTypeOf(entry).toEqualTypeOf<string | number>();
		expectTypeOf(key).toEqualTypeOf<`${number}` | 'length' | 'kind'>();
		return String(entry).toUpperCase();
	});
	const expectedMapped: {0?: string; length?: string; kind?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, {0: 'A', length: '1', kind: 'LETTERS'});
});

test('objectMapValues() - array treats declared non-index keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: number};
	array.foo = 3;

	const mapped = objectMapValues(array, value => String(value));

	expectTypeOf<string[]>(mapped);
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	void mapped.foo;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal((mapped as string[] & {foo: string}).foo, '3');
});

test('objectMapValues() - array subclass own named keys remain unsupported in the types', () => {
	class ExtendedArray extends Array<number> {
		foo = 3;
	}

	const mapped = objectMapValues(new ExtendedArray(1, 2), value => String(value));

	expectTypeOf<string[]>(mapped);
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	void mapped.foo;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal((mapped as string[] & {foo: string}).foo, '3');
});

test('objectMapValues() - array preserves declared numeric own keys', () => {
	const array = [1] as number[] & {42: string};
	array[42] = 'hello';

	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});

	expectTypeOf(mapped[42]).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped[42], 'HELLO');
});

test('objectMapValues() - array preserves declared negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const mapped = objectMapValues(array, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});

	expectTypeOf(mapped['-1']).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() maps own function-valued array entries', () => {
	const mapped = objectMapValues([() => 1] as const, value => value());
	const expectedMapped: [number] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, [1]);
});

test('objectMapValues() handles large tuples without recursive instantiation blowups', () => {
	const mapped = objectMapValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] as const, value => String(value));
	const expectedLast: string = mapped[49];

	void expectedLast;
	assert.equal(mapped[49], '49');
});

test('objectMapValues() preserves variadic tuple shape', () => {
	const tuple = [1, 2] as [1, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() preserves variadic tuple shape with only the required prefix', () => {
	const tuple = [1] as [1, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1']);
});

test('objectMapValues() preserves variadic tuple shape with a required suffix', () => {
	const tuple = [1, 2, 3] as [1, ...number[], 3];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[], string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2', '3']);
});

test('objectMapValues() preserves variadic tuple shape with only a required suffix', () => {
	const tuple = [1, 2] as [...number[], 2];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [...string[], string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() preserves variadic tuple non-index keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 3});

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] & {foo?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal(mapped.foo, '3');
});

test('objectMapValues() variadic tuple callback includes named extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'});

	objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}` | 'foo'>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
});

test('objectMapValues() widens variadic tuples for numeric extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'});

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
	const expectedMapped: string[] & {'-1'?: string} = mapped;

	void expectedMapped;
	assert.equal(mapped[0], '1');
	assert.equal(mapped[1], '2');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 2);
});

test('objectMapValues() variadic tuple callback includes numeric-like extra keys', () => {
	const tuple = Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'});

	objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<number | string>();
		expectTypeOf(key).toEqualTypeOf<`${number}`>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
});

test('objectMapValues() preserves required variadic tuple prefix elements that may include undefined', () => {
	const tuple = [undefined, 2] as [string | undefined, ...number[]];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, ...string[]] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['undefined', '2']);
});

test('objectMapValues() - array subclass produces a plain Array, not a subclass instance', () => {
	class ExtendedArray extends Array<number> {}

	const mapped = objectMapValues(new ExtendedArray(1, 2), value => String(value));

	assert.ok(Array.isArray(mapped));
	assert.equal(mapped instanceof ExtendedArray, false);
	assert.equal(Object.getPrototypeOf(mapped), Array.prototype);
	assert.deepEqual(mapped, ['1', '2']);
});

test('objectMapValues() does not map array subclass prototype accessors at runtime', () => {
	class ExtendedArray extends Array<number> {
		get value(): number {
			return 3;
		}
	}

	const array = new ExtendedArray(1, 2);
	const mapped = objectMapValues(array, value => String(value));

	expectTypeOf<string[]>(mapped);
	// @ts-expect-error - Subclass prototype properties are intentionally not reflected in the typing.
	void mapped.value;
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal((mapped as unknown as {value?: string}).value, undefined);
});

test('objectMapValues() compacts sparse arrays like Object.entries()', () => {
	const array = Array(3);
	const mapped = objectMapValues(array, value => value);

	assert.equal(mapped.length, 0);
	assert.deepEqual(Object.keys(mapped), []);
	assert.equal(0 in mapped, false);
	assert.equal(2 in mapped, false);
});

test('objectMapValues() drops trailing sparse array holes', () => {
	const array = [1, , ,] as number[];
	const mapped = objectMapValues(array, value => value * 2);

	assert.equal(mapped.length, 1);
	assert.deepEqual(mapped, [2]);
	assert.equal(1 in mapped, false);
	assert.equal(2 in mapped, false);
});

test('objectMapValues() - tuple', () => {
	const mapped = objectMapValues([1, 'a'] as const, value => String(value));
	const expectedMapped: [string, string] = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, ['1', 'a']);
});

test('objectMapValues() - optional tuple preserves trailing optional element', () => {
	const tuple = [1, 2] as [1, 2?];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string?] = mapped;
	const expectedLength: 1 | 2 = mapped.length;

	void expectedMapped;
	void expectedLength;
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal(mapped.length, 2);
});

test('objectMapValues() - required tuple elements may include undefined without widening the result slot', () => {
	const tuple = ['a'] as [string | undefined];
	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['a']);
});

test('objectMapValues() - required undefined tuple elements do not widen the result slot', () => {
	const mapped = objectMapValues([undefined] as const, value => String(value));
	const expectedMapped: [string] = mapped;

	void expectedMapped;
	expectTypeOf(mapped[0]).toBeString();
	assert.deepEqual(mapped, ['undefined']);
});

test('objectMapValues() - sparse tuple', () => {
	const mapped = objectMapValues([1, , 3] as const, value => String(value));
	const expectedHole: string | undefined = mapped[1];

	expectTypeOf(mapped[0]).toEqualTypeOf<string>();
	expectTypeOf(mapped[2]).toEqualTypeOf<string>();

	void expectedHole;
	assert.deepEqual(mapped, ['1', , '3']);
	assert.equal(1 in mapped, false);
});

test('objectMapValues() - tuple callback types', () => {
	objectMapValues([1, 'a'] as const, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | 'a'>();
		expectTypeOf(key).toEqualTypeOf<'0' | '1'>();
		return value;
	});
});

test('objectMapValues() - tuple preserves declared non-index keys', () => {
	const tuple = [1, 2] as [1, 2] & {foo: number};
	tuple.foo = 3;

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string] & {foo?: string} = mapped;

	void expectedMapped;
	assert.deepEqual(mapped, Object.assign(['1', '2'], {foo: '3'}));
	assert.equal(mapped.length, 2);
	assert.equal(mapped.foo, '3');
});

test('objectMapValues() - tuple extra keys stay optional when non-enumerable', () => {
	const tuple = [1, 2] as [1, 2] & {foo: number};
	Object.defineProperty(tuple, 'foo', {
		value: 3,
		enumerable: false,
		configurable: true,
		writable: true,
	});

	const mapped = objectMapValues(tuple, value => String(value));
	const expectedMapped: [string, string] & {foo?: string} = mapped;

	void expectedMapped;
	expectTypeOf(mapped.foo).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, ['1', '2']);
	assert.equal('foo' in mapped, false);
});

test('objectMapValues() - runtime still maps unsupported Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {map: Array.prototype.map});

	const mapped = objectMapValues(tuple, value => typeof value);

	assert.deepEqual(mapped, Object.assign(['number', 'number'], {map: 'function'}));
	assert.equal(typeof (mapped as [string, string] & {map: string}).map, 'string');
});

test('objectMapValues() - runtime still maps unsupported mutable Array member-name shadows', () => {
	const tuple = Object.assign([1, 2] as [1, 2], {sort: 'hello', fill: 'world', copyWithin: 'again'});

	const mapped = objectMapValues(tuple, value => String(value));

	assert.deepEqual(mapped, Object.assign(['1', '2'], {sort: 'hello', fill: 'world', copyWithin: 'again'}));
	assert.equal(mapped.length, 2);
	assert.equal((mapped as string[] & {sort: string}).sort, 'hello');
	assert.equal((mapped as string[] & {fill: string}).fill, 'world');
	assert.equal((mapped as string[] & {copyWithin: string}).copyWithin, 'again');
});

test('objectMapValues() - tuple widens for negative numeric extra keys', () => {
	const tuple = [1] as [1] & {'-1': string};
	tuple['-1'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '-1'>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
	const expectedMapped: string[] & {'-1'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	expectTypeOf(mapped['-1']).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped['-1'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() - tuple widens when numeric extra keys grow the array length', () => {
	const tuple = [1] as [1] & {42: string};
	tuple[42] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '42'>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
	const expectedMapped: string[] & {'42'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	// @ts-expect-error - Growing numeric keys widen fixed tuples away from an exact length.
	const exactLength: 1 = mapped.length;

	void exactLength;
	expectTypeOf(mapped[42]).toEqualTypeOf<string | undefined>();
	assert.equal(mapped[0], '1');
	assert.equal(mapped[42], 'HELLO');
	assert.equal(mapped.length, 43);
});

test('objectMapValues() - tuple widens for numeric-looking string keys with leading zeroes', () => {
	const tuple = [1] as [1] & {'01': string};
	tuple['01'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '01'>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
	const expectedMapped: string[] & {'01'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	assert.equal(mapped[0], '1');
	assert.equal(mapped['01'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() - tuple widens for decimal numeric extra keys', () => {
	const tuple = [1] as [1] & {'1.5': string};
	tuple['1.5'] = 'hello';

	const mapped = objectMapValues(tuple, (value, key) => {
		expectTypeOf(value).toEqualTypeOf<1 | string>();
		expectTypeOf(key).toEqualTypeOf<'0' | '1.5'>();
		return typeof value === 'number' ? value.toFixed() : value.toUpperCase();
	});
	const expectedMapped: string[] & {'1.5'?: string} = mapped;
	const expectedLength: number = mapped.length;

	void expectedMapped;
	void expectedLength;
	assert.equal(mapped[0], '1');
	assert.equal(mapped['1.5'], 'HELLO');
	assert.equal(mapped.length, 1);
});

test('objectMapValues() keeps "__proto__" as a data property', () => {
	const object = JSON.parse('{"__proto__":{"polluted":true},"safe":1}') as Record<string, unknown>;
	const mapped = objectMapValues(object, value => value);

	const protoPropertyDescriptor = Object.getOwnPropertyDescriptor(mapped, '__proto__');

	assert.equal(Object.getPrototypeOf(mapped), Object.prototype);
	assert.deepEqual(protoPropertyDescriptor?.value, {polluted: true});
	assert.deepEqual(mapped['safe'], 1);
	assert.equal((mapped as Record<string, unknown>)['polluted'], undefined);
});

test('objectMapValues() returns a new object', () => {
	const object = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => value);

	assert.notEqual(mapped, object);
});

test('objectMapValues() skips non-enumerable own properties', () => {
	const object = Object.defineProperty({a: 1}, 'hidden', {
		value: 99,
		enumerable: false,
		configurable: true,
		writable: true,
	});
	const mapped = objectMapValues(object as {a: number}, value => String(value));

	expectTypeOf(mapped.a).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {a: '1'});
	assert.equal('hidden' in mapped, false);
});

test('objectMapValues() with Record<string, T>', () => {
	const object: Record<string, number> = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => String(value));

	expectTypeOf(mapped).toEqualTypeOf<Record<string, string | undefined>>();
	assert.deepEqual(mapped, {a: '1', b: '2'});
});

test('objectMapValues() keeps index signatures partial in loose mode', () => {
	const object: Record<string, number> = {a: 1, b: 2};
	const mapped = objectMapValues(object, value => String(value), {strict: false});
	const expectedMapped: Record<string, string | undefined> = mapped;

	void expectedMapped;
	expectTypeOf(mapped['missingKey']).toEqualTypeOf<string | undefined>();
	assert.deepEqual(mapped, {a: '1', b: '2'});
});

test('objectMapValues() preserves null prototypes', () => {
	const object = Object.assign(Object.create(null) as Record<string, number>, {safe: 1});
	const mapped = objectMapValues(object, value => String(value));

	assert.equal(Object.getPrototypeOf(mapped), null);
	assert.deepEqual(mapped['safe'], '1');
	assert.equal('toString' in mapped, false);
});
