/**
 * Reusable cinematic scenes for the long travel & adventure templates. Every scene is built from
 * ordinary layers (text, shapes, footage placeholders) with natural easing — slow settles, soft
 * blur-ins, wipes and dissolves — so the results read as edited films rather than slide decks.
 */
import type { TransitionType } from '@/types'
import { uid } from '@/utils/id'
import { MONTAGE_COLORS, shade, type KenBurns, type TemplateBuilder } from './helpers'

export interface Style {
  heading: string
  script: string
  sans: string
  accent: string
  /** Primary text colour over footage. */
  ink: string
  /** Secondary text colour over footage. */
  mute: string
  /** Solid backgrounds for cards. */
  dark: string
  /** Colours cycled by footage placeholders. */
  tones?: string[]
}

type Tr = { type: TransitionType; duration: number }

/** Layer groups, front-to-back. Lanes inside each group are allocated automatically. */
export const FILM_GROUPS = ['Progress', 'Letterbox', 'Chips', 'Caption', 'Text', 'Frames', 'Panels', 'Hints', 'Scrim', 'Vignette', 'Footage']

export class Film {
  readonly u: number
  readonly mx: number
  readonly portrait: boolean
  readonly bar: number
  /** Top/bottom inset kept clear of text (letterbox bars). */
  safe = 0
  private cursor: number
  private shotIndex = 0

  /** `start` lets a film continue after another section with a different tempo (multi-song templates). */
  constructor(readonly b: TemplateBuilder, readonly S: Style, bpm: number, start = 0) {
    this.cursor = start
    this.u = Math.min(b.w, b.h) / 1080
    this.portrait = b.h > b.w
    this.mx = Math.round(b.w * (this.portrait ? 0.08 : 0.07))
    this.bar = (60 / bpm) * 4
    b.groups(...FILM_GROUPS)
  }

  /** Seconds for a number of bars. */
  at(bars: number) { return bars * this.bar }

  /** Claim the next `bars` of the film. */
  scene(bars: number) {
    const t = this.cursor
    this.cursor += this.at(bars)
    return { t, d: this.at(bars), bars }
  }

  get time() { return this.cursor }

  nextTone() { return (this.S.tones ?? MONTAGE_COLORS)[this.shotIndex++ % (this.S.tones ?? MONTAGE_COLORS).length] }
}

/** Rough text-box height for `text` at `size` wrapped to `width`. */
export function boxHeight(text: string, size: number, width: number, lineHeight = 1.15, charWidth = 0.56) {
  const perLine = Math.max(1, Math.floor(width / (size * charWidth)))
  const lines = text.split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0)
  return Math.ceil(lines * size * lineHeight)
}

const DISSOLVES: [TransitionType, number][] = [['blur-dissolve', 0.9], ['crossfade', 1], ['wipe', 0.8], ['blur-dissolve', 0.9], ['slide-left', 0.8], ['zoom', 0.9]]
const KB: KenBurns[] = ['in', 'left', 'out', 'right', 'up']

// ---------------------------------------------------------------------------------------------
// Footage
// ---------------------------------------------------------------------------------------------

/** One slowly moving shot filling [t, t+d). */
export function shot(F: Film, t: number, d: number, label: string, o: { kb?: KenBurns; tr?: Tr | null; tone?: string } = {}) {
  const i = F.b.p.clips.length
  const tr = o.tr === null ? undefined : o.tr ?? { type: DISSOLVES[i % DISSOLVES.length][0], duration: Math.min(DISSOLVES[i % DISSOLVES.length][1], d * 0.5) }
  F.b.shot({ label, start: t, duration: d, color: o.tone ?? F.nextTone(), kb: o.kb ?? KB[i % KB.length], track: 'Footage', labelTrack: 'Hints', transition: tr })
}

/** A run of shots splitting [t, t+d) evenly. `fast` uses short, crisp transitions for montage. */
export function shots(F: Film, t: number, d: number, labels: string[], o: { fast?: boolean; trIn?: Tr | null } = {}) {
  const each = d / labels.length
  labels.forEach((label, i) => {
    const type: TransitionType = o.fast ? (['slide-left', 'zoom', 'wipe', 'crossfade'] as const)[i % 4] : DISSOLVES[(F.b.p.clips.length + i) % DISSOLVES.length][0]
    const dur = Math.min(o.fast ? 0.35 : DISSOLVES[i % DISSOLVES.length][1], each * 0.5)
    const tr: Tr | null = i === 0 ? (o.trIn === undefined ? { type: 'blur-dissolve', duration: Math.min(0.9, each * 0.5) } : o.trIn) : { type, duration: dur }
    shot(F, t + i * each, each, label, { tr })
  })
}

