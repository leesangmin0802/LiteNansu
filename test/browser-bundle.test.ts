import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { LiteNansu, MT19937 } from '../src/rng.ts';
import { quality } from '../src/quality.ts';

test('standalone HTML worker matches TypeScript diagnostics and validates input', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('__REPORT_DATA__') && !html.includes('__WORKER_SOURCE__'));
  const source = html.match(/<script id="worker-source" type="text\/plain">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source);
  const messages: { type: string; report?: any }[] = [];
  const self = { onmessage: null as any, postMessage: (message: any) => messages.push(message) };
  runInNewContext(source, { self, performance, navigator: { userAgent: 'test' } }, { timeout: 10000 });
  self.onmessage({ data: { seed: 0, samples: 1000, count: 100000, rounds: 3 } });
  const report = messages.find(message => message.type === 'complete')?.report;
  assert.ok(report, 'worker must complete successfully');
  for (const [name, Make] of [['litenansu', LiteNansu], ['mt19937', MT19937]] as const) {
    const actual = JSON.parse(JSON.stringify(report.diagnostics[name][0]));
    const { seed, ...stats } = actual;
    assert.equal(seed, 0);
    assert.deepEqual(stats, quality(new Make(0), 1000));
    assert.equal(report.benchmark[name].uint32.roundsMs.length, 3);
  }
  messages.length = 0;
  self.onmessage({ data: { seed: -1, samples: 1000, count: 100000, rounds: 3 } });
  assert.equal(messages[0].type, 'error');
});
