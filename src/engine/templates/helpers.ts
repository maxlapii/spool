/**
 * Builder used by the bundled templates. Everything it creates is an ordinary editable layer/clip;
 * placeholders are footage frames the user replaces with their own clips (drag media from
 * Project → Media onto them). Tracks can be declared explicitly (`tracks()`), or — for long films —
 * layers are placed into named *groups* ("Text", "Footage", …) and lanes are allocated automatically.
 */
import type { Animations, AspectRatio, Clip, EntranceAnimation, Layer, Project, ShapeProps, TextProps, TransitionType } from '@/types'
import { createClip, createEmptyProject, createShapeLayer, createTextLayer, createTrack } from '../project'
import { uid } from '@/utils/id'
import { barSeconds, sampleAsset, trackById } from './samples'

export const PALETTE = {
  ocean: '#7fb7c9', sand: '#e3c58d', forest: '#8fbf9f', sunset: '#e7a07a', mountain: '#9aa5c4', dusk: '#b58fb9', snow: '#d9dde3',
  lagoon: '#79c7b7', clay: '#d79a7c', moss: '#a3b86c', night: '#1f2937', cream: '#f3ede2',
}
export const MONTAGE_COLORS = [PALETTE.ocean, PALETTE.sunset, PALETTE.forest, PALETTE.mountain, PALETTE.sand, PALETTE.dusk, PALETTE.lagoon, PALETTE.clay, PALETTE.snow, PALETTE.moss]

/** Darken (amount < 0) or lighten (amount > 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount))
  return `#${ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`
}

type Anim = Partial<EntranceAnimation>
const anim = (a: Anim | undefined, base: EntranceAnimation): EntranceAnimation => ({ ...base, ...(a ?? {}) })
type Tr = { type: TransitionType; duration: number }
type Gradient = NonNullable<ShapeProps['gradient']>

export interface TextOpts {
  text: string
  track: string
  start: number
  duration: number
  x: number
  y: number
  width: number
  height: number
  font?: string
  size?: number
  weight?: TextProps['fontWeight']
  color?: string
  align?: TextProps['align']
  italic?: boolean
  lineHeight?: number
  letterSpacing?: number
  pill?: string | null
  padding?: number
  radius?: number
  rotation?: number
  shadow?: number
  in?: Anim
  out?: Anim
  name?: string
  transition?: Tr
  keyframes?: Animations['keyframes']
}

export interface RectOpts {
  name: string
  track: string
  start: number
  duration: number
  fill: string
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  rotation?: number
  opacity?: number
  stroke?: string
  strokeWidth?: number
  gradient?: Gradient
  in?: Anim
  out?: Anim
  transition?: Tr
  keyframes?: Animations['keyframes']
  shape?: 'rect' | 'ellipse' | 'line'
}

export interface PlaceholderOpts {
  label: string
  track: string
  labelTrack?: string
  start: number
  duration: number
  color?: string
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  rotation?: number
  in?: Anim
  out?: Anim
  transition?: Tr
  keyframes?: Animations['keyframes']
  /** Hide the "your clip" caption (e.g. for tiny tiles). */
  silent?: boolean
}

export type KenBurns = 'in' | 'out' | 'left' | 'right' | 'up'

export interface ShotOpts {
  label: string
  start: number
  duration: number
  color?: string
  kb?: KenBurns
  track?: string
  labelTrack?: string
  transition?: Tr
  silent?: boolean
}

export class TemplateBuilder {
  readonly p: Project
  private trackIds = new Map<string, string>()
  private groupOrder: string[] = []
  private lanes = new Map<string, string[]>()
  private groupOf = new Map<string, string>()
  readonly w: number
  readonly h: number

  constructor(name: string, aspect: AspectRatio, duration: number, background: string) {
    this.p = createEmptyProject(name, aspect)
    this.p.tracks = []
    this.p.composition.duration = Math.ceil(duration * 100 - 1e-6) / 100
    this.p.composition.backgroundColor = background
    this.p.export = { ...this.p.export, width: this.p.composition.width, height: this.p.composition.height }
    this.w = this.p.composition.width
    this.h = this.p.composition.height
  }

