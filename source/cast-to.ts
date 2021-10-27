/**
Cast anything to a type.

Typescript offers an `as` keyword, but it doesn't always work.

`castTo` will avoid all type checking.

@example
```
import {castTo} from 'ts-extras';

const curryAdd = (foo: number) => (bar: number): number => {
	return foo + bar
}

const add = castTo<(a: number, b:number) => number>(
	// @ts-ignore
	(...args) => curryAdd(args[0])(args[1])
)
//=> (a:number, b:number) => number

add(1,1) //=> 2
```
 */
export function castTo<T>(value: any): T {
	return value as T;
}
