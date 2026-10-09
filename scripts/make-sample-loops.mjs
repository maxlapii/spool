// Synthesises two short royalty-free instrumental loops used by the bundled templates.
// Output: server/samples/*.mp3 (copied into data/assets by the API server on start).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static')
const SR = 44100

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12) // MIDI → Hz
const chordNotes = { Cmaj7: [60, 64, 67, 71], G: [55, 59, 62, 67], Am7: [57, 60, 64, 67], Fmaj7: [53, 57, 60, 64], Dm7: [50, 53, 57, 60], Em7: [52, 55, 59, 62], Bbmaj7: [58, 62, 65, 69] }

function synth({ name, bpm, seconds, chords, melody, kick = true, hat = true, bassOctave = 36, padGain = 0.16, pluckGain = 0.12, lowpass = 0.12 }) {
  const n = Math.round(SR * seconds)
  const L = new Float32Array(n)
  const R = new Float32Array(n)
  const beat = 60 / bpm
  const bar = beat * 4
  const barsPerChord = 2
  const tri = (ph) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1
  const env = (t, a, d, s, r, len) => (t < 0 ? 0 : t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : t < len ? s : Math.max(0, s * (1 - (t - len) / r)))

  // Pad: detuned triangles per chord, low-passed by a one-pole filter per channel
  let lpL = 0, lpR = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const chordIdx = Math.floor(t / (bar * barsPerChord)) % chords.length
    const chord = chordNotes[chords[chordIdx]]
    const tc = t - Math.floor(t / (bar * barsPerChord)) * bar * barsPerChord
    const e = env(tc, 0.6, 1.0, 0.8, 1.2, bar * barsPerChord - 0.4)
    let sL = 0, sR = 0
    for (let k = 0; k < chord.length; k++) {
      const f = NOTE(chord[k])
      sL += tri(t * f * 1.002 + k * 0.17) + 0.5 * tri(t * f * 0.998 + k * 0.31)
      sR += tri(t * f * 0.997 + k * 0.23) + 0.5 * tri(t * f * 1.003 + k * 0.11)
    }
    lpL += lowpass * (sL / chord.length - lpL)
    lpR += lowpass * (sR / chord.length - lpR)
    L[i] += lpL * padGain * e
    R[i] += lpR * padGain * e
  }
  // Bass: root on beats 1 & 3, sine with pluck envelope
  for (let b = 0; b * beat < seconds; b += 2) {
    const start = b * beat
    const chordIdx = Math.floor(start / (bar * barsPerChord)) % chords.length
    const f = NOTE(chordNotes[chords[chordIdx]][0] - 12 + (bassOctave - 48))
    for (let i = Math.floor(start * SR); i < Math.min(n, Math.floor((start + beat * 1.8) * SR)); i++) {
      const t = i / SR - start
      const e = env(t, 0.01, 0.3, 0.5, 0.3, beat * 1.5)
      const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * 0.22 * e
      L[i] += v; R[i] += v
    }
  }
  // Melody plucks on 8ths following a pattern of chord-tone offsets
  for (let s = 0; s * beat / 2 < seconds; s++) {
    const idx = melody[s % melody.length]
    if (idx === null) continue
    const start = s * beat / 2
    const chordIdx = Math.floor(start / (bar * barsPerChord)) % chords.length
    const chord = chordNotes[chords[chordIdx]]
    const f = NOTE(chord[idx % chord.length] + 12 * Math.floor(idx / chord.length) + 12)
    const pan = 0.5 + 0.4 * Math.sin(s * 0.7)
    for (let i = Math.floor(start * SR); i < Math.min(n, Math.floor((start + 0.6) * SR)); i++) {
      const t = i / SR - start
      const e = Math.exp(-t * 7)
      const v = (tri(t * f) * 0.6 + Math.sin(2 * Math.PI * f * t) * 0.4) * pluckGain * e
      L[i] += v * (1 - pan); R[i] += v * pan
    }
  }
  // Drums
  for (let b = 0; b * beat < seconds; b++) {
    const start = b * beat
    if (kick) for (let i = Math.floor(start * SR); i < Math.min(n, Math.floor((start + 0.3) * SR)); i++) {
      const t = i / SR - start
      const f = 50 + 110 * Math.exp(-t * 28)
      const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.5
      L[i] += v; R[i] += v
    }
    if (hat) {
      const hs = start + beat / 2
      let seed = 1234 + b
      for (let i = Math.floor(hs * SR); i < Math.min(n, Math.floor((hs + 0.06) * SR)); i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        const t = i / SR - hs
        const v = ((seed / 0x7fffffff) * 2 - 1) * Math.exp(-t * 70) * 0.09
        L[i] += v; R[i] += v
      }
    }
  }
  // Master: fade in/out, soft clip, normalise
  let peak = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const fade = Math.min(1, t / 0.8) * Math.min(1, (seconds - t) / 2.5)
    L[i] = Math.tanh(L[i] * 1.4) * fade
    R[i] = Math.tanh(R[i] * 1.4) * fade
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  }
  const g = 0.85 / peak
  const buf = Buffer.alloc(44 + n * 4)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4)
    buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4)
  }
  const wav = path.join('server/samples', `${name}.wav`)
  const mp3 = path.join('server/samples', `${name}.mp3`)
  fs.writeFileSync(wav, buf)
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', mp3])
  fs.unlinkSync(wav)
  console.log('wrote', mp3, fs.statSync(mp3).size, 'bytes')
}

synth({ name: 'sample-sunrise', bpm: 100, seconds: 32, chords: ['Cmaj7', 'G', 'Am7', 'Fmaj7'], melody: [0, null, 2, 3, null, 2, 1, null, 4, null, 2, null, 3, 2, null, 1] })
synth({ name: 'sample-lofi', bpm: 78, seconds: 32, chords: ['Dm7', 'Bbmaj7', 'Fmaj7', 'Em7'], melody: [null, 2, null, 0, null, 3, null, 1, null, null, 2, null, 4, null, null, 1], hat: true, padGain: 0.2, pluckGain: 0.09, lowpass: 0.06 })
