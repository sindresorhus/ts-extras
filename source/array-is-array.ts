// Each member is judged on its own. An array member, readonly or not, is kept as it is. A non-primitive member can hold an array with extra properties or a specific length, so it is narrowed to the array part of it. Primitive members are dropped. `unknown` becomes `unknown[]`, since `unknown & unknown[]` is `unknown[]`.
type ArrayMembers<T> = T extends readonly unknown[]
	? T
	: T extends string | number | bigint | boolean | symbol | null | undefined
		? never
		: T & unknown[];

/**
A strongly-typed version of `Array.isArray()`.

The builtin narrows `unknown` and `readonly` arrays to `any[]`, and keeps a `readonly` array in the `false` branch. This keeps the existing array type and narrows `unknown` to `unknown[]`.

@example
```
import {arrayIsArray} from 'ts-extras';

declare const tags: string | readonly string[];

if (arrayIsArray(tags)) {
	tags;
	//=> readonly string[]
} else {
	tags;
	//=> string
}

const value: unknown = ['a'];
if (arrayIsArray(value)) {
	value;
	//=> unknown[]
}
```

@note `any` stays `any`.

@note With an unconstrained type parameter, such as `value: T | T[]`, the result is not assignable to `T[]`. Use `Array.isArray()` there, or constrain `T`.

@category Improved builtin
@category Type guard
*/
export const arrayIsArray = Array.isArray as <T>(value: T) => value is ArrayMembers<T>;