  /** Declare visual tracks front-to-back (first = frontmost). */
  tracks(...names: string[]) {
    for (const n of names) {
      const t = createTrack('visual', n)
      this.p.tracks.push(t)
      this.trackIds.set(n, t.id)
    }
    return this
  }

  /** Declare layer groups front-to-back; lanes inside a group are allocated automatically. */
  groups(...names: string[]) {
    this.groupOrder = names
    return this
  }

  audioTrack(name = 'Music · add your song') {
    this.p.tracks.push(createTrack('audio', name))
    return this
  }

  /**
   * Put a bundled track on the audio track. `fromBar` starts inside the song (e.g. at the build before the chorus),
   * which keeps cuts on the beat when the video's own bar grid matches the song's tempo.
   */
  music(trackId: string, o: { start?: number; duration?: number; volume?: number; fadeIn?: number; fadeOut?: number; fromBar?: number; fromSeconds?: number; track?: string } = {}) {
    const track = trackById(trackId)
    if (!track) throw new Error(`Unknown sample track "${trackId}"`)
    const asset = sampleAsset(track)
    // `track` names an audio track to use (created on demand), so several songs can overlap for crossfades.
    let audio = o.track ? this.p.tracks.find((t) => t.kind === 'audio' && t.name === o.track) : this.p.tracks.find((t) => t.kind === 'audio')
    if (!audio) {
      audio = createTrack('audio', o.track ?? 'Music')
      this.p.tracks.push(audio)
    }
    if (!this.p.assets.some((a) => a.id === asset.id)) this.p.assets.push(asset)
    const start = o.start ?? 0
    const trimIn = Math.max(0, Math.round((o.fromSeconds ?? (o.fromBar ?? 0) * barSeconds(track)) * 1000) / 1000)
    const duration = Math.round(Math.min(o.duration ?? Infinity, track.duration - trimIn, this.p.composition.duration - start) * 1000) / 1000
    this.p.clips.push(createClip({
      trackId: audio.id, name: track.name, start, duration, trimIn,
      audio: { assetId: asset.id, volume: o.volume ?? 0.9, fadeIn: o.fadeIn ?? 1, fadeOut: o.fadeOut ?? Math.min(6, duration / 4), muted: false },
    }))
    return this
  }

  private trackFor(name: string, start: number, duration: number): string {
    const explicit = this.trackIds.get(name)
    if (explicit) return explicit
    const end = start + duration
    const ids = this.lanes.get(name) ?? []
    for (const id of ids) {
      if (!this.p.clips.some((c) => c.trackId === id && c.start < end - 1e-6 && c.start + c.duration > start + 1e-6)) return id
    }
    const t = createTrack('visual', ids.length ? `${name} ${ids.length + 1}` : name)
    this.p.tracks.push(t)
    ids.push(t.id)
    this.lanes.set(name, ids)
    this.groupOf.set(t.id, name)
    return t.id
  }

  private place(layer: Layer, trackName: string, start: number, duration: number, extra: Partial<Clip> = {}) {
    this.p.layers.push(layer)
    this.p.clips.push(createClip({ trackId: this.trackFor(trackName, start, duration), name: layer.name, start, duration, layerId: layer.id, ...extra }))
    return layer
  }

  text(o: TextOpts) {
    const layer = createTextLayer(
      {
        content: o.text, fontFamily: o.font ?? 'Poppins', fontSize: o.size ?? 64, fontWeight: o.weight ?? 700, color: o.color ?? '#ffffff', align: o.align ?? 'center',
        italic: o.italic ?? false, lineHeight: o.lineHeight ?? 1.1, letterSpacing: o.letterSpacing ?? 0, backgroundColor: o.pill ?? null, padding: o.padding ?? 0, borderRadius: o.radius ?? 0,
        ...(o.shadow ? { shadow: o.shadow } : {}),
      },
      {
        name: o.name ?? o.text.replace(/\s+/g, ' ').slice(0, 24),
        transform: { x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation ?? 0 },
        animations: {
          in: anim(o.in, { preset: 'rise', duration: 0.9, easing: 'expo-out', delay: 0 }),
          out: anim(o.out, { preset: 'fade', duration: 0.5, easing: 'sine-in-out' }),
          keyframes: o.keyframes ?? [],
        },
      },
    )
    return this.place(layer, o.track, o.start, o.duration, o.transition ? { transitionIn: o.transition } : {})
  }

