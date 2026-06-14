import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deepEqual, strictEqual, looseEqual, shallowEqual, diff } from '../src/index.js';

describe('primitives', () => {
  test('numbers', () => { assert.ok(deepEqual(1, 1)); assert.ok(!deepEqual(1, 2)); });
  test('strings', () => { assert.ok(deepEqual('a', 'a')); assert.ok(!deepEqual('a', 'b')); });
  test('booleans', () => { assert.ok(deepEqual(true, true)); assert.ok(!deepEqual(true, false)); });
  test('bigint', () => { assert.ok(deepEqual(1n, 1n)); assert.ok(!deepEqual(1n, 2n)); });
  test('null/undefined', () => { assert.ok(deepEqual(null, null)); assert.ok(deepEqual(undefined, undefined)); assert.ok(!deepEqual(null, undefined)); });
  test('NaN', () => { assert.ok(deepEqual(NaN, NaN)); });
  test('symbols ref', () => { const s = Symbol('x'); assert.ok(deepEqual(s, s)); assert.ok(!deepEqual(Symbol('x'), Symbol('x'))); });
  test('Infinity', () => { assert.ok(deepEqual(Infinity, Infinity)); assert.ok(!deepEqual(Infinity, -Infinity)); });
});

describe('arrays', () => {
  test('simple', () => { assert.ok(deepEqual([1,2,3], [1,2,3])); assert.ok(!deepEqual([1,2,3], [1,2,4])); });
  test('nested', () => { assert.ok(deepEqual([[1,2],[3]], [[1,2],[3]])); assert.ok(!deepEqual([[1],[2,3]], [[1],[2,4]])); });
  test('different lengths', () => { assert.ok(!deepEqual([1], [1,2])); });
  test('mixed types', () => { assert.ok(deepEqual([1,'a',null], [1,'a',null])); });
  test('empty', () => { assert.ok(deepEqual([], [])); });
  test('sparse', () => { assert.ok(deepEqual([,],[,])); });
});

describe('plain objects', () => {
  test('simple', () => { assert.ok(deepEqual({a:1}, {a:1})); assert.ok(!deepEqual({a:1}, {a:2})); });
  test('nested', () => { assert.ok(deepEqual({a:{b:{c:1}}}, {a:{b:{c:1}}})); assert.ok(!deepEqual({a:{b:1}}, {a:{b:2}})); });
  test('key order irrelevant', () => { assert.ok(deepEqual({a:1,b:2}, {b:2,a:1})); });
  test('missing keys', () => { assert.ok(!deepEqual({a:1}, {a:1,b:2})); });
  test('symbol keys', () => { const s = Symbol('x'); assert.ok(deepEqual({[s]:1}, {[s]:1})); assert.ok(!deepEqual({[s]:1}, {[Symbol('x')]:1})); });
});

describe('Date', () => {
  test('same', () => { assert.ok(deepEqual(new Date('2024-01-01'), new Date('2024-01-01'))); });
  test('different', () => { assert.ok(!deepEqual(new Date('2024-01-01'), new Date('2024-01-02'))); });
  test('both invalid', () => { assert.ok(deepEqual(new Date('invalid'), new Date('also-bad'))); });
  test('one invalid', () => { assert.ok(!deepEqual(new Date('invalid'), new Date('2024-01-01'))); });
});

describe('RegExp', () => {
  test('same', () => { assert.ok(deepEqual(/abc/gi, /abc/gi)); });
  test('different flags', () => { assert.ok(!deepEqual(/abc/g, /abc/i)); });
  test('different source', () => { assert.ok(!deepEqual(/abc/, /abd/)); });
});

describe('Map', () => {
  test('simple', () => { assert.ok(deepEqual(new Map([['a',1]]), new Map([['a',1]]))); });
  test('different', () => { assert.ok(!deepEqual(new Map([['a',1]]), new Map([['a',2]]))); });
  test('size mismatch', () => { assert.ok(!deepEqual(new Map([['a',1]]), new Map([['a',1],['b',2]]))); });
  test('object values', () => { assert.ok(deepEqual(new Map([['k',{x:1}]]), new Map([['k',{x:1}]]))); });
  test('object keys', () => { assert.ok(deepEqual(new Map([[{k:1},'v']]), new Map([[{k:1},'v']]))); });
});

describe('Set', () => {
  test('simple', () => { assert.ok(deepEqual(new Set([1,2,3]), new Set([1,2,3]))); });
  test('order irrelevant', () => { assert.ok(deepEqual(new Set([1,2,3]), new Set([3,2,1]))); });
  test('different', () => { assert.ok(!deepEqual(new Set([1,2]), new Set([1,2,3]))); });
  test('object members', () => { assert.ok(deepEqual(new Set([{x:1}]), new Set([{x:1}]))); });
});

describe('typed arrays', () => {
  test('Uint8Array', () => { assert.ok(deepEqual(new Uint8Array([1,2,3]), new Uint8Array([1,2,3]))); assert.ok(!deepEqual(new Uint8Array([1,2,3]), new Uint8Array([1,2,4]))); });
  test('Int32Array', () => { assert.ok(deepEqual(new Int32Array([1,-2,3]), new Int32Array([1,-2,3]))); });
  test('Float64Array', () => { assert.ok(deepEqual(new Float64Array([1.5,2.5]), new Float64Array([1.5,2.5]))); });
  test('different types', () => { assert.ok(!deepEqual(new Uint8Array([1]), new Uint16Array([1]))); });
  test('ArrayBuffer', () => { assert.ok(deepEqual(new ArrayBuffer(3), new ArrayBuffer(3))); assert.ok(!deepEqual(new ArrayBuffer(3), new ArrayBuffer(4))); });
  test('byte-level', () => { const a = new ArrayBuffer(4); const b = new ArrayBuffer(4); new DataView(a).setUint32(0, 256); new DataView(b).setUint32(0, 256); assert.ok(deepEqual(a, b)); });
});

