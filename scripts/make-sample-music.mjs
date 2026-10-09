// Composes the bundled royalty-free travel & adventure music (all original, synthesised here).
// Output: server/samples/music-*.mp3  (the API server copies them into data/assets on start).
// Run: node scripts/make-sample-music.mjs [trailhead|open-road|summit|golden-hour|drift|boom-bap|plot-twist|good-vibes]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static')
const SR = 44100
const TAU = Math.PI * 2
let seed = 20261009
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
const QUAL = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], sus2: [0, 2, 7] }
/** MIDI notes of a chord: pitch class + quality at an octave (octave 3 → C3 = 48). */
const chord = (pc, q, oct = 3) => QUAL[q].map((i) => 12 * (oct + 1) + pc + i)
const root = (pc, oct) => 12 * (oct + 1) + pc
const gains = (pan) => [Math.cos(((pan + 1) * Math.PI) / 4), Math.sin(((pan + 1) * Math.PI) / 4)]
const tri = (p) => 2 * Math.abs(2 * (p - Math.floor(p + 0.5))) - 1
const saw = (p) => 2 * (p - Math.floor(p)) - 1

class Mix {
  constructor(seconds) { this.n = Math.ceil(seconds * SR); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); this.S = new Float32Array(this.n) }
  put(i, l, r, send) { if (i < 0 || i >= this.n) return; this.L[i] += l; this.R[i] += r; this.S[i] += send * (l + r) * 0.5 }
}

// ---------------- instruments ----------------
function pad(m, t0, dur, notes, { gain = 0.1, att = 0.8, rel = 0.8, lp = 0.08, send = 0.5, detune = 0.0035, vib = 0, beat = 0, sc = 0, wide = 0.7, saws = 0.4 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + rel) * SR)
  notes.forEach((n, k) => {
    const f = mtof(n), [gl, gr] = gains(((k % 3) - 1) * wide * 0.5)
    let lpL = 0, lpR = 0
    for (let i = 0; i < len; i++) {
      const idx = i0 + i
      if (idx >= m.n) break
      const t = i / SR
      const env = Math.min(1, t / att) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel))
      const bend = vib ? (f * vib * (1 - Math.cos(TAU * 5.2 * t))) / (TAU * 5.2) : 0
      const pL = f * (1 - detune) * t + bend, pR = f * (1 + detune) * t + bend
      lpL += lp * ((1 - saws) * tri(pL) + saws * saw(pL) - lpL)
      lpR += lp * ((1 - saws) * tri(pR) + saws * saw(pR) - lpR)
      let amp = env * gain
      if (sc) amp *= 1 - sc * Math.exp(-((t0 + t) % beat) * 9)
      m.put(idx, lpL * amp * gl * 1.6, lpR * amp * gr * 1.6, send)
    }
  })
}

/** Karplus-Strong plucked string with fractional delay tuning (guitar / harp-like). */
function pluck(m, t0, freq, dur, { gain = 0.2, pan = 0, send = 0.3, ring = 0.45, bright = 0.55 } = {}) {
  const L = SR / freq - 0.5, size = Math.ceil(L) + 3, buf = new Float32Array(size)
  let lp = 0
  for (let i = 0; i < size; i++) { lp += bright * (rnd() * 2 - 1 - lp); buf[i] = lp * 1.7 }
  const decay = Math.pow(ring, 1 / freq)
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR), [gl, gr] = gains(pan)
  let w = 0, yPrev = 0
  for (let i = 0; i < len; i++) {
    let rp = w - L
    if (rp < 0) rp += size
    const a = Math.floor(rp), fr = rp - a
    const y = buf[a] * (1 - fr) + buf[(a + 1) % size] * fr
    buf[w] = 0.5 * (y + yPrev) * decay
    yPrev = y
    w = (w + 1) % size
    const rel = i > len - SR * 0.06 ? (len - i) / (SR * 0.06) : 1
    m.put(i0 + i, y * gain * gl * rel, y * gain * gr * rel, send)
  }
}

/** FM electric-piano (Rhodes-like). */
function key(m, t0, freq, dur, { gain = 0.2, pan = 0, send = 0.4, tine = 1.2, decay = 2.0 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.4) * SR), [gl, gr] = gains(pan)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const rel = t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.4)
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.004) * rel
    const mod = tine * Math.exp(-t * 4) * Math.sin(TAU * freq * t)
    const v = (Math.sin(TAU * freq * t + mod) + 0.16 * Math.sin(TAU * freq * 2 * t) * Math.exp(-t * 6)) * env * gain
    m.put(i0 + i, v * gl, v * gr, send)
  }
}

function bass(m, t0, freq, dur, { gain = 0.3, send = 0.04, decay = 2.2 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.1) * SR)
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const rel = t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.1)
    const env = Math.min(1, t / 0.006) * Math.exp(-t * decay) * rel
    const v = Math.tanh((Math.sin(TAU * freq * t) + 0.28 * Math.sin(TAU * 2 * freq * t) + 0.12 * Math.sin(TAU * 3 * freq * t)) * 1.3) * env * gain
    m.put(i0 + i, v, v, send)
  }
}

function kick(m, t0, { gain = 0.5, low = 44, punch = 130, decay = 9, send = 0.02 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.42 * SR)
  let ph = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    ph += (TAU * (low + (punch - low) * Math.exp(-t * 30))) / SR
    const v = (Math.sin(ph) * Math.exp(-t * decay) + (rnd() * 2 - 1) * Math.exp(-t * 300) * 0.12) * gain
    m.put(i0 + i, v, v, send)
  }
}

function snare(m, t0, { gain = 0.25, pan = 0, send = 0.3, tone = 190 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.3 * SR), [gl, gr] = gains(pan)
  let prev = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const n = rnd() * 2 - 1
    const hp = n - prev * 0.85
    prev = n
    const v = (hp * Math.exp(-t * 16) * 0.7 + Math.sin(TAU * tone * t) * Math.exp(-t * 28) * 0.5) * gain
    m.put(i0 + i, v * gl, v * gr, send)
  }
}

function hat(m, t0, { gain = 0.08, open = false, pan = 0.2, send = 0.1 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((open ? 0.28 : 0.07) * SR), [gl, gr] = gains(pan)
  let prev = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const n = rnd() * 2 - 1
    const v = (n - prev) * Math.exp(-t * (open ? 14 : 70)) * gain
    prev = n
    m.put(i0 + i, v * gl, v * gr, send)
  }
}

