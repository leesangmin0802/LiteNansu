import type { Random } from './rng.ts';

export function quality(rng: Random, samples: number, onProgress?: (done: number, bins: number[], preview: number[]) => void) {
  const high = new Uint32Array(256), low = new Uint32Array(256);
  const bits = new Uint32Array(32), dice = new Uint32Array(6);
  const lags = [1, 2, 16, 64];
  const ring = new Float64Array(64);
  const pairs = lags.map(() => ({ n: 0, x: 0, y: 0, xx: 0, yy: 0, xy: 0 }));
  const preview: number[] = [];
  let sum = 0, insideCircle = 0, previous = 0;
  for (let i = 0; i < samples; i++) {
    const word = rng.nextUint32(), u = word / 0x100000000;
    if (preview.length < 2048) preview.push(u);
    high[word >>> 24]++; low[word & 255]++; sum += u;
    for (let bit = 0; bit < 32; bit++) bits[bit] += (word >>> bit) & 1;
    for (let k = 0; k < lags.length; k++) {
      if (i < lags[k]) continue;
      const x = ring[(i - lags[k]) & 63], p = pairs[k];
      p.n++; p.x += x; p.y += u; p.xx += x * x; p.yy += u * u; p.xy += x * u;
    }
    ring[i & 63] = u;
    if (i % 2 === 1 && previous * previous + u * u < 1) insideCircle++;
    previous = u;
    if ((i + 1) % 65536 === 0) onProgress?.(i + 1, [...high], preview);
  }
  for (let i = 0; i < samples; i++) dice[rng.int(6)]++;
  const chiSquare = (bins: Uint32Array) => {
    const expected = samples / bins.length;
    return Array.from(bins).reduce((s, n) => s + (n - expected) ** 2 / expected, 0);
  };
  return {
    preview,
    mean: sum / samples,
    highByte: { chiSquare: chiSquare(high), degreesOfFreedom: 255, bins: [...high] },
    lowByte: { chiSquare: chiSquare(low), degreesOfFreedom: 255, bins: [...low] },
    bitZScores: Array.from(bits, n => (n - samples / 2) / Math.sqrt(samples / 4)),
    correlations: pairs.map((p, k) => ({ lag: lags[k], value:
      (p.n * p.xy - p.x * p.y) /
      Math.sqrt((p.n * p.xx - p.x ** 2) * (p.n * p.yy - p.y ** 2)) })),
    dice: { chiSquare: chiSquare(dice), degreesOfFreedom: 5, bins: [...dice] },
    monteCarloPi: 4 * insideCircle / Math.floor(samples / 2),
  };
}