describe('Error', () => {
  test('same message', () => { assert.ok(deepEqual(new Error('x'), new Error('x'))); });
  test('different message', () => { assert.ok(!deepEqual(new Error('x'), new Error('y'))); });
  test('different name', () => { assert.ok(!deepEqual(new TypeError('x'), new Error('x'))); });
});

describe('circular references', () => {
  test('self-ref equal', () => {
    const a = { x: 1 }; a.self = a;
    const b = { x: 1 }; b.self = b;
    assert.ok(deepEqual(a, b));
  });
  test('self-ref not equal', () => {
    const a = { x: 1 }; a.self = a;
    const b = { x: 2 }; b.self = b;
    assert.ok(!deepEqual(a, b));
  });
  test('cross-ref', () => {
    const shared = { v: 1 };
    const a = { a: shared, b: shared };
    const b = { a: shared, b: shared };
    assert.ok(deepEqual(a, b));
  });
  test('mutual circular', () => {
    const a = {}; a.b = {}; a.b.a = a;
    const b = {}; b.b = {}; b.b.a = b;
    assert.ok(deepEqual(a, b));
  });
  test('circular array', () => {
    const a = [1]; a.push(a);
    const b = [1]; b.push(b);
    assert.ok(deepEqual(a, b));
  });
});

describe('modes', () => {
  test('loose null/undefined', () => { assert.ok(looseEqual(null, undefined)); assert.ok(looseEqual(undefined, null)); });
  test('strict null/undefined', () => { assert.ok(!strictEqual(null, undefined)); });
  test('loose number coercion', () => { assert.ok(looseEqual(1, '1')); });
  test('strict number', () => { assert.ok(!strictEqual(1, '1')); });
  test('shallow primitives', () => { assert.ok(shallowEqual({a:1}, {a:1})); assert.ok(!shallowEqual({a:1}, {a:2})); });
  test('shallow nested ref', () => {
    const obj = { b: 1 };
    assert.ok(shallowEqual({a: obj}, {a: obj}));
    assert.ok(!shallowEqual({a: {b:1}}, {a: {b:1}}));
  });
  test('shallow array', () => { assert.ok(shallowEqual([1,2], [1,2])); assert.ok(!shallowEqual([1,[2]], [1,[2]])); });
});

describe('ignore option', () => {
  test('ignore key', () => { assert.ok(deepEqual({a:1,b:2}, {a:1,b:3}, {ignore:['b']})); });
  test('ignore multiple', () => { assert.ok(deepEqual({a:1,b:2,c:3}, {a:1,b:9,c:8}, {ignore:['b','c']})); });
  test('ignore not needed', () => { assert.ok(deepEqual({a:1}, {a:1}, {ignore:['b']})); });
});

describe('diff()', () => {
  test('identical', () => { assert.deepEqual(diff({a:1}, {a:1}), []); });
  test('primitive diff', () => {
    const d = diff(1, 2);
    assert.equal(d.length, 1);
    assert.equal(d[0].path, '(root)');
  });
  test('nested diff', () => {
    const d = diff({a:{b:1}}, {a:{b:2}});
    assert.equal(d.length, 1);
    assert.ok(d[0].path.includes('b'));
  });
  test('array diff', () => {
    const d = diff([1,2,3], [1,5,3]);
    assert.equal(d.length, 1);
  });
  test('missing key', () => {
    const d = diff({a:1,b:2}, {a:1});
    assert.equal(d.length, 1);
  });
  test('extra key', () => {
    const d = diff({a:1}, {a:1,b:2});
    assert.equal(d.length, 1);
  });
  test('ignore in diff', () => {
    const d = diff({a:1,b:2}, {a:1,b:3}, {ignore:['b']});
    assert.equal(d.length, 0);
  });
  test('circular safe', () => {
    const a = {x:1}; a.s = a;
    const b = {x:2}; b.s = b;
    const d = diff(a, b);
    assert.ok(d.length > 0);
  });
});

describe('edge cases', () => {
  test('functions', () => { const f = () => {}; assert.ok(!deepEqual(f, () => {})); assert.ok(deepEqual(f, f)); });
  test('empty objects', () => { assert.ok(deepEqual({}, {})); });
  test('object vs array', () => { assert.ok(!deepEqual({}, [])); assert.ok(!deepEqual({0:'a',length:1}, ['a'])); });
  test('prototype not compared', () => {
    class A { constructor() { this.x = 1; } }
    class B { constructor() { this.x = 1; } }
    assert.ok(deepEqual(new A(), new B()));
  });
  test('nested mixed', () => {
    const a = { a: [1, { b: new Date(0) }], c: new Map([['k', [1,2]]]) };
    const b = { a: [1, { b: new Date(0) }], c: new Map([['k', [1,2]]]) };
    assert.ok(deepEqual(a, b));
  });
  test('deeply nested', () => {
    const a = { l1: { l2: { l3: { l4: { l5: 42 } } } } };
    const b = { l1: { l2: { l3: { l4: { l5: 42 } } } } };
    assert.ok(deepEqual(a, b));
  });
});
