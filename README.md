# deepequal-x

Zero-dependency deep equality comparison for JavaScript. No fluff, no bloat — just a fast, thorough `deepEqual` that handles every JS type you actually care about.

## Why?

Most deep-equal libraries either skip edge cases (circular refs, Maps, typed arrays) or pull in 50KB of dependencies. `deepequal-x` handles all of it in a single file with zero deps.

## Install

```bash
npm install deepequal-x
```

## API

### `deepEqual(a, b, opts?)`
Deep strict equality. Returns `true`/`false`.

```js
import { deepEqual } from 'deepequal-x';

deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
deepEqual(new Date('2024-01-01'), new Date('2024-01-02')); // false
deepEqual(new Map([['k', 1]]), new Map([['k', 1]])); // true
```

**Options:**
- `mode: 'strict' | 'loose' | 'shallow'` (default: `'strict'`)
- `ignore: string[]` — keys to skip during comparison

```js
deepEqual({ id: 1, updated: 1234 }, { id: 1, updated: 5678 }, {
  ignore: ['updated'] // true — ignores the 'updated' key
});
```

### `strictEqual(a, b, opts?)`
Alias for `deepEqual` with `mode: 'strict'`. Type matters — `1 !== '1'`.

### `looseEqual(a, b, opts?)`
Loose mode — coerces primitives like `==`. `null == undefined`, `1 == '1'`.

```js
looseEqual(null, undefined); // true
looseEqual(1, '1'); // true
```

### `shallowEqual(a, b, opts?)`
One-level comparison — compares values with `===` without recursing.

```js
shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
shallowEqual({ a: { x: 1 } }, { a: { x: 1 } }); // false — different refs
```

### `diff(a, b, opts?)`
Returns an array of differences with paths.

```js
import { diff } from 'deepequal-x';

diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } });
// [{ path: '.b.c', a: 2, b: 3 }]
```

## Supported Types

| Type | Handled |
|------|---------|
| Primitives (number, string, boolean, bigint) | ✅ |
| null / undefined | ✅ |
| NaN | ✅ |
| Symbol (by reference) | ✅ |
| Plain objects | ✅ |
| Arrays (including sparse) | ✅ |
| Map (including object keys) | ✅ |
| Set (including object members) | ✅ |
| Date (including Invalid Date) | ✅ |
| RegExp (source + flags) | ✅ |
| ArrayBuffer | ✅ |
| Typed arrays (Uint8Array, Float64Array, etc.) | ✅ |
| Error (name + message + cause) | ✅ |
| Circular references | ✅ |
| Functions (by reference) | ✅ |

## CLI

```bash
# Compare two JSON values
deepequal '{"a":1}' '{"a":1}'

# Show differences
deepequal '{"a":1}' '{"a":2}' --diff

# Compare with loose mode
deepequal '{"a":1}' '{"a":"1"}' --mode loose

# Ignore keys
deepequal '{"id":1,"ts":123}' '{"id":1,"ts":456}' --ignore ts

# JSON output
deepequal '{"a":1}' '{"a":2}' --json
```

## License

MIT
