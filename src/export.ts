import { writeSync } from 'node:fs';
import { generators } from './rng.ts';
import type { GeneratorName } from './rng.ts';

const [name = 'litenansu', seedText = '12345', countText = '1000000'] = process.argv.slice(2);
if (!Object.hasOwn(generators, name)) throw new Error('unknown generator');
const seed = Number(seedText), count = Number(countText);
if (!Number.isSafeInteger(count) || count < 1) throw new RangeError('count must be a positive safe integer');
const rng = new generators[name as GeneratorName](seed);
const buffer = Buffer.alloc(65536);
// stdout contains only raw uint32 little-endian bytes, suitable for external tools.
for (let done = 0; done < count;) {
  const words = Math.min(buffer.length / 4, count - done);
  for (let i = 0; i < words; i++) buffer.writeUInt32LE(rng.nextUint32(), i * 4);
  let offset = 0;
  while (offset < words * 4) offset += writeSync(1, buffer, offset, words * 4 - offset);
  done += words;
}