function clap(m, t0, { gain = 0.2, send = 0.35 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.3 * SR)
  let prev = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const n = rnd() * 2 - 1
    const burst = t < 0.036 ? Math.exp(-(t % 0.012) * 260) : Math.exp(-(t - 0.036) * 16) * 0.55
    const v = (n - prev * 0.6) * burst * gain
    prev = n
    m.put(i0 + i, v, v, send)
  }
}

function riser(m, t0, dur, { gain = 0.1, send = 0.4 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR)
  let lp = 0
  for (let i = 0; i < len; i++) {
    const p = i / len
    lp += (0.02 + 0.45 * p * p) * (rnd() * 2 - 1 - lp)
    const v = lp * gain * p * p * 3
    m.put(i0 + i, v * 0.9, v * 1.1, send)
  }
}

function crash(m, t0, { gain = 0.14, send = 0.5 } = {}) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(3 * SR)
  let prev = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const n = rnd() * 2 - 1
    const v = (n - prev * 0.8) * Math.exp(-t * 2.2) * gain
    prev = n
    m.put(i0 + i, v, v * 0.9, send)
  }
}

function vinyl(m, seconds, gain) {
  let lp = 0
  for (let i = 0; i < m.n; i++) {
    lp += 0.2 * (rnd() * 2 - 1 - lp)
    let v = lp * gain * 0.35
    if (rnd() < 0.00035) v += (rnd() * 2 - 1) * gain * 1.6
    m.put(i, v, v * 0.9, 0)
  }
  void seconds
}

// ---------------- mix-down ----------------
function comb(input, delay, fb, damp) {
  const buf = new Float32Array(delay), out = new Float32Array(input.length)
  let idx = 0, lp = 0
  for (let i = 0; i < input.length; i++) {
    const y = buf[idx]
    lp = y * (1 - damp) + lp * damp
    buf[idx] = input[i] + lp * fb
    out[i] = y
    if (++idx >= delay) idx = 0
  }
  return out
}
function allpass(input, delay, g) {
  const buf = new Float32Array(delay), out = new Float32Array(input.length)
  let idx = 0
  for (let i = 0; i < input.length; i++) {
    const d = buf[idx], v = input[i] + g * d
    buf[idx] = v
    out[i] = d - g * v
    if (++idx >= delay) idx = 0
  }
  return out
}
function reverb(send, delays, fb) {
  const sum = new Float32Array(send.length)
  for (const d of delays) { const c = comb(send, d, fb, 0.35); for (let i = 0; i < sum.length; i++) sum[i] += c[i] * 0.25 }
  return allpass(allpass(sum, 556, 0.5), 441, 0.5)
}

