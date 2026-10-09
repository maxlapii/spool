import type { AnimationPreset, Clip, Keyframe, KeyframeProperty, Layer, Transition } from '@/types'
import { ease } from './easing'
import { lerp } from '@/utils/math'

/** Fully resolved visual state for a layer at a moment in time. */
export interface RenderState {
  visible: boolean
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  scale: number
  /** Extra translation from entrance/exit/transition effects, in composition px. */
  dx: number
  dy: number
  /** Gaussian blur radius in composition px (entrance/exit/transition effects). */
  blur: number
  /** Horizontal reveal 0..1 from the left edge (1 = fully visible). Used by wipes. */
  clip: number
  /** Reserved for darkening transitions; 0..1. */
  dim: number
}

/** Interpolate a single property from its keyframes at relative time `t`. */
export function interpolateKeyframes(keyframes: Keyframe[], property: KeyframeProperty, t: number, fallback: number): number {
  const kfs = keyframes.filter((k) => k.property === property).sort((a, b) => a.time - b.time)
  if (kfs.length === 0) return fallback
  if (t <= kfs[0].time) return kfs[0].value
  const last = kfs[kfs.length - 1]
  if (t >= last.time) return last.value
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time
      const p = span <= 0 ? 1 : (t - a.time) / span
      return lerp(a.value, b.value, ease(b.easing, p))
    }
  }
  return fallback
}

interface Effect {
  opacity: number
  scale: number
  dx: number
  dy: number
  rotation: number
  blur: number
  clip: number
}
const none = (): Effect => ({ opacity: 1, scale: 1, dx: 0, dy: 0, rotation: 0, blur: 0, clip: 1 })
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Entrance effect at `progress` (0 = hidden, 1 = shown). Distances are small and proportional to
 * the layer so motion reads as natural settling rather than flying in from off screen.
 */
function presetEffect(preset: AnimationPreset, progress: number, w: number, h: number): Effect {
  const p = progress
  const r = none()
  switch (preset) {
    case 'none':
      return r
    case 'fade':
      r.opacity = p
      return r
    case 'rise':
      r.opacity = p
      r.dy = (1 - p) * clampTo(h * 0.35, 22, 44)
      return r
    case 'slide-up':
      r.opacity = p
      r.dy = (1 - p) * clampTo(h * 0.7, 44, 110)
      return r
    case 'slide-down':
      r.opacity = p
      r.dy = -(1 - p) * clampTo(h * 0.7, 44, 110)
      return r
    case 'slide-left':
      r.opacity = p
      r.dx = (1 - p) * clampTo(w * 0.18, 50, 180)
      return r
    case 'slide-right':
      r.opacity = p
      r.dx = -(1 - p) * clampTo(w * 0.18, 50, 180)
      return r
    case 'drift':
      r.opacity = p
      r.dx = (1 - p) * 36
      return r
    case 'scale':
      r.opacity = p
      r.scale = 0.9 + 0.1 * p
      return r
    case 'zoom-out':
      r.opacity = p
      r.scale = 1.12 - 0.12 * p
      return r
    case 'blur-in':
      r.opacity = p
      r.blur = (1 - p) * 16
      r.scale = 1.03 - 0.03 * p
      return r
    case 'wipe':
      r.clip = p
      return r
    case 'rotate':
      r.opacity = p
      r.rotation = (1 - p) * -6
      r.scale = 0.94 + 0.06 * p
      return r
    case 'pop':
      r.opacity = Math.min(1, p * 1.4)
      r.scale = 0.82 + 0.18 * p
      return r
  }
}

/**
 * Transition effect over the overlap window. The incoming clip is drawn on top of the outgoing one,
 * so crossfades never dip to the background: the outgoing layer stays opaque underneath.
 */
function transitionEffect(tr: Transition, progress: number, incoming: boolean, w: number, h: number): Effect {
  const e = ease('smooth', progress)
  const r = none()
  switch (tr.type) {
    case 'none':
      return r
    case 'crossfade':
      if (incoming) r.opacity = e
      return r
    case 'blur-dissolve':
      if (incoming) {
        r.opacity = e
        r.blur = (1 - e) * 14
        r.scale = 1.03 - 0.03 * e
      } else {
        r.blur = e * 12
        r.scale = 1 + 0.02 * e
      }
      return r
    case 'fade-black':
      if (incoming) r.opacity = e < 0.5 ? 0 : (e - 0.5) * 2
      else r.opacity = e < 0.5 ? 1 - e * 2 : 0
      return r
    case 'wipe':
      if (incoming) r.clip = e
      return r
    case 'slide-left':
      if (incoming) r.dx = (1 - e) * w
      else r.dx = -e * w * 0.3
      return r
    case 'slide-right':
      if (incoming) r.dx = -(1 - e) * w
      else r.dx = e * w * 0.3
      return r
    case 'slide-up':
      if (incoming) r.dy = (1 - e) * h
      else r.dy = -e * h * 0.3
      return r
    case 'zoom':
      if (incoming) {
        r.opacity = e
        r.scale = 1.1 - 0.1 * e
      } else r.scale = 1 + 0.12 * e
      return r
  }
}

export interface ClipContext {
  /** Transition into this clip (from previous clip on the track). */
  transitionIn?: Transition
  /** Transition into the NEXT clip on the track; this clip plays the outgoing role. */
  transitionOut?: Transition
}

