import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isPropertyPresent} from '../source/index.js';

test('isPropertyPresent()', () => {
	const check = isPropertyPresent('value');
	assert.equal(check({value: 1}), true);
	assert.equal(check({value: undefined}), false);
	assert.equal(check({value: null}), false);
	assert.equal(check({}), false);

	// Falsy-but-present values are kept
	assert.equal(check({value: 0}), true);
	assert.equal(check({value: ''}), true);
	assert.equal(check({value: false}), true);

	type Item = {
		name: string;
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		value: number | null | undefined;
	};

	const items: Item[] = [
		{name: 'a', value: 1},
		{name: 'b', value: null},
		{name: 'c', value: undefined},
	];

	const result = items.filter(isPropertyPresent('value'));
	assert.deepEqual(result, [{name: 'a', value: 1}]);
	expectTypeOf(result[0]!.value).toEqualTypeOf<number>();

	type ReadonlyItem = {
		readonly value: number | null | undefined;
	};

	const readonlyItems: ReadonlyItem[] = [{value: 1}, {value: null}, {value: undefined}];
	const readonlyResult = readonlyItems.filter(isPropertyPresent('value'));
	expectTypeOf(readonlyResult[0]!.value).toEqualTypeOf<number>();
	// @ts-expect-error
	readonlyResult[0]!.value = 2;

	// Works with null-only property
	type ItemNullable = {
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		data: string | null;
	};

	const nullables: ItemNullable[] = [{data: 'hello'}, {data: null}];
	const withData = nullables.filter(isPropertyPresent('data'));
	assert.deepEqual(withData, [{data: 'hello'}]);
	expectTypeOf(withData[0]!.data).toEqualTypeOf<string>();

	// Works with optional properties
	type ItemOptional = {
		data?: string;
	};

	const optionals: ItemOptional[] = [{data: 'hello'}, {}];
	const withOptional = optionals.filter(isPropertyPresent('data'));
	assert.deepEqual(withOptional, [{data: 'hello'}]);
	expectTypeOf(withOptional[0]!.data).toEqualTypeOf<string>();

	// Chained filters narrow multiple properties
	type Multi = {
		a?: string;
		b?: number;
	};

	const multi: Multi[] = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {}];
	const both = multi.filter(isPropertyPresent('a')).filter(isPropertyPresent('b'));
	assert.deepEqual(both, [{a: 'x', b: 1}]);
	expectTypeOf(both[0]!.a).toEqualTypeOf<string>();
	expectTypeOf(both[0]!.b).toEqualTypeOf<number>();

	// Narrowing with .map() - the primary use case
	const mapped = items.filter(isPropertyPresent('value')).map(item => item.value * 2);
	assert.deepEqual(mapped, [2]);
	expectTypeOf(mapped).toEqualTypeOf<number[]>();

	// Union type property narrows correctly
	type ItemUnion = {
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		value: string | number | null | undefined;
	};

	const unions: ItemUnion[] = [{value: 'a'}, {value: 1}, {value: null}, {value: undefined}];
	const presentUnions = unions.filter(isPropertyPresent('value'));
	assert.deepEqual(presentUnions, [{value: 'a'}, {value: 1}]);
	expectTypeOf(presentUnions[0]!.value).toEqualTypeOf<string | number>();

	// Widened keys fall back to the original value type
	let widenedKey: string = Math.random() > 0.5 ? 'value' : 'name';
	const widenedResult = items.filter(isPropertyPresent(widenedKey));
	assert.deepEqual(widenedResult, widenedKey === 'value' ? [{name: 'a', value: 1}] : items);
	const firstWidenedValue = widenedResult[0]!.value;
	const widenedValue: typeof firstWidenedValue = null;
	void widenedValue;

	// Branded keys also fall back to the original value type
	type BrandedKey = string & {readonly __brand: unique symbol};
	let brandedKey: BrandedKey = (Math.random() > 0.5 ? 'value' : 'name') as BrandedKey;
	const brandedResult = items.filter(isPropertyPresent(brandedKey));
	assert.deepEqual(brandedResult, brandedKey === 'value' ? [{name: 'a', value: 1}] : items);
	const firstBrandedValue = brandedResult[0]!.value;
	const brandedValue: typeof firstBrandedValue = null;
	void brandedValue;

	type BrandedNumberKey = number & {readonly __brand: unique symbol};
	type NumberItem = {
		0: string | null | undefined;
		1: string | null | undefined;
	};

	let brandedNumberKey: BrandedNumberKey = (Math.random() > 0.5 ? 0 : 1) as BrandedNumberKey;
	const brandedNumberItems: NumberItem[] = [
		{0: 'zero', 1: null},
		{0: null, 1: 'one'},
	];
	const brandedNumberResult = brandedNumberItems.filter(isPropertyPresent(brandedNumberKey));
	assert.deepEqual(brandedNumberResult, brandedNumberKey === 0 ? [{0: 'zero', 1: null}] : [{0: null, 1: 'one'}]);
	const firstBrandedNumberValue = brandedNumberResult[0]![0];
	const brandedNumberValue: typeof firstBrandedNumberValue = null;
	void brandedNumberValue;

	type BrandedSymbolKey = symbol & {readonly __brand: unique symbol};
	const brandedSymbolKeyA = Symbol('a');
	const brandedSymbolKeyB = Symbol('b');
	type SymbolItem = {
		[brandedSymbolKeyA]: number | null | undefined;
		[brandedSymbolKeyB]: number | null | undefined;
	};

	let brandedSymbolKey: BrandedSymbolKey = (Math.random() > 0.5 ? brandedSymbolKeyA : brandedSymbolKeyB) as BrandedSymbolKey;
	const brandedSymbolItems: SymbolItem[] = [
		{[brandedSymbolKeyA]: 1, [brandedSymbolKeyB]: null},
		{[brandedSymbolKeyA]: null, [brandedSymbolKeyB]: 2},
	];
	const brandedSymbolResult = brandedSymbolItems.filter(isPropertyPresent(brandedSymbolKey));
	assert.deepEqual(brandedSymbolResult, brandedSymbolKey === brandedSymbolKeyA ? [{[brandedSymbolKeyA]: 1, [brandedSymbolKeyB]: null}] : [{[brandedSymbolKeyA]: null, [brandedSymbolKeyB]: 2}]);
	const firstBrandedSymbolValue = brandedSymbolResult[0]![brandedSymbolKeyA];
	const brandedSymbolValue: typeof firstBrandedSymbolValue = null;
	void brandedSymbolValue;

	// Dynamic template-literal keys fall back to the original value type
	type TemplateKey = `foo${string}`;
	type TemplateItem = Record<TemplateKey, number | null | undefined>;
	let templateKey: TemplateKey = Math.random() > 0.5 ? 'fooA' : 'fooB';
	const templateItems: TemplateItem[] = [
		{fooA: 1, fooB: null},
		{fooA: null, fooB: 2},
	];
	const templateResult = templateItems.filter(isPropertyPresent(templateKey));
	assert.deepEqual(templateResult, templateKey === 'fooA' ? [{fooA: 1, fooB: null}] : [{fooA: null, fooB: 2}]);
	const firstTemplateValue = templateResult[0]!.fooA;
	const templateValue: typeof firstTemplateValue = null;
	void templateValue;

	type NumericTemplateKey = `${number}px`;
	type NumericTemplateItem = Record<NumericTemplateKey, number | null | undefined>;
	let numericTemplateKey: NumericTemplateKey = Math.random() > 0.5 ? '1px' : '2px';
	const numericTemplateItems: NumericTemplateItem[] = [
		{'1px': 1, '2px': null},
		{'1px': null, '2px': 2},
	];
	const numericTemplateResult = numericTemplateItems.filter(isPropertyPresent(numericTemplateKey));
	assert.deepEqual(numericTemplateResult, numericTemplateKey === '1px' ? [{'1px': 1, '2px': null}] : [{'1px': null, '2px': 2}]);
	const firstNumericTemplateValue = numericTemplateResult[0]!['1px'];
	const numericTemplateValue: typeof firstNumericTemplateValue = null;
	void numericTemplateValue;

	// Broad object types do not collapse to never
	const broadObjects: object[] = [];
	broadObjects.push({value: 1}, {value: null}, {});
	const broadResult = broadObjects.filter(isPropertyPresent('value'));
	assert.deepEqual(broadResult, [{value: 1}]);
	const firstBroadValue = broadResult[0]!.value;
	const broadValue: typeof firstBroadValue = 1;
	void broadValue;

	// Primitive unions can be filtered
	const primitiveMixedValues: Array<{value?: number | null} | string> = [{value: 1}, 'x', {value: null}, {}];
	const primitiveMixedResult = primitiveMixedValues.filter(isPropertyPresent('value'));
	assert.deepEqual(primitiveMixedResult, [{value: 1}]);
	expectTypeOf(primitiveMixedResult[0]!.value).toEqualTypeOf<number>();

	// Unknown values can be filtered without collapsing to never
	const unknownValues: unknown[] = [{value: 1}, {value: false}, 'x', 1, {value: null}, {}];
	const unknownResult = unknownValues.filter(isPropertyPresent('value'));
	assert.deepEqual(unknownResult, [{value: 1}, {value: false}]);
	const firstUnknownValue = unknownResult[0]!.value;
	const unknownValue: typeof firstUnknownValue = 1;
	void unknownValue;

	// Undeclared own keys still narrow to an accessible property
	type ExpandoItem = {
		name: string;
	};

	const expandoItems: ExpandoItem[] = [
		Object.assign({name: 'a'}, {value: 1}),
		Object.assign({name: 'b'}, {value: null}),
		{name: 'c'},
	];
	const expandoResult = expandoItems.filter(isPropertyPresent('value'));
	assert.deepEqual(expandoResult, [Object.assign({name: 'a'}, {value: 1})]);
	const expandoItem: typeof expandoResult[0] = Object.assign({name: 'a'}, {value: 1});
	void expandoItem;

	// Array string indices do not collapse to never
	const arrayItems: Array<Array<string | null>> = [['a'], [null], []];
	const arrayResult = arrayItems.filter(isPropertyPresent('0'));
	assert.deepEqual(arrayResult, [['a']]);
	const firstArrayValue = arrayResult[0]!['0'];
	void firstArrayValue;

	// Symbol keys work with own-property checks
	const symbolKey = Symbol('value');
	const checkSymbol = isPropertyPresent(symbolKey);
	assert.equal(checkSymbol({[symbolKey]: 1}), true);
	assert.equal(checkSymbol({[symbolKey]: null}), false);
	assert.equal(checkSymbol({[symbolKey]: undefined}), false);
	assert.equal(checkSymbol({}), false);
	assert.equal(checkSymbol(Object.create({[symbolKey]: 1})), false);
	const symbolValues: Array<{[symbolKey]?: number | null} | {other: string}> = [{[symbolKey]: 1}, {other: 'x'}, {[symbolKey]: null}, {}];
	const symbolResult = symbolValues.filter(isPropertyPresent(symbolKey));
	assert.deepEqual(symbolResult, [{[symbolKey]: 1}]);
	expectTypeOf(symbolResult[0]![symbolKey]).toEqualTypeOf<number>();

	// Function objects can be filtered
	type FunctionWithOptionalValue = (() => void) & {value?: number | null};
	const functionWithValue: FunctionWithOptionalValue = Object.assign(() => {}, {value: 1});
	const functionWithoutValue: FunctionWithOptionalValue = () => {};
	const functionResult = [functionWithValue, functionWithoutValue].filter(isPropertyPresent('value'));
	assert.deepEqual(functionResult, [functionWithValue]);
	expectTypeOf(functionResult[0]!.value).toEqualTypeOf<number>();

	// Numeric keys work with own-property checks
	const checkNumeric = isPropertyPresent(0);
	assert.equal(checkNumeric({0: 'zero'}), true);
	assert.equal(checkNumeric({0: null}), false);
	assert.equal(checkNumeric({0: undefined}), false);
	assert.equal(checkNumeric(Object.create({0: 'zero'})), false);
	const numericValues: Array<{0?: string | null} | {1: number}> = [{0: 'zero'}, {1: 1}, {0: null}, {}];
	const numericResult = numericValues.filter(isPropertyPresent(0));
	assert.deepEqual(numericResult, [{0: 'zero'}]);
	expectTypeOf(numericResult[0]![0]).toEqualTypeOf<string>();

	// Own accessors are rejected because later reads are not stable
	const ownAccessorObject = {};
	Object.defineProperty(ownAccessorObject, 'value', {
		get() {
			return 1;
		},
		enumerable: true,
	});
	assert.equal(isPropertyPresent('value')(ownAccessorObject), false);

	// Stateful own accessors are also rejected
	let hasReturnedValue = false;
	const ownStatefulAccessorObject = {};
	Object.defineProperty(ownStatefulAccessorObject, 'value', {
		get() {
			if (hasReturnedValue) {
				return undefined;
			}

			hasReturnedValue = true;
			return 1;
		},
		enumerable: true,
	});
	assert.equal(isPropertyPresent('value')(ownStatefulAccessorObject), false);

	// Own accessors returning nullish values are rejected
	const ownNullAccessorObject = {};
	Object.defineProperty(ownNullAccessorObject, 'value', {
		get() {
			return null;
		},
		enumerable: true,
	});
	assert.equal(isPropertyPresent('value')(ownNullAccessorObject), false);

	const ownUndefinedAccessorObject = {};
	Object.defineProperty(ownUndefinedAccessorObject, 'value', {
		get() {
			return undefined;
		},
		enumerable: true,
	});
	assert.equal(isPropertyPresent('value')(ownUndefinedAccessorObject), false);

	// Union keys only narrow the checked key
	type ItemWithMultipleKeys = {
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		a?: string | null;
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		b?: number | null;
	};

	const unionKey = Math.random() > 0.5 ? 'a' as const : 'b' as const;
	const multipleKeys: ItemWithMultipleKeys[] = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {a: null}, {b: null}, {}];
	const withUnionKey = multipleKeys.filter(isPropertyPresent(unionKey));
	expectTypeOf(withUnionKey[0]!.a).toEqualTypeOf<string | null | undefined>();
	expectTypeOf(withUnionKey[0]!.b).toEqualTypeOf<number | null | undefined>();

	// Heterogeneous unions keep omitted members available via own-property expandos
	type HeterogeneousItem = {kind: 'a'} | {kind: 'b'; value: number | null | undefined};

	const heterogeneousItems: HeterogeneousItem[] = [{kind: 'a'}, {kind: 'b', value: 1}, {kind: 'b', value: null}, {kind: 'b', value: undefined}];
	const withValue = heterogeneousItems.filter(isPropertyPresent('value'));
	assert.deepEqual(withValue, [{kind: 'b', value: 1}]);
	expectTypeOf(withValue[0]!.kind).toEqualTypeOf<'a' | 'b'>();
	const declaredHeterogeneousItem: typeof withValue[0] = {kind: 'b', value: 1};
	void declaredHeterogeneousItem;
	const expandoHeterogeneousItem: typeof withValue[0] = Object.assign({kind: 'a' as const}, {value: 1});
	void expandoHeterogeneousItem;

	// Inherited properties are ignored to match the narrowing
	const inheritedValueItem: HeterogeneousItem = Object.assign(Object.create({value: 1}) as {kind: 'a'}, {kind: 'a' as const});
	const ownValueItem: HeterogeneousItem = {kind: 'b', value: 1};
	const withoutInheritedValue = [inheritedValueItem, ownValueItem].filter(isPropertyPresent('value'));
	assert.deepEqual(withoutInheritedValue, [ownValueItem]);

	// Inherited getters are ignored without being executed
	const inheritedThrowingGetterItem = Object.assign(Object.create({
		get value() {
			throw new Error('Getter should not run');
		},
	}) as {kind: 'a'}, {kind: 'a' as const});
	assert.doesNotThrow(() => {
		assert.equal(isPropertyPresent('value')(inheritedThrowingGetterItem), false);
	});

	// Object/array property
	type ItemNested = {
		children: string[] | undefined;
	};

	const nested: ItemNested[] = [{children: ['a']}, {children: undefined}];
	const withChildren = nested.filter(isPropertyPresent('children'));
	assert.deepEqual(withChildren, [{children: ['a']}]);
	expectTypeOf(withChildren[0]!.children).toEqualTypeOf<string[]>();

	// Reusing the same predicate across different arrays
	const predicate = isPropertyPresent('value');
	assert.deepEqual([{value: 1}, {value: undefined}].filter(predicate), [{value: 1}]);
	assert.deepEqual([{value: 'x'}, {value: null}].filter(predicate), [{value: 'x'}]);

	// Works as a standalone type guard
	const item: Item = {name: 'test', value: null};
	if (isPropertyPresent('value')(item)) {
		expectTypeOf(item.value).toEqualTypeOf<number>();
	}

	// Primitive values are rejected
	assert.equal(check(null as unknown), false);
	assert.equal(check(undefined as unknown), false);
	assert.equal(check(42 as unknown), false);
	assert.equal(check('hello' as unknown), false);
	assert.equal(check(true as unknown), false);
	assert.equal(check(Symbol('x') as unknown), false);

	// NaN and -0 are present
	assert.equal(check({value: Number.NaN}), true);
	assert.equal(check({value: -0}), true);

	// Non-enumerable own properties are detected
	const nonEnumerable = {};
	Object.defineProperty(nonEnumerable, 'value', {value: 1, enumerable: false});
	assert.equal(check(nonEnumerable), true);

	// Null-prototype objects work (Object.hasOwn is safe unlike hasOwnProperty)
	const nullProto = Object.create(null) as Record<string, unknown>;
	nullProto['value'] = 1;
	assert.equal(check(nullProto), true);
	assert.equal(check(Object.create(null)), false);

	// Sparse array holes are not present
	// eslint-disable-next-line no-sparse-arrays
	assert.equal(isPropertyPresent('1')([1, , 3]), false);
	// eslint-disable-next-line no-sparse-arrays
	assert.equal(isPropertyPresent('0')([1, , 3]), true);

	// Null-prototype objects with null/undefined values
	const nullProtoNull = Object.create(null) as Record<string, unknown>;
	nullProtoNull['value'] = null;
	assert.equal(check(nullProtoNull), false);
	const nullProtoUndefined = Object.create(null) as Record<string, unknown>;
	nullProtoUndefined['value'] = undefined;
	assert.equal(check(nullProtoUndefined), false);

	// Frozen objects
	assert.equal(check(Object.freeze({value: 1})), true);
	assert.equal(check(Object.freeze({value: null})), false);
	assert.equal(check(Object.freeze({value: undefined})), false);

	// Empty string as property key
	assert.equal(isPropertyPresent('')({['']: 1}), true);
	assert.equal(isPropertyPresent('')({['']: null}), false);
	assert.equal(isPropertyPresent('')({['']: undefined}), false);
	assert.equal(isPropertyPresent('')({}), false);

	// Prototype-sensitive keys
	assert.equal(isPropertyPresent('__proto__')({__proto__: Object.prototype}), false); // __proto__ is not an own property
	assert.equal(isPropertyPresent('__proto__')({['__proto__']: 'custom'}), true);
	assert.equal(isPropertyPresent('constructor')({}), false); // inherited
	assert.equal(isPropertyPresent('constructor')({constructor: 'own'}), true);
	assert.equal(isPropertyPresent('toString')({}), false); // inherited
	assert.equal(isPropertyPresent('toString')({toString: () => 'own'}), true);
});