function finish(m, name, { wet = 0.3, fb = 0.84, fadeIn = 1.5, fadeOut = 6, tp = -1.5 } = {}) {
  const wl = reverb(m.S, [1687, 1789, 1913, 2039], fb), wr = reverb(m.S, [1711, 1823, 1951, 2083], fb)
  let peak = 0
  const seconds = m.n / SR
  for (let i = 0; i < m.n; i++) {
    const t = i / SR
    const fade = Math.min(1, t / fadeIn) * Math.min(1, Math.max(0, (seconds - t) / fadeOut))
    m.L[i] = Math.tanh((m.L[i] + wl[i] * wet) * 1.25) * fade
    m.R[i] = Math.tanh((m.R[i] + wr[i] * wet) * 1.25) * fade
    peak = Math.max(peak, Math.abs(m.L[i]), Math.abs(m.R[i]))
  }
  // Report the energy contour so arrangement dynamics can be checked without listening.
  const win = Math.floor(SR * 20)
  const contour = []
  for (let s = 0; s + win < m.n; s += win) { let e = 0; for (let i = s; i < s + win; i += 7) e += m.L[i] * m.L[i]; contour.push(Math.sqrt(e / (win / 7)).toFixed(2)) }
  const g = 0.9 / peak
  const buf = Buffer.alloc(44 + m.n * 4)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + m.n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(m.n * 4, 40)
  for (let i = 0; i < m.n; i++) { buf.writeInt16LE(Math.round(m.L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(m.R[i] * g * 32767), 46 + i * 4) }
  fs.mkdirSync('server/samples', { recursive: true })
  const wav = path.join('server/samples', `${name}.wav`), mp3 = path.join('server/samples', `${name}.mp3`)
  fs.writeFileSync(wav, buf)
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-af', `loudnorm=I=-16:TP=${tp}:LRA=9`, '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', mp3])
  fs.unlinkSync(wav)
  console.log(`wrote ${mp3}  ${(fs.statSync(mp3).size / 1e6).toFixed(2)} MB  ${seconds.toFixed(1)}s  contour(20s rms): ${contour.join(' ')}`)
}

function compose(name, bpm, sections, barFn, opts = {}) {
  const beat = 60 / bpm, bar = beat * 4
  const total = sections.reduce((a, s) => a + s.bars, 0)
  const m = new Mix(total * bar)
  let b0 = 0
  for (const s of sections) {
    for (let k = 0; k < s.bars; k++) barFn(m, { t: (b0 + k) * bar, beat, bar, bi: b0 + k, k, s, l: s.l, last: k === s.bars - 1, sx: beat / 4 })
    b0 += s.bars
  }
  if (opts.vinyl) vinyl(m, total * bar, opts.vinyl)
  console.log(`${name}: ${bpm} BPM, ${total} bars = ${(total * bar).toFixed(2)}s`)
  finish(m, name, opts)
}
const chordAt = (s, k, per = 1) => s.prog[Math.floor(k / per) % s.prog.length]

// ================= Trailhead — bright acoustic adventure, 112 BPM, G major =================
function trailhead() {
  const A = [[7, 'maj'], [2, 'maj'], [4, 'min'], [0, 'maj']], B = [[4, 'min'], [0, 'maj'], [7, 'maj'], [2, 'maj']]
  const secs = [
    { bars: 8, prog: A, l: { pad: 0.6, gtr: 0.8 } },
    { bars: 16, prog: A, l: { pad: 0.5, gtr: 1, bass: 1, kick: 0.7, hat: 0.6 } },
    { bars: 8, prog: B, l: { pad: 0.7, gtr: 1, bass: 1, kick: 0.8, hat: 0.8, snare: 0.7, roll: 1, riser: 1 } },
    { bars: 16, prog: A, l: { pad: 0.9, gtr: 1, strum: 1, bass: 1, kick: 1, snare: 1, hat: 1, clap: 1, lead: 1, shaker: 1, crash: 1 } },
    { bars: 16, prog: A, l: { pad: 0.5, gtr: 1, bass: 1, kick: 0.8, hat: 0.7, snare: 0.5 } },
    { bars: 16, prog: B, l: { pad: 1, gtr: 0.9, key: 0.8 } },
    { bars: 8, prog: A, l: { pad: 0.8, gtr: 1, bass: 1, kick: 0.9, snare: 0.8, roll: 1, riser: 1, hat: 0.8 } },
    { bars: 16, prog: A, l: { pad: 1, gtr: 1, strum: 1, bass: 1, kick: 1, snare: 1, hat: 1, clap: 1, lead: 1, shaker: 1, pad2: 1, crash: 1 } },
    { bars: 8, prog: A, l: { pad: 0.7, gtr: 0.8 } },
  ]
  const phrase = [[[0, 0, 2], [6, 1, 1], [8, 2, 3]], [[0, 1, 2], [6, 2, 1], [8, 3, 3]], [[0, 2, 2], [6, 1, 1], [8, 0, 3]], [[0, 1, 3], [8, 0, 4]]]
  compose('music-trailhead', 112, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, ch = chord(pc, q, 3), arr = [ch[0], ch[1], ch[2], ch[0] + 12]
    if (c.k === 0 && l.crash) crash(m, c.t)
    if (l.riser && c.k === c.s.bars - 4) riser(m, c.t, c.bar * 4, { gain: 0.11 })
    if (l.pad) pad(m, c.t, c.bar, [...chord(pc, q, 2), ch[0] + 12], { gain: 0.07 * l.pad, att: 0.7, rel: 0.6, lp: 0.07, send: 0.6 })
    if (l.pad2) pad(m, c.t, c.bar, chord(pc, q, 5), { gain: 0.03, att: 0.4, lp: 0.12, send: 0.7 })
    if (l.gtr) [0, 1, 2, 1, 3, 2, 1, 2].forEach((ix, s) => pluck(m, c.t + (s * c.beat) / 2, mtof(arr[ix]), c.beat * 1.6, { gain: 0.17 * l.gtr * (s % 2 ? 0.8 : 1), pan: s % 2 ? 0.25 : -0.25, ring: 0.4 }))
    if (l.strum) [0, 2.5].forEach((b) => ch.forEach((n, i) => pluck(m, c.t + b * c.beat + i * 0.014, mtof(n + 12), c.beat * 1.8, { gain: 0.07, pan: -0.1 + i * 0.1, ring: 0.5, bright: 0.7 })))
    if (l.bass) [[0, 1], [2, 0.85], [3.5, 0.55]].forEach(([b, g], i) => { if (i < 3 && (i < 2 || l.kick >= 1)) bass(m, c.t + b * c.beat, mtof(root(pc, 2)), c.beat * 1.3, { gain: 0.3 * g * l.bass }) })
    if (l.kick) [0, 2, 2.5].forEach((b, i) => { if (i < 2 || l.kick >= 1) kick(m, c.t + b * c.beat, { gain: 0.5 * l.kick }) })
    if (l.snare) [1, 3].forEach((b) => snare(m, c.t + b * c.beat, { gain: 0.2 * l.snare }))
    if (l.clap) [1, 3].forEach((b) => clap(m, c.t + b * c.beat, { gain: 0.12 }))
    if (l.hat) for (let s = 0; s < 8; s++) hat(m, c.t + (s * c.beat) / 2 + c.beat / 4 * (s % 2 ? 0 : 0), { gain: 0.06 * l.hat * (s % 2 ? 1 : 0.6), open: l.kick >= 1 && s === 7 })
    if (l.shaker) for (let s = 0; s < 16; s++) hat(m, c.t + s * c.sx, { gain: 0.025, pan: -0.4 })
    if (l.roll && c.k >= c.s.bars - 2) { const n = c.k === c.s.bars - 1 ? 16 : 8; for (let s = 0; s < n; s++) snare(m, c.t + (s * c.bar) / n, { gain: (0.08 + 0.3 * ((c.k - (c.s.bars - 2)) * 0.5 + s / n / 2)) }) }
    if (l.lead) phrase[c.k % 4].forEach(([p, ix, d]) => pad(m, c.t + p * c.sx, d * c.sx, [chord(pc, q, 5)[ix % 3] + (ix > 2 ? 12 : 0)], { gain: 0.07, att: 0.03, rel: 0.2, lp: 0.25, vib: 0.004, send: 0.5, saws: 0.15, wide: 0 }))
    if (l.key) [0, 1.5, 2, 3].forEach((b, i) => key(m, c.t + b * c.beat, mtof(chord(pc, q, 4)[i % 3] + 12), c.beat * 1.2, { gain: 0.07, send: 0.6, decay: 1.8, tine: 0.8, pan: 0.3 }))
  })
}

