/* eslint-disable @typescript-eslint/no-restricted-types -- We intentionally use `object` to accept interfaces. */
import type {Exact, IsUnion, WritableKeysOf} from 'type-fest';

/*
Source keys that would set a required target property to `undefined`: writable target keys whose source value admits `undefined` while the target property does not. `UpdatableShape` maps these to `never` so the update is rejected, just as TypeScript forbids assigning `undefined` to a required property.
*/
type UnsafeUndefinedKeys<Target extends object, Source extends object> = {
	[Key in keyof Source]-?: Key extends WritableKeysOf<Target>
		? undefined extends Source[Key]
			? undefined extends Target[Key]
				? never
				: Key
			: never
		: never;
}[keyof Source];

/*
The shape a source may have: only the writable properties of the target, each typed as the target's own value type. `readonly` properties map to `never` so the compiler rejects updating them, just as it rejects a direct `target.id = …` assignment. Union targets are rejected outright; narrow to a specific variant first.
*/
type UpdatableShape<Target extends object, Source extends object> = IsUnion<Target> extends true ? never : {
	[Key in keyof Source]: Key extends WritableKeysOf<Target> ? Target[Key] : never;
} & Record<UnsafeUndefinedKeys<Target, Source>, never>;

type KnownKeySource<Source extends object> = keyof Source extends never ? never : Source;

/**
Apply a type-checked partial update to an object in place.

This is useful since `Object.assign()` accepts any source and silently allows typos and type mismatches. This constrains the source to a partial of the target, so the compiler rejects a property that does not exist on the target — even when the source is a pre-typed variable rather than an object literal — one with an incompatible type, and a `readonly` property. The target is mutated and returned.

Unlike `objectAssign`, this cannot add new properties or change their types — it only updates existing writable ones — which is what makes it safe for applying partial updates.

Union-typed targets are intentionally unsupported. Narrow to a specific union variant before updating it.

The source type must expose at least one known key. Broad `object`/`{}` sources and empty no-op updates are unsupported because their keys and values cannot be checked.

@example
```
import {objectUpdate} from 'ts-extras';

const user = {name: 'Sindre', age: 41};

objectUpdate(user, {age: 42}); // => {name: string; age: number}

// @ts-expect-error - 'email' does not exist on the target
objectUpdate(user, {email: 'sindre@example.com'});

// @ts-expect-error - 'age' must be a number
objectUpdate(user, {age: '42'});
```

@category General
*/
export function objectUpdate<Target extends object, Source extends object>(
	target: Target,
	source: KnownKeySource<Source> & Exact<UpdatableShape<Target, Source>, Source>,
): Target {
	return Object.assign(target, source);
}
