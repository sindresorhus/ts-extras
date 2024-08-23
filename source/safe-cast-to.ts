/**
Cast a value to the given type safely.

The `as` keyword allows unsafe conversions between unrelated types, like converting a number to a string. This function restricts casting to compatible types, preserving type safety.

@example
```
type Foo = {
	a: string;
	b?: number;
};

declare const possibleUndefined: Foo | undefined;

const foo = possibleUndefined ?? safeCastTo<Partial<Foo>>({});
console.log(foo.a ?? '', foo.b ?? 0);

const bar = possibleUndefined ?? {};
// @ts-expect-error
console.log(bar.a ?? '', bar.b ?? 0);
//             ^^^ Property 'a' does not exist on type '{}'.(2339)
//                          ^^^ Property 'b' does not exist on type '{}'.(2339)
```

@category General
*/
export function safeCastTo<T>(value: T): T {
	return value;
}