// ================= Open Road — driving road-trip energy, 124 BPM, A minor =================
function openRoad() {
  const P1 = [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']], P2 = [[5, 'maj'], [0, 'maj'], [7, 'maj'], [9, 'min']]
  const drop = { pad: 1, sc: 1, arp: 1, bass: 1, kick: 1, hat: 1, clap: 1, lead: 1, crash: 1 }
  const secs = [
    { bars: 8, prog: P1, l: { pad: 0.7, arp: 0.6, hat: 0.4 } },
    { bars: 8, prog: P1, l: { pad: 0.8, arp: 1, kick: 0.6, clap: 0.5, hat: 1, riser: 1 } },
    { bars: 16, prog: P1, l: drop },
    { bars: 8, prog: P2, l: { pad: 1, arp: 0.5, key: 1 } },
    { bars: 8, prog: P2, l: { pad: 0.9, arp: 1, kick: 0.5, hat: 1, roll: 1, riser: 1 } },
    { bars: 16, prog: P2, l: { ...drop, lead2: 1 } },
    { bars: 12, prog: P1, l: { pad: 0.8, arp: 1, bass: 1, hat: 1, kick1: 1 } },
    { bars: 8, prog: P1, l: { pad: 0.9, arp: 1, kick: 0.6, hat: 1, roll: 1, riser: 1 } },
    { bars: 16, prog: P1, l: { ...drop, lead2: 1 } },
    { bars: 16, prog: P2, l: { ...drop, lead2: 1, pad2: 1 } },
    { bars: 8, prog: P1, l: { pad: 0.8, arp: 0.7, key: 0.8 } },
  ]
  const LEAD = [[[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 2]], [[0, 69, 1], [1, 72, 1], [2, 74, 2]], [[0, 76, 1.5], [1.5, 79, 0.5], [2, 76, 1], [3, 74, 1]], [[0, 72, 2], [2, 69, 2]]]
  compose('music-open-road', 124, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, ch = chord(pc, q, 3), up = chord(pc, q, 4)
    if (c.k === 0 && l.crash) crash(m, c.t)
    if (l.riser && c.k === c.s.bars - 4) riser(m, c.t, c.bar * 4, { gain: 0.1 })
    if (l.pad) pad(m, c.t, c.bar, [...ch, ch[0] + 12], { gain: 0.07 * l.pad, att: 0.3, rel: 0.4, lp: 0.09, saws: 0.6, send: 0.5, beat: c.beat, sc: l.sc ? 0.6 : 0 })
    if (l.pad2) pad(m, c.t, c.bar, chord(pc, q, 5), { gain: 0.03, att: 0.3, lp: 0.15, saws: 0.6, beat: c.beat, sc: 0.5 })
    if (l.arp) for (let s = 0; s < 16; s++) key(m, c.t + s * c.sx, mtof([up[0], up[1], up[2], up[1]][s % 4] + (s % 8 >= 4 ? 12 : 0)), c.sx * 1.6, { gain: 0.05 * l.arp * (s % 4 === 0 ? 1.3 : 0.9), tine: 0.5, decay: 9, send: 0.45, pan: s % 2 ? 0.3 : -0.3 })
    if (l.bass) for (let s = 0; s < 8; s++) bass(m, c.t + (s * c.beat) / 2, mtof(root(pc, 2) + (s % 2 ? 12 : 0)), c.beat * 0.4, { gain: 0.25 * (s % 2 ? 0.7 : 1), decay: 3 })
    if (l.kick) for (let b = 0; b < 4; b++) if (l.kick >= 1 || b % 2 === 0) kick(m, c.t + b * c.beat, { gain: 0.5 * Math.min(1, l.kick) })
    if (l.kick1) kick(m, c.t, { gain: 0.5 })
    if (l.hat) for (let s = 0; s < 8; s++) hat(m, c.t + (s * c.beat) / 2 + c.beat / 2 * (s % 2 ? 0 : 1) * 0 + (s % 2 ? 0 : c.beat / 2) * 0, { gain: 0.05 * l.hat * (s % 2 ? 1.4 : 0.5), open: s % 2 === 1 && l.kick >= 1 })
    if (l.clap) [1, 3].forEach((b) => clap(m, c.t + b * c.beat, { gain: 0.15 * l.clap }))
    if (l.roll && c.k >= c.s.bars - 2) { const n = c.k === c.s.bars - 1 ? 16 : 8; for (let s = 0; s < n; s++) snare(m, c.t + (s * c.bar) / n, { gain: 0.08 + 0.3 * ((c.k - (c.s.bars - 2)) * 0.5 + s / n / 2) }) }
    if (l.lead || l.lead2) LEAD[c.k % 4].forEach(([b, n, d]) => pad(m, c.t + b * c.beat, d * c.beat, [n + (l.lead2 ? 12 : 0)], { gain: 0.06, att: 0.02, rel: 0.12, lp: 0.28, saws: 0.7, vib: 0.003, send: 0.5, wide: 0 }))
    if (l.key) [0, 1, 2, 3].forEach((b) => key(m, c.t + b * c.beat, mtof(up[b % 3] + 12), c.beat * 1.5, { gain: 0.08, decay: 1.8, tine: 0.8, send: 0.6, pan: 0.2 }))
  }, { wet: 0.22, fb: 0.8 })
}

// ================= Summit — epic cinematic build, 90 BPM, D minor =================
function summit() {
  const P1 = [[2, 'min'], [10, 'maj'], [5, 'maj'], [0, 'maj']], P2 = [[7, 'min'], [10, 'maj'], [5, 'maj'], [0, 'maj']]
  const full = { str: 1, key: 1, bass: 1, kick: 1, snare: 1, lead: 1, crash: 1 }
  const secs = [
    { bars: 8, prog: P1, l: { key: 0.9, str: 0.4 } },
    { bars: 12, prog: P1, l: { key: 1, str: 0.6, bass: 0.6 } },
    { bars: 12, prog: P2, l: { key: 1, str: 0.8, bass: 0.8, kick: 0.5 } },
    { bars: 8, prog: P1, l: { key: 1, str: 1, bass: 1, kick: 0.8, roll: 1, riser: 1 } },
    { bars: 20, prog: P1, l: full },
    { bars: 10, prog: P2, l: { key: 1, str: 0.7 } },
    { bars: 12, prog: P1, l: { ...full, lead2: 1 } },
    { bars: 8, prog: P1, l: { key: 0.9, str: 0.5 } },
  ]
  const LEAD = [[[0, 1, 2], [2, 2, 2]], [[0, 2, 2], [2, 1, 2]], [[0, 3, 2], [2, 2, 2]], [[0, 1, 4]]]
  compose('music-summit', 90, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, ch = chord(pc, q, 3), up = chord(pc, q, 4)
    if (c.k === 0 && l.crash) crash(m, c.t, { gain: 0.18 })
    if (l.riser && c.k === c.s.bars - 4) riser(m, c.t, c.bar * 4, { gain: 0.13 })
    if (l.str) pad(m, c.t, c.bar, [...ch, ch[0] + 12, ch[2] + 12], { gain: 0.07 * l.str, att: 1.2, rel: 1, lp: 0.05, saws: 0.7, vib: 0.0035, send: 0.7, detune: 0.006 })
    if (l.key) [0, 1, 2, 3].forEach((b) => key(m, c.t + b * c.beat, mtof(up[[0, 2, 1, 2][b]] + (b === 0 ? 0 : 12) - (b === 0 ? 0 : 12) + 0), c.beat * 1.8, { gain: 0.13 * l.key, send: 0.75, decay: 1.5, tine: 0.8, pan: 0.15 }))
    if (l.bass) for (let s = 0; s < 8; s++) bass(m, c.t + (s * c.beat) / 2, mtof(root(pc, 2)), c.beat * 0.55, { gain: 0.2 * l.bass * (s === 0 ? 1.3 : 0.8), decay: 2.6 })
    if (l.kick) { kick(m, c.t, { gain: 0.6 * l.kick, low: 52, punch: 95, decay: 6, send: 0.25 }); if (l.kick >= 1) kick(m, c.t + 2 * c.beat, { gain: 0.45, low: 52, punch: 95, decay: 6, send: 0.25 }) }
    if (l.snare) [1, 3].forEach((b) => snare(m, c.t + b * c.beat, { gain: 0.14, tone: 150, send: 0.5 }))
    if (l.roll && c.k >= c.s.bars - 2) { const n = c.k === c.s.bars - 1 ? 16 : 8; for (let s = 0; s < n; s++) snare(m, c.t + (s * c.bar) / n, { gain: 0.06 + 0.28 * ((c.k - (c.s.bars - 2)) * 0.5 + s / n / 2), send: 0.5 }) }
    if (l.lead) LEAD[c.k % 4].forEach(([b, ix, d]) => pad(m, c.t + b * c.beat, d * c.beat, [chord(pc, q, 5)[ix % 3] + (ix > 2 ? 12 : 0) + (l.lead2 ? 0 : 0)], { gain: 0.07, att: 0.18, rel: 0.4, lp: 0.12, saws: 0.6, vib: 0.005, send: 0.7, wide: 0 }))
    if (l.lead2) pad(m, c.t, c.bar, chord(pc, q, 6).slice(0, 2), { gain: 0.025, att: 0.5, lp: 0.15, send: 0.8 })
  }, { wet: 0.38, fb: 0.88 })
}

