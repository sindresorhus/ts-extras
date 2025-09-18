import test from 'ava';
import {expectTypeOf} from 'expect-type';
import type {IsEqual} from 'type-fest';
import {isEqualType} from '../source/index.js';

test('isEqualType() - Type-level comparison', t => {
	// These should compile and return true for matching types
	const result1 = isEqualType<string, string>();
	const result2 = isEqualType<number, number>();
	const result3 = isEqualType<boolean, boolean>();
	const result4 = isEqualType<{a: string}, {a: string}>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();
	expectTypeOf(result3).toEqualTypeOf<true>();
	expectTypeOf(result4).toEqualTypeOf<true>();

	t.is(result1, true);
	t.is(result2, true);
	t.is(result3, true);
	t.is(result4, true);

	// These should return false for non-matching types
	const result5 = isEqualType<string, number>();
	const result6 = isEqualType<{a: string}, {a: number}>();

	expectTypeOf(result5).toEqualTypeOf<false>();
	expectTypeOf(result6).toEqualTypeOf<false>();

	// At runtime, this compile-time utility always returns true
	t.true(Boolean(result5));
	t.true(Boolean(result6));
});

test('isEqualType() - Value-level comparison', t => {
	const str1 = 'hello';
	const str2 = 'world';
	const num1 = 42;
	const bool1 = true;

	// Same types should return true
	const result1 = isEqualType(str1, str2);
	const result2 = isEqualType(num1, 123);
	const result3 = isEqualType(bool1, false);

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();
	expectTypeOf(result3).toEqualTypeOf<true>();

	t.is(result1, true);
	t.is(result2, true);
	t.is(result3, true);

	// Different types should return false
	const result4 = isEqualType(str1, num1);
	const result5 = isEqualType(num1, bool1);

	expectTypeOf(result4).toEqualTypeOf<false>();
	expectTypeOf(result5).toEqualTypeOf<false>();

	// At runtime, this compile-time utility always returns true
	t.true(Boolean(result4));
	t.true(Boolean(result5));
});

test('isEqualType() - Conditional type usage', t => {
	// Demonstrate using IsEqual in conditional types
	type StringNumberCheck = IsEqual<string, number> extends true ? 'same' : 'different';
	type StringStringCheck = IsEqual<string, string> extends true ? 'same' : 'different';

	expectTypeOf<StringNumberCheck>().toMatchTypeOf<'different'>();
	expectTypeOf<StringStringCheck>().toMatchTypeOf<'same'>();

	// The function itself can be used for compile-time checks
	const result1 = isEqualType<string, number>();
	const result2 = isEqualType<string, string>();

	expectTypeOf(result1).toEqualTypeOf<false>();
	expectTypeOf(result2).toEqualTypeOf<true>();

	// At runtime, this compile-time utility always returns true
	t.true(Boolean(result1));
	t.true(Boolean(result2));
});

test('isEqualType() - Complex types', t => {
	type ComplexType1 = {
		name: string;
		age: number;
		active: boolean;
	};

	type ComplexType2 = {
		name: string;
		age: number;
		active: boolean;
	};

	type ComplexType3 = {
		name: string;
		age: string; // Different type
		active: boolean;
	};

	// Same complex types
	const result1 = isEqualType<ComplexType1, ComplexType2>();
	expectTypeOf(result1).toEqualTypeOf<true>();
	t.is(result1, true);

	// Different complex types should return false
	const result2 = isEqualType<ComplexType1, ComplexType3>();
	expectTypeOf(result2).toEqualTypeOf<false>();
	t.true(Boolean(result2));
});

test('isEqualType() - Tuple types', t => {
	const result1 = isEqualType<[string, number], [string, number]>();
	const result2 = isEqualType<readonly [string, number], readonly [string, number]>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();

	t.is(result1, true);
	t.is(result2, true);

	// Different tuples should return false
	const result3 = isEqualType<[string, number], [number, string]>();
	expectTypeOf(result3).toEqualTypeOf<false>();
	t.true(Boolean(result3));
});

test('isEqualType() - Literal types', t => {
	const result1 = isEqualType<'hello', 'hello'>();
	const result2 = isEqualType<42, 42>();
	const result3 = isEqualType<true, true>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();
	expectTypeOf(result3).toEqualTypeOf<true>();

	t.is(result1, true);
	t.is(result2, true);
	t.is(result3, true);

	// Different literals should return false
	const result4 = isEqualType<'hello', 'world'>();
	const result5 = isEqualType<42, 43>();

	expectTypeOf(result4).toEqualTypeOf<false>();
	expectTypeOf(result5).toEqualTypeOf<false>();

	t.true(Boolean(result4));
	t.true(Boolean(result5));
});