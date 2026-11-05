import type {IsAny} from 'type-fest';

// `void` is not listed: a callback typed `() => void` can return a truthy value.
type Falsy = false | 0 | 0n | '' | null | undefined;

// `unknown` is spelled out as every type that has a truthy value. `Exclude<unknown, Falsy>` is `unknown`, and a predicate whose type equals its input narrows the false branch to `never`, while a broad `{}` makes TypeScript narrow the false branch of `unknown` to `null | undefined`, which drops `0`, `''`, and `false`. `any` stays `any`, so a value from `JSON.parse()` stays usable.
type Truthy<T> = IsAny<T> extends true
	? T
	: unknown extends T
		? string | number | bigint | true | symbol | object
		: Exclude<T, Falsy>;

/**
Check whether a value is truthy. Use it as a type guard in `.filter()`.

Unlike `.filter(Boolean)`, this removes the falsy types from the result. In an `if`/`else`, use `if (value)` instead, since the `else` branch of this guard can be wrong.

@example
```
import {isTruthy} from 'ts-extras';

const values = ['a', '', null, 'b', undefined];

const truthy = values.filter(isTruthy);
//=> ['a', 'b']
//   ^? string[]
```

@note The `else` branch drops `string`, `number`, `bigint`, `{}`, and `void`, though their falsy values (`''`, `0`, `NaN`, `0n`, and `undefined`) take it. `unknown` stays `unknown` there. Inverting the guard has the same problem, so to keep the falsy values, filter with `value => !value`.

@category Type guard
*/
// This must stay a single generic signature. An overloaded predicate passed directly to `.filter()` is inferred from its last signature, so `values.filter(isTruthy)` would stop narrowing, and that is the main use. The `else` branch for wide primitives is documented instead.
export function isTruthy<T>(value: T): value is T & Truthy<T> {
	return Boolean(value);
}
