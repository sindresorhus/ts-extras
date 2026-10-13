import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isPropertyDefined, isPropertyPresent} from '../source/index.js';

/*
`isPropertyDefined` rejects `undefined` and accepts `null`. `isPropertyPresent` rejects both.

That is the whole of what separates them. The runtime bodies are the same function twice, and the types differ only in `Exclude<T, undefined>` against `NonNullable<T>`, so the cases are one suite, run against both guards.

Every case below is written once and run twice. Where the two answers differ the case carries both, which is the only place the difference shows at runtime. A case written with `T | undefined` and no `null` narrows to the same type under both guards, so most of the type assertions are shared too. Unknown-valued properties share the guarantee that undefined is excluded, and separate tests at the end check each guard's null handling.
*/
const guards = [
	{name: 'isPropertyDefined', guard: isPropertyDefined},
	{name: 'isPropertyPresent', guard: isPropertyPresent},
] as const;

// What each guard does with a value. A row is one runtime answer, and the two columns differ only where the value holds the nullish member the guard in question rejects.
type Case = {
	what: string;
	key: PropertyKey;
	value: unknown;
	defined: boolean;
	present: boolean;
};

// A key the table can name, since a symbol cannot be written inline in a row above.
const tableSymbol = Symbol('table');

test('a property guard answers for any value it is handed', () => {
	const cases: Case[] = [
		{
			what: 'a number', key: 'value', value: {value: 1}, defined: true, present: true,
		},
		{
			what: 'undefined', key: 'value', value: {value: undefined}, defined: false, present: false,
		},
		{
			what: 'null', key: 'value', value: {value: null}, defined: true, present: false,
		},
		{
			what: 'a missing key', key: 'value', value: {}, defined: false, present: false,
		},

		// Falsy but there, which is the case a truthiness check would get wrong.
		{
			what: 'zero', key: 'value', value: {value: 0}, defined: true, present: true,
		},
		{
			what: 'an empty string', key: 'value', value: {value: ''}, defined: true, present: true,
		},
		{
			what: 'false', key: 'value', value: {value: false}, defined: true, present: true,
		},
		{
			what: 'NaN', key: 'value', value: {value: NaN}, defined: true, present: true,
		},
		{
			what: 'negative zero', key: 'value', value: {value: -0}, defined: true, present: true,
		},

		// A primitive is rejected by the `typeof` guard, not by having no such own property. A string owns `length` and its indices, so a guard that dropped the `typeof` check would answer `true` for those. A number owns nothing, so it cannot tell the two apart.
		{
			what: 'null itself', key: 'value', value: null, defined: false, present: false,
		},
		{
			what: 'undefined itself', key: 'value', value: undefined, defined: false, present: false,
		},
		{
			what: 'a number', key: 'value', value: 42, defined: false, present: false,
		},
		{
			what: 'a string', key: 'value', value: 'hello', defined: false, present: false,
		},
		{
			what: 'a boolean', key: 'value', value: true, defined: false, present: false,
		},
		{
			what: 'a symbol', key: 'value', value: Symbol('x'), defined: false, present: false,
		},
		{
			what: 'a string by `length`', key: 'length', value: 'abc', defined: false, present: false,
		},
		{
			what: 'a string by index', key: '0', value: 'abc', defined: false, present: false,
		},

		// A null-prototype object owns what it is given and inherits nothing.
		{
			what: 'a null-prototype object', key: 'value', value: Object.assign(Object.create(null), {value: 1}), defined: true, present: true,
		},
		{
			what: 'a null-prototype object with `undefined`', key: 'value', value: Object.assign(Object.create(null), {value: undefined}), defined: false, present: false,
		},
		{
			what: 'a null-prototype object with `null`', key: 'value', value: Object.assign(Object.create(null), {value: null}), defined: true, present: false,
		},
		{
			what: 'an empty null-prototype object', key: 'value', value: Object.create(null), defined: false, present: false,
		},

		{
			what: 'a frozen object', key: 'value', value: Object.freeze({value: 1}), defined: true, present: true,
		},
		{
			what: 'a frozen object with `undefined`', key: 'value', value: Object.freeze({value: undefined}), defined: false, present: false,
		},
		{
			what: 'a frozen object with `null`', key: 'value', value: Object.freeze({value: null}), defined: true, present: false,
		},

		// Prototype-sensitive names. `__proto__:` in a literal sets the prototype rather than defining a property, so the "not an own property" case is a plain object and the own one is built with a computed key, which does define it.
		{
			what: 'a plain object by `__proto__`', key: '__proto__', value: {}, defined: false, present: false,
		},
		{
			what: 'an own `__proto__` data property', key: '__proto__', value: {['__proto__']: 'custom'}, defined: true, present: true,
		},
		{
			what: 'a plain object by `constructor`', key: 'constructor', value: {}, defined: false, present: false,
		},
		{
			what: 'an own `constructor`', key: 'constructor', value: {constructor: 'own'}, defined: true, present: true,
		},
		{
			what: 'a plain object by `toString`', key: 'toString', value: {}, defined: false, present: false,
		},
		{
			what: 'an own `toString`', key: 'toString', value: {toString: () => 'own'}, defined: true, present: true,
		},

		// An empty string is a key like any other.
		{
			what: 'the empty-string key', key: '', value: {'': 1}, defined: true, present: true,
		},
		{
			what: 'the empty-string key with `undefined`', key: '', value: {'': undefined}, defined: false, present: false,
		},
		{
			what: 'the empty-string key with `null`', key: '', value: {'': null}, defined: true, present: false,
		},
		{
			what: 'the empty-string key on a plain object', key: '', value: {}, defined: false, present: false,
		},

		// A symbol key, which a table row cannot write inline.
		{
			what: 'a symbol key', key: tableSymbol, value: {[tableSymbol]: 1}, defined: true, present: true,
		},
		{
			what: 'a symbol key with `undefined`', key: tableSymbol, value: {[tableSymbol]: undefined}, defined: false, present: false,
		},
		{
			what: 'a symbol key with `null`', key: tableSymbol, value: {[tableSymbol]: null}, defined: true, present: false,
		},
		{
			what: 'a symbol key on a plain object', key: tableSymbol, value: {}, defined: false, present: false,
		},
		{
			what: 'a symbol key only on the prototype', key: tableSymbol, value: Object.create({[tableSymbol]: 1}), defined: false, present: false,
		},

		// A numeric key, in its own spelling and in the string form the builtin treats as the same.
		{
			what: 'a numeric key', key: 0, value: {0: 'zero'}, defined: true, present: true,
		},
		{
			what: 'a numeric key with `undefined`', key: 0, value: {0: undefined}, defined: false, present: false,
		},
		{
			what: 'a numeric key with `null`', key: 0, value: {0: null}, defined: true, present: false,
		},
		{
			what: 'a numeric key as a string', key: '0', value: {0: 'zero'}, defined: true, present: true,
		},
		{
			what: 'a numeric key only on the prototype', key: 0, value: Object.create({0: 'zero'}), defined: false, present: false,
		},

		// A sparse array hole is a missing index, not an `undefined` element.
		{
			what: 'a sparse array hole', key: '1', value: [1, , 3], defined: false, present: false,
		},
		{
			what: 'a sparse array element', key: '0', value: [1, , 3], defined: true, present: true,
		},
	];

	for (const {what, key, value, defined, present} of cases) {
		assert.equal(isPropertyDefined(key)(value), defined, `isPropertyDefined: ${what}`);
		assert.equal(isPropertyPresent(key)(value), present, `isPropertyPresent: ${what}`);
	}
});