// ---------------------------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------------------------

/** Cinematic black bars over the whole film. */
export function letterbox(F: Film, duration: number, thickness = 0.085) {
  const { b } = F
  const h = Math.round(b.h * thickness)
  b.rect({ name: 'Letterbox top', track: 'Letterbox', start: 0, duration, fill: '#000000', x: 0, y: 0, width: b.w, height: h })
  b.rect({ name: 'Letterbox bottom', track: 'Letterbox', start: 0, duration, fill: '#000000', x: 0, y: b.h - h, width: b.w, height: h })
  F.safe = h
  b.hintInset = thickness + 0.04
}

/** Soft edge darkening over the whole film for a natural, graded look. */
export function vignette(F: Film, duration: number, strength = 0.5) {
  F.b.rect({ name: 'Vignette', track: 'Vignette', start: 0, duration, fill: 'rgba(0,0,0,0)', gradient: { to: `rgba(0,0,0,${strength})`, angle: 0, type: 'radial' }, x: 0, y: 0, width: F.b.w, height: F.b.h })
}

/** Thin progress line along the bottom of the frame. */
export function progress(F: Film, duration: number) {
  const { b, u } = F
  const h = Math.max(4, Math.round(5 * u))
  b.rect({
    name: 'Progress', track: 'Progress', start: 0, duration, fill: F.S.accent, x: 0, y: b.h - h, width: 2, height: h,
    keyframes: [{ id: uid('kf'), property: 'width', time: 0, value: 2, easing: 'linear' }, { id: uid('kf'), property: 'width', time: duration, value: b.w, easing: 'linear' }],
  })
}

/** Gradient scrim so text stays readable over footage. */
export function scrim(F: Film, t: number, d: number, where: 'bottom' | 'top' | 'full' = 'bottom', strength = 0.62) {
  const { b } = F
  if (where === 'full') {
    b.rect({ name: 'Dim', track: 'Scrim', start: t, duration: d, fill: '#000000', opacity: strength * 0.7, in: { preset: 'fade', duration: 1, easing: 'sine-in-out' }, out: { preset: 'fade', duration: 0.8, easing: 'sine-in-out' } })
    return
  }
  const h = Math.round(b.h * 0.46)
  b.rect({
    name: where === 'bottom' ? 'Scrim bottom' : 'Scrim top', track: 'Scrim', start: t, duration: d, fill: 'rgba(0,0,0,0)', gradient: { to: `rgba(0,0,0,${strength})`, angle: where === 'bottom' ? 180 : 0 },
    x: 0, y: where === 'bottom' ? b.h - h : 0, width: b.w, height: h, in: { preset: 'fade', duration: 1, easing: 'sine-in-out' }, out: { preset: 'fade', duration: 0.8, easing: 'sine-in-out' },
  })
}

/** Thin keyline frame inset from the edges. */
export function keyline(F: Film, t: number, d: number, inset = 0.04) {
  const { b, u } = F
  const ix = Math.round(b.w * inset)
  const iy = Math.round(b.h * inset) + F.safe
  b.rect({
    name: 'Frame', track: 'Frames', start: t, duration: d, fill: 'rgba(0,0,0,0)', stroke: 'rgba(255,255,255,0.7)', strokeWidth: Math.max(2, Math.round(2 * u)),
    x: ix, y: iy, width: b.w - ix * 2, height: b.h - iy * 2, in: { preset: 'fade', duration: 1.4, easing: 'sine-in-out' }, out: { preset: 'fade', duration: 0.8, easing: 'sine-in-out' },
  })
}

// ---------------------------------------------------------------------------------------------
// Titles and cards
// ---------------------------------------------------------------------------------------------

function backdrop(F: Film, t: number, d: number, color: string, tr?: Tr | null) {
  F.b.rect({ name: 'Card backdrop', track: 'Footage', start: t, duration: d, fill: color, gradient: { to: shade(color, 0.12), angle: 160 }, transition: tr === null ? undefined : tr ?? { type: 'blur-dissolve', duration: Math.min(1, d * 0.4) } })
}

