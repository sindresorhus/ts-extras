import {type Writable} from 'type-fest';

/**
Cast the given value to be [`Writable`](https://github.com/sindresorhus/type-fest/blob/main/source/writable.d.ts).

This is useful because of a [TypeScript limitation](https://github.com/microsoft/TypeScript/issues/45618#issuecomment-908072756).

@example
```
import {asWritable} from 'ts-extras';

declare const context: {readonly user: {id: number}};

// `context.user` is readonly, so assigning to it is a compile error without the cast.
const writableContext = asWritable(context);
writableContext.user = {id: 2};
```

@note The result loses call signatures, construct signatures, and `#private` fields, so a function, a class, or an instance with a private field is no longer callable, constructable, or assignable to its original type.

@note Only top-level properties are made writable. For a union, only the keys that every member has become writable; the other keys keep their `readonly` modifier.

@category General
*/
export function asWritable<T>(value: T): Writable<T> {
	return value as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
}
