import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {isPropertyDefined} from '../source/index.js';

test('isPropertyDefined()', () => {
	const check = isPropertyDefined('value');
	assert.equal(check({value: 1}), true);
	assert.equal(check({value: undefined}), false);
	assert.equal(check({value: null}), true);
	assert.equal(check({}), false);

	// Falsy-but-defined values are kept
	assert.equal(check({value: 0}), true);
	assert.equal(check({value: ''}), true);
	assert.equal(check({value: false}), true);

	type Item = {
		name: string;
		value: number | undefined;
	};

	const items: Item[] = [
		{name: 'a', value: 1},
		{name: 'b', value: undefined},
		{name: 'c', value: 3},
	];

	const result = items.filter(isPropertyDefined('value'));
	assert.deepEqual(result, [{name: 'a', value: 1}, {name: 'c', value: 3}]);
	expectTypeOf(result[0]!.value).toEqualTypeOf<number>();

	type ReadonlyItem = {
		readonly value: number | undefined;
	};

	const readonlyItems: ReadonlyItem[] = [{value: 1}, {value: undefined}];
	const readonlyResult = readonlyItems.filter(isPropertyDefined('value'));
	expectTypeOf(readonlyResult[0]!.value).toEqualTypeOf<number>();
	// @ts-expect-error
	readonlyResult[0]!.value = 2;

	// Works with optional properties
	type ItemOptional = {
		data?: string;
	};

	const optionals: ItemOptional[] = [{data: 'hello'}, {}];
	const withData = optionals.filter(isPropertyDefined('data'));
	assert.deepEqual(withData, [{data: 'hello'}]);
	expectTypeOf(withData[0]!.data).toEqualTypeOf<string>();

	// Does not remove null
	type ItemNullable = {
		// eslint-disable-next-line @typescript-eslint/no-restricted-types
		value: number | null | undefined;
	};

	const nullables: ItemNullable[] = [{value: 1}, {value: null}, {value: undefined}];
	const definedOnly = nullables.filter(isPropertyDefined('value'));
	assert.deepEqual(definedOnly, [{value: 1}, {value: null}]);
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	expectTypeOf(definedOnly[0]!.value).toEqualTypeOf<number | null>();

	// Chained filters narrow multiple properties
	type Multi = {
		a?: string;
		b?: number;
	};

	const multi: Multi[] = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {}];
	const both = multi.filter(isPropertyDefined('a')).filter(isPropertyDefined('b'));
	assert.deepEqual(both, [{a: 'x', b: 1}]);
	expectTypeOf(both[0]!.a).toEqualTypeOf<string>();
	expectTypeOf(both[0]!.b).toEqualTypeOf<number>();

	// Narrowing with .map() - the primary use case
	const mapped = items.filter(isPropertyDefined('value')).map(item => item.value * 2);
	assert.deepEqual(mapped, [2, 6]);
	expectTypeOf(mapped).toEqualTypeOf<number[]>();

	// Union type property narrows correctly
	type ItemUnion = {
		value: string | number | undefined;
	};

	const unions: ItemUnion[] = [{value: 'a'}, {value: 1}, {value: undefined}];
	const definedUnions = unions.filter(isPropertyDefined('value'));
	assert.deepEqual(definedUnions, [{value: 'a'}, {value: 1}]);
	expectTypeOf(definedUnions[0]!.value).toEqualTypeOf<string | number>();

	// Widened keys fall back to the original value type
	let widenedKey: string = Math.random() > 0.5 ? 'value' : 'name';
	const widenedResult = items.filter(isPropertyDefined(widenedKey));
	assert.deepEqual(widenedResult, widenedKey === 'value' ? [{name: 'a', value: 1}, {name: 'c', value: 3}] : items);
	const firstWidenedValue = widenedResult[0]!.value;
	const widenedValue: typeof firstWidenedValue = undefined;
	void widenedValue;

	// Branded keys also fall back to the original value type
	type BrandedKey = string & {readonly __brand: unique symbol};
	let brandedKey: BrandedKey = (Math.random() > 0.5 ? 'value' : 'name') as BrandedKey;
	const brandedResult = items.filter(isPropertyDefined(brandedKey));
	assert.deepEqual(brandedResult, brandedKey === 'value' ? [{name: 'a', value: 1}, {name: 'c', value: 3}] : items);
	const firstBrandedValue = brandedResult[0]!.value;
	const brandedValue: typeof firstBrandedValue = undefined;
	void brandedValue;

	type BrandedNumberKey = number & {readonly __brand: unique symbol};
	type NumberItem = {
		0: string | undefined;
		1: string | undefined;
	};

	let brandedNumberKey: BrandedNumberKey = (Math.random() > 0.5 ? 0 : 1) as BrandedNumberKey;
	const brandedNumberItems: NumberItem[] = [
		{0: 'zero', 1: undefined},
		{0: undefined, 1: 'one'},
	];
	const brandedNumberResult = brandedNumberItems.filter(isPropertyDefined(brandedNumberKey));
	assert.deepEqual(brandedNumberResult, brandedNumberKey === 0 ? [{0: 'zero', 1: undefined}] : [{0: undefined, 1: 'one'}]);
	const firstBrandedNumberValue = brandedNumberResult[0]![0];
	const brandedNumberValue: typeof firstBrandedNumberValue = undefined;
	void brandedNumberValue;

	type BrandedSymbolKey = symbol & {readonly __brand: unique symbol};
	const brandedSymbolKeyA = Symbol('a');
	const brandedSymbolKeyB = Symbol('b');
	type SymbolItem = {
		[brandedSymbolKeyA]: number | undefined;
		[brandedSymbolKeyB]: number | undefined;
	};

	let brandedSymbolKey: BrandedSymbolKey = (Math.random() > 0.5 ? brandedSymbolKeyA : brandedSymbolKeyB) as BrandedSymbolKey;
	const brandedSymbolItems: SymbolItem[] = [
		{[brandedSymbolKeyA]: 1, [brandedSymbolKeyB]: undefined},
		{[brandedSymbolKeyA]: undefined, [brandedSymbolKeyB]: 2},
	];
	const brandedSymbolResult = brandedSymbolItems.filter(isPropertyDefined(brandedSymbolKey));
	assert.deepEqual(brandedSymbolResult, brandedSymbolKey === brandedSymbolKeyA ? [{[brandedSymbolKeyA]: 1, [brandedSymbolKeyB]: undefined}] : [{[brandedSymbolKeyA]: undefined, [brandedSymbolKeyB]: 2}]);
	const firstBrandedSymbolValue = brandedSymbolResult[0]![brandedSymbolKeyA];
	const brandedSymbolValue: typeof firstBrandedSymbolValue = undefined;
	void brandedSymbolValue;

	// Dynamic template-literal keys fall back to the original value type
	type TemplateKey = `foo${string}`;
	type TemplateItem = Record<TemplateKey, number | undefined>;
	let templateKey: TemplateKey = Math.random() > 0.5 ? 'fooA' : 'fooB';
	const templateItems: TemplateItem[] = [
		{fooA: 1, fooB: undefined},
		{fooA: undefined, fooB: 2},
	];
	const templateResult = templateItems.filter(isPropertyDefined(templateKey));
	assert.deepEqual(templateResult, templateKey === 'fooA' ? [{fooA: 1, fooB: undefined}] : [{fooA: undefined, fooB: 2}]);
	const firstTemplateValue = templateResult[0]!.fooA;
	const templateValue: typeof firstTemplateValue = undefined;
	void templateValue;

	type NumericTemplateKey = `${number}px`;
	type NumericTemplateItem = Record<NumericTemplateKey, number | undefined>;
	let numericTemplateKey: NumericTemplateKey = Math.random() > 0.5 ? '1px' : '2px';
	const numericTemplateItems: NumericTemplateItem[] = [
		{'1px': 1, '2px': undefined},
		{'1px': undefined, '2px': 2},
	];
	const numericTemplateResult = numericTemplateItems.filter(isPropertyDefined(numericTemplateKey));
	assert.deepEqual(numericTemplateResult, numericTemplateKey === '1px' ? [{'1px': 1, '2px': undefined}] : [{'1px': undefined, '2px': 2}]);
	const firstNumericTemplateValue = numericTemplateResult[0]!['1px'];
	const numericTemplateValue: typeof firstNumericTemplateValue = undefined;
	void numericTemplateValue;

	// Broad object types do not collapse to never
	const broadObjects: object[] = [];
	broadObjects.push({value: 1}, {});
	const broadResult = broadObjects.filter(isPropertyDefined('value'));
	assert.deepEqual(broadResult, [{value: 1}]);
	const firstBroadValue = broadResult[0]!.value;
	const broadValue: typeof firstBroadValue = 1;
	void broadValue;

	// Primitive unions can be filtered
	const primitiveMixedValues: Array<{value?: number} | string> = [{value: 1}, 'x', {}];
	const primitiveMixedResult = primitiveMixedValues.filter(isPropertyDefined('value'));
	assert.deepEqual(primitiveMixedResult, [{value: 1}]);
	expectTypeOf(primitiveMixedResult[0]!.value).toEqualTypeOf<number>();

	// Unknown values can be filtered without collapsing to never
	const unknownValues: unknown[] = [{value: 1}, {value: null}, 'x', 1, {}];
	const unknownResult = unknownValues.filter(isPropertyDefined('value'));
	assert.deepEqual(unknownResult, [{value: 1}, {value: null}]);
	const firstUnknownValue = unknownResult[0]!.value;
	const unknownValue: typeof firstUnknownValue = 1;
	void unknownValue;

	// Undeclared own keys still narrow to an accessible property
	type ExpandoItem = {
		name: string;
	};

	const expandoItems: ExpandoItem[] = [
		Object.assign({name: 'a'}, {value: 1}),
		{name: 'b'},
	];
	const expandoResult = expandoItems.filter(isPropertyDefined('value'));
	assert.deepEqual(expandoResult, [Object.assign({name: 'a'}, {value: 1})]);
	const expandoItem: typeof expandoResult[0] = Object.assign({name: 'a'}, {value: 1});
	void expandoItem;

	// Array string indices do not collapse to never
	const arrayItems: string[][] = [['a'], []];
	const arrayResult = arrayItems.filter(isPropertyDefined('0'));
	assert.deepEqual(arrayResult, [['a']]);
	const firstArrayValue = arrayResult[0]!['0'];
	void firstArrayValue;

	// Symbol keys work with own-property checks
	const symbolKey = Symbol('value');
	const checkSymbol = isPropertyDefined(symbolKey);
	assert.equal(checkSymbol({[symbolKey]: 1}), true);
	assert.equal(checkSymbol({[symbolKey]: undefined}), false);
	assert.equal(checkSymbol({}), false);
	assert.equal(checkSymbol(Object.create({[symbolKey]: 1})), false);
	const symbolValues: Array<{[symbolKey]?: number} | {other: string}> = [{[symbolKey]: 1}, {other: 'x'}, {}];
	const symbolResult = symbolValues.filter(isPropertyDefined(symbolKey));
	assert.deepEqual(symbolResult, [{[symbolKey]: 1}]);
	expectTypeOf(symbolResult[0]![symbolKey]).toEqualTypeOf<number>();

	// Function objects can be filtered
	type FunctionWithOptionalValue = (() => void) & {value?: number};
	const functionWithValue: FunctionWithOptionalValue = Object.assign(() => {}, {value: 1});
	const functionWithoutValue: FunctionWithOptionalValue = () => {};
	const functionResult = [functionWithValue, functionWithoutValue].filter(isPropertyDefined('value'));
	assert.deepEqual(functionResult, [functionWithValue]);
	expectTypeOf(functionResult[0]!.value).toEqualTypeOf<number>();

	// Numeric keys work with own-property checks
	const checkNumeric = isPropertyDefined(0);
	assert.equal(checkNumeric({0: 'zero'}), true);
	assert.equal(checkNumeric({0: undefined}), false);
	assert.equal(checkNumeric(Object.create({0: 'zero'})), false);
	const numericValues: Array<{0?: string} | {1: number}> = [{0: 'zero'}, {1: 1}, {}];
	const numericResult = numericValues.filter(isPropertyDefined(0));
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
	assert.equal(isPropertyDefined('value')(ownAccessorObject), false);

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
	assert.equal(isPropertyDefined('value')(ownStatefulAccessorObject), false);

	// Own accessors returning undefined are rejected
	const ownUndefinedAccessorObject = {};
	Object.defineProperty(ownUndefinedAccessorObject, 'value', {
		get() {
			return undefined;
		},
		enumerable: true,
	});
	assert.equal(isPropertyDefined('value')(ownUndefinedAccessorObject), false);

	// Union keys only narrow the checked key
	type ItemWithMultipleKeys = {
		a?: string;
		b?: number;
	};

	const unionKey = Math.random() > 0.5 ? 'a' as const : 'b' as const;
	const multipleKeys: ItemWithMultipleKeys[] = [{a: 'x', b: 1}, {a: 'y'}, {b: 2}, {}];
	const withUnionKey = multipleKeys.filter(isPropertyDefined(unionKey));
	expectTypeOf(withUnionKey[0]!.a).toEqualTypeOf<string | undefined>();
	expectTypeOf(withUnionKey[0]!.b).toEqualTypeOf<number | undefined>();

	// Heterogeneous unions keep omitted members available via own-property expandos
	type HeterogeneousItem = {kind: 'a'} | {kind: 'b'; value: number | undefined};

	const heterogeneousItems: HeterogeneousItem[] = [{kind: 'a'}, {kind: 'b', value: 1}, {kind: 'b', value: undefined}];
	const withValue = heterogeneousItems.filter(isPropertyDefined('value'));
	assert.deepEqual(withValue, [{kind: 'b', value: 1}]);
	expectTypeOf(withValue[0]!.kind).toEqualTypeOf<'a' | 'b'>();
	const declaredHeterogeneousItem: typeof withValue[0] = {kind: 'b', value: 1};
	void declaredHeterogeneousItem;
	const expandoHeterogeneousItem: typeof withValue[0] = Object.assign({kind: 'a' as const}, {value: 1});
	void expandoHeterogeneousItem;

	// Inherited properties are ignored to match the narrowing
	const inheritedValueItem: HeterogeneousItem = Object.assign(Object.create({value: 1}) as {kind: 'a'}, {kind: 'a' as const});
	const ownValueItem: HeterogeneousItem = {kind: 'b', value: 1};
	const withoutInheritedValue = [inheritedValueItem, ownValueItem].filter(isPropertyDefined('value'));
	assert.deepEqual(withoutInheritedValue, [ownValueItem]);

	// Inherited getters are ignored without being executed
	const inheritedThrowingGetterItem = Object.assign(Object.create({
		get value() {
			throw new Error('Getter should not run');
		},
	}) as {kind: 'a'}, {kind: 'a' as const});
	assert.doesNotThrow(() => {
		assert.equal(isPropertyDefined('value')(inheritedThrowingGetterItem), false);
	});

	// Object/array property
	type ItemNested = {
		children: string[] | undefined;
	};

	const nested: ItemNested[] = [{children: ['a']}, {children: undefined}];
	const withChildren = nested.filter(isPropertyDefined('children'));
	assert.deepEqual(withChildren, [{children: ['a']}]);
	expectTypeOf(withChildren[0]!.children).toEqualTypeOf<string[]>();

	// Reusing the same predicate across different arrays
	const predicate = isPropertyDefined('value');
	assert.deepEqual([{value: 1}, {value: undefined}].filter(predicate), [{value: 1}]);
	assert.deepEqual([{value: 'x'}, {value: undefined}].filter(predicate), [{value: 'x'}]);

	// Works as a standalone type guard
	const item: Item = {name: 'test', value: undefined};
	if (isPropertyDefined('value')(item)) {
		expectTypeOf(item.value).toEqualTypeOf<number>();
	}

	// Primitive values are rejected
	assert.equal(check(null as unknown), false);
	assert.equal(check(undefined as unknown), false);
	assert.equal(check(42 as unknown), false);
	assert.equal(check('hello' as unknown), false);
	assert.equal(check(true as unknown), false);
	assert.equal(check(Symbol('x') as unknown), false);

	// NaN and -0 are defined
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

	// Sparse array holes are not defined
	// eslint-disable-next-line no-sparse-arrays
	assert.equal(isPropertyDefined('1')([1, , 3]), false);
	// eslint-disable-next-line no-sparse-arrays
	assert.equal(isPropertyDefined('0')([1, , 3]), true);

	// Null-prototype objects with undefined values
	const nullProtoUndefined = Object.create(null) as Record<string, unknown>;
	nullProtoUndefined['value'] = undefined;
	assert.equal(check(nullProtoUndefined), false);

	// Frozen objects
	assert.equal(check(Object.freeze({value: 1})), true);
	assert.equal(check(Object.freeze({value: undefined})), false);

	// Empty string as property key
	assert.equal(isPropertyDefined('')({['']: 1}), true);
	assert.equal(isPropertyDefined('')({['']: undefined}), false);
	assert.equal(isPropertyDefined('')({}), false);

	// Prototype-sensitive keys
	assert.equal(isPropertyDefined('__proto__')({__proto__: Object.prototype}), false); // __proto__ is not an own property
	assert.equal(isPropertyDefined('__proto__')({['__proto__']: 'custom'}), true);
	assert.equal(isPropertyDefined('constructor')({}), false); // inherited
	assert.equal(isPropertyDefined('constructor')({constructor: 'own'}), true);
	assert.equal(isPropertyDefined('toString')({}), false); // inherited
	assert.equal(isPropertyDefined('toString')({toString: () => 'own'}), true);
});