/** Full-screen title: kicker, big title that settles out of a blur, a drawn rule and a subtitle. */
export function titleCard(F: Film, t: number, d: number, o: { kicker?: string; title: string; subtitle?: string; bg?: string; tr?: Tr | null }) {
  const { b, S, u } = F
  backdrop(F, t, d, o.bg ?? S.dark, o.tr)
  const W = b.w - F.mx * 2
  const size = Math.round((F.portrait ? 108 : 138) * u * (o.title.length > 16 ? 0.74 : 1))
  const th = boxHeight(o.title, size, W, 1.05, 0.6)
  const kick = o.kicker ? Math.round(64 * u) : 0
  const sub = o.subtitle ? Math.round(120 * u) : 0
  let y = Math.round((b.h - (th + kick + sub + 40 * u)) / 2)
  const fadeOut = { preset: 'fade' as const, duration: 0.9, easing: 'sine-in-out' as const }
  if (o.kicker) {
    b.text({ text: o.kicker, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: Math.round(40 * u), font: S.sans, size: Math.round(27 * u), weight: 600, letterSpacing: 11, color: S.accent, in: { preset: 'rise', duration: 1, delay: 0.5 }, out: fadeOut })
    y += kick
  }
  b.text({ text: o.title, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: th, font: S.heading, size, weight: 700, lineHeight: 1.05, letterSpacing: -1, color: S.ink, shadow: 14, in: { preset: 'blur-in', duration: 1.8, easing: 'quart-out', delay: 0.8 }, out: fadeOut })
  y += th + Math.round(22 * u)
  b.rect({ name: 'Title rule', track: 'Frames', start: t, duration: d, fill: S.accent, x: Math.round((b.w - 140 * u) / 2), y, width: Math.round(140 * u), height: Math.max(3, Math.round(3 * u)), in: { preset: 'wipe', duration: 1.1, easing: 'quart-out', delay: 1.9 }, out: fadeOut })
  if (o.subtitle) b.text({ text: o.subtitle, track: 'Text', start: t, duration: d, x: F.mx, y: y + Math.round(36 * u), width: W, height: Math.round(60 * u), font: S.sans, size: Math.round(33 * u), weight: 400, letterSpacing: 2, color: S.mute, in: { preset: 'rise', duration: 1, delay: 2.2 }, out: fadeOut })
}

/** Chapter title: a large numeral and name. With `over`, it sits on a dimmed shot instead of a solid card. */
export function chapterCard(F: Film, t: number, d: number, o: { num: string; title: string; sub?: string; over?: boolean; bg?: string; tr?: Tr | null; label?: string }) {
  const { b, S, u } = F
  if (o.over) {
    shot(F, t, d, o.label ?? `Chapter ${o.num} · opening shot`, { kb: 'out', tr: o.tr })
    scrim(F, t, d, 'full', 0.7)
  } else backdrop(F, t, d, o.bg ?? S.dark, o.tr)
  const W = b.w - F.mx * 2
  const num = Math.round((F.portrait ? 190 : 230) * u)
  const title = Math.round((F.portrait ? 76 : 92) * u * (o.title.length > 18 ? 0.8 : 1))
  const th = boxHeight(o.title, title, W, 1.05, 0.58)
  const total = num * 0.82 + th + (o.sub ? 70 * u : 0)
  let y = Math.round((b.h - total) / 2)
  const out = { preset: 'fade' as const, duration: 0.8, easing: 'sine-in-out' as const }
  b.text({ text: o.num, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: num, font: S.heading, size: num, weight: 800, color: S.accent, align: 'left', lineHeight: 0.9, in: { preset: 'blur-in', duration: 1.6, easing: 'quart-out', delay: 0.3 }, out })
  y += Math.round(num * 0.82)
  b.text({ text: o.title, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: th, font: S.heading, size: title, weight: 700, align: 'left', lineHeight: 1.05, color: S.ink, shadow: 16, in: { preset: 'rise', duration: 1.2, delay: 0.9 }, out })
  y += th + Math.round(14 * u)
  if (o.sub) b.text({ text: o.sub, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: Math.round(50 * u), font: S.sans, size: Math.round(30 * u), weight: 500, letterSpacing: 3, color: S.mute, align: 'left', shadow: 10, in: { preset: 'rise', duration: 1, delay: 1.3 }, out })
  b.rect({ name: 'Chapter rule', track: 'Frames', start: t, duration: d, fill: S.accent, x: F.mx, y: Math.round((b.h - total) / 2) - Math.round(26 * u), width: Math.round(110 * u), height: Math.max(3, Math.round(3 * u)), in: { preset: 'wipe', duration: 1, easing: 'quart-out', delay: 0.1 }, out })
}

