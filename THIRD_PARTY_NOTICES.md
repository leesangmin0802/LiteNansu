# Third-party notices

## xoshiro128**

The xoshiro128** core is by David Blackman and Sebastiano Vigna. Their reference implementation is dedicated to the public domain under CC0 1.0. LiteNansu uses a TypeScript port with a separate 32-bit seed expansion routine.

- Reference: https://prng.di.unimi.it/xoshiro128starstar.c
- Authors’ site: https://prng.di.unimi.it/
- CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

## MT19937

The MT19937 initialization and generation implementation follows the reference algorithm by Makoto Matsumoto and Takuji Nishimura. The original BSD-style three-clause notice is retained below, in `src/rng.ts`, and in the generated standalone HTML.

- Reference: https://www.math.sci.hiroshima-u.ac.jp/m-mat/MT/MT2002/CODES/mt19937ar.c

```text
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
```

## Project code

The project’s original interface, diagnostics, tests, visualization and documentation are available under the MIT license in LICENSE. Retain the applicable third-party notices when redistributing the implementations or generated HTML.