// ================= Golden Hour — warm lo-fi travel chill, 84 BPM, F major =================
function goldenHour() {
  const A = [[5, 'maj7'], [4, 'min7'], [2, 'min7'], [0, 'maj7']], B = [[10, 'maj7'], [9, 'min7'], [7, 'min7'], [0, 'dom7']]
  const groove = { pad: 0.8, key: 1, bass: 1, kick: 1, snare: 1, hat: 1 }
  const secs = [
    { bars: 4, prog: A, l: { pad: 1, key: 0.8 } },
    { bars: 16, prog: A, l: groove },
    { bars: 16, prog: B, l: { ...groove, mel: 1 } },
    { bars: 16, prog: A, l: { ...groove, mel: 1 } },
    { bars: 8, prog: B, l: { pad: 1, key: 1, mel: 0.7 } },
    { bars: 16, prog: B, l: { ...groove, mel: 1, pad: 1 } },
    { bars: 8, prog: A, l: { pad: 1, key: 0.9, mel: 0.8 } },
  ]
  const MEL = [[[0, 72, 6], [10, 69, 4]], [[4, 74, 4], [12, 72, 6]], [[0, 69, 8], [12, 67, 4]], [[2, 72, 4], [8, 69, 8]]]
  compose('music-golden-hour', 84, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, ch = chord(pc, q, 3), up = chord(pc, q, 4)
    const at = (p) => c.t + p * c.sx + (p % 2 ? c.sx * 0.32 : 0)
    if (l.pad) pad(m, c.t, c.bar, [...ch, up[0]], { gain: 0.05 * l.pad, att: 1, rel: 1, lp: 0.04, saws: 0.2, send: 0.6 })
    if (l.key) { [0, 10].forEach((p, i) => ch.concat(up.slice(0, 1)).forEach((n, k) => key(m, at(p) + k * 0.012, mtof(n + 12), c.sx * (i ? 4 : 7), { gain: 0.07 * l.key, decay: 2.6, tine: 1.0, send: 0.55, pan: -0.2 + k * 0.12 }))) }
    if (l.bass) [0, 6, 10, 13].forEach((p, i) => bass(m, at(p), mtof(root(pc, 2)), c.sx * (i === 3 ? 2 : 4), { gain: 0.26 * (i === 1 ? 0.7 : 1), decay: 2.2 }))
    if (l.kick) [0, 7, 10].forEach((p, i) => kick(m, at(p), { gain: 0.42 * (i === 2 ? 0.7 : 1), low: 48, punch: 105, decay: 9 }))
    if (l.snare) [4, 12].forEach((p) => snare(m, at(p), { gain: 0.15, tone: 170, send: 0.4 }))
    if (l.hat) for (let p = 0; p < 16; p += 2) hat(m, at(p), { gain: 0.045 * (p % 4 ? 0.7 : 1), pan: 0.25 })
    if (l.mel) MEL[c.k % 4].forEach(([p, n, d]) => pluck(m, at(p), mtof(n), d * c.sx * 0.9, { gain: 0.13 * l.mel, pan: 0.3, ring: 0.5, bright: 0.45, send: 0.5 }))
  }, { wet: 0.3, fb: 0.84, vinyl: 0.012 })
}

/** Standard snare roll that ramps up over the last two bars of a section (or the two bars before a stop bar). */
function rollBars(m, c, before = 0, { send = 0.3 } = {}) {
  const from = c.s.bars - 2 - before
  if (c.k < from || c.k >= from + 2) return
  const n = c.k === from + 1 ? 16 : 8
  for (let s = 0; s < n; s++) snare(m, c.t + (s * c.bar) / n, { gain: 0.08 + 0.3 * ((c.k - from) * 0.5 + s / n / 2), send })
}
const phraseNote = (pc, q, ix) => chord(pc, q, 5)[ix % 3] + 12 * Math.floor(ix / 3)