/** Lower-third: accent bar, title and subtitle with an optional tag chip, over a soft bottom scrim. */
export function lowerThird(F: Film, t: number, d: number, o: { title: string; sub?: string; tag?: string }) {
  const { b, S, u } = F
  scrim(F, t, d, 'bottom', 0.6)
  const x = F.mx
  const titleSize = Math.round((F.portrait ? 54 : 58) * u)
  const subSize = Math.round(30 * u)
  const W = b.w - F.mx * 2
  const th = boxHeight(o.title, titleSize, W - 30 * u, 1.1, 0.58)
  const block = th + (o.sub ? subSize * 1.5 : 0)
  const bottom = b.h - F.safe - Math.round((F.portrait ? 150 : 90) * u)
  const y = bottom - block
  const out = { preset: 'fade' as const, duration: 0.7, easing: 'sine-in-out' as const }
  b.rect({ name: 'Lower-third bar', track: 'Frames', start: t, duration: d, fill: S.accent, x, y: y + 4, width: Math.max(4, Math.round(5 * u)), height: block, in: { preset: 'wipe', duration: 0.8, easing: 'quart-out', delay: 0.3 }, out })
  b.text({ text: o.title, track: 'Text', start: t, duration: d, x: x + Math.round(24 * u), y, width: W - 30 * u, height: th, font: S.sans, size: titleSize, weight: 700, align: 'left', lineHeight: 1.1, color: S.ink, shadow: 18, in: { preset: 'rise', duration: 1, delay: 0.45 }, out })
  if (o.sub) b.text({ text: o.sub, track: 'Text', start: t, duration: d, x: x + Math.round(24 * u), y: y + th + Math.round(6 * u), width: W - 30 * u, height: Math.round(subSize * 1.3), font: S.sans, size: subSize, weight: 400, letterSpacing: 1, align: 'left', color: S.mute, shadow: 14, in: { preset: 'rise', duration: 1, delay: 0.7 }, out })
  if (o.tag) b.text({ text: o.tag, track: 'Chips', start: t, duration: d, x, y: y - Math.round(50 * u), width: Math.round(Math.max(150, o.tag.length * 20) * u), height: Math.round(36 * u), font: S.sans, size: Math.round(20 * u), weight: 700, letterSpacing: 4, color: '#ffffff', pill: S.accent, padding: Math.round(9 * u), radius: Math.round(6 * u), in: { preset: 'drift', duration: 0.9, delay: 0.2 }, out })
}

/** Small place tag in the top-left corner. */
export function locationTag(F: Film, t: number, d: number, place: string, coords?: string) {
  const { b, S, u } = F
  const text = coords ? `${place}   ·   ${coords}` : place
  b.text({
    text, track: 'Chips', start: t, duration: d, x: F.mx, y: F.safe + Math.round(F.portrait ? 120 * u : 56 * u), width: Math.round(Math.min(b.w - F.mx * 2, Math.max(260, text.length * 17.5) * u)), height: Math.round(46 * u),
    font: S.sans, size: Math.round(21 * u), weight: 600, letterSpacing: 3, color: '#ffffff', pill: 'rgba(0,0,0,0.42)', padding: Math.round(12 * u), radius: Math.round(8 * u), align: 'left',
    in: { preset: 'drift', duration: 1, delay: 0.5 }, out: { preset: 'fade', duration: 0.7, easing: 'sine-in-out' },
  })
}

/** Cinematic subtitle line near the bottom. */
export function caption(F: Film, t: number, d: number, text: string) {
  const { b, S, u } = F
  const size = Math.round((F.portrait ? 44 : 40) * u)
  const W = Math.round(b.w - F.mx * (F.portrait ? 2 : 3.2))
  const h = boxHeight(text, size, W, 1.3, 0.52)
  b.text({
    text, track: 'Caption', start: t, duration: d, x: Math.round((b.w - W) / 2), y: b.h - F.safe - Math.round((F.portrait ? 210 : 120) * u) - h, width: W, height: h,
    font: S.sans, size, weight: 500, lineHeight: 1.3, color: '#ffffff', shadow: 22, in: { preset: 'fade', duration: 1, easing: 'sine-in-out', delay: 0.2 }, out: { preset: 'fade', duration: 0.8, easing: 'sine-in-out' },
  })
}

