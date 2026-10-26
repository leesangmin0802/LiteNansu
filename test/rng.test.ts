import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiteNansu, MT19937, Random, generators } from '../src/rng.ts';

test('MT19937 reference seed 5489 vector', () => {
  const rng = new MT19937(5489);
  assert.deepEqual(Array.from({ length: 10 }, () => rng.nextUint32()), [
    3499211612, 581869302, 3890346734, 3586334585, 545404204,
    4161255391, 3922919429, 949333985, 2715962298, 1323567403,
  ]);
});

test('xoshiro128** known state vector', () => {
  const rng = LiteNansu.fromState([1, 2, 3, 4]);
  assert.deepEqual(Array.from({ length: 5 }, () => rng.nextUint32()),
    [11520, 0, 5927040, 70819200, 2031721883]);
});

test('saved state restores the sequence and does not alias internal memory', () => {
  const rng = new LiteNansu(12345);
  for (let i = 0; i < 100; i++) rng.nextUint32();
  const state = rng.getState(), restored = LiteNansu.fromState(state);
  state[0] = 0;
  for (let i = 0; i < 1000; i++) assert.equal(rng.nextUint32(), restored.nextUint32());
  assert.throws(() => LiteNansu.fromState([0, 0, 0, 0]));
});

test('seed reproducibility and uint32 range for edge seeds', () => {
  for (const Make of Object.values(generators)) {
    for (const seed of [0, 1, 0xffffffff]) {
      const a = new Make(seed), b = new Make(seed);
      for (let i = 0; i < 2000; i++) {
        const x = a.nextUint32();
        assert.equal(x, b.nextUint32());
        assert.ok(Number.isInteger(x) && x >= 0 && x < 0x100000000);
      }
    }
    for (const bad of [-1, 1.5, NaN, Infinity, 0x100000000]) assert.throws(() => new Make(bad));
  }
});

test('bounded sampling rejects the biased tail and handles boundary ranges', () => {
  class Scripted extends Random {
    calls = 0;
    nextUint32() { return [0xffffffff, 7][this.calls++]; }
  }
  const rng = new Scripted();
  assert.equal(rng.int(6), 1);
  assert.equal(rng.calls, 2);
  const full = new Scripted();
  assert.equal(full.int(0x100000000), 0xffffffff);
  assert.equal(new Scripted().int(1), 0);
  for (const bad of [0, -1, 1.5, NaN, Infinity, 0x100000001])
    assert.throws(() => new LiteNansu(1).int(bad));
});
