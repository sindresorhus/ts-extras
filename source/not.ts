/**
Invert a type predicate function.

This utility allows you to create the inverse of any type guard function, using TypeScript's `Exclude` utility type to properly narrow types.

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

@note TypeScript may fail to narrow types in nested branches, with mutated variables, or when using `Exclude` with complex union types. See:
- https://github.com/microsoft/TypeScript/issues/44901
- https://github.com/microsoft/TypeScript/issues/43589

@category Type guard
*/
export function not<T>(
	predicate: (value: unknown) => value is T,
): <Value>(value: Value) => value is Exclude<Value, T> {
	return <Value>(value: Value): value is Exclude<Value, T> => !predicate(value);
}
