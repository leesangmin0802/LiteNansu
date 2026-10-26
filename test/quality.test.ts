import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiteNansu, MT19937 } from '../src/rng.ts';
import { quality } from '../src/quality.ts';

test('quality counts every sample, preserves generated preview, reports progress', () => {
  for (const Make of [LiteNansu, MT19937]) {
    const samples = 65537;
    const updates: number[] = [];
    const result = quality(new Make(0), samples, done => updates.push(done));
    assert.deepEqual(updates, [65536]);
    for (const bins of [result.highByte.bins, result.lowByte.bins, result.dice.bins])
      assert.equal(bins.reduce((sum, value) => sum + value, 0), samples);
    const reference = new Make(0);
    assert.equal(result.preview.length, 2048);
    for (const value of result.preview) assert.equal(value, reference.random());
    assert.equal(result.bitZScores.length, 32);
    for (const correlation of result.correlations) assert.ok(Number.isFinite(correlation.value));
    assert.ok(result.mean > 0 && result.mean < 1);
    assert.ok(result.monteCarloPi > 0 && result.monteCarloPi < 4);
  }
});
