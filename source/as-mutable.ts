import {Mutable} from 'type-fest';

/**
Cast the given value to be [`Mutable`](https://github.com/sindresorhus/type-fest/blob/main/source/mutable.d.ts).

This is useful because of a TypeScript limitation: https://github.com/microsoft/TypeScript/issues/45618#issuecomment-908072756

@example
```
import {asMutable} from 'ts-extras';

const mutableContext = asMutable((await import('x')).context);
```

@category General
*/
export function asMutable<T>(value: T): Mutable<T> {
	return value as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
}
