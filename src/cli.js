#!/usr/bin/env node
import { deepEqual, diff, strictEqual, looseEqual, shallowEqual } from './index.js';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    mode: { short: 'm', default: 'strict' },
    ignore: { short: 'i', default: '' },
    json: { short: 'j', default: false },
    diff: { short: 'd', default: false },
    help: { short: 'h', default: false },
  },
  allowPositionals: true,
});

function usage() {
  console.log(`deepequal-x — deep equality comparison

Usage:
  deepequal <a> <b>                  Compare two JSON values
  deepequal --file <a.json> <b.json> Compare two JSON files
  deepequal --diff <a> <b>           Show differences

Options:
  -m, --mode <mode>    strict | loose | shallow (default: strict)
  -i, --ignore <keys>  Comma-separated keys to ignore
  -j, --json           Output JSON
  -d, --diff           Show differences instead of just true/false
  -h, --help           Show this help

Examples:
  deepequal '{"a":1}' '{"a":1}'
  deepequal --file a.json b.json --diff
  deepequal '{"a":1}' '{"a":2}' --mode loose --json`);
}

if (values.help || positionals.length === 0) { usage(); process.exit(0); }

const ignore = values.ignore ? values.ignore.split(',').map(s => s.trim()) : [];

function parseVal(v) {
  try { return JSON.parse(v); } catch { return v; }
}

const a = parseVal(positionals[0]);
const b = parseVal(positionals[1]);

if (values.diff) {
  const diffs = diff(a, b, { ignore });
  if (values.json) {
    console.log(JSON.stringify(diffs, null, 2));
  } else if (diffs.length === 0) {
    console.log('✓ No differences');
  } else {
    for (const d of diffs) {
      console.log(`  ${d.path}: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`);
    }
  }
  process.exit(diffs.length > 0 ? 1 : 0);
}

const opts = { mode: values.mode, ignore };
const result = deepEqual(a, b, opts);

if (values.json) {
  console.log(JSON.stringify({ equal: result, mode: values.mode }));
} else {
  console.log(result ? '✓ equal' : '✗ not equal');
}
process.exit(result ? 0 : 1);
