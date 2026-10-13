// `unknown` spelled out as every primitive plus `object`, minus the guarded type.
type Spelled<Type> = Exclude<string | number | bigint | boolean | symbol | object | null | undefined, Type>;

// `Exclude` per member, except that `unknown` is first spelled out. A predicate whose type equals its input narrows the false branch to `never`, and `Exclude<unknown, Type>` is `unknown`, so without this the false branch of `not(isString)(value: unknown)` would be `never`. Spelled out, `Exclude` can remove the guarded type, so the true branch is precise and the false branch keeps a usable type. `any` absorbs the intersection and stays `any`, as in v1.3.0, so `json.items.filter(not(isNullish))` keeps its items usable. TypeScript makes the true branch equal to the predicate type, so a spelled-out type there breaks that code, and the cost of `any` is a false branch typed `never`. Keeping this a single distributive conditional over `Value` lets a generic input narrow by its constraint, so `not(isString)(value: V)` with `V extends string | number` reads as a number.
type Negated<Value, Type> = Value extends Type
	? never
	: unknown extends Value
		? Value & Spelled<Type>
		: Value;

/**
Invert a type predicate function.

This utility negates a type guard and uses TypeScript's `Exclude` utility type to narrow unions.

@example
```
import {not} from 'ts-extras';

const isNullish = (value: unknown): value is null | undefined => value == null;

const isNotNullish = not(isNullish);

const values = [1, null, 2, undefined, 3];
const defined = values.filter(isNotNullish);
//=> [1, 2, 3]
// with type number[]

// Works with any type guard
const isString = (value: unknown): value is string => typeof value === 'string';

const isNotString = not(isString);

declare const mixedValue: string | number | boolean;
if (isNotString(mixedValue)) {
	mixedValue;
	//=> number | boolean
}
```

@note The original guard must accept `unknown` and correctly describe both its true and false branches. A guard that checks only a subset of its declared type, such as checking only positive numbers while claiming `number`, cannot be faithfully inverted. Property guards also check ownership and data descriptors, which their property types cannot describe, so they cannot be faithfully inverted as predicates. Negate their boolean result at the actual input instead. A guard whose broad overload returns boolean, such as `isInteger`, is rejected; invert its boolean result directly with `value => !isInteger(value)` instead.

@note The inverse removes every input member that the original guard's type matches. If a member only overlaps that type, such as `{a: string}` against a guard for `{a: string; b: number}`, the false branch can be narrower than the runtime. For the same reason, an `any`, `object`, or `{}` input has a false branch typed `never`.

@note Narrowing can also fail in nested branches, with mutated variables, or with complex unions. See:
- https://github.com/microsoft/TypeScript/issues/44901
- https://github.com/microsoft/TypeScript/issues/43589

@category Type guard
*/
// This must stay a single generic signature. An overloaded predicate passed directly to `.filter()` is inferred from its base signature, where `Value` is `unknown`, so `values.filter(not(isNullish))` would stop narrowing. That was the main documented use in v1.3.0, so do not add a boolean overload to protect edge-case false branches; document those instead.
export function not<Type>(predicate: (value: unknown) => value is Type): <Value>(value: Value) => value is Negated<Value, Type> {
	return <Value>(value: Value): value is Negated<Value, Type> => !predicate(value);
}
