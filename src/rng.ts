/*
 * MT19937 reference implementation notice (retained for this port).
Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
All rights reserved.                          

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

  1. Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.

  2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.

  3. The names of its contributors may not be used to endorse or promote 
     products derived from this software without specific prior written 
     permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export interface Rng { nextUint32(): number }
export const UINT32_RANGE = 0x100000000;

function checkSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE)
    throw new RangeError('seed must be a uint32');
}

/** Seeded convenience API. int() uses rejection sampling to avoid modulo bias. */
export abstract class Random implements Rng {
  abstract nextUint32(): number;
  random(): number { return this.nextUint32() / UINT32_RANGE; }
  int(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE)
      throw new RangeError('maxExclusive must be an integer in [1, 2^32]');
    const limit = UINT32_RANGE - UINT32_RANGE % maxExclusive;
    let value: number;
    do { value = this.nextUint32(); } while (value >= limit);
    return value % maxExclusive;
  }
}

/** xoshiro128** core by David Blackman and Sebastiano Vigna (CC0).
 * LiteNansu is an implementation/API name, not a newly invented algorithm.
 * 16 bytes of state payload; JS object/array overhead is additional.
 */
export class LiteNansu extends Random {
  private state: Uint32Array;
  constructor(seed: number) {
    super();
    checkSeed(seed);
    let x = seed >>> 0;
    const mix = () => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.state = new Uint32Array([mix(), mix(), mix(), mix()]);
    if (this.state.every(v => v === 0)) this.state[0] = 1;
  }
  static fromState(words: readonly number[]): LiteNansu {
    if (words.length !== 4) throw new RangeError('state needs four uint32 words');
    words.forEach(checkSeed);
    if (words.every(v => v === 0)) throw new RangeError('zero state is invalid');
    const rng = new LiteNansu(0);
    rng.state.set(words);
    return rng;
  }
  getState(): number[] { return Array.from(this.state); }
  nextUint32(): number {
    const s = this.state;
    const x = Math.imul(s[1], 5);
    const result = Math.imul((x << 7) | (x >>> 25), 9);
    const t = s[1] << 9;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);
    return result >>> 0;
  }
}

/** Standard MT19937, including its original single-uint32 seed initialization. */
export class MT19937 extends Random {
  private state = new Uint32Array(624);
  private index = 624;
  constructor(seed: number) {
    super(); checkSeed(seed);
    this.state[0] = seed;
    for (let i = 1; i < 624; i++) {
      const previous = this.state[i - 1];
      this.state[i] = (Math.imul(1812433253, previous ^ (previous >>> 30)) + i) >>> 0;
    }
  }
  nextUint32(): number {
    const s = this.state;
    if (this.index >= 624) {
      for (let i = 0; i < 624; i++) {
        const y = (s[i] & 0x80000000) | (s[(i + 1) % 624] & 0x7fffffff);
        s[i] = s[(i + 397) % 624] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let y = s[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
}

// Add your own Random subclass here to compare experimental designs.
export const generators = { litenansu: LiteNansu, mt19937: MT19937 };
export type GeneratorName = keyof typeof generators;