/** Resolve the previous/next-clip transition context for a clip on its track. */
export function clipContext(clip: Clip, trackClips: Clip[]): ClipContext {
  const sorted = [...trackClips].sort((a, b) => a.start - b.start)
  const idx = sorted.findIndex((c) => c.id === clip.id)
  const next = idx >= 0 ? sorted[idx + 1] : undefined
  const ctx: ClipContext = {}
  if (clip.transitionIn && clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0 && idx > 0) ctx.transitionIn = clip.transitionIn
  if (next && next.transitionIn && next.transitionIn.type !== 'none' && next.transitionIn.duration > 0) ctx.transitionOut = next.transitionIn
  return ctx
}

/** Same as `clipContext` for a clip at `index` of an already start-sorted track (no re-sorting). */
export function clipContextSorted(sorted: Clip[], index: number): ClipContext {
  const clip = sorted[index]
  const next = sorted[index + 1]
  const ctx: ClipContext = {}
  if (clip.transitionIn && clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0 && index > 0) ctx.transitionIn = clip.transitionIn
  if (next && next.transitionIn && next.transitionIn.type !== 'none' && next.transitionIn.duration > 0) ctx.transitionOut = next.transitionIn
  return ctx
}

/** Longest transition we ever look ahead/behind for (see TRANSITION limits in operations). */
export const MAX_TRANSITION_SECONDS = 10

/** Time range in which the clip is rendered, including transition overlap. */
export function visibleRange(clip: Clip, ctx: ClipContext): { start: number; end: number } {
  const start = clip.start - (ctx.transitionIn ? ctx.transitionIn.duration / 2 : 0)
  const end = clip.start + clip.duration + (ctx.transitionOut ? ctx.transitionOut.duration / 2 : 0)
  return { start, end }
}

/**
 * Evaluate a layer's render state at absolute timeline time `time`.
 * Combines base transform, keyframes, entrance/exit presets and track transitions.
 */
export function evaluateLayer(layer: Layer, clip: Clip, time: number, ctx: ClipContext = {}, compositionSize = { width: 1920, height: 1080 }): RenderState {
  const range = visibleRange(clip, ctx)
  const hidden: RenderState = {
    visible: false, x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 0, scale: 1, dx: 0, dy: 0, blur: 0, clip: 1, dim: 0,
  }
  if (layer.hidden || time < range.start || time >= range.end) return hidden

  const rel = time - clip.start
  const kf = layer.animations?.keyframes ?? []
  const t = layer.transform
  const x = interpolateKeyframes(kf, 'x', rel, t.x)
  const y = interpolateKeyframes(kf, 'y', rel, t.y)
  const width = interpolateKeyframes(kf, 'width', rel, t.width)
  const height = interpolateKeyframes(kf, 'height', rel, t.height)
  const rotation = interpolateKeyframes(kf, 'rotation', rel, t.rotation)
  let opacity = interpolateKeyframes(kf, 'opacity', rel, layer.opacity)
  let scale = interpolateKeyframes(kf, 'scale', rel, 1)
  let dx = 0
  let dy = 0
  let rot = 0
  let blur = 0
  let clipFrac = 1
  const apply = (eff: Effect, sign: 1 | -1 = 1) => {
    opacity *= eff.opacity
    scale *= eff.scale
    dx += sign * eff.dx
    dy += sign * eff.dy
    rot += sign * eff.rotation
    blur = Math.max(blur, eff.blur)
    clipFrac = Math.min(clipFrac, eff.clip)
  }

  // Entrance
  const inA = layer.animations?.in
  if (inA && inA.preset && inA.preset !== 'none' && inA.duration > 0) {
    const delay = inA.delay ?? 0
    const p = ease(inA.easing, (rel - delay) / inA.duration)
    apply(presetEffect(inA.preset, rel < delay ? 0 : p, width, height))
  }
  // Exit (skipped while a transition takes the clip out, so the two never fight)
  const outA = layer.animations?.out
  if (outA && outA.preset && outA.preset !== 'none' && outA.duration > 0 && !ctx.transitionOut) {
    const startOut = clip.duration - outA.duration
    if (rel >= startOut) {
      const p = ease(outA.easing, 1 - (rel - startOut) / outA.duration)
      apply(presetEffect(outA.preset, p, width, height), -1)
    }
  }
  // Transition in (this clip is incoming)
  if (ctx.transitionIn) {
    const d = ctx.transitionIn.duration
    const winStart = clip.start - d / 2
    if (time < winStart + d) {
      const p = Math.min(1, Math.max(0, (time - winStart) / d))
      apply(transitionEffect(ctx.transitionIn, p, true, compositionSize.width, compositionSize.height))
    }
  }
  // Transition out (next clip is incoming; this one is outgoing)
  if (ctx.transitionOut) {
    const d = ctx.transitionOut.duration
    const winStart = clip.start + clip.duration - d / 2
    if (time >= winStart) {
      const p = Math.min(1, Math.max(0, (time - winStart) / d))
      apply(transitionEffect(ctx.transitionOut, p, false, compositionSize.width, compositionSize.height))
    }
  }

  return {
    visible: opacity > 0.001 && clipFrac > 0.001,
    x, y, width, height,
    rotation: rotation + rot,
    opacity: Math.min(1, Math.max(0, opacity)),
    scale, dx, dy, blur, clip: clipFrac, dim: 0,
  }
}

/** Audio gain for a clip at absolute time, including fades. 0..1 */
export function audioGain(clip: Clip, time: number): number {
  const a = clip.audio
  if (!a || a.muted) return 0
  const rel = time - clip.start
  if (rel < 0 || rel > clip.duration) return 0
  let g = a.volume
  if (a.fadeIn > 0 && rel < a.fadeIn) g *= rel / a.fadeIn
  if (a.fadeOut > 0 && rel > clip.duration - a.fadeOut) g *= Math.max(0, (clip.duration - rel) / a.fadeOut)
  return Math.min(1, Math.max(0, g))
}