/** A pull quote on a solid card: a big quotation mark, the quote and an attribution. */
export function quote(F: Film, t: number, d: number, o: { text: string; author: string; bg?: string; tr?: Tr | null }) {
  const { b, S, u } = F
  backdrop(F, t, d, o.bg ?? S.dark, o.tr)
  const W = Math.round(b.w - F.mx * (F.portrait ? 2.2 : 4.5))
  const size = Math.round((F.portrait ? 60 : 68) * u * (o.text.length > 80 ? 0.84 : 1))
  const qh = boxHeight(o.text, size, W, 1.25, 0.5)
  const total = qh + 130 * u
  const y = Math.round((b.h - total) / 2) + Math.round(40 * u)
  const x = Math.round((b.w - W) / 2)
  const out = { preset: 'fade' as const, duration: 0.9, easing: 'sine-in-out' as const }
  b.text({ text: '“', track: 'Text', start: t, duration: d, x, y: y - Math.round(190 * u), width: Math.round(260 * u), height: Math.round(260 * u), font: S.script, size: Math.round(280 * u), weight: 400, color: S.accent, align: 'left', lineHeight: 1, in: { preset: 'fade', duration: 1.6, easing: 'sine-in-out' }, out })
  b.text({ text: o.text, track: 'Text', start: t, duration: d, x, y, width: W, height: qh, font: S.script, size, weight: 400, italic: true, lineHeight: 1.25, color: S.ink, in: { preset: 'blur-in', duration: 1.8, easing: 'quart-out', delay: 0.6 }, out })
  b.rect({ name: 'Quote rule', track: 'Frames', start: t, duration: d, fill: S.accent, x: Math.round((b.w - 90 * u) / 2), y: y + qh + Math.round(30 * u), width: Math.round(90 * u), height: Math.max(3, Math.round(3 * u)), in: { preset: 'wipe', duration: 1, easing: 'quart-out', delay: 1.8 }, out })
  b.text({ text: o.author, track: 'Text', start: t, duration: d, x, y: y + qh + Math.round(58 * u), width: W, height: Math.round(44 * u), font: S.sans, size: Math.round(26 * u), weight: 600, letterSpacing: 6, color: S.accent, in: { preset: 'rise', duration: 1, delay: 2.1 }, out })
}

/** Three big numbers (distance, elevation, days…) over a dimmed shot. */
export function stats(F: Film, t: number, d: number, items: { value: string; label: string }[], o: { label?: string } = {}) {
  const { b, S, u } = F
  shot(F, t, d, o.label ?? 'Stats backdrop · wide shot', { kb: 'in' })
  scrim(F, t, d, 'full', 0.85)
  const n = items.length
  const colW = F.portrait ? b.w - F.mx * 2 : Math.round((b.w - F.mx * 2) / n)
  const rowH = F.portrait ? Math.round(Math.min(280 * u, (b.h - F.safe * 2 - 240 * u) / n)) : 0
  const vsize = Math.round((F.portrait ? 120 : 132) * u)
  const out = { preset: 'fade' as const, duration: 0.8, easing: 'sine-in-out' as const }
  items.forEach((it, i) => {
    const x = F.portrait ? F.mx : F.mx + i * colW
    const top = F.portrait ? Math.round((b.h - rowH * n) / 2) + i * rowH : Math.round(b.h / 2 - vsize * 0.8)
    const delay = 0.4 + i * 0.3
    b.rect({ name: `Stat rule ${i + 1}`, track: 'Frames', start: t, duration: d, fill: S.accent, x, y: top, width: Math.round(70 * u), height: Math.max(3, Math.round(3 * u)), in: { preset: 'wipe', duration: 0.8, easing: 'quart-out', delay }, out })
    b.text({ text: it.value, track: 'Text', start: t, duration: d, x, y: top + Math.round(18 * u), width: colW - Math.round(30 * u), height: Math.round(vsize * 1.1), font: S.heading, size: vsize, weight: 700, align: 'left', lineHeight: 1, color: S.ink, shadow: 14, in: { preset: 'rise', duration: 1.2, delay: delay + 0.15 }, out })
    b.text({ text: it.label, track: 'Text', start: t, duration: d, x, y: top + Math.round(vsize * 1.18) + Math.round(18 * u), width: colW - Math.round(30 * u), height: Math.round(40 * u), font: S.sans, size: Math.round(24 * u), weight: 600, letterSpacing: 6, align: 'left', color: S.mute, shadow: 10, in: { preset: 'rise', duration: 1, delay: delay + 0.4 }, out })
  })
}