  rect(o: RectOpts) {
    const layer = createShapeLayer(
      { shape: o.shape ?? 'rect', fill: o.fill, borderRadius: o.radius ?? 0, ...(o.stroke ? { stroke: o.stroke, strokeWidth: o.strokeWidth ?? 2 } : {}), ...(o.gradient ? { gradient: o.gradient } : {}) },
      {
        name: o.name,
        opacity: o.opacity ?? 1,
        transform: { x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? this.w, height: o.height ?? this.h, rotation: o.rotation ?? 0 },
        animations: {
          in: anim(o.in, { preset: 'none', duration: 0.8, easing: 'expo-out', delay: 0 }),
          out: anim(o.out, { preset: 'none', duration: 0.5, easing: 'sine-in-out' }),
          keyframes: o.keyframes ?? [],
        },
      },
    )
    return this.place(layer, o.track, o.start, o.duration, o.transition ? { transitionIn: o.transition } : {})
  }

  /** A footage placeholder: a graded frame plus a small caption telling the user what to drop there. */
  placeholder(o: PlaceholderOpts) {
    const x = o.x ?? 0
    const y = o.y ?? 0
    const width = o.width ?? this.w
    const height = o.height ?? this.h
    const color = o.color ?? PALETTE.ocean
    const frame = this.rect({
      name: `${o.label} (replace with your clip)`, track: o.track, start: o.start, duration: o.duration, fill: color, gradient: { to: shade(color, -0.32), angle: 160 },
      x, y, width, height, radius: o.radius ?? 0, rotation: o.rotation ?? 0, in: o.in, out: o.out, transition: o.transition, keyframes: o.keyframes,
    })
    if (!o.silent) this.caption(o.label, o.labelTrack ?? o.track, o.start, o.duration, x, y, width, height, o.rotation ?? 0, o.transition)
    return frame
  }

  /** Bottom inset (fraction of the frame height) for placeholder hint labels; letterboxed films raise it. */
  hintInset = 0.05

  private caption(label: string, track: string, start: number, duration: number, x: number, y: number, width: number, height: number, rotation: number, transition?: Tr) {
    const capH = Math.max(36, Math.round(Math.min(width, height) * 0.05))
    this.text({
      text: `▢ ${label}`, name: `${label} caption`, track, start, duration,
      x: x + Math.round(width * 0.06), y: y + height - capH - Math.round(height * this.hintInset), width: Math.round(width * 0.88), height: capH,
      font: 'Inter', size: Math.round(capH * 0.5), weight: 500, color: 'rgba(255,255,255,0.8)', align: 'left', rotation,
      in: { preset: 'none' }, out: { preset: 'none' }, transition,
    })
  }

  /**
   * A full-frame footage shot with a slow Ken Burns move. The frame is oversized so panning never
   * reveals an edge. Consecutive shots on the same lane get smooth transitions.
   */
  shot(o: ShotOpts) {
    const color = o.color ?? PALETTE.ocean
    const bleed = 0.07
    const kb = o.kb ?? 'in'
    const bx = -Math.round(this.w * bleed)
    const by = -Math.round(this.h * bleed)
    const panX = Math.round(this.w * 0.035)
    const panY = Math.round(this.h * 0.035)
    const d = o.duration
    const k = (property: 'scale' | 'x' | 'y', a: number, b: number) => [
      { id: uid('kf'), property, time: 0, value: a, easing: 'sine-in-out' as const },
      { id: uid('kf'), property, time: d, value: b, easing: 'sine-in-out' as const },
    ]
    const keyframes: Animations['keyframes'] =
      kb === 'in' ? k('scale', 1, 1.09)
      : kb === 'out' ? k('scale', 1.09, 1)
      : kb === 'left' ? [...k('x', bx + panX, bx - panX), ...k('scale', 1.04, 1.04)]
      : kb === 'right' ? [...k('x', bx - panX, bx + panX), ...k('scale', 1.04, 1.04)]
      : [...k('y', by + panY, by - panY), ...k('scale', 1.04, 1.04)]
    const frame = this.rect({
      name: `${o.label} (replace with your clip)`, track: o.track ?? 'Footage', start: o.start, duration: d, fill: color, gradient: { to: shade(color, -0.34), angle: 160 },
      x: bx, y: by, width: this.w - bx * 2, height: this.h - by * 2, keyframes, transition: o.transition,
    })
    if (!o.silent) this.caption(o.label, o.labelTrack ?? 'Hints', o.start, d, 0, 0, this.w, this.h, 0, o.transition)
    return frame
  }

