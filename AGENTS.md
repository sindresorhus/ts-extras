# ts-extras

Essential utilities for TypeScript projects. Improved builtins, type guards, and assertions.

## Commands

```bash
npm test   # MUST pass before committing (xo + node tests + type tests + build)
```

## Structure

```text
source/<name>.ts → One exported function per file
source/index.ts  → Export (MUST add)
test/<name>.ts   → Runtime + type tests, one file per source file
readme.md        → One-line entry per export (lint enforces)
```

## Patterns

- Mirror the builtin at runtime. The types promise only what the builtin can deliver; when its own typing is unsound, return a conservative merged type instead.
- Doc comments: `/** */`, no `*` prefix, `@example` with `//=>` output, `@note` for caveats, `@category`. Every source file has a matching test file; pin exact result types with `expectTypeOf(…).toEqualTypeOf<…>()`, not just runtime values.
- Like type-fest, this package requires `exactOptionalPropertyTypes`. Disabling it is unsupported. The test tsconfig runs with it and with `noUncheckedIndexedAccess`: `{x?: T}` can only hold `undefined` when it declares `| undefined`, and an index-signature read adds `| undefined`. Check new expectations against it, not an ad-hoc invocation.
- `items.filter(guard('value'))` and `items.filter(item => guard('value')(item))` go through different signatures. Cover both for the main cases.
- Internal helpers live in `source/internal-types.ts` and `source/internal-proto.ts`. They are not exported.

## Boundaries

These cases cost complexity and performance for few users. Do not add handling for them. Document them as a limitation (`@note`) instead, and pin the chosen behavior with a test. See type-fest for the same philosophy.

- Key matching beyond TypeScript's own `keyof` rules: `0` and `'0'` are distinct, an enum member is not matched by its plain numeric value, and noncanonical numeric strings (`'00'`, `'1e3'`, `'1.0'`) name nothing a declared key holds. The existing read-side aliasing (`StringFormKey`, `CanonicalNumericString`) covers canonical spellings only. Do not add another matcher or spelling normalization.
- A source with no implicit index signature (interface, class instance) that shares no key takes the conservative path: it contributes nothing to the result type, though the runtime still copies it. The same gap as TypeScript's own `Object.assign()` intersection.
- Prototype members, internal slots (`Date`, `Map`, …), non-enumerable and symbol keys are invisible to `Object.entries()` and to the types.
- Once a tuple-ish shape stops looking like a tuple (numeric extra keys, sparse holes, far indices), fall back to the array result. Do not model holes precisely.
- `not()` on an `any`, `object`, or `{}` input has a `never` false branch. Documented; leave it.
- `describeValue()` must never throw and must stay bounded. Do not harden it further for hostile getters beyond what the tests pin.