/** Three panels revealing one after another on a dark card. */
export function triptych(F: Film, t: number, d: number, labels: [string, string, string], o: { tr?: Tr | null } = {}) {
  const { b, S, u } = F
  backdrop(F, t, d, S.dark, o.tr)
  const gap = Math.round(24 * u)
  const m = Math.round(b.w * 0.05)
  const area = { x: m, y: F.safe + Math.round(b.h * 0.07), w: b.w - m * 2, h: b.h - (F.safe + Math.round(b.h * 0.07)) * 2 }
  labels.forEach((label, i) => {
    const horizontal = !F.portrait
    const pw = horizontal ? Math.round((area.w - gap * 2) / 3) : area.w
    const ph = horizontal ? area.h : Math.round((area.h - gap * 2) / 3)
    const tone = F.nextTone()
    b.placeholder({
      label, track: 'Panels', labelTrack: 'Hints', start: t, duration: d, color: tone, radius: Math.round(14 * u),
      x: horizontal ? area.x + i * (pw + gap) : area.x, y: horizontal ? area.y : area.y + i * (ph + gap), width: pw, height: ph,
      in: { preset: 'blur-in', duration: 1.4, easing: 'quart-out', delay: 0.3 + i * 0.35 }, out: { preset: 'fade', duration: 0.8, easing: 'sine-in-out' },
    })
  })
}

/** Paper-style card with a tilted polaroid, handwritten caption and date. */
export function polaroid(F: Film, t: number, d: number, o: { label: string; caption: string; date: string; side?: 'left' | 'right'; rot?: number; paper?: string; ink?: string; tr?: Tr | null }) {
  const { b, S, u } = F
  const paper = o.paper ?? '#f3ede2'
  const ink = o.ink ?? '#2b2622'
  backdrop(F, t, d, paper, o.tr)
  const rot = o.rot ?? -3
  const fw = Math.round((F.portrait ? 800 : 700) * u)
  const fh = Math.round(fw * 1.18)
  const left = (o.side ?? 'left') === 'left'
  const fx = F.portrait ? Math.round((b.w - fw) / 2) : left ? Math.round(b.w * 0.12) : Math.round(b.w - fw - b.w * 0.12)
  const fy = F.portrait ? Math.round(b.h * 0.16) : Math.round((b.h - fh) / 2)
  const out = { preset: 'fade' as const, duration: 0.8, easing: 'sine-in-out' as const }
  b.rect({ name: 'Polaroid frame', track: 'Frames', start: t, duration: d, fill: '#ffffff', stroke: 'rgba(0,0,0,0.08)', strokeWidth: 2, x: fx, y: fy, width: fw, height: fh, radius: Math.round(8 * u), rotation: rot, in: { preset: 'rise', duration: 1.3, easing: 'expo-out', delay: 0.2 }, out })
  const pad = Math.round(fw * 0.07)
  b.placeholder({ label: o.label, track: 'Panels', labelTrack: 'Hints', start: t, duration: d, color: F.nextTone(), x: fx + pad, y: fy + pad, width: fw - pad * 2, height: fw - pad * 2, rotation: rot, in: { preset: 'rise', duration: 1.3, easing: 'expo-out', delay: 0.3 }, out })
  b.text({ text: o.caption, track: 'Text', start: t, duration: d, x: fx + pad, y: fy + fw - pad + Math.round(30 * u), width: fw - pad * 2, height: Math.round(86 * u), font: S.script, size: Math.round(54 * u), weight: 400, italic: true, color: ink, rotation: rot, in: { preset: 'fade', duration: 1.2, easing: 'sine-in-out', delay: 1 }, out })
  const tx = F.portrait ? F.mx : left ? Math.round(b.w * 0.12 + fw + b.w * 0.07) : Math.round(b.w * 0.12)
  const ty = F.portrait ? Math.round(b.h * 0.16 + fh + 70 * u) : Math.round(b.h * 0.34)
  const tw = F.portrait ? b.w - F.mx * 2 : Math.round(b.w - fw - b.w * 0.12 * 2 - b.w * 0.07)
  b.text({ text: o.date, track: 'Text', start: t, duration: d, x: tx, y: ty, width: tw, height: Math.round(110 * u), font: 'Space Grotesk', size: Math.round(84 * u), weight: 700, color: ink, align: F.portrait ? 'center' : 'left', in: { preset: 'rise', duration: 1, delay: 0.7 }, out })
  b.rect({ name: 'Date rule', track: 'Frames', start: t, duration: d, fill: S.accent, x: F.portrait ? Math.round((b.w - 90 * u) / 2) : tx, y: ty + Math.round(120 * u), width: Math.round(90 * u), height: Math.max(3, Math.round(3 * u)), in: { preset: 'wipe', duration: 0.9, easing: 'quart-out', delay: 1.4 }, out })
}

