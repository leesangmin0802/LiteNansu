import { generators } from './rng.ts';
import type { Random } from './rng.ts';
import { quality } from './quality.ts';

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
function measure(rng: Random, mode: string, count: number) {
  let checksum = 0;
  const start = performance.now();
  if (mode === 'uint32') for (let i = 0; i < count; i++) checksum += rng.nextUint32();
  if (mode === 'float') for (let i = 0; i < count; i++) checksum += rng.random();
  if (mode === 'int100') for (let i = 0; i < count; i++) checksum += rng.int(100);
  return { ms: Math.max(0.001, performance.now() - start), checksum };
}

self.onmessage = event => {
  try {
    const { seed, samples, count, rounds } = event.data;
    for (const [value, minimum, maximum] of [[seed, 0, 0xffffffff], [samples, 1000, 10000000], [count, 100000, 10000000], [rounds, 3, 15]]) {
      if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error('실험 설정 범위를 확인하세요.');
    }
    const entries = Object.entries(generators);
    const benchmark: Record<string, Record<string, unknown>> = {};
    const diagnostics: Record<string, unknown[]> = {};
    const total = 6 * rounds + 6; // six warmups, timed runs; quality is shown separately
    let done = 0;
    const progress = (text: string) => self.postMessage({ type: 'progress', value: done / total * 60, text });
    for (const mode of ['uint32', 'float', 'int100']) {
      const timings: Record<string, number[]> = {}, checksums: Record<string, number> = {};
      for (const [name, Make] of entries) {
        progress(`${name} · ${mode} 예열 중`);
        measure(new Make(seed), mode, 500000);
        timings[name] = []; done++;
      }
      for (let round = 0; round < rounds; round++) {
        for (const [name, Make] of round % 2 ? [...entries].reverse() : entries) {
          const value = measure(new Make(seed), mode, count);
          timings[name].push(value.ms); checksums[name] = value.checksum;
          done++; progress(`${name} · ${mode} 속도 측정 ${round + 1}/${rounds}`);
        }
      }
      for (const [name] of entries) {
        benchmark[name] ??= {};
        const medianMs = median(timings[name]);
        benchmark[name][mode] = { medianMs, millionPerSecond: count / medianMs / 1000, roundsMs: timings[name], checksum: checksums[name] };
      }
    }
    for (let k = 0; k < entries.length; k++) {
      const [name, Make] = entries[k];
      self.postMessage({ type: 'progress', value: 60 + k * 20, text: `${name} · 난수 생성 및 품질 검사 중` });
      const result = quality(new Make(seed), samples, (generated, bins, preview) => {
        self.postMessage({ type: 'preview', name, generated, bins, preview,
          value: 60 + k * 20 + generated / samples * 16,
          text: `${name} · ${generated.toLocaleString()} / ${samples.toLocaleString()}개 생성` });
      });
      diagnostics[name] = [{ seed, ...result }];
      self.postMessage({ type: 'preview', name, generated: samples, bins: result.highByte.bins, preview: result.preview,
        value: 80 + k * 20, text: `${name} · 품질 검사 완료` });
    }
    self.postMessage({ type: 'complete', report: {
      createdAt: new Date().toISOString(), runtime: '브라우저 실험', platform: navigator.userAgent,
      architecture: '', config: { samplesPerSeed: samples, count, rounds, seeds: [seed] },
      benchmark, diagnostics, note: '초기 품질 진단. 주기·독립 스트림 보장이나 전문 통계 검사를 대체하지 않습니다.',
    } });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
