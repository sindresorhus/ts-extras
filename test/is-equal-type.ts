import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import type {IsEqual} from 'type-fest';
import {isEqualType} from '../source/index.js';

test('isEqualType() - Type-level comparison', () => {
	// These should compile and return true/false types
	const result1 = isEqualType<string, string>();
	const result2 = isEqualType<number, number>();
	const result3 = isEqualType<boolean, boolean>();
	const result4 = isEqualType<{a: string}, {a: string}>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();
	expectTypeOf(result3).toEqualTypeOf<true>();
	expectTypeOf(result4).toEqualTypeOf<true>();

	// Runtime returns undefined (compile-time utility)
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
	assert.equal(result3 as any, undefined);
	assert.equal(result4 as any, undefined);

	// These should return false types for non-matching types
	const result5 = isEqualType<string, number>();
	const result6 = isEqualType<{a: string}, {a: number}>();

	expectTypeOf(result5).toEqualTypeOf<false>();
	expectTypeOf(result6).toEqualTypeOf<false>();

	// Runtime returns undefined (compile-time utility)
	assert.equal(result5 as any, undefined);
	assert.equal(result6 as any, undefined);
});

test('isEqualType() - Value-level comparison', () => {
	const string1 = 'hello';
	const string2 = 'world';
	const number1 = 42;
	const bool1 = true;

	// Same types should have true type
	const result1 = isEqualType(string1, string2);
	const result2 = isEqualType(number1, 123);
	const result3 = isEqualType(bool1, false);

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<true>();
	expectTypeOf(result3).toEqualTypeOf<true>();

	// Runtime returns undefined
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
	assert.equal(result3 as any, undefined);

	// Different types should have false type
	const result4 = isEqualType(string1, number1);
	const result5 = isEqualType(number1, bool1);

	expectTypeOf(result4).toEqualTypeOf<false>();
	expectTypeOf(result5).toEqualTypeOf<false>();

	// Runtime returns undefined
	assert.equal(result4 as any, undefined);
	assert.equal(result5 as any, undefined);
});

test('isEqualType() - Conditional type usage', () => {
	// Demonstrate using IsEqual in conditional types
	type StringNumberCheck = IsEqual<string, number> extends true ? 'same' : 'different';
	type StringStringCheck = IsEqual<string, string> extends true ? 'same' : 'different';

	expectTypeOf<StringNumberCheck>().toExtend<'different'>();
	expectTypeOf<StringStringCheck>().toExtend<'same'>();

	// The function itself can be used for compile-time checks
	const result1 = isEqualType<string, string>();
	const result2 = isEqualType<string, number>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<false>();

	// Runtime returns undefined
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
});

test('isEqualType() - Complex types', () => {
	// Test with complex object types
	type User = {name: string; age: number};
	type UserCopy = {name: string; age: number};
	type UserWithId = {name: string; age: number; id: string};

	const result1 = isEqualType<User, UserCopy>();
	const result2 = isEqualType<User, UserWithId>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<false>();

	// Runtime returns undefined
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
});

test('isEqualType() - Tuple types', () => {
	type Tuple1 = [string, number];
	type Tuple2 = [string, number];
	type Tuple3 = [number, string];

	const result1 = isEqualType<Tuple1, Tuple2>();
	const result2 = isEqualType<Tuple1, Tuple3>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<false>();

	// Runtime returns undefined
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
});

test('isEqualType() - Literal types', () => {
	const result1 = isEqualType<'hello', 'hello'>();
	const result2 = isEqualType<'hello', 'world'>();

	expectTypeOf(result1).toEqualTypeOf<true>();
	expectTypeOf(result2).toEqualTypeOf<false>();

	// Runtime returns undefined
	assert.equal(result1 as any, undefined);
	assert.equal(result2 as any, undefined);
});