/** Large statement over a shot (e.g. "WE WERE HERE"). */
export function bigStatement(F: Film, t: number, d: number, text: string, o: { sub?: string; label?: string; tr?: Tr | null } = {}) {
  const { b, S, u } = F
  shot(F, t, d, o.label ?? 'Closing shot', { kb: 'out', tr: o.tr })
  scrim(F, t, d, 'full', 0.55)
  const W = b.w - F.mx * 2
  const size = Math.round((F.portrait ? 120 : 150) * u * (text.length > 14 ? 0.7 : 1))
  const h = boxHeight(text, size, W, 1.02, 0.62)
  const y = Math.round((b.h - h) / 2) - (o.sub ? Math.round(30 * u) : 0)
  const out = { preset: 'fade' as const, duration: 1, easing: 'sine-in-out' as const }
  b.text({ text, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: h, font: S.heading, size, weight: 700, letterSpacing: 2, lineHeight: 1.02, color: S.ink, shadow: 24, in: { preset: 'blur-in', duration: 2, easing: 'quart-out', delay: 0.4 }, out })
  if (o.sub) b.text({ text: o.sub, track: 'Text', start: t, duration: d, x: F.mx, y: y + h + Math.round(24 * u), width: W, height: Math.round(60 * u), font: S.sans, size: Math.round(32 * u), weight: 500, letterSpacing: 6, color: S.accent, shadow: 12, in: { preset: 'rise', duration: 1.2, delay: 1.6 }, out })
}

/** Credits that roll up the screen on a dark card. */
export function credits(F: Film, t: number, d: number, o: { heading: string; lines: string[]; tr?: Tr | null }) {
  const { b, S, u } = F
  backdrop(F, t, d, S.dark, o.tr)
  const size = Math.round(34 * u)
  const lineH = 1.9
  const body = o.lines.join('\n')
  const W = Math.round(b.w * (F.portrait ? 0.84 : 0.5))
  const h = Math.round(o.lines.length * size * lineH + size * 6)
  const x = Math.round((b.w - W) / 2)
  b.text({
    text: `${o.heading}\n\n${body}`, name: 'Credits', track: 'Text', start: t, duration: d, x, y: b.h, width: W, height: h, font: S.sans, size, weight: 500, lineHeight: lineH, letterSpacing: 3, color: S.ink, in: { preset: 'none' }, out: { preset: 'none' },
    keyframes: [{ id: uid('kf'), property: 'y', time: 0, value: b.h, easing: 'linear' }, { id: uid('kf'), property: 'y', time: d, value: -h, easing: 'linear' }],
  })
}

/** Sign-off card with a handle chip. */
export function endCard(F: Film, t: number, d: number, o: { title: string; sub?: string; handle?: string; tr?: Tr | null }) {
  const { b, S, u } = F
  backdrop(F, t, d, S.dark, o.tr)
  const W = b.w - F.mx * 2
  const size = Math.round((F.portrait ? 100 : 112) * u * (o.title.length > 18 ? 0.78 : 1))
  const th = boxHeight(o.title, size, W, 1.05, 0.58)
  const total = th + (o.sub ? 90 * u : 0) + (o.handle ? 110 * u : 0)
  let y = Math.round((b.h - total) / 2)
  const out = { preset: 'fade' as const, duration: 1.2, easing: 'sine-in-out' as const }
  b.text({ text: o.title, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: th, font: S.heading, size, weight: 700, lineHeight: 1.05, letterSpacing: -1, color: S.ink, in: { preset: 'blur-in', duration: 1.8, easing: 'quart-out', delay: 0.3 }, out })
  y += th + Math.round(26 * u)
  if (o.sub) { b.text({ text: o.sub, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: Math.round(56 * u), font: S.sans, size: Math.round(32 * u), weight: 400, letterSpacing: 2, color: S.mute, in: { preset: 'rise', duration: 1, delay: 1.2 }, out }); y += Math.round(90 * u) }
  if (o.handle) b.text({ text: o.handle, track: 'Chips', start: t, duration: d, x: Math.round(b.w / 2 - 230 * u), y, width: Math.round(460 * u), height: Math.round(70 * u), font: S.sans, size: Math.round(30 * u), weight: 700, letterSpacing: 2, color: '#ffffff', pill: S.accent, padding: Math.round(14 * u), radius: Math.round(10 * u), in: { preset: 'scale', duration: 1, easing: 'expo-out', delay: 1.6 }, out })
}