// ================= Drift — ambient chill, 72 BPM, E-flat major =================
function drift() {
  const A = [[3, 'maj7'], [8, 'maj7'], [0, 'min7'], [10, 'dom7']], B = [[8, 'maj7'], [7, 'min7'], [5, 'min7'], [10, 'dom7']]
  const base = { pad: 1, key: 0.8, harp: 0.8 }
  const flow = { ...base, bass: 1, shaker: 1, kick: 0.7 }
  const secs = [
    { bars: 8, prog: A, l: { pad: 0.8, harp: 0.6 } },
    { bars: 16, prog: A, l: flow },
    { bars: 16, prog: B, l: { ...flow, mel: 1 } },
    { bars: 8, prog: A, l: { pad: 1, key: 1, harp: 0.5, bells: 1 } },
    { bars: 16, prog: A, l: { ...flow, mel: 1, bells: 1, pad2: 1 } },
    { bars: 8, prog: B, l: { pad: 0.9, harp: 0.6, mel: 0.6 } },
  ]
  const MEL = [[[0, 2, 6], [6, 1, 4], [10, 3, 6]], [[0, 3, 8], [8, 2, 6]], [[2, 1, 4], [6, 2, 4], [10, 0, 6]], [[0, 0, 12]]]
  compose('music-drift', 72, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, ch = chord(pc, q, 3), up = chord(pc, q, 4)
    const at = (p) => c.t + p * c.sx + (p % 2 ? c.sx * 0.2 : 0)
    if (l.pad) pad(m, c.t, c.bar, [...ch, up[0]], { gain: 0.06 * l.pad, att: 1.2, rel: 1, lp: 0.035, saws: 0.1, send: 0.7 })
    if (l.pad2) pad(m, c.t, c.bar, chord(pc, q, 5), { gain: 0.022, att: 1, rel: 1, lp: 0.1, saws: 0.1, send: 0.8 })
    if (l.key) [0, 10].forEach((p, i) => up.forEach((n, k) => key(m, at(p) + k * 0.014, mtof(n), c.sx * (i ? 5 : 9), { gain: 0.058 * l.key, decay: 1.4, tine: 0.7, send: 0.6, pan: -0.25 + k * 0.17 })))
    if (l.harp) [0, 1, 2, 3, 2, 1, 2, 3].forEach((ix, s) => pluck(m, c.t + (s * c.beat) / 2, mtof(up[ix % up.length] + 12), c.beat * 1.8, { gain: 0.085 * l.harp * (s % 2 ? 0.8 : 1), pan: s % 2 ? 0.35 : -0.35, ring: 0.62, bright: 0.35, send: 0.7 }))
    if (l.bass) [[0, 1], [10, 0.7]].forEach(([p, g]) => bass(m, at(p), mtof(root(pc, 2)), c.sx * (p ? 4 : 9), { gain: 0.24 * g * l.bass, decay: 1.6 }))
    if (l.kick) { kick(m, at(0), { gain: 0.28 * l.kick, low: 46, punch: 88, decay: 10, send: 0.1 }); kick(m, at(10), { gain: 0.2 * l.kick, low: 46, punch: 88, decay: 10, send: 0.1 }) }
    if (l.kick) [4, 12].forEach((p) => snare(m, at(p), { gain: 0.05, tone: 210, send: 0.45 }))
    if (l.shaker) for (let p = 0; p < 16; p += 2) hat(m, at(p), { gain: 0.022 * (p % 4 ? 1 : 0.7), pan: -0.35, send: 0.2 })
    if (l.mel) MEL[c.k % 4].forEach(([p, ix, d]) => pluck(m, at(p), mtof(chord(pc, q, 5)[ix % 4]), d * c.sx, { gain: 0.1 * l.mel, pan: 0.3, ring: 0.6, bright: 0.4, send: 0.65 }))
    if (l.bells) key(m, c.t + 1.5 * c.beat, mtof(chord(pc, q, 6)[c.k % 4]), c.beat * 2, { gain: 0.032, tine: 1.6, decay: 2.5, send: 0.85, pan: c.k % 2 ? 0.45 : -0.45 })
  }, { wet: 0.42, fb: 0.88, vinyl: 0.005 })
}

// ================= Boom Bap — hip-hop city groove, 90 BPM, A minor =================
function boomBap() {
  const A = [[9, 'min7'], [2, 'min7'], [7, 'dom7'], [0, 'maj7']], B = [[5, 'maj7'], [4, 'dom7'], [9, 'min7'], [9, 'min7']]
  const beat = { key: 1, bass: 1, kick: 1, snare: 1, hat: 1 }
  const hook = { ...beat, mel: 1, stab: 1, clap: 1, ghost: 1, pad: 1 }
  const secs = [
    { bars: 4, prog: A, l: { key: 1, pad: 0.6 } },
    { bars: 16, prog: A, l: beat },
    { bars: 16, prog: A, l: { ...beat, mel: 1 } },
    { bars: 8, prog: B, l: { ...hook, crash: 1 } },
    { bars: 4, prog: A, l: { key: 1, bass: 1 } },
    { bars: 16, prog: A, l: { ...beat, mel: 1, ghost: 1, crash: 1 } },
    { bars: 16, prog: B, l: { ...hook, crash: 1 } },
    { bars: 10, prog: A, l: { key: 1, bass: 0.8, hat: 0.6, pad: 0.6 } },
  ]
  const MEL = [[[0, 2, 3], [6, 1, 3], [10, 3, 5]], [[0, 3, 4], [8, 2, 3], [12, 1, 3]], [[2, 1, 3], [6, 2, 3], [10, 3, 4]], [[0, 3, 6], [10, 2, 5]]]
  compose('music-boom-bap', 90, secs, (m, c) => {
    const [pc, q] = chordAt(c.s, c.k), l = c.l, up = chord(pc, q, 4)
    const at = (p) => c.t + p * c.sx + (p % 2 ? c.sx * 0.36 : 0)
    if (c.k === 0 && l.crash) crash(m, c.t, { gain: 0.1 })
    if (l.pad) pad(m, c.t, c.bar, chord(pc, q, 3), { gain: 0.045 * l.pad, att: 0.5, rel: 0.5, lp: 0.05, saws: 0.3, send: 0.4 })
    if (l.key) [0, 6, 10].forEach((p, i) => up.forEach((n, k) => key(m, at(p) + k * 0.011, mtof(n), c.sx * (i === 0 ? 5 : 3), { gain: 0.07 * l.key, decay: 3.2, tine: 0.9, send: 0.35, pan: -0.2 + k * 0.13 })))
    if (l.bass) [0, 6, 10].concat(c.k % 4 === 3 ? [13] : []).forEach((p) => bass(m, at(p), mtof(root(pc, 2) + (p === 13 ? 7 : 0)), c.sx * (p === 0 ? 5 : 3), { gain: 0.3 * l.bass * (p === 0 ? 1 : 0.8), decay: 1.8 }))
    if (l.kick) [0, 10].concat(c.k % 4 === 3 ? [7] : []).concat(c.k % 2 ? [14] : []).forEach((p, i) => kick(m, at(p), { gain: 0.55 * (i > 1 ? 0.7 : 1), low: 45, punch: 112, decay: 8, send: 0.04 }))
    if (l.snare) [4, 12].forEach((p) => snare(m, at(p), { gain: 0.21, tone: 175, send: 0.3 }))
    if (l.ghost) [7, 15].forEach((p) => snare(m, at(p), { gain: 0.045, tone: 200, send: 0.2 }))
    if (l.clap) [4, 12].forEach((p) => clap(m, at(p), { gain: 0.09 }))
    if (l.hat) for (let p = 0; p < 16; p += 2) hat(m, at(p), { gain: 0.045 * l.hat * (p % 4 ? 0.7 : 1), pan: 0.25, open: !!l.stab && p === 14 })
    if (l.stab) [0, 10].forEach((p) => pad(m, at(p), c.sx * 2.2, chord(pc, q, 5), { gain: 0.04, att: 0.008, rel: 0.12, lp: 0.2, saws: 0.8, send: 0.3, wide: 0.3 }))
    if (l.mel) MEL[c.k % 4].forEach(([p, ix, d]) => pad(m, at(p), d * c.sx, [chord(pc, q, 5)[ix % 4] + 12], { gain: 0.05 * l.mel, att: 0.02, rel: 0.25, lp: 0.18, saws: 0.3, vib: 0.003, send: 0.4, wide: 0 }))
  }, { wet: 0.22, fb: 0.8, vinyl: 0.02 })
}

