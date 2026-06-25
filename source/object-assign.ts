/* eslint-disable @typescript-eslint/no-restricted-types -- We intentionally use `object` to accept interfaces. */
import type {
	ObjectMerge,
	ReadonlyKeysOf,
	Simplify,
} from 'type-fest';

/*
Fold the sources onto the target left-to-right. Each step uses `ObjectMerge` so overlapping keys are unioned instead of intersected (which would turn conflicting types into `never`).
*/
type ReadonlyTargetKeys<Target extends object, Result extends object> =
	Extract<ReadonlyKeysOf<Target>, keyof Result>;

type PreserveReadonlyTargetKeys<Target extends object, Result extends object> =
	Result extends unknown
		? [ReadonlyTargetKeys<Target, Result>] extends [never]
			? Result
			: Simplify<
				Omit<Result, ReadonlyTargetKeys<Target, Result>>
				& Readonly<Pick<Result, ReadonlyTargetKeys<Target, Result>>>
			>
		: never;

type NonPlainSource =
	| Date
	| RegExp
	| Promise<unknown>
	| ReadonlyMap<unknown, unknown>
	| WeakMap<WeakKey, unknown>
	| ReadonlySet<unknown>
	| WeakSet<WeakKey>
	| readonly unknown[];

type SharedKeys<Target extends object, Source extends object> =
	| Extract<keyof Target, keyof Source>
	| Extract<keyof Source, keyof Target>;

type ConservativeSource<Target extends object, Source extends object> =
	Partial<Record<SharedKeys<Target, Source>, unknown>>;

type ObjectAssignSource = unknown;
type NoOpObjectAssignSource = null | undefined | boolean | number | bigint | symbol;
type RuntimeObjectAssignSource<Source> = Exclude<Source, NoOpObjectAssignSource>;

/*
Declared source keys are not guaranteed to be own enumerable runtime keys: pre-typed values may be class instances with prototype accessors/methods or non-enumerable properties. Source-only keys are therefore optional, while keys already present on the target are typed as target-or-source because they may or may not be overwritten. Readonly target keys are preserved later by `PreserveReadonlyTargetKeys`.
*/
type MaybeCopiedSource<Target extends object, Source extends object> = Simplify<{
	[Key in Extract<keyof Source, keyof Target>]: Target[Key] | Source[Key];
} & Partial<Omit<Source, keyof Target>>>;

type IsRecordSource<Source extends object> =
	false extends (Source extends unknown ? Source extends Record<PropertyKey, unknown> ? true : false : never)
		? false
		: true;

type MergeKnownSource<Target extends object, Source extends object> =
	ObjectMerge<Target, Source> extends infer Result extends object
		? PreserveReadonlyTargetKeys<Target, Result>
		: object;

type ObjectAssignMerge<Target extends object, Source extends object> =
	[Source] extends [NonPlainSource]
		? MergeKnownSource<Target, ConservativeSource<Target, Source>>
		: IsRecordSource<Source> extends true
			? MergeKnownSource<Target, MaybeCopiedSource<Target, Source>>
			: MergeKnownSource<Target, ConservativeSource<Target, Source>>;

type ObjectAssignSourceResult<Target extends object, Source extends ObjectAssignSource> = RuntimeObjectAssignSource<Source> extends infer RuntimeSource
	? [RuntimeSource] extends [never]
		? Target
		: [keyof RuntimeSource] extends [never]
			? object
			: [RuntimeSource] extends [object]
				? ObjectAssignMerge<Target, RuntimeSource>
				: object
	: Target;

type ObjectAssignResult<Target extends object, Sources extends readonly ObjectAssignSource[]> =
	Sources extends readonly []
		? Target
		: Sources extends readonly [infer First extends ObjectAssignSource, ...infer Rest extends readonly ObjectAssignSource[]]
			? ObjectAssignResult<ObjectAssignSourceResult<Target, First>, Rest>
			: Sources extends ReadonlyArray<infer Source extends ObjectAssignSource>
				? ObjectAssignSourceResult<Target, Source>
				: Target;

type PlainObjectTarget<Target extends object> =
	Target extends (...arguments_: never[]) => unknown
		? never
		: Target extends abstract new (...arguments_: never[]) => unknown
			? never
			: Target;

/**
A strongly-typed version of `Object.assign()`.

This is useful since `Object.assign()` returns the intersection `Target & Source`, which is unsound: conflicting property types are intersected (for example, `{a: number} & {a: string}` makes `a` become `never`), and unsafe access through index signatures is not caught. This function returns a conservative merged type instead, where source-only keys are optional and overlapping keys include the target and source value types.

@example
```
import {objectAssign} from 'ts-extras';

const merged = objectAssign({a: 1}, {b: 2}); // => {a: number; b?: number}

const overridden = objectAssign({a: 1}, {a: 'x'}); // => {a: number | string}

const intersected = Object.assign({a: 1}, {a: 'x'}); // => {a: number} & {a: string}, so `a` is never
```

@category Improved builtin
*/
export function objectAssign<Target extends object, Sources extends readonly ObjectAssignSource[]>(
	target: PlainObjectTarget<Target>,
	...sources: Sources
): ObjectAssignResult<Target, Sources> {
	return Object.assign(target, ...sources) as ObjectAssignResult<Target, Sources>;
}
