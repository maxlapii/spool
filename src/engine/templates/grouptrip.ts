/**
 * "Group trip story": a 16:9 film for a friends' bus trip, in six sections that each get their own music,
 * crossfaded on two audio tracks:
 *   1 intro (slow, lazy)  →  2 route map with a bus (chill, then up)  →  3 activities (smooth, romantic)
 *   →  4 group fun (hip, then enjoy)  →  5 each member talks (smooth, kept low under the voices)  →  6 close (slowing down)
 * Every section is storyboarded in whole bars of its song, so the animation lands on the beat. All layers are
 * ordinary editable layers: the map is built from shapes (replace it with your own Google Maps screenshot or
 * screen recording), the route draws itself, the bus drives it with keyframes, and footage frames are placeholders.
 */
import type { Animations, Project } from '@/types'
import type { TemplateDef } from './travel'
import { TemplateBuilder } from './helpers'
import { uid } from '@/utils/id'
import {
  bigStatement, bigWord, boxHeight, caption, chapterCard, dayChip, endCard, Film, locationTag, lowerThird, polaroid, progress, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { expectEnd, filmAt, fmt, mixMusic, plan, totalOf, type Part } from './mixes'

const GROUP: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Plus Jakarta Sans', accent: '#ff6a2b', ink: '#ffffff', mute: 'rgba(255,255,255,0.86)', dark: '#13141f', tones: ['#6aa7b0', '#d98c5f', '#7a92c9', '#3ecfaf', '#e0508a', '#c9b06a'] }
const WARM = ['#e0a07a', '#d48a8a', '#e6b98a', '#c98aa0']
const ROUTE = '#3a8df7'
const INK = '#14202e'
type Tr = NonNullable<Parameters<typeof shot>[4]>['tr']

const PARTS: Part[] = [
  { track: 'music-drift', fromBar: 0, bars: 8 }, // 1 intro: slow and lazy
  { track: 'music-trailhead', fromBar: 16, bars: 20 }, // 2 map: chill verse, build, chorus drop on arrival
  { track: 'music-golden-hour', fromBar: 20, bars: 16 }, // 3 activities: smooth and romantic
  { track: 'music-boom-bap', fromBar: 36, bars: 12 }, // 4a group fun: hip
  { track: 'music-good-vibes', fromBar: 24, bars: 12 }, // 4b group fun: enjoy
  { track: 'music-drift', fromBar: 24, bars: 24, volume: 0.5 }, // 5 members talking: smooth, low
  { track: 'music-golden-hour', fromBar: 76, bars: 8 }, // 6 close: slowing down
]
const MUSIC_LABEL = 'Drift + Trailhead + Golden Hour + Boom Bap + Good Vibes'

const fade = (d = 1, delay = 0): NonNullable<Animations['in']> => ({ preset: 'fade', duration: d, easing: 'sine-in-out', delay })
const out = (d = 0.9): NonNullable<Animations['out']> => ({ preset: 'fade', duration: d, easing: 'sine-in-out' })
const kf = (property: 'x' | 'y' | 'scale' | 'opacity' | 'width', time: number, value: number, easing: Animations['keyframes'][number]['easing'] = 'sine-in-out') => ({ id: uid('kf'), property, time, value, easing })

// =============================================================================================
// Section 2: the map
// =============================================================================================
type Pt = [number, number]
const A: Pt = [250, 830]
const WAY: Pt[] = [[560, 640], [900, 740], [1180, 470], [1500, 700]]
const B: Pt = [1700, 300]
/** Bar (from the section start) at which the bus reaches each point: A, 4 stops, B. The first drive starts at bar 2. */
const ARRIVE = [2, 5, 8, 11, 14, 16]

function mapScene(b: TemplateBuilder, F: Film) {
  const t0 = F.time
  const total = F.at(20)
  F.scene(20)
  const bar = F.bar
  const at = (bars: number) => t0 + bars * bar
  const rel = (bars: number) => bars * bar
  const pts: Pt[] = [A, ...WAY, B]

  // --- the stylised map (replace with your own screenshot / screen recording) ---
  b.rect({ name: 'Map base · replace with your Google Maps screenshot', track: 'Footage', start: t0, duration: total, fill: '#f3f6ef', gradient: { to: '#e8efe4', angle: 160 }, x: 0, y: 0, width: b.w, height: b.h, transition: { type: 'blur-dissolve', duration: Math.min(1.4, F.at(1)) } })
  const decor = (name: string, fill: string, x: number, y: number, w: number, h: number, o: { radius?: number; rot?: number; shape?: 'rect' | 'ellipse' } = {}) =>
    b.rect({ name, track: 'Map', start: t0, duration: total, fill, x, y, width: w, height: h, radius: o.radius ?? 0, rotation: o.rot ?? 0, shape: o.shape, in: fade(1.2), out: out(1) })
  decor('Sea', '#b4d9f2', 1300, 820, 1000, 600, { shape: 'ellipse' })
  decor('River', '#c3def0', 760 - 750, 540 - 17, 1500, 34, { rot: 70, radius: 17 })
  decor('Park', '#cfe8c1', 150, 130, 360, 210, { radius: 28 })
  decor('Park 2', '#cfe8c1', 1000, 820, 260, 170, { radius: 28 })
  decor('Blocks west', '#dfe6da', 150, 720, 300, 220, { radius: 20 })
  decor('Blocks east', '#dfe6da', 1560, 130, 300, 200, { radius: 20 })
  for (const y of [300, 900]) decor(`Road y${y}`, '#ffffff', -50, y, b.w + 100, 16, { radius: 8 })
  for (const x of [480, 1640]) decor(`Road x${x}`, '#ffffff', x, -50, 16, b.h + 100, { radius: 8 })
  decor('Highway', '#f7d08a', 960 - 1150, 540 - 13, 2300, 26, { rot: -22, radius: 13 })

  // --- headline ---
  const mx = F.mx
  b.text({ text: 'DAY 1 · THE ROUTE', track: 'Chips', start: at(0.3), duration: rel(15.6), x: mx, y: 70, width: 330, height: 46, font: GROUP.sans, size: 21, weight: 700, letterSpacing: 5, color: '#ffffff', pill: GROUP.accent, padding: 12, radius: 8, align: 'center', in: { preset: 'drift', duration: 0.9, delay: 0.1 }, out: out(0.8) })
  b.text({ text: 'Bangkok to Chiang Mai', track: 'Text', start: at(0.3), duration: rel(15.6), x: mx, y: 130, width: 820, height: 96, font: GROUP.heading, size: 70, weight: 700, color: INK, align: 'left', lineHeight: 1.05, letterSpacing: -1, in: { preset: 'rise', duration: 1.1, delay: 0.3 }, out: out(0.8) })
  b.text({ text: '700 km · 10 hours · 6 friends · 1 very loud bus', track: 'Text', start: at(0.3), duration: rel(15.6), x: mx, y: 226, width: 820, height: 46, font: GROUP.sans, size: 28, weight: 500, color: '#44546a', align: 'left', in: { preset: 'rise', duration: 1, delay: 0.6 }, out: out(0.8) })

  // --- pins ---
  const pill = (text: string, x: number, y: number, w: number, start: number, dur: number, track = 'Chips') =>
    b.text({ text, track, start, duration: dur, x, y, width: w, height: 44, font: GROUP.sans, size: 22, weight: 700, letterSpacing: 3, color: '#ffffff', pill: INK, padding: 11, radius: 8, align: 'center', in: { preset: 'drift', duration: 0.8, delay: 0.2 }, out: out(0.8) })
  b.rect({ name: 'Departure pin', track: 'Pins', start: at(0.8), duration: total - rel(0.8), fill: '#2fbf71', stroke: '#ffffff', strokeWidth: 8, shape: 'ellipse', x: A[0] - 22, y: A[1] - 22, width: 44, height: 44, in: { preset: 'pop', duration: 0.6, easing: 'expo-out' }, out: out(0.9) })
  pill('DEPARTURE · BANGKOK', A[0] + 38, A[1] - 22, 400, at(0.9), total - rel(0.9))

  // --- route: drawn segment by segment as the bus drives it ---
  const H = 20
  pts.slice(0, -1).forEach((P, i) => {
    const Q = pts[i + 1]
    const dx = Q[0] - P[0]
    const dy = Q[1] - P[1]
    const L = Math.hypot(dx, dy)
    const start = at(ARRIVE[i])
    const dur = rel(ARRIVE[i + 1] - ARRIVE[i])
    b.rect({
      name: `Route ${i + 1}`, track: 'Route', start, duration: t0 + total - start, fill: ROUTE, stroke: '#ffffff', strokeWidth: 3,
      x: (P[0] + Q[0]) / 2 - (L + H) / 2, y: (P[1] + Q[1]) / 2 - H / 2, width: L + H, height: H, radius: H / 2, rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
      in: { preset: 'wipe', duration: dur, easing: 'sine-in-out' }, out: out(0.9),
    })
  })

  // --- bus (four editable layers moved together with keyframes) ---
  const busStart = at(1.4)
  const busDur = at(ARRIVE[5]) + rel(1) - busStart // parks for a beat after arriving, then leaves so the pin shows
  const track = (off: Pt) => {
    const k: Animations['keyframes'] = [kf('x', 0, A[0] + off[0], 'linear'), kf('y', 0, A[1] - 32 + off[1], 'linear')]
    pts.forEach((P, i) => {
      const time = rel(ARRIVE[i] - 1.4)
      if (i === 0) { k.push(kf('x', time, P[0] + off[0], 'linear'), kf('y', time, P[1] - 32 + off[1], 'linear')) } else { k.push(kf('x', time, P[0] + off[0]), kf('y', time, P[1] - 32 + off[1])) }
    })
    return k
  }
  const part = (name: string, fill: string, off: Pt, w: number, h: number, radius: number, shape: 'rect' | 'ellipse' = 'rect', delay = 0) =>
    b.rect({ name: `Bus · ${name}`, track: 'Bus', start: busStart, duration: busDur, fill, shape, x: A[0] + off[0], y: A[1] - 32 + off[1], width: w, height: h, radius, keyframes: track(off), in: { preset: 'pop', duration: 0.55, easing: 'expo-out', delay }, out: out(0.9) })
  // Front-most layer first: windows over the body, wheels tucked behind it.
  part('windows', '#a9d8ff', [-54, -21], 108, 20, 5, 'rect', 0.04)
  part('body', '#ffc83d', [-70, -29], 140, 58, 14)
  part('front wheel', '#262a36', [28, 18], 24, 24, 12, 'ellipse', 0.08)
  part('rear wheel', '#262a36', [-52, 18], 24, 24, 12, 'ellipse', 0.08)

  // --- stops: a quick thumbnail pops up where the bus pauses ---
  const thumbs: { label: string; at: [number, number]; ox: number; oy: number }[] = [
    { label: 'Ayutthaya', at: WAY[0], ox: -230, oy: -240 },
    { label: 'Sukhothai', at: WAY[1], ox: -100, oy: 70 },
    { label: 'Lampang', at: WAY[2], ox: -120, oy: -240 },
    { label: 'Chiang Rai', at: WAY[3], ox: -210, oy: 60 },
  ]
  thumbs.forEach((t, i) => {
    const arrive = at(ARRIVE[i + 1])
    const life = rel(2.2)
    const x = t.at[0] + t.ox
    const y = t.at[1] + t.oy
    // One layer per thumbnail: a footage frame with a white border (drop your photo or clip onto it).
    b.rect({ name: `Stop ${i + 1} · ${t.label} photo (replace with your clip)`, track: 'Thumbs', start: arrive - rel(0.1), duration: life, fill: GROUP.tones![i % 6], gradient: { to: 'rgba(0,0,0,0.33)', angle: 160 }, stroke: '#ffffff', strokeWidth: 10, x, y, width: 240, height: 160, radius: 14, in: { preset: 'pop', duration: 0.55, easing: 'expo-out' }, out: out(0.6) })
    b.text({ text: t.label.toUpperCase(), track: 'Chips', start: arrive - rel(0.1), duration: life, x: x + 20, y: y + 150, width: 200, height: 40, font: GROUP.sans, size: 19, weight: 700, letterSpacing: 3, color: '#ffffff', pill: ROUTE, padding: 9, radius: 8, align: 'center', in: { preset: 'rise', duration: 0.7, delay: 0.25 }, out: out(0.6) })
  })

  // --- arrival: pin, pulsing rings, welcome text and a quick row of thumbnails ---
  const arrive = at(ARRIVE[5])
  b.rect({ name: 'Arrival pin', track: 'Pins', start: arrive - rel(0.4), duration: t0 + total - arrive + rel(0.4), fill: '#e5484d', stroke: '#ffffff', strokeWidth: 8, shape: 'ellipse', x: B[0] - 28, y: B[1] - 28, width: 56, height: 56, in: { preset: 'pop', duration: 0.7, easing: 'expo-out' }, out: out(0.9) })
  for (let i = 0; i < 3; i++) {
    b.rect({
      name: `Arrival ring ${i + 1}`, track: 'Rings', start: arrive + i * 1.3, duration: 1.3, fill: 'rgba(229,72,77,0)', stroke: '#e5484d', strokeWidth: 5, shape: 'ellipse', x: B[0] - 28, y: B[1] - 28, width: 56, height: 56,
      keyframes: [kf('scale', 0, 1, 'quart-out'), kf('scale', 1.3, 3.2, 'quart-out'), kf('opacity', 0, 0.9, 'linear'), kf('opacity', 1.3, 0, 'linear')],
    })
  }
  pill('ARRIVAL · CHIANG MAI', B[0] - 470, B[1] - 22, 410, arrive - rel(0.2), t0 + total - arrive + rel(0.2))
  b.text({ text: 'WELCOME TO CHIANG MAI', track: 'Text', start: arrive, duration: t0 + total - arrive, x: mx, y: 880, width: 1100, height: 110, font: GROUP.heading, size: 84, weight: 800, color: INK, align: 'left', letterSpacing: -2, in: { preset: 'wipe', duration: 1.1, easing: 'quart-out' }, out: out(0.9) })
  ;['Old town', 'Night bazaar', 'Doi Suthep'].forEach((label, i) => {
    const x = 1130 + i * 230
    const st = arrive + rel(0.3) + i * 0.28
    const dur = t0 + total - st
    b.rect({ name: `Arrival highlight · ${label} (replace with your clip)`, track: 'Thumbs', start: st, duration: dur, fill: GROUP.tones![(i + 2) % 6], gradient: { to: 'rgba(0,0,0,0.33)', angle: 160 }, stroke: '#ffffff', strokeWidth: 9, x, y: 60, width: 200, height: 134, radius: 12, in: { preset: 'pop', duration: 0.5, easing: 'expo-out' }, out: out(0.8) })
  })
}

// =============================================================================================
// Section 5: one member card (talking video + name + wish)
// =============================================================================================
const CARD_TRANSITIONS: NonNullable<Tr>[] = [
  { type: 'blur-dissolve', duration: 1.2 }, { type: 'wipe', duration: 1 }, { type: 'crossfade', duration: 1.2 },
  { type: 'slide-left', duration: 1 }, { type: 'blur-dissolve', duration: 1.2 }, { type: 'zoom', duration: 1 },
]
function memberCard(F: Film, t: number, d: number, m: { n: number; name: string; role: string; wish: string }) {
  const { b, S } = F
  b.rect({ name: `Member ${m.n} backdrop`, track: 'Footage', start: t, duration: d, fill: S.dark, gradient: { to: '#1d2033', angle: 160 }, x: 0, y: 0, width: b.w, height: b.h, transition: CARD_TRANSITIONS[(m.n - 1) % CARD_TRANSITIONS.length] })
  const vx = F.mx
  const vw = 1000
  const vh = 600
  const vy = Math.round((b.h - vh) / 2)
  b.placeholder({ label: `Member ${m.n} · ${m.name} talking`, track: 'Panels', labelTrack: 'Hints', start: t, duration: d, color: S.tones![(m.n - 1) % 6], x: vx, y: vy, width: vw, height: vh, radius: 18, in: { preset: 'blur-in', duration: 1.4, easing: 'quart-out', delay: 0.2 }, out: out(0.8) })
  // a slim bar that fills while they speak
  b.rect({ name: 'Speaking time', track: 'Frames', start: t, duration: d, fill: S.accent, x: vx, y: vy + vh + 22, width: 2, height: 6, radius: 3, in: { preset: 'fade', duration: 0.8, delay: 0.8 }, out: out(0.8), keyframes: [kf('width', 0, 2, 'linear'), kf('width', d, vw, 'linear')] })
  b.rect({ name: 'Speaking track', track: 'Frames', start: t, duration: d, fill: 'rgba(255,255,255,0.14)', x: vx, y: vy + vh + 22, width: vw, height: 6, radius: 3, in: { preset: 'fade', duration: 0.8, delay: 0.8 }, out: out(0.8) })
  const x = vx + vw + 70
  const w = b.w - x - F.mx
  b.text({ text: `MEMBER ${String(m.n).padStart(2, '0')}`, track: 'Chips', start: t, duration: d, x, y: vy, width: 220, height: 46, font: S.sans, size: 21, weight: 700, letterSpacing: 5, color: '#ffffff', pill: S.accent, padding: 12, radius: 8, align: 'center', in: { preset: 'drift', duration: 0.9, delay: 0.5 }, out: out(0.8) })
  b.text({ text: m.name, track: 'Text', start: t, duration: d, x, y: vy + 78, width: w, height: 96, font: S.heading, size: 80, weight: 700, color: S.ink, align: 'left', letterSpacing: -1, in: { preset: 'rise', duration: 1.1, delay: 0.7 }, out: out(0.8) })
  b.text({ text: m.role, track: 'Text', start: t, duration: d, x, y: vy + 182, width: w, height: 44, font: S.sans, size: 28, weight: 500, color: S.mute, align: 'left', in: { preset: 'rise', duration: 1, delay: 0.95 }, out: out(0.8) })
  b.rect({ name: 'Member rule', track: 'Frames', start: t, duration: d, fill: S.accent, x, y: vy + 250, width: 90, height: 4, in: { preset: 'wipe', duration: 0.9, easing: 'quart-out', delay: 1.2 }, out: out(0.8) })
  b.text({ text: 'WISH FOR THE NEXT TRIP', track: 'Text', start: t, duration: d, x, y: vy + 288, width: w, height: 34, font: S.sans, size: 20, weight: 700, letterSpacing: 6, color: S.accent, align: 'left', in: { preset: 'rise', duration: 0.9, delay: 1.5 }, out: out(0.8) })
  const size = 40
  const h = boxHeight(m.wish, size, w, 1.3, 0.5)
  b.text({ text: `“${m.wish}”`, track: 'Text', start: t, duration: d, x, y: vy + 336, width: w, height: h, font: S.script, size, weight: 400, italic: true, lineHeight: 1.3, color: S.ink, align: 'left', in: { preset: 'blur-in', duration: 1.6, easing: 'quart-out', delay: 1.9 }, out: out(0.8) })
}

const MEMBERS = [
  { name: 'Mind', role: 'The trip planner', wish: 'A train across Japan, no schedule, just snacks.' },
  { name: 'Joy', role: 'Official photographer', wish: 'More sunsets with this exact crew.' },
  { name: 'Tom', role: 'Navigator', wish: 'Mountains next time. And a bus that never breaks down.' },
  { name: 'Anna', role: 'Snack manager', wish: 'A beach week, a hammock, and all of you.' },
  { name: 'Leo', role: 'Playlist DJ', wish: 'A road trip that ends at a real festival.' },
  { name: 'Mei', role: 'Memory keeper', wish: 'Let us make this a yearly tradition.' },
]

// =============================================================================================
// The film
// =============================================================================================
function groupTripStory(): Project {
  const pl = plan(PARTS)
  const dur = totalOf(pl)
  const b = new TemplateBuilder(`Group trip story · ${fmt(dur)}`, '16:9', dur, GROUP.dark)
  const film = (i: number) => filmAt(b, pl, i, GROUP)
  vignette(film(0), dur, 0.25)
  progress(film(0), dur)
  let F: Film
  let s: ReturnType<Film['scene']>

  // 1 · Intro — slow and lazy (Drift)
  F = film(0)
  s = F.scene(4)
  b.marker(s.t, '1 · Intro', '#6aa7b0')
  titleCard(F, s.t, s.d, { kicker: 'THE GANG · ONE BUS', title: 'The Lazy Road', subtitle: 'Six friends, one slow trip', tr: null })
  s = F.scene(2)
  shot(F, s.t, s.d, 'Morning at the bus station', { kb: 'in', tr: { type: 'blur-dissolve', duration: 1.6 } })
  locationTag(F, s.t + 1, s.d - 1.8, 'DEPARTURE', 'Bangkok · 07:30')
  s = F.scene(2)
  shot(F, s.t, s.d, 'Everyone boarding', { kb: 'right', tr: { type: 'crossfade', duration: 1.6 } })
  caption(F, s.t + F.at(0.3), F.at(1.5), 'No plans. Just a bus and a long road.')
  expectEnd(F, pl[0], 'groupTripStory')

  // 2 · The route — chill, then up (Trailhead)
  F = film(1)
  b.marker(F.time, '2 · The route', '#3a8df7')
  mapScene(b, F)
  expectEnd(F, pl[1], 'groupTripStory')

  // 3 · Activities — smooth and romantic (Golden Hour)
  F = film(2)
  s = F.scene(2)
  b.marker(s.t, '3 · Activities', '#e0788f')
  chapterCard(F, s.t, s.d, { num: '03', title: 'Moments', sub: 'ACTIVITIES · SUNSETS · TOGETHER', over: true, label: 'Activities · opening shot' })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Sunset kayak', { kb: 'in', tone: WARM[0] })
  lowerThird(F, s.t + 0.8, s.d - 1.6, { title: 'Sunset kayak', sub: 'Golden hour on the river', tag: 'ACTIVITY 01' })
  s = F.scene(3)
  shots(F, s.t, s.d, ['Night market', 'Street food'])
  lowerThird(F, s.t + 0.8, s.d - 1.6, { title: 'Night market', sub: 'Lanterns, noodles and too many snacks', tag: 'ACTIVITY 02' })
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Rooftop dinner', caption: 'candles and city lights', date: 'ACTIVITY 03', side: 'left', rot: -3, paper: '#fbeee6', ink: '#3a2428' })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Slow walk at sunset', { kb: 'out', tone: WARM[2] })
  caption(F, s.t + F.at(0.4), F.at(1.1), 'Some moments need no soundtrack.')
  caption(F, s.t + F.at(1.8), F.at(1.1), 'Except this one.')
  s = F.scene(2)
  triptych(F, s.t, s.d, ['Hand in hand', 'Golden light', 'Last light'])
  expectEnd(F, pl[2], 'groupTripStory')

  // 4a · Group fun — hip (Boom Bap)
  F = film(3)
  s = F.scene(2)
  b.marker(s.t, '4 · Group fun', '#ff6a2b')
  bigWord(F, s.t, s.d, 'GROUP MODE ON', { sub: 'ACTIVITIES · PHOTOS · CHAOS', bg: GROUP.accent, color: '#13141f', subColor: '#13141f' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Group game', 'Water fight', 'Karaoke', 'Pool jump'], { fast: true })
  dayChip(F, s.t + 0.5, F.at(3), 'GROUP ACTIVITY')
  s = F.scene(2)
  polaroid(F, s.t, s.d, { label: 'Group selfie', caption: 'twelve takes later', date: 'DAY 03', side: 'right', rot: 3, paper: '#1b1d2e', ink: '#f3f3f8' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Random photo 1', 'Random photo 2', 'Random photo 3', 'Random photo 4'], { fast: true })
  expectEnd(F, pl[3], 'groupTripStory')

  // 4b · Group fun — enjoy (Good Vibes)
  F = film(4)
  s = F.scene(4)
  shots(F, s.t, s.d, ['Joke clip 1', 'Blooper', 'Joke clip 2', 'Blooper 2'], { fast: true })
  dayChip(F, s.t + 0.5, F.at(3), 'BLOOPER REEL')
  s = F.scene(2)
  bigWord(F, s.t, s.d, 'WHO FELL ASLEEP?', { bg: '#3ecfaf', color: '#13141f' })
  s = F.scene(2)
  triptych(F, s.t, s.d, ['Funny face', 'Sleepy bus', 'Epic fail'])
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '6', label: 'FRIENDS' }, { value: '1', label: 'LOUD BUS' }, { value: '0 h', label: 'OF SLEEP' }], { label: 'Stats backdrop · group on the bus' })
  expectEnd(F, pl[4], 'groupTripStory')

  // 5 · Members — smooth, low under the voices (Drift)
  F = film(5)
  MEMBERS.forEach((m, i) => {
    s = F.scene(4)
    if (i === 0) b.marker(s.t, '5 · Members', '#9a5bf5')
    memberCard(F, s.t, s.d, { n: i + 1, ...m })
  })
  expectEnd(F, pl[5], 'groupTripStory')

  // 6 · Close — slowing down (Golden Hour outro)
  F = film(6)
  s = F.scene(3)
  b.marker(s.t, '6 · Thank you', '#c9b06a')
  thumbGrid(F, s.t, s.d, ['Sunset kayak', 'Night market', 'Group selfie', 'Joke clip', 'Rooftop dinner', 'On the bus'])
  s = F.scene(3)
  bigStatement(F, s.t, s.d, 'THE WHOLE GANG', { sub: 'SAME BUS NEXT TIME?', label: 'Group photo · everyone in frame' })
  s = F.scene(2)
  endCard(F, s.t, s.d, { title: 'Thank you', sub: 'For every mile and every laugh', handle: '@yourgang' })
  expectEnd(F, pl[6], 'groupTripStory')

  // Layer order, front to back (the map pieces only exist during section 2).
  b.groups('Progress', 'Chips', 'Caption', 'Text', 'Bus', 'Rings', 'Thumbs', 'Frames', 'Panels', 'Hints', 'Pins', 'Route', 'Map', 'Scrim', 'Vignette', 'Footage')
  mixMusic(b, pl, { xf: 2.4, fadeOut: 5 })
  return b.done()
}

/** Six thumbnails popping in one after another on a dark card. */
function thumbGrid(F: Film, t: number, d: number, labels: string[]) {
  const { b, S } = F
  b.rect({ name: 'Thumbnails backdrop', track: 'Footage', start: t, duration: d, fill: S.dark, gradient: { to: '#1d2033', angle: 160 }, x: 0, y: 0, width: b.w, height: b.h, transition: { type: 'blur-dissolve', duration: Math.min(1.4, d * 0.4) } })
  b.text({ text: 'OUR TRIP IN SIX FRAMES', track: 'Text', start: t, duration: d, x: F.mx, y: 86, width: b.w - F.mx * 2, height: 60, font: S.sans, size: 30, weight: 700, letterSpacing: 10, color: S.accent, align: 'center', in: { preset: 'rise', duration: 1, delay: 0.2 }, out: out(0.8) })
  const gap = 28
  const w = 520
  const h = 292
  const x0 = Math.round((b.w - (w * 3 + gap * 2)) / 2)
  const y0 = 196
  labels.forEach((label, i) => {
    const x = x0 + (i % 3) * (w + gap)
    const y = y0 + Math.floor(i / 3) * (h + gap)
    b.placeholder({ label: `Thumbnail · ${label}`, track: 'Panels', silent: true, start: t, duration: d, color: S.tones![i % 6], x, y, width: w, height: h, radius: 16, in: { preset: 'blur-in', duration: 1.1, easing: 'quart-out', delay: 0.5 + i * 0.4 }, out: out(0.8) })
  })
}

const GROUP_PLAN = plan(PARTS)
const MAP_PREVIEW = GROUP_PLAN[1].start + 12.5 * GROUP_PLAN[1].bar

export const GROUP_TEMPLATES: TemplateDef[] = [
  {
    id: 'group-trip-story', name: 'Group trip story',
    description: `A friends' bus trip in six sections (${fmt(totalOf(GROUP_PLAN))}): lazy intro, an animated route map with a driving bus and stop thumbnails, romantic activities, hip and fun group clips, each member's wish for the next trip, and a thank-you. Seven songs crossfade between sections.`,
    category: 'travel', aspect: '16:9', duration: totalOf(GROUP_PLAN), previewTime: MAP_PREVIEW, music: MUSIC_LABEL, build: groupTripStory,
  },
]