/** Beat flash: one huge word on a solid colour that pops in on the beat, with an optional sub line. Hard cut by default. */
export function bigWord(F: Film, t: number, d: number, text: string, o: { sub?: string; bg?: string; color?: string; subColor?: string; tr?: Tr | null } = {}) {
  const { b, S, u } = F
  backdrop(F, t, d, o.bg ?? S.dark, o.tr === undefined ? null : o.tr)
  const W = b.w - F.mx * 2
  const size = Math.round(Math.min((F.portrait ? 170 : 230) * u, W / (Math.max(1, Math.max(...text.split('\n').map((l) => l.length))) * 0.66)))
  const h = boxHeight(text, size, W, 1, 0.66)
  const subH = o.sub ? Math.round(90 * u) : 0
  const y = Math.round((b.h - h - subH) / 2)
  b.text({ text, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: h, font: S.heading, size, weight: 800, lineHeight: 1, letterSpacing: -2, color: o.color ?? S.ink, align: 'center', in: { preset: 'pop', duration: 0.5, easing: 'expo-out' }, out: { preset: 'none', duration: 0.2, easing: 'linear' } })
  if (o.sub) b.text({ text: o.sub, track: 'Text', start: t, duration: d, x: F.mx, y: y + h + Math.round(22 * u), width: W, height: Math.round(60 * u), font: S.sans, size: Math.round(36 * u), weight: 600, letterSpacing: 8, color: o.subColor ?? (o.bg ? '#ffffff' : S.accent), align: 'center', in: { preset: 'rise', duration: 0.8, easing: 'expo-out', delay: 0.35 }, out: { preset: 'fade', duration: 0.4, easing: 'sine-in-out' } })
}

/** Lyric card: short lines over a dimmed shot, each line rising on its own beat; `hi` tints one line with the accent. */
export function lyric(F: Film, t: number, d: number, lines: string[], o: { hi?: number; label?: string; tr?: Tr | null } = {}) {
  const { b, S, u } = F
  shot(F, t, d, o.label ?? 'Lyric background · footage or loop', { tr: o.tr })
  scrim(F, t, d, 'full', 0.62)
  const W = b.w - F.mx * 2
  const size = Math.round(Math.min(130 * u, W / (Math.max(...lines.map((l) => l.length)) * 0.6)))
  const hLine = Math.round(size * 1.08)
  let y = Math.round((b.h - hLine * lines.length) / 2)
  const beat = F.bar / 4
  lines.forEach((line, i) => {
    b.text({ text: line, track: 'Text', start: t, duration: d, x: F.mx, y, width: W, height: hLine, font: S.heading, size, weight: 800, letterSpacing: -1, lineHeight: 1.05, align: 'left', color: i === o.hi ? S.accent : S.ink, shadow: 20, in: { preset: 'rise', duration: 0.7, easing: 'expo-out', delay: 0.1 + i * beat * 2 }, out: { preset: 'fade', duration: 0.4, easing: 'sine-in-out' } })
    y += hLine
  })
}

/** Small marker + chip for a "DAY 03" style counter. */
export function dayChip(F: Film, t: number, d: number, text: string, o: { x?: number; y?: number } = {}) {
  const { b, S, u } = F
  b.text({
    text, track: 'Chips', start: t, duration: d, x: o.x ?? F.mx, y: o.y ?? F.safe + Math.round(F.portrait ? 120 * u : 56 * u), width: Math.round(Math.max(170, text.length * 24) * u), height: Math.round(50 * u),
    font: S.sans, size: Math.round(24 * u), weight: 700, letterSpacing: 5, color: '#ffffff', pill: S.accent, padding: Math.round(12 * u), radius: Math.round(8 * u), align: 'center',
    in: { preset: 'drift', duration: 0.9, delay: 0.3 }, out: { preset: 'fade', duration: 0.6, easing: 'sine-in-out' },
  })
}