  /**
   * A beat-cut montage of placeholders on one track, with alternating transitions.
   * Returns the end time.
   */
  montage(o: { track: string; labelTrack?: string; start: number; count: number; each: number; labelPrefix?: string; transitions?: TransitionType[]; transitionDuration?: number; x?: number; y?: number; width?: number; height?: number; radius?: number; zoom?: boolean }) {
    const trs = o.transitions ?? ['slide-left', 'crossfade', 'zoom', 'slide-up']
    let t = o.start
    for (let i = 0; i < o.count; i++) {
      const kf: Animations['keyframes'] = o.zoom
        ? [{ id: uid('kf'), property: 'scale', time: 0, value: 1, easing: 'sine-in-out' }, { id: uid('kf'), property: 'scale', time: o.each, value: i % 2 ? 1.08 : 1.12, easing: 'sine-in-out' }]
        : []
      this.placeholder({
        label: `${o.labelPrefix ?? 'Clip'} ${String(i + 1).padStart(2, '0')}`, track: o.track, labelTrack: o.labelTrack, start: t, duration: o.each, color: MONTAGE_COLORS[i % MONTAGE_COLORS.length],
        x: o.x, y: o.y, width: o.width, height: o.height, radius: o.radius, keyframes: kf,
        transition: i === 0 ? undefined : { type: trs[(i - 1) % trs.length], duration: o.transitionDuration ?? 0.5 },
      })
      t += o.each
    }
    return t
  }

  marker(time: number, label: string, color = '#9a5bf5') {
    this.p.markers.push({ id: uid('mk'), time: Math.round(time * 100) / 100, label, color })
    return this
  }

  done(): Project {
    if (this.groupOrder.length) {
      const key = (id: string) => {
        const g = this.groupOf.get(id)
        const gi = g ? this.groupOrder.indexOf(g) : -1
        return gi < 0 ? this.groupOrder.length : gi
      }
      const visual = this.p.tracks.filter((t) => t.kind === 'visual')
      const audio = this.p.tracks.filter((t) => t.kind === 'audio')
      const order = new Map(this.p.tracks.map((t, i) => [t.id, i]))
      visual.sort((a, b) => key(a.id) - key(b.id) || (order.get(a.id)! - order.get(b.id)!))
      this.p.tracks = [...visual, ...audio]
    }
    this.p.markers.sort((a, b) => a.time - b.time)
    return this.p
  }
}

/** Stack several text lines that appear one after another (the "and with that…" build-up). */
export function buildUpLines(
  b: TemplateBuilder,
  lines: { text: string; track: string; font: string; size: number; weight?: TextProps['fontWeight']; italic?: boolean; color?: string; width?: number; x?: number; align?: TextProps['align']; letterSpacing?: number }[],
  o: { start: number; duration: number; y: number; gap?: number; stagger?: number; firstDelay?: number; in?: Anim; out?: Anim },
) {
  let y = o.y
  lines.forEach((l, i) => {
    const h = Math.round(l.size * 1.15)
    const width = l.width ?? Math.round(b.w * 0.8)
    b.text({
      text: l.text, track: l.track, start: o.start, duration: o.duration, x: l.x ?? Math.round((b.w - width) / 2), y, width, height: h,
      font: l.font, size: l.size, weight: l.weight ?? 700, italic: l.italic, color: l.color ?? '#ffffff', align: l.align ?? 'center', letterSpacing: l.letterSpacing,
      in: { preset: 'rise', duration: 0.9, easing: 'expo-out', delay: (o.firstDelay ?? 0.3) + i * (o.stagger ?? 0.45), ...(o.in ?? {}) },
      out: { preset: 'fade', duration: 0.6, easing: 'sine-in-out', ...(o.out ?? {}) },
    })
    y += h + (o.gap ?? -4)
  })
  return y
}
