/**
 * Repair a loaded project so every field the renderer relies on is valid.
 * Older saves (or tool calls that slipped through) may carry undefined/NaN values.
 */
import type { Animations, EntranceAnimation, Project } from '@/types'
import { ANIMATION_PRESETS, ASPECT_PRESETS, EASINGS, KEYFRAME_PROPERTIES, MAX_COMPOSITION_DURATION, MAX_SPEED, MIN_SPEED, TRANSITION_TYPES } from '@/types'
import { defaultAnimations, defaultExportSettings } from './project'
import { isColor } from './validate'

const FPS = [24, 25, 30, 50, 60]
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback

function fixAnim(a: Partial<EntranceAnimation> | undefined, base: EntranceAnimation): EntranceAnimation {
  return {
    preset: a && ANIMATION_PRESETS.includes(a.preset as EntranceAnimation['preset']) ? (a.preset as EntranceAnimation['preset']) : base.preset,
    duration: num(a?.duration, base.duration, 0, 30),
    easing: a && EASINGS.includes(a.easing as EntranceAnimation['easing']) ? (a.easing as EntranceAnimation['easing']) : base.easing,
    delay: num(a?.delay, 0, 0, MAX_COMPOSITION_DURATION),
  }
}

export function normalizeProject(input: Project): Project {
  const p: Project = JSON.parse(JSON.stringify(input))
  const c = p.composition ?? ({} as Project['composition'])
  const aspect = c.aspect && ASPECT_PRESETS[c.aspect] ? c.aspect : '16:9'
  p.composition = {
    aspect,
    width: num(c.width, ASPECT_PRESETS[aspect].width, 16, 7680),
    height: num(c.height, ASPECT_PRESETS[aspect].height, 16, 7680),
    fps: FPS.includes(c.fps) ? c.fps : 30,
    duration: num(c.duration, 15, 1, MAX_COMPOSITION_DURATION),
    backgroundColor: isColor(c.backgroundColor) ? c.backgroundColor : '#ffffff',
    backgroundAssetId: typeof c.backgroundAssetId === 'string' ? c.backgroundAssetId : null,
    ...(typeof c.speed === 'number' && Number.isFinite(c.speed) && c.speed !== 1 ? { speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, c.speed)) } : {}),
  }
  p.export = { ...defaultExportSettings(p.composition), ...(p.export ?? {}) }
  if (!FPS.includes(p.export.fps)) p.export.fps = p.composition.fps
  p.assets = Array.isArray(p.assets) ? p.assets : []
  p.tracks = Array.isArray(p.tracks) ? p.tracks.filter((t) => t && typeof t.id === 'string') : []
  p.markers = Array.isArray(p.markers)
    ? p.markers.filter((m) => m && typeof m.id === 'string').map((m) => {
        const { speed, ...rest } = m
        const keep = typeof speed === 'number' && Number.isFinite(speed) && speed !== 1
        return { ...rest, time: num(m.time, 0, 0), label: String(m.label ?? 'Section'), color: isColor(m.color) ? m.color : '#9a5bf5', ...(keep ? { speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) } : {}) }
      })
    : []
  p.layers = (Array.isArray(p.layers) ? p.layers : []).filter((l) => l && typeof l.id === 'string').map((l) => {
    const base = defaultAnimations()
    const a = (l.animations ?? {}) as Partial<Animations>
    const animations: Animations = {
      in: fixAnim(a.in, base.in),
      out: fixAnim(a.out, base.out),
      keyframes: (Array.isArray(a.keyframes) ? a.keyframes : [])
        .filter((k) => k && KEYFRAME_PROPERTIES.includes(k.property) && Number.isFinite(k.time) && Number.isFinite(k.value))
        .map((k) => ({ ...k, id: k.id ?? `kf_${Math.random().toString(36).slice(2, 10)}`, easing: EASINGS.includes(k.easing) ? k.easing : 'ease-in-out' })),
    }
    const t = l.transform ?? ({} as typeof l.transform)
    return {
      ...l,
      name: String(l.name ?? l.type),
      opacity: num(l.opacity, 1, 0, 1),
      locked: !!l.locked,
      hidden: !!l.hidden,
      transform: { x: num(t.x, 0), y: num(t.y, 0), width: num(t.width, 100, 1), height: num(t.height, 100, 1), rotation: num(t.rotation, 0) },
      animations,
    }
  })
  const layerIds = new Set(p.layers.map((l) => l.id))
  const trackIds = new Set(p.tracks.map((t) => t.id))
  p.clips = (Array.isArray(p.clips) ? p.clips : [])
    .filter((cl) => cl && typeof cl.id === 'string' && trackIds.has(cl.trackId) && (!cl.layerId || layerIds.has(cl.layerId)))
    .map((cl) => ({
      ...cl,
      start: num(cl.start, 0, 0, MAX_COMPOSITION_DURATION),
      duration: num(cl.duration, 1, 0.1, MAX_COMPOSITION_DURATION),
      trimIn: num(cl.trimIn, 0, 0),
      transitionIn: cl.transitionIn && TRANSITION_TYPES.includes(cl.transitionIn.type) ? { type: cl.transitionIn.type, duration: num(cl.transitionIn.duration, 0.6, 0, 10) } : undefined,
      audio: cl.audio ? { assetId: String(cl.audio.assetId), volume: num(cl.audio.volume, 1, 0, 1), fadeIn: num(cl.audio.fadeIn, 0, 0), fadeOut: num(cl.audio.fadeOut, 0, 0), muted: !!cl.audio.muted } : undefined,
    }))
  return p
}
