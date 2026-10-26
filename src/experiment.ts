import { mkdirSync, writeFileSync } from 'node:fs';
import { generators } from './rng.ts';
import type { Random } from './rng.ts';
import { quality } from './quality.ts';
import { buildDashboard } from './dashboard.ts';

function option(name: string, fallback: number, min: number): number {
  const index = process.argv.indexOf(`--${name}`);
  const value = index < 0 ? fallback : Number(process.argv[index + 1]);
  if (!Number.isSafeInteger(value) || value < min || value > 0xffffffff)
    throw new RangeError(`--${name} must be an integer in [${min}, 4294967295]`);
  return value;
}
const samples = option('samples', 1_000_000, 1000);
const count = option('count', 10_000_000, 1000);
const rounds = option('rounds', 11, 3);
const seed = option('seed', 12345, 0);
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const middle = Math.floor(a.length / 2);
  return a.length % 2 ? a[middle] : (a[middle - 1] + a[middle]) / 2;
};
type Mode = 'uint32' | 'float' | 'int100';
function run(rng: Random, mode: Mode, n: number) {
  let checksum = 0;
  const start = performance.now();
  // Each loop has a fixed call site; no per-output mode dispatch.
  if (mode === 'uint32') for (let i = 0; i < n; i++) checksum += rng.nextUint32();
  if (mode === 'float') for (let i = 0; i < n; i++) checksum += rng.random();
  if (mode === 'int100') for (let i = 0; i < n; i++) checksum += rng.int(100);
  return { ms: performance.now() - start, checksum };
}


const entries = Object.entries(generators);
const benchmark: Record<string, Record<string, unknown>> = {};
console.log('속도 측정 중…');
for (const mode of ['uint32', 'float', 'int100'] as Mode[]) {
  const timings: Record<string, number[]> = {};
  const checksums: Record<string, number[]> = {};
  for (const [name, Make] of entries) {
    timings[name] = []; checksums[name] = [];
    run(new Make(seed), mode, 1_000_000);
  }
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 ? [...entries].reverse() : entries;
    for (const [name, Make] of order) {
      const result = run(new Make(seed), mode, count);
      timings[name].push(result.ms); checksums[name].push(result.checksum);
    }
  }
  for (const [name] of entries) {
    benchmark[name] ??= {};
    benchmark[name][mode] = {
      medianMs: median(timings[name]), millionPerSecond: count / median(timings[name]) / 1000,
      roundsMs: timings[name], checksum: checksums[name][0],
    };
  }
}
console.log('품질 진단 중…');
const seeds = [...new Set([seed, 0, 1, 0xffffffff])];
const diagnostics = Object.fromEntries(entries.map(([name, Make]) => [name,
  seeds.map(s => ({ seed: s, ...quality(new Make(s), samples) }))]));
const report = {
  createdAt: new Date().toISOString(), runtime: process.version,
  platform: process.platform, architecture: process.arch,
  config: { samplesPerSeed: samples, count, rounds, seeds }, benchmark, diagnostics,
  note: 'Exploratory diagnostics only. No statistical certification, period proof, or independent-stream guarantee.',
};
const output = new URL('../results/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('report.json', output), JSON.stringify(report, null, 2));
const rows = entries.map(([name]) => {
  const b = benchmark[name].uint32 as { millionPerSecond: number };
  return `| ${name} | ${b.millionPerSecond.toFixed(2)} | ${name === 'litenansu' ? 16 : 2496} |`;
});
const qualityRows = entries.flatMap(([name]) => diagnostics[name].map(d =>
  `| ${name} | ${d.seed} | ${d.mean.toFixed(6)} | ${d.highByte.chiSquare.toFixed(2)} | ` +
  `${d.lowByte.chiSquare.toFixed(2)} | ${Math.max(...d.bitZScores.map(Math.abs)).toFixed(2)} | ` +
  `${Math.max(...d.correlations.map(c => Math.abs(c.value))).toFixed(5)} | ${d.monteCarloPi.toFixed(5)} |`
));
const summary = `# LiteNansu 실험 결과\n\nNode ${process.version}, ${process.platform}/${process.arch}\n\n` +
  `각 측정 ${count.toLocaleString()}개, ${rounds}회 중앙값. 품질 진단은 시드별 ${samples.toLocaleString()}개.\n\n` +
  `| 생성기 | 초당 백만 개 (uint32) | 상태 배열 바이트 |\n|---|---:|---:|\n${rows.join('\n')}\n\n` +
  `실제 객체 메모리는 더 큽니다.\n\n` +
  `| 생성기 | 시드 | 평균 | 상위 χ² | 하위 χ² | 최대 비트 절대 Z | 최대 절대 상관 | π 추정 |\n` +
  `|---|---:|---:|---:|---:|---:|---:|---:|\n${qualityRows.join('\n')}\n\n` +
  `바이트 χ²의 자유도는 255입니다. 평균은 0.5, Z와 상관계수는 0 부근을 기대하지만 표본 변동이 있습니다. ` +
  `여러 검사 중 극단값이 우연히 나타날 수 있습니다. 주사위 빈도와 전체 측정값은 report.json에 있습니다.\n\n` +
  `이 진단은 결함 탐색용이며 합격 판정이 아닙니다. 전문 통계 검사와 주기 분석은 별도입니다.\n`;
writeFileSync(new URL('summary.md', output), summary);
console.log(summary);
buildDashboard();