// ================= Plot Twist — playful surprises, 120 BPM, C major (stops, half-time, key changes) =================
function plotTwist() {
  const C = [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], M = [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']]
  const full = { bass: 1, kick: 1, clap: 1, hat: 1, pizz: 1, stab: 1, lead: 1, crash: 1, stutter: 1 }
  const build = { pizz: 1, bass: 1, kick: 0.8, hat: 1, roll: 1, riser: 1, stop: 1 }
  const secs = [
    { bars: 8, prog: C, l: { pizz: 1, bell: 1 } },
    { bars: 8, prog: C, l: { pizz: 1, bell: 0.6, bass: 1, kick: 0.5, hat: 1 } },
    { bars: 8, prog: C, l: build },
    { bars: 16, prog: C, l: full },
    { bars: 8, prog: M, l: { half: 1, bass: 1, bell: 1 } },
    { bars: 8, prog: M, l: build },
    { bars: 16, prog: C, sh: 2, l: full },
    { bars: 8, prog: M, sh: 2, l: { bell: 1, pad: 1 } },
    { bars: 8, prog: C, sh: 2, l: build },
    { bars: 20, prog: C, sh: 4, l: { ...full, lead2: 1, pad: 1 } },
    { bars: 12, prog: C, sh: 4, l: { pizz: 1, bell: 1 } },
  ]
  const LEAD = [[[0, 2, 1.5], [1.5, 1, 0.5], [2, 3, 1], [3, 2, 1]], [[0, 1, 1], [1, 2, 1], [2, 3, 2]], [[0, 2, 1.5], [1.5, 4, 0.5], [2, 3, 1], [3, 2, 1]], [[0, 3, 3]]]
  compose('music-plot-twist', 120, secs, (m, c) => {
    const [pc0, q] = chordAt(c.s, c.k), pc = pc0 + (c.s.sh ?? 0), l = c.l, up = chord(pc, q, 4)
    if (l.stop && c.last) { pluck(m, c.t + 3.5 * c.beat, mtof(root(pc, 4) + 12), 0.4, { gain: 0.14, ring: 0.3, send: 0.5 }); return } // the surprise: everything cuts out, one cheeky pluck
    if (c.k === 0 && l.crash) crash(m, c.t)
    if (l.riser && c.k === c.s.bars - 4) riser(m, c.t, c.bar * 3, { gain: 0.1 })
    if (l.pad) pad(m, c.t, c.bar, chord(pc, q, 3).concat(up[0]), { gain: 0.06, att: 0.4, rel: 0.4, lp: 0.07, saws: 0.4, send: 0.5 })
    if (l.pizz) [0, 2, 1, 2, 0, 2, 1, 2].forEach((ix, s) => pluck(m, c.t + (s * c.beat) / 2, mtof(up[ix] + (s % 4 === 3 ? 12 : 0)), c.beat * 0.45, { gain: 0.13 * l.pizz, ring: 0.12, bright: 0.8, pan: s % 2 ? 0.3 : -0.3, send: 0.25 }))
    if (l.bell) [0, 1.5, 2, 3.5].forEach((b, i) => key(m, c.t + b * c.beat, mtof(chord(pc, q, 6)[i % 3]), c.beat * 1.5, { gain: 0.05 * l.bell, tine: 1.8, decay: 4, send: 0.6, pan: i % 2 ? 0.4 : -0.4 }))
    if (l.bass && !l.half) for (let s = 0; s < 8; s++) bass(m, c.t + (s * c.beat) / 2, mtof(root(pc, 2) + (s % 2 ? 12 : 0)), c.beat * 0.35, { gain: 0.24 * (s % 2 ? 0.6 : 1), decay: 4 })
    if (l.bass && l.half) bass(m, c.t, mtof(root(pc, 2)), c.beat * 3.2, { gain: 0.3, decay: 1.4 })
    if (l.kick && !l.half) for (let b = 0; b < 4; b++) if (l.kick >= 1 || b % 2 === 0) kick(m, c.t + b * c.beat, { gain: 0.48 * Math.min(1, l.kick) })
    if (l.half) { kick(m, c.t, { gain: 0.5, low: 48, punch: 100, decay: 7 }); snare(m, c.t + 2 * c.beat, { gain: 0.3, tone: 150, send: 0.5 }) }
    if (l.half) [0, 2].forEach((b) => pad(m, c.t + b * c.beat, c.beat * 1.8, [chord(pc, q, 5)[b ? 2 : 0]], { gain: 0.06, att: 0.04, rel: 0.2, lp: 0.2, saws: 0.6, vib: 0.012, send: 0.5, wide: 0 }))
    if (l.clap) [1, 3].forEach((b) => clap(m, c.t + b * c.beat, { gain: 0.15 }))
    if (l.hat) for (let s = 0; s < 8; s++) hat(m, c.t + (s * c.beat) / 2, { gain: 0.05 * (s % 2 ? 1.3 : 0.5), open: s % 2 === 1 && l.kick >= 1 })
    if (l.stab) [1.5, 3, 3.5].forEach((b) => pad(m, c.t + b * c.beat, c.beat * 0.3, up, { gain: 0.045, att: 0.005, rel: 0.1, lp: 0.22, saws: 0.7, send: 0.3 }))
    if (l.stutter && c.k % 8 === 7 && !c.last) for (let s = 0; s < 4; s++) snare(m, c.t + 3 * c.beat + s * c.sx * 1, { gain: 0.1 + s * 0.04, tone: 220, send: 0.3 })
    if (l.lead || l.lead2) LEAD[c.k % 4].forEach(([b, ix, d]) => pad(m, c.t + b * c.beat, d * c.beat, [phraseNote(pc, q, ix) + (l.lead2 ? 12 : 0)], { gain: 0.06, att: 0.02, rel: 0.12, lp: 0.3, saws: 0.5, vib: 0.004, send: 0.5, wide: 0 }))
    if (l.roll) rollBars(m, c, c.s.l.stop ? 1 : 0)
  }, { wet: 0.25, fb: 0.82, tp: -3 })
}

// ================= Good Vibes — sunny feel-good groove, 100 BPM, A major (lifts up a tone at the end) =================
function goodVibes() {
  const A = [[9, 'maj'], [4, 'maj'], [6, 'min'], [2, 'maj']], B = [[6, 'min'], [2, 'maj'], [9, 'maj'], [4, 'maj']]
  const groove = { bass: 1, kick: 1, clap: 1, shaker: 1, strum: 1 }
  const chorus = { ...groove, hat: 1, stab: 1, lead: 1, pad: 1, crash: 1 }
  const secs = [
    { bars: 4, prog: A, l: { strum: 1, clap: 1 } },
    { bars: 12, prog: A, l: { ...groove, kick: 0.6 } },
    { bars: 8, prog: B, l: { ...groove, stab: 0.8, roll: 1, riser: 1 } },
    { bars: 16, prog: A, l: chorus },
    { bars: 8, prog: B, l: { strum: 1, key: 1, clap: 1, shaker: 1 } },
    { bars: 12, prog: A, l: { ...groove, stab: 1, key: 0.8 } },
    { bars: 8, prog: B, l: { ...groove, stab: 1, roll: 1, riser: 1 } },
    { bars: 16, prog: A, l: { ...chorus, lead2: 1 } },
    { bars: 12, prog: A, sh: 2, l: { ...chorus, lead2: 1, pad2: 1 } },
    { bars: 4, prog: A, sh: 2, l: { strum: 1, clap: 1, key: 1 } },
  ]
  const LEAD = [[[2, 0, 1], [3, 1, 0.5], [2, 1.5, 0.5], [1, 2, 1], [2, 3, 1]], [[3, 0, 1.5], [2, 1.5, 0.5], [1, 2, 2]], [[2, 0, 1], [3, 1, 1], [4, 2, 1], [3, 3, 1]], [[2, 0, 0.5], [1, 0.5, 0.5], [0, 1, 3]]]
  compose('music-good-vibes', 100, secs, (m, c) => {
    const [pc0, q] = chordAt(c.s, c.k), pc = pc0 + (c.s.sh ?? 0), l = c.l, ch = chord(pc, q, 3), up = chord(pc, q, 4)
    if (c.k === 0 && l.crash) crash(m, c.t)
    if (l.riser && c.k === c.s.bars - 4) riser(m, c.t, c.bar * 4, { gain: 0.1 })
    if (l.pad) pad(m, c.t, c.bar, [...ch, up[0]], { gain: 0.05, att: 0.3, rel: 0.4, lp: 0.08, saws: 0.5, send: 0.5 })
    if (l.pad2) pad(m, c.t, c.bar, chord(pc, q, 5), { gain: 0.025, att: 0.3, lp: 0.14, saws: 0.5, send: 0.6 })
    if (l.strum) [0.5, 1.5, 2.5, 3.5].forEach((b) => ch.forEach((n, i) => pluck(m, c.t + b * c.beat + i * 0.012, mtof(n + 12), c.beat * 0.3, { gain: 0.07, ring: 0.15, bright: 0.8, pan: -0.2 + i * 0.12, send: 0.2 })))
    if (l.key) [0, 2.5].forEach((b) => up.forEach((n, i) => key(m, c.t + b * c.beat + i * 0.01, mtof(n), c.beat * 1.6, { gain: 0.06 * l.key, decay: 2.2, tine: 0.9, send: 0.5, pan: 0.15 + i * 0.1 })))
    if (l.bass) [0, 3, 6, 8, 10, 13].forEach((p) => bass(m, c.t + p * c.sx, mtof(root(pc, 2) + (p === 6 || p === 13 ? 12 : 0)), c.sx * (p === 0 ? 3 : 1.6), { gain: 0.26 * (p === 0 ? 1 : 0.75), decay: 4 }))
    if (l.kick) for (let b = 0; b < 4; b++) if (l.kick >= 1 || b % 2 === 0) kick(m, c.t + b * c.beat, { gain: 0.42 * Math.min(1, l.kick), low: 48, punch: 110, decay: 9 })
    if (l.clap) [1, 3].forEach((b) => clap(m, c.t + b * c.beat, { gain: 0.16 }))
    if (l.shaker) for (let s = 0; s < 16; s++) hat(m, c.t + s * c.sx, { gain: 0.026 * (s % 4 === 2 ? 1.6 : 1), pan: -0.3 })
    if (l.hat) for (let s = 1; s < 8; s += 2) hat(m, c.t + (s * c.beat) / 2, { gain: 0.05, open: true, pan: 0.3 })
    if (l.stab) [0, 1.5, 3].forEach((b) => pad(m, c.t + b * c.beat, c.beat * 0.35, [...up, up[0] + 12], { gain: 0.045 * l.stab, att: 0.01, rel: 0.1, lp: 0.25, saws: 0.85, send: 0.3, wide: 0.3 }))
    if (l.lead || l.lead2) LEAD[c.k % 4].forEach(([ix, b, d]) => pad(m, c.t + b * c.beat, d * c.beat, [phraseNote(pc, q, ix) + (l.lead2 ? 12 : 0)], { gain: 0.06, att: 0.03, rel: 0.2, lp: 0.3, saws: 0.1, vib: 0.006, send: 0.5, wide: 0 }))
    if (l.roll) rollBars(m, c)
  }, { wet: 0.2, fb: 0.78 })
}

const all = { trailhead, 'open-road': openRoad, summit, 'golden-hour': goldenHour, drift, 'boom-bap': boomBap, 'plot-twist': plotTwist, 'good-vibes': goodVibes }
const wanted = process.argv.slice(2)
for (const [name, fn] of Object.entries(all)) if (!wanted.length || wanted.includes(name)) { seed = 20261009; fn() }