for (const {name, guard} of guards) {
	test(`${name}() narrows the property a filter keeps`, () => {
		// The primary use case. The result has to be a subtype of its input, which is what `Array#filter`'s own constraint requires, or the narrowing silently does not happen.
		type Item = {name: string; value: number | undefined};
		const items: Item[] = [{name: 'a', value: 1}, {name: 'b', value: undefined}, {name: 'c', value: 3}];

		// The guard goes to `filter` directly too, which is its own signature rather than an inferred one.
		const result = items.filter(guard('value'));
		expectTypeOf(result[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(result, [{name: 'a', value: 1}, {name: 'c', value: 3}]);

		// A guard whose nullish exclusion is the whole proof removes `null` entries in the direct form as well.
		const nullables: Array<{value: number} | null> = [{value: 1}, null, {value: 3}];
		const withoutNulls = nullables.filter(guard('value'));
		expectTypeOf(withoutNulls[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(withoutNulls, [{value: 1}, {value: 3}]);

		// `readonly` on the property is preserved, so writing through the result is caught.
		const readonlyItems: Array<{readonly value: number | undefined}> = [{value: 1}, {value: undefined}];
		const readonlyResult = readonlyItems.filter(item => guard('value')(item));
		expectTypeOf(readonlyResult[0]!.value).toEqualTypeOf<number>();
		// @ts-expect-error - `value` is declared `readonly`, so writing must not compile.
		readonlyResult[0]!.value = 2;

		// An optional property keeps its own optionality, and the guard removes the `undefined`.
		const optionals: Array<{data?: string}> = [{data: 'hello'}, {}];
		const withData = optionals.filter(guard('data'));
		expectTypeOf(withData[0]!.data).toEqualTypeOf<string>();
		assert.deepEqual(withData, [{data: 'hello'}]);

		// Chained filters narrow more than one property, one in each form.
		const multi: Array<{a?: string; b?: number}> = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {}];
		const both = multi.filter(guard('a')).filter(item => guard('b')(item));
		expectTypeOf(both[0]!.a).toEqualTypeOf<string>();
		expectTypeOf(both[0]!.b).toEqualTypeOf<number>();
		assert.deepEqual(both, [{a: 'x', b: 1}]);

		// `map()` over a narrowed array, which is the other common shape.
		const mapped = items.filter(guard('value')).map(item => item.value * 2);
		expectTypeOf(mapped).toEqualTypeOf<number[]>();
		assert.deepEqual(mapped, [2, 6]);

		// A union property narrows to the union of what is left.
		const unions: Array<{value: string | number | undefined}> = [{value: 'a'}, {value: 1}, {value: undefined}];
		const narrowed = unions.filter(item => guard('value')(item));
		expectTypeOf(narrowed[0]!.value).toEqualTypeOf<string | number>();
		assert.deepEqual(narrowed, [{value: 'a'}, {value: 1}]);

		// A nested property, which is the same rule one level down.
		const nested: Array<{children: string[] | undefined}> = [{children: ['a']}, {children: undefined}];
		const withChildren = nested.filter(item => guard('children')(item));
		expectTypeOf(withChildren[0]!.children).toEqualTypeOf<string[]>();
		assert.deepEqual(withChildren, [{children: ['a']}]);

		// The same predicate reused across differently typed arrays.
		const predicate = guard('value');
		assert.deepEqual([{value: 1}, {value: undefined}].filter(item => predicate(item)), [{value: 1}]);
		assert.deepEqual([{value: 'x'}, {value: undefined}].filter(item => predicate(item)), [{value: 'x'}]);

		// And used as a standalone guard rather than through `filter`.
		const item: Item = {name: 'test', value: undefined};
		if (guard('value')(item)) {
			expectTypeOf(item.value).toEqualTypeOf<number>();
		}
	});

	test(`${name}() narrows nothing for a key that names an infinite set`, () => {
		// A key naming an infinite set of strings proves only one key, so the value type has to be left alone. Making the whole key set required would make every key of an index signature look answered, so reading an absent key would compile and produce `NaN` at runtime.
		type Env = {[Key in Uppercase<string>]?: number};
		const envs: Env[] = [{API_KEY: 1}, {API_KEY: undefined}, {}];
		const envKey = 'API_KEY' as Uppercase<string>;

		const found = envs.filter(item => guard(envKey)(item));
		expectTypeOf(found[0]!['MISSING']).toEqualTypeOf<number | undefined>();
		assert.deepEqual(found.map(item => item['API_KEY']), [1]);
		assert.equal(found[0]!['MISSING'], undefined);

		// A leading literal segment still names an infinite set, even though the key starts with fixed text.
		const leadingKey = 'fooA' as `foo${string}`;
		const leadingItems: Array<Record<`foo${string}`, number | undefined>> = [{fooA: 1}];
		const leadingResult = leadingItems.filter(item => guard(leadingKey)(item));
		expectTypeOf(leadingResult[0]!['fooB']).toEqualTypeOf<number | undefined>();
	});

	test(`${name}() narrows nothing for a branded or template-literal key`, () => {
		// Every one of these names an infinite set, so none of them can be narrowed, and the declared value type must survive exactly.
		const widenedKey: string = 'value';
		const widened: Array<{name: string; value?: number}> = [{name: 'a', value: 1}, {name: 'b'}];
		expectTypeOf(widened.filter(item => guard(widenedKey)(item))[0]!.value).toEqualTypeOf<number | undefined>();

		type BrandedKey = string & {readonly __brand: unique symbol};
		const brandedKey = 'value' as BrandedKey;
		expectTypeOf(widened.filter(item => guard(brandedKey)(item))[0]!.value).toEqualTypeOf<number | undefined>();

		type NumberItem = {0: string | undefined; 1: string | undefined};
		const brandedNumberKey = 0 as number & {readonly __brand: unique symbol};
		const brandedNumberItems: NumberItem[] = [{0: 'zero', 1: undefined}, {0: undefined, 1: 'one'}];
		expectTypeOf(brandedNumberItems.filter(item => guard(brandedNumberKey)(item))[0]![0]).toEqualTypeOf<string | undefined>();

		const symbolA = Symbol('a');
		const symbolB = Symbol('b');
		const brandedSymbolKey = symbolA as symbol & {readonly __brand: unique symbol};
		const symbolItems: Array<Record<typeof symbolA | typeof symbolB, number | undefined>> = [
			{[symbolA]: 1, [symbolB]: undefined},
			{[symbolA]: undefined, [symbolB]: 2},
		];
		expectTypeOf(symbolItems.filter(item => guard(brandedSymbolKey)(item))[0]![symbolA]).toEqualTypeOf<number | undefined>();

		const templateKey = 'fooA' as `foo${string}`;
		const templateItems: Array<Record<`foo${string}`, number | undefined>> = [{fooA: 1, fooB: undefined}, {fooA: undefined, fooB: 2}];
		expectTypeOf(templateItems.filter(item => guard(templateKey)(item))[0]!['fooA']).toEqualTypeOf<number | undefined>();

		const numericTemplateKey = '1px' as `${number}px`;
		const numericTemplateItems: Array<Record<`${number}px`, number | undefined>> = [{'1px': 1, '2px': undefined}, {'1px': undefined, '2px': 2}];
		expectTypeOf(numericTemplateItems.filter(item => guard(numericTemplateKey)(item))[0]!['1px']).toEqualTypeOf<number | undefined>();

		// The runtime still checks the exact key.
		assert.equal(widened.filter(item => guard(widenedKey)(item)).length, 1);
	});

	test(`${name}() keeps a broad or unknown value from collapsing to never`, () => {
		// `never` is assignable to every type, so a collapsed result compiles arbitrary code in the branch and then fails at runtime. These are the shapes that could produce one.
		const broadObjects: object[] = [{value: 1}, {}];
		const broadResult = broadObjects.filter(item => guard('value')(item));
		expectTypeOf(broadResult[0]!.value).toEqualTypeOf<{} | null>();
		assert.deepEqual(broadResult, [{value: 1}]);

		// A union with a primitive member keeps the object member narrowed.
		const primitiveMixed: Array<{value?: number} | string> = [{value: 1}, 'x', {}];
		const primitiveMixedResult = primitiveMixed.filter(item => guard('value')(item));
		expectTypeOf(primitiveMixedResult[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(primitiveMixedResult, [{value: 1}]);

		// No `null` here, since that is the one value the two guards part company on and the expected result could not be shared. It is covered on its own at the end of this file.
		const unknowns: unknown[] = [{value: 1}, 'x', 1, {}];
		const unknownResult = unknowns.filter(item => guard('value')(item));
		expectTypeOf(unknownResult[0]!.value).toEqualTypeOf<{} | null>();
		assert.deepEqual(unknownResult, [{value: 1}]);

		// An own key the declared shape does not have is still readable, which is the expando case.
		type ExpandoItem = {name: string};
		const expandos: ExpandoItem[] = [Object.assign({name: 'a'}, {value: 1}), {name: 'b'}];
		const expandoResult = expandos.filter(item => guard('value')(item));
		assert.deepEqual(expandoResult, [Object.assign({name: 'a'}, {value: 1})]);
		const expandoItem: typeof expandoResult[number] = Object.assign({name: 'a'}, {value: 1});
		void expandoItem;

		// A string index does not collapse to `never` either.
		const arrayItems: string[][] = [['a'], []];
		const arrayResult = arrayItems.filter(item => guard('0')(item));
		expectTypeOf(arrayResult[0]!['0']).toEqualTypeOf<string>();
		assert.deepEqual(arrayResult, [['a']]);
	});

	test(`${name}() narrows a symbol, numeric or function key`, () => {
		// The runtime answers for every shape of symbol and numeric key are in the table at the top. What is left here is the narrowing, which is the part the table cannot express.
		const symbolKey = Symbol('value');
		const symbolValues: Array<{[symbolKey]?: number} | {other: string}> = [{[symbolKey]: 1}, {other: 'x'}, {}];
		const symbolResult = symbolValues.filter(item => guard(symbolKey)(item));
		expectTypeOf(symbolResult[0]![symbolKey]).toExtend<{} | null>();
		assert.deepEqual(symbolResult, [{[symbolKey]: 1}]);

		const numericValues: Array<{0?: string} | {1: number}> = [{0: 'zero'}, {1: 1}, {}];
		const numericResult = numericValues.filter(item => guard(0)(item));
		expectTypeOf(numericResult[0]![0]).toExtend<{} | null>();
		assert.deepEqual(numericResult, [{0: 'zero'}]);

		// A function is a value too, and carries whatever was added to it.
		type FunctionWithOptionalValue = (() => void) & {value?: number};
		const withValue: FunctionWithOptionalValue = Object.assign(() => {}, {value: 1});
		const withoutValue: FunctionWithOptionalValue = () => {};
		const functionResult = [withValue, withoutValue].filter(item => guard('value')(item));
		expectTypeOf(functionResult[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(functionResult, [withValue]);
	});

	test(`${name}() ignores an inherited property, whatever the value`, () => {
		// `in` would report an inherited one, and the guard narrows to a property a later read reaches, so the two have to agree on which properties are actually there.
		type Heterogeneous = {kind: 'a'} | {kind: 'b'; value: number | undefined};

		const inherited: Heterogeneous = Object.assign(Object.create({value: 1}) as {kind: 'a'}, {kind: 'a'});
		const own: Heterogeneous = {kind: 'b', value: 1};
		assert.deepEqual([inherited, own].filter(item => guard('value')(item)), [own]);

		// An inherited getter is ignored without being executed, so a throwing one is safe.
		const inheritedThrowing = Object.assign(Object.create({
			get value(): number {
				throw new Error('Getter should not run');
			},
		}) as {kind: 'a'}, {kind: 'a'});
		assert.equal(guard('value')(inheritedThrowing), false);
	});

	test(`${name}() only accepts an own data property`, () => {
		// The guard reads a property descriptor and only accepts a data property, so an accessor is out whichever it returns, and an inherited property is out. A non-enumerable own data property is in: the guard asks whether the value is there, not whether it is enumerable.
		assert.equal(guard('inherited')(Object.create({inherited: 1})), false);

		const accessor = {
			get value(): number {
				return 1;
			},
		};
		assert.equal(guard('value')(accessor), false);

		// A stateful getter is out too, since a later read is not stable.
		let hasReturnedValue = false;
		const stateful = {};
		Object.defineProperty(stateful, 'value', {
			get() {
				if (hasReturnedValue) {
					return undefined;
				}

				hasReturnedValue = true;
				return 1;
			},
			enumerable: true,
		});
		assert.equal(guard('value')(stateful), false);

		const nullReturning = {};
		Object.defineProperty(nullReturning, 'value', {get: () => null, enumerable: true});
		assert.equal(guard('value')(nullReturning), false);

		assert.equal(guard('hidden')(Object.defineProperty({}, 'hidden', {value: 1})), true);

		// A null-prototype object has no inherited properties at all.
		const bare = Object.assign(Object.create(null), {a: 1}) as {a?: number};
		assert.equal(guard('a')(bare), true);
		assert.equal(guard('toString')(bare), false);
	});

	test(`${name}() reads the index signature value for a key outside keyof`, () => {
		// A key that is not literally in `keyof` can still be covered by an index signature, and then the signature's own value type is known, so a numeric key against a string index signature keeps that value type rather than `unknown`.
		const stringIndexed: Array<Record<string, string | undefined>> = [{0: 'x'}, {0: undefined}];
		const narrowed = stringIndexed.filter(item => guard(0)(item));
		expectTypeOf(narrowed[0]![0]).toEqualTypeOf<string>();
		assert.deepEqual(narrowed, [{0: 'x'}]);

		const numberIndexed: Array<Record<number, string | undefined>> = [{1: 'x'}, {1: undefined}];
		const byName = numberIndexed.filter(item => guard('1')(item));
		expectTypeOf(byName[0]!['1']).toEqualTypeOf<string>();
		assert.deepEqual(byName, [{1: 'x'}]);

		// A key no index signature covers has no known value type beyond the nullish members the guard excludes. The value is a type only claim, since the runtime filter drops every item that lacks the key.
		const plain: Array<{a?: string}> = [{a: 'x'}];
		const fallback = plain.filter(item => guard('b')(item));
		assert.deepEqual(fallback, []);

		if (false) {
			expectTypeOf(fallback[0]!['b']).toExtend<{} | null>();
		}
	});

	test(`${name}() does not claim an element type for a named key on an array`, () => {
		// A key outside `keyof` is only covered by a real index signature. The apparent members of an array are not one, so a named key does not get the element type: after `Object.assign(array, {value: 42})` it holds a number, not a `string`.
		const array: string[] = ['a'];
		Object.assign(array, {value: 42});

		assert.equal(guard('value')(array), true);
		if (guard('value')(array)) {
			expectTypeOf(array['value']).toExtend<{} | null>();
			assert.equal(array['value'], 42);
		}

		// A numeric key really is the element type, in either spelling.
		if (guard(0)(array)) {
			expectTypeOf(array[0]).toEqualTypeOf<string>();
		}

		if (guard('0')(array)) {
			expectTypeOf(array[0]).toEqualTypeOf<string>();
		}
	});

	test(`${name}() reads a numeric index signature for a numeric key`, () => {
		const record: Record<number, string> = {0: 'a'};

		if (guard(0)(record)) {
			expectTypeOf(record[0]).toEqualTypeOf<string>();
		}

		const stringRecord: Record<string, number> = {a: 1};

		if (guard(1)(stringRecord)) {
			expectTypeOf(stringRecord[1]).toEqualTypeOf<number>();
		}
	});

	test(`${name}() narrows a class instance for a key outside its shape`, () => {
		// The fallback must keep the members a mapped type cannot carry: a `#private` field and the `this` type of a fluent method. Otherwise the result is not a subtype of the input, so `Array#filter` silently falls back to its non-narrowing overload and the declared key cannot be read at all.
		class Session {
			#token = 'x';
			revoked?: boolean;
			revoke(): this {
				this.#token += 'y';
				return this;
			}
		}

		const sessions: Array<Session & {expiredAt?: number}> = [
			Object.assign(new Session(), {expiredAt: 1, revoked: true}),
			new Session(),
		];
		const found = sessions.filter(item => guard('expiredAt')(item));

		expectTypeOf(found[0]!['expiredAt']).toEqualTypeOf<number>();
		expectTypeOf(found[0]!.revoke()).toExtend<Session>();
		assert.equal(found.length, 1);
		assert.equal(found[0]!['expiredAt'], 1);

		// A key the shape declares keeps its own narrowing.
		const flagged = sessions.filter(item => guard('revoked')(item));
		expectTypeOf(flagged[0]!.revoked).toEqualTypeOf<boolean>();

		// A declared optional property keeps the other optional members.
		const extra = Object.assign(new Session(), {extra: 'x', nope: 5}) as Session & {extra?: string; nope?: number};
		const withExtra = [extra, new Session() as Session & {extra?: string; nope?: number}].filter(item => guard('nope')(item));
		expectTypeOf(withExtra[0]!.revoke()).toExtend<Session>();
		expectTypeOf(withExtra[0]!['nope']).toEqualTypeOf<number>();
		expectTypeOf(withExtra[0]!.extra).toEqualTypeOf<string | undefined>();

		// Erasing the runtime property from the input type exercises the undeclared-property fallback.
		const undeclaredSessions: Session[] = [Object.assign(new Session(), {extra: 'x'}), new Session()];
		const withUndeclared = undeclaredSessions.filter(item => guard('extra')(item));
		expectTypeOf(withUndeclared[0]!).toExtend<Session & Record<'extra', unknown>>();
		assert.equal(withUndeclared.length, 1);
		assert.equal(withUndeclared[0]!.extra, 'x');
		assert.equal(withUndeclared[0]!.revoke(), withUndeclared[0]);
	});

	test(`${name}() narrows a numeric-literal key spelled as its string form`, () => {
		// `Object.getOwnPropertyDescriptor()` finds the very same property for `0` and `'0'`, and the declared type says the only way it is missing is `undefined`, so the string spelling has to narrow just like the numeric one, even though `'0' extends keyof {0: …}` is false. It must not fall back to `unknown` for a property the guard has just proved.
		type Slot = {0: string | undefined; name: string};
		const slots: Slot[] = [{0: 'x', name: 'a'}, {0: undefined, name: 'b'}];

		const found = slots.filter(item => guard('0')(item));
		expectTypeOf(found[0]![0]).toEqualTypeOf<string>();
		assert.deepEqual(found, [{0: 'x', name: 'a'}]);

		const byNumber = slots.filter(item => guard(0)(item));
		expectTypeOf(byNumber[0]![0]).toEqualTypeOf<string>();
		assert.deepEqual(byNumber, [{0: 'x', name: 'a'}]);

		// A key the object does not declare has no known value type beyond the excluded nullish members, and nothing survives the filter at runtime, so the type is checked on its own.
		if (false) {
			const unknown = slots.filter(item => guard('7')(item));
			expectTypeOf(unknown[0]!['7']).toExtend<{} | null>();
		}

		assert.equal(slots.filter(item => guard('7')(item)).length, 0);
	});

	test(`${name}() does not narrow a key that mixes a literal with a widened type`, () => {
		// A key that mixes a literal with a widened type is one arbitrary string at runtime, so the literal member is not promised as a required property. `objectHasIn` and `objectHasOwn` treat the same key as widened too, and add an optional index signature instead.
		type LogLevel = 'info' | (string & {});
		const items: Array<{info?: string}> = [{info: 'a'}, {}];
		const level = 'info' as LogLevel;

		const found = items.filter(item => guard(level)(item));
		expectTypeOf(found[0]!['info']).toEqualTypeOf<string | undefined>();
		assert.deepEqual(found, [{info: 'a'}]);

		// A single literal key narrows. A two-member key does not, and cannot: the guard proves one key at a time, and TypeScript has no way to say "at least one of", so neither member is promised.
		expectTypeOf(items.filter(item => guard('info' as const)(item))[0]!['info']).toEqualTypeOf<string>();
		expectTypeOf(items.filter(item => guard('info' as 'info' | 'warn')(item))[0]!['info']).toEqualTypeOf<string | undefined>();
	});

	test(`${name}() does not borrow a value type from another union member`, () => {
		// `keyof` a union is the intersection of its members' keys. An undeclared property has no known value type beyond the excluded nullish members, since a structurally valid member can hold an extra own value of any type.
		const items: Array<{kind: 'a'} | {kind: 'b'; value: number | undefined}> = [
			{kind: 'b', value: 42},
			{kind: 'a'},
			{kind: 'b', value: undefined},
		];

		const found = items.filter(item => guard('value')(item));
		expectTypeOf(found[0]!['value']).toExtend<{} | null>();
		// Borrowing would give `number`, and a string would then not fit.
		expectTypeOf<string>().toExtend<typeof found[0]['value']>();
		assert.deepEqual(found, [{kind: 'b', value: 42}]);
	});

	test(`${name}() narrows a union member by member, not into one flat shape`, () => {
		// A single flattened result would claim every member's keys are present, so filtering `{a: number} | {b: string}` on `'a'` would report a `b` for a value that only ever has an `a`. It would also not be a subtype of its input, which is what `Array#filter`'s own constraint needs, so the narrowing would vanish with no diagnostic.
		const values: Array<{a: number} | {b: string}> = [{a: 1}, {b: 'x'}];
		const found = values.filter(item => guard('a')(item));

		assert.deepEqual(found, [{a: 1}]);
		if (false) {
			// @ts-expect-error - the guard proved `a`, not `b`.
			found[0]!.b;
		}

		// A union whose members declare the key with different types narrows it to their union.
		const rows: Array<{kind: 'a'; payload?: string} | {kind: 'b'; payload?: number}> = [
			{kind: 'a', payload: 'x'},
			{kind: 'b', payload: 1},
			{kind: 'a'},
		];
		const narrowed = rows.filter(item => guard('payload')(item));

		expectTypeOf(narrowed[0]!.payload).toEqualTypeOf<string | number>();
		expectTypeOf(narrowed[0]!.kind).toEqualTypeOf<'a' | 'b'>();
		assert.deepEqual(narrowed, [{kind: 'a', payload: 'x'}, {kind: 'b', payload: 1}]);
	});

	test(`${name}() keeps the result a subtype of its input`, () => {
		// `Array#filter` narrows only when the predicate's result is a subtype of the array's element type, and it says nothing at all when it is not. That silent fall-back is the failure mode this guard is most prone to, so the shapes that could produce one are pinned here.
		type One = {a?: number};
		type Two = {b?: string};
		type Three = {c?: boolean};

		// A single shape, and a key it has.
		const one: One[] = [];
		expectTypeOf(one.filter(item => guard('a')(item))).toEqualTypeOf<Array<One & {a: number}>>();

		if (false) {
			// A key the shape does not declare has only the guard's nullish exclusions, since its specific value type is unknown.
			const declared: unknown = one.filter(item => guard('b')(item))[0]!['b'];
			void declared;
		}

		// A union, and a key one member has and the others do not. Each member is narrowed on its own, so the result stays a union of subtypes while undeclared values only lose the excluded nullish members.
		const pair: Array<One | Two> = [];
		const fromPair = pair.filter(item => guard('a')(item));
		expectTypeOf(fromPair).toExtend<Array<(One & {a: number}) | (Two & {a: {} | null})>>();

		if (false) {
			// @ts-expect-error - only one member has `b`, so the union cannot be indexed by it.
			fromPair[0]!['b'];

			// The proved key has no specific value type on members that did not declare it.
			const proved: unknown = fromPair[0]!['a'];
			void proved;
		}

		// A three-member union where only one member has the key at all.
		const triple: Array<One | Two | Three> = [];
		const fromTriple = triple.filter(item => guard('a')(item));
		expectTypeOf(fromTriple).toExtend<Array<(One & {a: number}) | (Two & {a: {} | null}) | (Three & {a: {} | null})>>();

		// An empty array and an `unknown` array both narrow, so `filter` picks the narrowing overload.
		const empty: never[] = [];
		expectTypeOf(empty.filter(item => guard('a')(item))).toEqualTypeOf<never[]>();

		const unknownArray: unknown[] = [];
		expectTypeOf(unknownArray.filter(item => guard('a')(item))).toExtend<Array<object & {a: {} | null}>>();

		// A two-member key cannot make both members required, so neither is required at the top level.
		const two: Two[] = [];
		const fromTwoKey = two.filter(item => guard('a' as 'a' | 'b')(item));
		expectTypeOf(fromTwoKey).toExtend<Array<(Two & {a: {} | null}) | (Two & {b: string})>>();

		if (false) {
			const other: string | undefined = fromTwoKey[0]!['b'];
			void other;
		}
	});

	test(`${name}() keeps a union member with an undeclared key`, () => {
		// An undeclared key's specific value type is unknown, since the member may carry an extra own property. The guard only excludes nullish members. `filter()` takes the guard's own type as its element type and cannot drop that member.
		const items: Array<{a?: number} | {b?: string}> = [{a: 1}, {b: 'x'}, {}];

		const found = items.filter(item => guard('a')(item));
		expectTypeOf(found).toExtend<Array<{a?: number} | {b?: string}>>();
		assert.deepEqual(found, [{a: 1}]);

		for (const item of items) {
			if (guard('a')(item)) {
				expectTypeOf(item.a).toExtend<{} | null>();
			} else {
				expectTypeOf(item).toExtend<{a?: number} | {b?: string}>();
			}
		}

		assert.deepEqual(items.filter(item => guard('b')(item)), [{b: 'x'}]);
	});

	test(`${name}() narrows only the key a union key names`, () => {
		// The key is a union at the call site, and only one of its members was checked, so neither property is claimed and both keep their own type.
		const multipleKeys: Array<{a?: string; b?: number}> = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {}];
		const unionKey = 'a' as 'a' | 'b';
		const withUnionKey = multipleKeys.filter(item => guard(unionKey)(item));

		expectTypeOf(withUnionKey[0]!.a).toEqualTypeOf<string | undefined>();
		expectTypeOf(withUnionKey[0]!.b).toEqualTypeOf<number | undefined>();
	});

	test(`${name}() keeps a readonly property readonly`, () => {
		// The proved property preserves readonly declarations and index signatures while narrowing their value type.
		const declared: {readonly v: number | undefined} = {v: 1};

		if (guard('v')(declared)) {
			expectTypeOf(declared.v).toEqualTypeOf<number>();
			// @ts-expect-error - `v` is declared `readonly`, so writing must not compile.
			declared.v = 2;
		}

		const index: {readonly [key: string]: number | undefined} = {v: 1};

		if (guard('v')(index)) {
			expectTypeOf(index['v']).toEqualTypeOf<number>();
			// @ts-expect-error - A guard must not make a readonly index writable.
			index['v'] = 2;
		}
	});

	test(`${name}() preserves readonly numeric and symbol index signatures`, () => {
		const numbers: Readonly<Record<number, number | undefined>> = {0: 1};
		if (guard(0)(numbers)) {
			expectTypeOf(numbers[0]).toEqualTypeOf<number>();
			assert.equal(numbers[0], 1);
			// @ts-expect-error - The proved numeric property remains readonly.
			numbers[0] = 2;
		}

		const aliases: Readonly<Record<number, number | undefined>> = {0: 1};
		if (guard('0')(aliases)) {
			expectTypeOf(aliases['0']).toEqualTypeOf<number>();
			assert.equal(aliases['0'], 1);
			// @ts-expect-error - String spelling does not remove numeric-index readonlyness.
			aliases['0'] = 2;
		}

		const key = Symbol('readonly');
		const symbols: Readonly<Record<symbol, number | undefined>> = {[key]: 1};
		if (guard(key)(symbols)) {
			expectTypeOf(symbols[key]).toEqualTypeOf<number>();
			assert.equal(symbols[key], 1);
			// @ts-expect-error - The proved symbol property remains readonly.
			symbols[key] = 2;
		}
	});

	test(`${name}() keeps mutable index signatures writable`, () => {
		const strings: Record<string, number | undefined> = {value: 1};
		if (guard('value')(strings)) {
			strings['value'] = 2;
		}

		assert.equal(strings['value'], 2);

		const numbers: Record<number, number | undefined> = {0: 1};
		if (guard('0')(numbers)) {
			numbers['0'] = 2;
		}

		assert.equal(numbers[0], 2);

		const key = Symbol('mutable');
		const symbols: Record<symbol, number | undefined> = {[key]: 1};
		if (guard(key)(symbols)) {
			symbols[key] = 2;
		}

		assert.equal(symbols[key], 2);
	});

	test(`${name}() assumes a required non-nullable property is an own data property`, () => {
		// Boundary: a required property whose type already excludes the value the guard rejects matches the predicate, so TypeScript drops it from the false branch. An own accessor is rejected at runtime and reaches that `never` branch. This is documented rather than gated, since a boolean overload stops `items.filter(guard('value'))` from narrowing.
		const accessor = Object.defineProperty({}, 'value', {get: () => 1, configurable: true}) as {value: number};

		assert.equal(guard('value')(accessor), false);
		assert.equal(guard('value')({value: 1}), true);

		// A required property is the case the claim is about, since an optional one keeps the nullish member for the guard to remove and so has a usable complement.
		for (const item of [accessor, {value: 1}] as Array<{value: number}>) {
			if (guard('value')(item)) {
				expectTypeOf(item.value).toEqualTypeOf<number>();
			} else {
				expectTypeOf(item).toBeNever();
				// An accessor still supplies its value to an ordinary read, despite being rejected by the data-property guard.
				assert.equal((item as {value: number}).value, 1);
			}
		}
	});
}

// A `never`-typed key is reachable through a value the caller has already proven impossible, and it must not distribute over the empty union, which would make the guard claim every value is filtered away.
function makeMaybeValue(): {a?: number} {
	return {};
}

for (const {name, guard} of guards) {
	test(`${name}() leaves a never-typed key alone`, () => {
		const maybeValue = makeMaybeValue();
		const neverKey = 'a' as never;

		if (guard(neverKey)(maybeValue)) {
			expectTypeOf(maybeValue).toEqualTypeOf<{a?: number}>();
		}

		// A `never`-typed key is the string `'a'` at runtime and the guard reads the property rather than the key's type, so it answers for a value that has the key and one that does not.
		assert.equal(guard(neverKey)(maybeValue), false);
		assert.equal(guard(neverKey)({a: 1}), true);
	});

	test(`${name}() answers false for a value it cannot inspect`, () => {
		// `getOwnPropertyDescriptor` goes through the proxy's own-key trap, and a revoked proxy or a trap that throws takes the guard down with it. The guard catches that and answers `false`, as its siblings do, so the same value gets the same answer from all of them.
		const {proxy, revoke} = Proxy.revocable({a: 1}, {});
		revoke();
		assert.equal(guard('a')(proxy), false);

		const hostile = new Proxy({}, {
			getOwnPropertyDescriptor() {
				throw new Error('nope');
			},
		});
		assert.equal(guard('a')(hostile), false);

		// The guard is documented for use as a filter callback, where a throw would take the whole call down.
		assert.deepEqual([{a: 1}, proxy].filter(item => guard('a')(item)), [{a: 1}]);
	});
}

for (const {name, guard} of guards) {
	// A value that is still a type parameter cannot be read through the guard, which is what the note in the source says. Narrowing the value is the way out, and both halves of that are pinned here.
	test(`${name}() cannot read a value that is still a type parameter`, () => {
		// The shape the note warns about. A still-generic input keeps its unresolved type, which carries no property to read.
		const readAnUnresolved = <Value>(item: Value): unknown => {
			if (guard('value')(item)) {
				// @ts-expect-error -- A generic input has no declared property to read, which is the claim.
				return item.value;
			}

			return undefined;
		};

		assert.equal(readAnUnresolved({value: 1}), 1);

		// Narrowing the value, which is what the note tells the reader to do, is what does compile.
		const readThroughAGeneric = <Value>(item: Value): unknown => guard('value')(item)
			? (item as Value & {value: number}).value
			: undefined;

		// The guard answers either way, so the branch is reachable while the generic input remains unchanged.
		assert.equal(guard('value')({value: 1}), true);
		assert.equal(readThroughAGeneric({value: 1}), 1);
		assert.equal(readThroughAGeneric({}), undefined);
	});
}

// The one place the two guards part company, and the reason the suite above carries two columns.
test('isPropertyDefined() keeps a null, isPropertyPresent() removes it', () => {
	// A presence test that answers `true` proves the item is there, not that it is non-nullable, so the true branch must keep every member of the declared type. `null` is the point, so the type that carries it is named once.
	type Nullable = number | null | undefined;

	const values: Array<{value: Nullable}> = [{value: 1}, {value: null}, {value: undefined}];

	const definedResult = values.filter(item => isPropertyDefined('value')(item));
	assert.deepEqual(definedResult, [{value: 1}, {value: null}]);
	expectTypeOf(definedResult[0]!.value).toEqualTypeOf<number | null>();

	const presentResult = values.filter(item => isPropertyPresent('value')(item));
	expectTypeOf(presentResult[0]!.value).toEqualTypeOf<number>();
	assert.deepEqual(presentResult, [{value: 1}]);

	// A required `null` is the other direction: `isPropertyDefined` keeps it and narrows nothing, while `isPropertyPresent` drops the item.
	const requiredNulls: Array<{value: number | null}> = [{value: 1}, {value: null}];
	assert.deepEqual(requiredNulls.filter(item => isPropertyDefined('value')(item)), requiredNulls);
	assert.deepEqual(requiredNulls.filter(item => isPropertyPresent('value')(item)), [{value: 1}]);
});

test('property guards do not borrow a value type from another union member', () => {
	type Item = {kind: 'a'; a?: number} | {kind: 'b'; b: string};
	const wider = {kind: 'b', b: 'text', a: 'unexpected'} as const;
	const items: Item[] = [wider];

	const defined = items.filter(item => isPropertyDefined('a')(item));
	expectTypeOf(defined[0]!.a).toExtend<{} | null>();
	// Borrowing would give `number`, and the runtime string would then not fit.
	expectTypeOf<string>().toExtend<typeof defined[0]['a']>();
	assert.equal(defined[0]!.a, 'unexpected');

	const present = items.filter(item => isPropertyPresent('a')(item));
	expectTypeOf(present[0]!.a).toExtend<{}>();
	expectTypeOf<string>().toExtend<typeof present[0]['a']>();
	assert.equal(present[0]!.a, 'unexpected');
});

test('property guards do not treat a noncanonical numeric string as a numeric index', () => {
	const record: Record<number, string> = Object.assign({1: 'one'}, {'01': 42});

	assert.equal(isPropertyDefined('01')(record), true);
	if (isPropertyDefined('01')(record)) {
		expectTypeOf(record['01']).toEqualTypeOf<{} | null>();
		assert.equal(record['01'], 42);
	}

	assert.equal(isPropertyPresent('01')(record), true);
	if (isPropertyPresent('01')(record)) {
		expectTypeOf(record['01']).toEqualTypeOf<{}>();
		assert.equal(record['01'], 42);
	}
});

test('property guards narrow a symbol key to its declared value type', () => {
	const key = Symbol('key');
	const items: Array<{[key]?: number | undefined}> = [{[key]: 1}, {}];

	const defined = items.filter(item => isPropertyDefined(key)(item));
	expectTypeOf(defined[0]![key]).toEqualTypeOf<number>();
	assert.equal(defined.length, 1);

	const present = items.filter(item => isPropertyPresent(key)(item));
	expectTypeOf(present[0]![key]).toEqualTypeOf<number>();
	assert.equal(present.length, 1);
});

test('isPropertyPresent() removes null and isPropertyDefined() keeps it', () => {
	const items: Array<{data: string | null}> = [{data: 'a'}, {data: null}];

	const present = items.filter(item => isPropertyPresent('data')(item));
	expectTypeOf(present[0]!.data).toEqualTypeOf<string>();
	assert.deepEqual(present, [{data: 'a'}]);

	const defined = items.filter(item => isPropertyDefined('data')(item));
	expectTypeOf(defined[0]!.data).toEqualTypeOf<string | null>();
	assert.deepEqual(defined, items);
});

test('property guards preserve readonly records and their distinct null handling through filter', () => {
	const items: Array<Readonly<Record<string, number | null | undefined>>> = [
		Object.freeze({value: 1}),
		Object.freeze({value: null}),
		Object.freeze({value: undefined}),
		Object.freeze({}),
	];
	const defined = items.filter(item => isPropertyDefined('value')(item));
	const present = items.filter(item => isPropertyPresent('value')(item));

	expectTypeOf(defined[0]!['value']).toEqualTypeOf<number | null>();
	expectTypeOf(present[0]!['value']).toEqualTypeOf<number>();
	assert.deepEqual(defined, [{value: 1}, {value: null}]);
	assert.deepEqual(present, [{value: 1}]);

	// These writes are type-only because the records are frozen at runtime.
	void function checkReadonlyResults() {
		// @ts-expect-error - Filtering must not make the defined property writable.
		defined[0]!['value'] = 2;
		// @ts-expect-error - Filtering must not make the present property writable.
		present[0]!['value'] = 2;
	};
});

test('isPropertyDefined() keeps an unknown-valued property usable in its false branch', () => {
	const check = (value: unknown) => {
		const item = {value};
		if (isPropertyDefined('value')(item)) {
			expectTypeOf(item.value).toEqualTypeOf<{} | null>();
			return [true, item.value] as const;
		}

		expectTypeOf(item.value).toEqualTypeOf<unknown>();
		return [false, item.value] as const;
	};

	assert.deepEqual(check(undefined), [false, undefined]);
	assert.deepEqual(check(null), [true, null]);
	assert.deepEqual(check(false), [true, false]);
	assert.deepEqual(check(0), [true, 0]);
});

test('property guards refine an undeclared property without borrowing a value type', () => {
	const item = {label: 'row', value: false} as {label: string};

	if (isPropertyDefined('value')(item)) {
		expectTypeOf(item.value).toEqualTypeOf<{} | null>();
		assert.equal(item.value, false);
	}

	if (isPropertyPresent('value')(item)) {
		expectTypeOf(item.value).toEqualTypeOf<{}>();
		assert.equal(item.value, false);
	}
});

test('property guards refine unknown values through the string spelling of a numeric property', () => {
	const checkDefined = (value: unknown) => {
		const item: {readonly 0: unknown} = {0: value};
		if (isPropertyDefined('0')(item)) {
			expectTypeOf(item[0]).toEqualTypeOf<{} | null>();
			return [true, item[0]] as const;
		}

		expectTypeOf(item[0]).toEqualTypeOf<unknown>();
		return [false, item[0]] as const;
	};

	const checkPresent = (value: unknown) => {
		const item: {readonly 0: unknown} = {0: value};
		if (isPropertyPresent('0')(item)) {
			expectTypeOf(item[0]).toEqualTypeOf<{}>();
			return [true, item[0]] as const;
		}

		expectTypeOf(item[0]).toEqualTypeOf<unknown>();
		return [false, item[0]] as const;
	};

	assert.deepEqual(checkDefined(undefined), [false, undefined]);
	assert.deepEqual(checkDefined(null), [true, null]);
	assert.deepEqual(checkDefined(''), [true, '']);
	assert.deepEqual(checkPresent(undefined), [false, undefined]);
	assert.deepEqual(checkPresent(null), [false, null]);
	assert.deepEqual(checkPresent(''), [true, '']);
});

for (const {name, guard} of guards) {
	test(`${name}() treats a declared required property as an own data property`, () => {
		// Boundary: an inherited or accessor property is rejected at runtime, but the type cannot tell it from an own data property, so the false branch is typed `never` for it.
		type Item = {readonly value: number};
		function inspect(value: Item) {
			if (guard('value')(value)) {
				expectTypeOf(value).toExtend<Item>();
				return `present: ${value.value}`;
			}

			expectTypeOf(value).toBeNever();
			return `skipped: ${(value as Item).value}`;
		}

		const inherited = Object.create({value: 1}) as Item;
		const accessor: Item = {
			get value() {
				return 2;
			},
		};

		assert.equal(inspect(inherited), 'skipped: 1');
		assert.equal(inspect(accessor), 'skipped: 2');
		assert.equal(inspect({value: 3}), 'present: 3');
	});

	test(`${name}() narrows a union containing a required property member`, () => {
		type Required = {readonly kind: 'required'; readonly value: number};
		type Optional = {readonly kind: 'optional'; readonly value?: number};
		type Item = Required | Optional;
		function inspect(value: Item) {
			if (guard('value')(value)) {
				expectTypeOf(value.value).toEqualTypeOf<number>();
				return `present: ${value.kind}`;
			}

			expectTypeOf(value).toEqualTypeOf<Optional>();
			return `skipped: ${value.kind}`;
		}

		assert.equal(inspect({kind: 'optional'}), 'skipped: optional');
		assert.equal(inspect({kind: 'required', value: 2}), 'present: required');
		assert.equal(inspect({kind: 'optional', value: 3}), 'present: optional');

		const items: Item[] = [{kind: 'optional'}, {kind: 'required', value: 2}, {kind: 'optional', value: 3}];
		const filtered = items.filter(guard('value'));
		expectTypeOf(filtered[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(filtered, [{kind: 'required', value: 2}, {kind: 'optional', value: 3}]);
	});

	test(`${name}() narrows when passed directly to filter`, () => {
		// Regression guard: this was the primary documented use in v1.3.0. An overloaded predicate is inferred from its base signature when passed to `.filter()`, so the guard must return a single generic signature.
		const items: Array<{value?: number}> = [{value: 1}, {}, {value: undefined}];
		const predicate = guard('value');
		const direct = items.filter(predicate);
		const wrapped = items.filter(item => predicate(item));

		expectTypeOf(direct[0]!.value).toEqualTypeOf<number>();
		expectTypeOf(wrapped[0]!.value).toEqualTypeOf<number>();
		assert.deepEqual(direct, [{value: 1}]);
		assert.deepEqual(wrapped, direct);
	});
}

for (const {name, guard} of guards) {
	test(`${name}() preserves readonly string-named numeric properties checked by number`, () => {
		const items: Array<{readonly '0': number | undefined}> = [Object.freeze({'0': 1}), Object.freeze({'0': undefined})];
		const found = items.filter(item => guard(0)(item));

		expectTypeOf(found[0]![0]).toEqualTypeOf<number>();
		assert.deepEqual(found, [{'0': 1}]);

		void function checkReadonly() {
			// @ts-expect-error - A numeric alias must retain the declared property's readonly modifier.
			found[0]![0] = 2;
			// @ts-expect-error - Both spellings still refer to the same readonly property.
			found[0]!['0'] = 2;
		};
	});
}

for (const {name, guard} of guards) {
	test(`${name}() keeps an any value usable in both branches`, () => {
		// Regression guard: intersecting the predicate with the input collapsed it to `any`, and TypeScript then narrowed the false branch to `never`.
		const data = JSON.parse('{"other": 1}');
		if (guard('id')(data)) {
			return;
		}

		expectTypeOf(data).toBeAny();
		assert.equal(data.other, 1);
	});
}

// Boundary: a union key cannot express "at least one of", so the `else` branch drops every member that declares one of the keys, even when the checked key was missing at runtime. This is documented. Do not add an overload to fix it, since `.filter()` would stop narrowing.
test('isPropertyDefined() with a union key can type a reachable else branch as never', () => {
	type Shape = {a: number; b?: string};
	const shape: Shape = {a: 1};
	const key = 'b' as 'a' | 'b';

	if (isPropertyDefined(key)(shape)) {
		assert.fail('`b` is missing');
	} else {
		expectTypeOf(shape).toBeNever();
		assert.equal(Object.hasOwn(shape, 'b'), false);
	}
});
