/**
Cast a value to the given type safely.

This is useful since the `as` keyword allows you to convert between two unrelated types, which is type-unsafe. For example, converting a number to a string type.

However, this function only allows you to cast a given value to a type that is compatible with it, avoiding the potential risk of using "as" and not breaking the type safety of your code.

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
