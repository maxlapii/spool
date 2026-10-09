/**
 * Pure editing operations over a Project. Every editing surface (canvas, timeline,
 * inspector, keyboard shortcuts and Claude tools) goes through these functions so
 * validation and behaviour stay consistent. Operations never mutate their input.
 */
import { produce } from 'immer'
import type {
  AspectRatio, AudioSettings, Clip, Composition, EntranceAnimation, Keyframe, Layer, Marker, MediaProps, Project,
  ShapeProps, TextProps, Track, TrackKind, Transition, Transform,
} from '@/types'
import { ANIMATION_PRESETS, ASPECT_PRESETS, EASINGS, KEYFRAME_PROPERTIES, MAX_COMPOSITION_DURATION, MAX_OUTPUT_SECONDS, MAX_SPEED, MIN_SPEED, TRANSITION_TYPES } from '@/types'
import { uid } from '@/utils/id'
import { clamp } from '@/utils/math'
import { compact } from '@/utils/object'
import { outputDuration } from './speed'
import { assert, assertColor, assertFinite, assertNonNegative, assertPositive, assertRange, ValidationError } from './validate'
import {
  MIN_CLIP_DURATION, createClip, createMediaLayer, createShapeLayer, createTextLayer, createTrack, defaultAnimations,
} from './project'

export { ValidationError }

// ---------- lookups ----------

export function getClip(project: Project, clipId: string): Clip {
  const clip = project.clips.find((c) => c.id === clipId)
  if (!clip) throw new ValidationError(`Unknown clip id "${clipId}"`)
  return clip
}

export function getLayer(project: Project, layerId: string): Layer {
  const layer = project.layers.find((l) => l.id === layerId)
  if (!layer) throw new ValidationError(`Unknown layer id "${layerId}"`)
  return layer
}

export function getTrack(project: Project, trackId: string): Track {
  const track = project.tracks.find((t) => t.id === trackId)
  if (!track) throw new ValidationError(`Unknown track id "${trackId}"`)
  return track
}

export function clipForLayer(project: Project, layerId: string): Clip | undefined {
  return project.clips.find((c) => c.layerId === layerId)
}

export function layerForClip(project: Project, clipId: string): Layer | undefined {
  const clip = project.clips.find((c) => c.id === clipId)
  return clip?.layerId ? project.layers.find((l) => l.id === clip.layerId) : undefined
}

export function clipsOnTrack(project: Project, trackId: string): Clip[] {
  return project.clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start)
}

export function clipEnd(clip: Clip) {
  return clip.start + clip.duration
}

/** Does [start, start+duration) overlap any other clip on the track? */
export function overlapsOnTrack(project: Project, trackId: string, start: number, duration: number, excludeId?: string): Clip | undefined {
  const end = start + duration
  return project.clips.find((c) => c.trackId === trackId && c.id !== excludeId && c.start < end - 1e-6 && clipEnd(c) > start + 1e-6)
}

/**
 * Find the nearest start >= 0 on a track where a clip of `duration` fits without overlapping.
 * Prefers the requested start, then searches in the direction of `bias`.
 */
export function freeStart(project: Project, trackId: string, start: number, duration: number, excludeId?: string, bias: 'left' | 'right' | 'nearest' = 'nearest'): number | null {
  if (!overlapsOnTrack(project, trackId, start, duration, excludeId)) return Math.max(0, start)
  const others = project.clips.filter((c) => c.trackId === trackId && c.id !== excludeId).sort((a, b) => a.start - b.start)
  const candidates: number[] = [0]
  for (const c of others) candidates.push(clipEnd(c), c.start - duration)
  const valid = candidates.filter((t) => t >= 0 && !overlapsOnTrack(project, trackId, t, duration, excludeId))
  if (valid.length === 0) return null
  const pool = bias === 'left' ? valid.filter((t) => t <= start) : bias === 'right' ? valid.filter((t) => t >= start) : valid
  const list = pool.length ? pool : valid
  return list.reduce((best, t) => (Math.abs(t - start) < Math.abs(best - start) ? t : best), list[0])
}

/** First visual track (from the top) with room for the clip, or null. */
export function findFreeVisualTrack(project: Project, start: number, duration: number): string | null {
  for (const t of project.tracks) {
    if (t.kind !== 'visual' || t.locked) continue
    if (!overlapsOnTrack(project, t.id, start, duration)) return t.id
  }
  return null
}

/** Touch updatedAt — called by every mutating op. */
function touch(draft: Project) {
  draft.updatedAt = new Date().toISOString()
}

function assertTime(v: unknown, name = 'time'): asserts v is number {
  assertNonNegative(v, name)
  assert(v <= MAX_COMPOSITION_DURATION, `${name} must be within the ${MAX_COMPOSITION_DURATION}s (5 minute) limit`)
}

/** Grow the composition to fit a clip, within the 5-minute limit. */
function fitComposition(d: Project, end: number) {
  assert(end <= MAX_COMPOSITION_DURATION + 1e-6, `Clips cannot extend past ${MAX_COMPOSITION_DURATION}s (5 minutes)`)
  if (end > d.composition.duration) d.composition.duration = Math.min(MAX_COMPOSITION_DURATION, Math.ceil(end))
}

function trackKindForLayer(layer: Layer): TrackKind {
  return layer.type === 'video' || layer.type === 'image' || layer.type === 'text' || layer.type === 'shape' ? 'visual' : 'audio'
}

function assertTrackAccepts(track: Track, clip: Pick<Clip, 'layerId' | 'audio'>) {
  if (clip.audio) assert(track.kind === 'audio', `Track "${track.name}" is not an audio track`)
  else assert(track.kind === 'visual', `Track "${track.name}" is an audio track and cannot hold visual clips`)
}

// ---------- tracks ----------

export function addTrack(project: Project, kind: TrackKind, name?: string, index?: number): { project: Project; trackId: string } {
  const track = createTrack(kind, name ?? (kind === 'audio' ? 'Audio' : 'Layer'))
  const next = produce(project, (d) => {
    const i = index ?? (kind === 'audio' ? d.tracks.length : 0)
    d.tracks.splice(clamp(i, 0, d.tracks.length), 0, track)
    touch(d)
  })
  return { project: next, trackId: track.id }
}

export function updateTrack(project: Project, trackId: string, patch: Partial<Pick<Track, 'name' | 'locked' | 'hidden' | 'muted'>>): Project {
  getTrack(project, trackId)
  return produce(project, (d) => {
    const t = d.tracks.find((x) => x.id === trackId)!
    if (patch.name !== undefined) t.name = String(patch.name).slice(0, 60) || t.name
    if (patch.locked !== undefined) t.locked = !!patch.locked
    if (patch.hidden !== undefined) t.hidden = !!patch.hidden
    if (patch.muted !== undefined) t.muted = !!patch.muted
    touch(d)
  })
}

export function moveTrack(project: Project, trackId: string, direction: 'up' | 'down'): Project {
  const idx = project.tracks.findIndex((t) => t.id === trackId)
  assert(idx >= 0, `Unknown track id "${trackId}"`)
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= project.tracks.length) return project
  return produce(project, (d) => {
    const [t] = d.tracks.splice(idx, 1)
    d.tracks.splice(target, 0, t)
    touch(d)
  })
}

export function deleteTrack(project: Project, trackId: string): Project {
  getTrack(project, trackId)
  const clipIds = project.clips.filter((c) => c.trackId === trackId).map((c) => c.id)
  const withoutClips = deleteClips(project, clipIds)
  return produce(withoutClips, (d) => {
    d.tracks = d.tracks.filter((t) => t.id !== trackId)
    touch(d)
  })
}

// ---------- adding clips ----------

interface AddVisualOptions {
  start?: number
  duration?: number
  trackId?: string
}

function resolveTiming(project: Project, opts: AddVisualOptions) {
  const start = opts.start ?? 0
  const duration = opts.duration ?? Math.max(MIN_CLIP_DURATION, Math.min(5, project.composition.duration - start))
  assertTime(start, 'start')
  assertPositive(duration, 'duration')
  return { start, duration }
}

function insertVisual(project: Project, layer: Layer, opts: AddVisualOptions): { project: Project; clipId: string; layerId: string } {
  const { start, duration } = resolveTiming(project, opts)
  let trackId = opts.trackId
  let base = project
  let placedStart = start
  if (trackId) {
    const track = getTrack(project, trackId)
    assert(track.kind === trackKindForLayer(layer), `Track "${track.name}" cannot hold ${layer.type} layers`)
    const fs = freeStart(project, trackId, start, duration, undefined, 'right')
    assert(fs !== null, `No room on track "${track.name}" at ${start}s`)
    placedStart = fs
  } else {
    const free = findFreeVisualTrack(project, start, duration)
    if (free) trackId = free
    else {
      const r = addTrack(project, 'visual', layer.type === 'text' ? 'Text' : layer.type === 'shape' ? 'Graphics' : 'Media', 0)
      base = r.project
      trackId = r.trackId
    }
  }
  const clip = createClip({ trackId: trackId!, name: layer.name, start: placedStart, duration, layerId: layer.id })
  const next = produce(base, (d) => {
    d.layers.push(layer)
    d.clips.push(clip)
    fitComposition(d, clipEnd(clip))
    touch(d)
  })
  return { project: next, clipId: clip.id, layerId: layer.id }
}

export function addTextLayer(
  project: Project,
  text: Partial<TextProps>,
  transform: Partial<Transform> = {},
  opts: AddVisualOptions & { name?: string; animations?: Partial<Layer['animations']> } = {},
) {
  validateTextProps(text)
  const c = project.composition
  const width = transform.width ?? Math.round(c.width * 0.6)
  const height = transform.height ?? Math.round((text.fontSize ?? 64) * (text.lineHeight ?? 1.2) * 1.3)
  const layer = createTextLayer(text, {
    name: opts.name,
    transform: {
      x: transform.x ?? Math.round((c.width - width) / 2),
      y: transform.y ?? Math.round((c.height - height) / 2),
      width, height, rotation: transform.rotation ?? 0,
    },
    animations: opts.animations,
  })
  validateTransform(layer.transform)
  return insertVisual(project, layer, opts)
}

export function addShapeLayer(
  project: Project,
  shape: Partial<ShapeProps>,
  transform: Partial<Transform> = {},
  opts: AddVisualOptions & { name?: string; animations?: Partial<Layer['animations']> } = {},
) {
  validateShapeProps(shape)
  const c = project.composition
  const width = transform.width ?? 320
  const height = transform.height ?? 320
  const layer = createShapeLayer(shape, {
    name: opts.name,
    transform: {
      x: transform.x ?? Math.round((c.width - width) / 2),
      y: transform.y ?? Math.round((c.height - height) / 2),
      width, height, rotation: transform.rotation ?? 0,
    },
    animations: opts.animations,
  })
  validateTransform(layer.transform)
  return insertVisual(project, layer, opts)
}

/** Add an image/video/audio asset to the timeline. */
export function addMediaClip(
  project: Project,
  assetId: string,
  opts: AddVisualOptions & { media?: Partial<MediaProps>; transform?: Partial<Transform>; name?: string } = {},
): { project: Project; clipId: string; layerId?: string } {
  const asset = project.assets.find((a) => a.id === assetId)
  if (!asset) throw new ValidationError(`Unknown asset id "${assetId}"`)
  if (asset.type === 'audio') {
    return addAudioClip(project, assetId, opts)
  }
  const c = project.composition
  // Fit the asset inside the composition, preserving aspect ratio
  const aw = asset.width ?? c.width
  const ah = asset.height ?? c.height
  const scale = Math.min(c.width / aw, c.height / ah)
  const width = opts.transform?.width ?? Math.round(aw * scale)
  const height = opts.transform?.height ?? Math.round(ah * scale)
  const layer = createMediaLayer(asset.type, assetId, opts.media, {
    name: opts.name ?? asset.name,
    transform: {
      x: opts.transform?.x ?? Math.round((c.width - width) / 2),
      y: opts.transform?.y ?? Math.round((c.height - height) / 2),
      width, height, rotation: opts.transform?.rotation ?? 0,
    },
  })
  const duration = opts.duration ?? (asset.type === 'video' && asset.duration ? asset.duration : undefined)
  return insertVisual(project, layer, { ...opts, duration })
}

export function addAudioClip(project: Project, assetId: string, opts: AddVisualOptions & { name?: string; trimIn?: number; audio?: Partial<Omit<AudioSettings, 'assetId'>> } = {}): { project: Project; clipId: string } {
  const asset = project.assets.find((a) => a.id === assetId)
  if (!asset) throw new ValidationError(`Unknown asset id "${assetId}"`)
  assert(asset.type === 'audio' || asset.type === 'video', 'Only audio or video assets can be placed on audio tracks')
  const start = opts.start ?? 0
  const duration = opts.duration ?? asset.duration ?? 5
  assertTime(start, 'start')
  assertPositive(duration, 'duration')
  if (opts.trimIn !== undefined) assertNonNegative(opts.trimIn, 'trimIn')
  if (opts.audio?.volume !== undefined) assertRange(opts.audio.volume, 'volume', 0, 1)
  if (opts.audio?.fadeIn !== undefined) assertRange(opts.audio.fadeIn, 'fadeIn', 0, duration)
  if (opts.audio?.fadeOut !== undefined) assertRange(opts.audio.fadeOut, 'fadeOut', 0, duration)
  let base = project
  let trackId = opts.trackId
  if (trackId) assert(getTrack(project, trackId).kind === 'audio', 'Target track is not an audio track')
  else {
    trackId = project.tracks.find((t) => t.kind === 'audio' && !t.locked && !overlapsOnTrack(project, t.id, start, duration))?.id
    if (!trackId) {
      const r = addTrack(project, 'audio', 'Audio')
      base = r.project
      trackId = r.trackId
    }
  }
  const placed = freeStart(base, trackId, start, duration, undefined, 'right')
  assert(placed !== null, 'No room on the audio track')
  const clip = createClip({
    trackId: trackId!,
    name: opts.name ?? asset.name,
    start: placed, duration,
    trimIn: opts.trimIn ?? 0,
    audio: { assetId, volume: 1, fadeIn: 0, fadeOut: 0, muted: false, ...compact(opts.audio ?? {}) },
  })
  const next = produce(base, (d) => {
    d.clips.push(clip)
    fitComposition(d, clipEnd(clip))
    touch(d)
  })
  return { project: next, clipId: clip.id }
}

// ---------- layer updates ----------

export interface LayerPatch {
  name?: string
  opacity?: number
  locked?: boolean
  hidden?: boolean
  transform?: Partial<Transform>
  text?: Partial<TextProps>
  /** `gradient: null` removes an existing gradient. */
  shape?: Partial<Omit<ShapeProps, 'gradient'>> & { gradient?: ShapeProps['gradient'] | null }
  media?: Partial<MediaProps>
}

export function validateTransform(t: Partial<Transform>) {
  if (t.x !== undefined) assertFinite(t.x, 'x')
  if (t.y !== undefined) assertFinite(t.y, 'y')
  if (t.width !== undefined) assertRange(t.width, 'width', 1, 20000)
  if (t.height !== undefined) assertRange(t.height, 'height', 1, 20000)
  if (t.rotation !== undefined) assertRange(t.rotation, 'rotation', -3600, 3600)
}

export function validateTextProps(p: Partial<TextProps>) {
  if (p.content !== undefined) assert(typeof p.content === 'string' && p.content.length <= 2000, 'content must be a string of at most 2000 characters')
  if (p.fontSize !== undefined) assertRange(p.fontSize, 'fontSize', 4, 800)
  if (p.fontWeight !== undefined) assert([400, 500, 600, 700, 800].includes(p.fontWeight), 'fontWeight must be one of 400, 500, 600, 700, 800')
  if (p.color !== undefined) assertColor(p.color, 'color')
  if (p.align !== undefined) assert(['left', 'center', 'right'].includes(p.align), 'align must be left, center or right')
  if (p.lineHeight !== undefined) assertRange(p.lineHeight, 'lineHeight', 0.5, 4)
  if (p.letterSpacing !== undefined) assertRange(p.letterSpacing, 'letterSpacing', -50, 200)
  if (p.fontFamily !== undefined) assert(typeof p.fontFamily === 'string' && p.fontFamily.length > 0 && p.fontFamily.length < 80, 'fontFamily must be a font name')
  if (p.backgroundColor !== undefined && p.backgroundColor !== null) assertColor(p.backgroundColor, 'backgroundColor')
  if (p.padding !== undefined) assertRange(p.padding, 'padding', 0, 400)
  if (p.shadow !== undefined) assertRange(p.shadow, 'shadow', 0, 60)
  if (p.borderRadius !== undefined) assertRange(p.borderRadius, 'borderRadius', 0, 1000)
}

export function validateShapeProps(p: Partial<Omit<ShapeProps, 'gradient'>> & { gradient?: ShapeProps['gradient'] | null }) {
  if (p.shape !== undefined) assert(['rect', 'ellipse', 'line', 'triangle'].includes(p.shape), 'shape must be rect, ellipse, line or triangle')
  if (p.fill !== undefined) assertColor(p.fill, 'fill')
  if (p.stroke !== undefined) assertColor(p.stroke, 'stroke')
  if (p.gradient) {
    assertColor(p.gradient.to, 'gradient.to')
    assertRange(p.gradient.angle, 'gradient.angle', -360, 360)
    if (p.gradient.type !== undefined) assert(p.gradient.type === 'linear' || p.gradient.type === 'radial', 'gradient.type must be linear or radial')
  }
  if (p.strokeWidth !== undefined) assertRange(p.strokeWidth, 'strokeWidth', 0, 200)
  if (p.borderRadius !== undefined) assertRange(p.borderRadius, 'borderRadius', 0, 1000)
}

export function validateMediaProps(p: Partial<MediaProps>) {
  if (p.fit !== undefined) assert(['cover', 'contain', 'fill'].includes(p.fit), 'fit must be cover, contain or fill')
  if (p.borderRadius !== undefined) assertRange(p.borderRadius, 'borderRadius', 0, 1000)
  if (p.volume !== undefined) assertRange(p.volume, 'volume', 0, 1)
}

export function updateLayer(project: Project, layerId: string, patch: LayerPatch): Project {
  const layer = getLayer(project, layerId)
  if (patch.opacity !== undefined) assertRange(patch.opacity, 'opacity', 0, 1)
  if (patch.transform) validateTransform(patch.transform)
  if (patch.text) {
    assert(layer.type === 'text', `Layer "${layer.name}" is not a text layer`)
    validateTextProps(patch.text)
  }
  if (patch.shape) {
    assert(layer.type === 'shape', `Layer "${layer.name}" is not a shape layer`)
    validateShapeProps(patch.shape)
  }
  if (patch.media) {
    assert(layer.type === 'image' || layer.type === 'video', `Layer "${layer.name}" is not a media layer`)
    validateMediaProps(patch.media)
  }
  return produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    if (patch.name !== undefined) l.name = String(patch.name).slice(0, 60) || l.name
    if (patch.opacity !== undefined) l.opacity = patch.opacity
    if (patch.locked !== undefined) l.locked = !!patch.locked
    if (patch.hidden !== undefined) l.hidden = !!patch.hidden
    if (patch.transform) Object.assign(l.transform, compact(patch.transform))
    if (patch.text && l.type === 'text') Object.assign(l.text, compact(patch.text))
    if (patch.shape && l.type === 'shape') {
      const { gradient, ...rest } = patch.shape
      Object.assign(l.shape, compact(rest))
      if ('gradient' in patch.shape) {
        if (gradient) l.shape.gradient = { ...gradient }
        else delete l.shape.gradient
      }
    }
    if (patch.media && (l.type === 'image' || l.type === 'video')) Object.assign(l.media, compact(patch.media))
    touch(d)
  })
}

export function updateManyLayers(project: Project, patches: { layerId: string; patch: LayerPatch }[]): Project {
  return patches.reduce((p, { layerId, patch }) => updateLayer(p, layerId, patch), project)
}

// ---------- clip timing ----------

export function updateClip(project: Project, clipId: string, patch: Partial<Pick<Clip, 'name'>>): Project {
  getClip(project, clipId)
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    if (patch.name !== undefined) c.name = String(patch.name).slice(0, 60) || c.name
    touch(d)
  })
}

/** Move a clip to a new start time and optionally a compatible track. */
export function moveClip(project: Project, clipId: string, start: number, trackId?: string): Project {
  const clip = getClip(project, clipId)
  assertTime(start, 'start')
  if (trackId !== undefined && trackId !== clip.trackId) assertTrackAccepts(getTrack(project, trackId), clip)
  const target = trackId ?? clip.trackId
  const placed = freeStart(project, target, start, clip.duration, clipId, 'nearest')
  assert(placed !== null, `No room for "${clip.name}" on that track`)
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    c.start = placed
    if (trackId) c.trackId = trackId
    fitComposition(d, clipEnd(c))
    touch(d)
  })
}

/**
 * Trim a clip edge. Trimming the start keeps the end fixed (and advances trimIn for media);
 * trimming the end keeps the start fixed.
 */
export function trimClip(project: Project, clipId: string, edge: 'start' | 'end', time: number): Project {
  getClip(project, clipId)
  assertTime(time, 'time')
  const self = getClip(project, clipId)
  const neighbours = project.clips.filter((c) => c.trackId === self.trackId && c.id !== clipId)
  const prevEnd = neighbours.filter((c) => clipEnd(c) <= self.start + 1e-6).reduce((m, c) => Math.max(m, clipEnd(c)), 0)
  const nextStart = neighbours.filter((c) => c.start >= clipEnd(self) - 1e-6).reduce((m, c) => Math.min(m, c.start), Infinity)
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    const end = clipEnd(c)
    if (edge === 'start') {
      const newStart = clamp(time, Math.max(prevEnd, c.start - c.trimIn), end - MIN_CLIP_DURATION)
      const delta = newStart - c.start
      c.trimIn = Math.max(0, c.trimIn + delta)
      c.start = newStart
      c.duration = end - newStart
    } else {
      const newEnd = Math.min(nextStart, Math.max(c.start + MIN_CLIP_DURATION, time))
      c.duration = newEnd - c.start
    }
    fitComposition(d, clipEnd(c))
    touch(d)
  })
}

export function setClipDuration(project: Project, clipId: string, duration: number): Project {
  getClip(project, clipId)
  assertPositive(duration, 'duration')
  assert(duration >= MIN_CLIP_DURATION, `duration must be at least ${MIN_CLIP_DURATION}s`)
  const self = getClip(project, clipId)
  const blocker = overlapsOnTrack(project, self.trackId, self.start, duration, clipId)
  assert(!blocker, `Duration ${duration}s would overlap "${blocker?.name}" on the same track`)
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    c.duration = duration
    fitComposition(d, clipEnd(c))
    touch(d)
  })
}

/** Split a clip at an absolute time. Returns the id of the new (right-hand) clip. */
export function splitClip(project: Project, clipId: string, time: number): { project: Project; newClipId: string } {
  const clip = getClip(project, clipId)
  assertTime(time, 'time')
  assert(time > clip.start + MIN_CLIP_DURATION / 2 && time < clipEnd(clip) - MIN_CLIP_DURATION / 2, 'Split time must fall inside the clip')
  const offset = time - clip.start
  const newClipId = uid('clip')
  const next = produce(project, (d) => {
    const left = d.clips.find((x) => x.id === clipId)!
    const right: Clip = { ...left, id: newClipId, start: time, duration: clipEnd(left) - time, trimIn: left.trimIn + offset, transitionIn: undefined }
    left.duration = offset
    if (left.layerId) {
      const layer = d.layers.find((l) => l.id === left.layerId)!
      const newLayer = JSON.parse(JSON.stringify(layer)) as Layer
      newLayer.id = uid('layer')
      // Shift keyframes so the right part continues the same motion.
      newLayer.animations.keyframes = newLayer.animations.keyframes.map((k) => ({ ...k, id: uid('kf'), time: k.time - offset }))
      newLayer.animations.in = { ...newLayer.animations.in, preset: 'none' }
      layer.animations.out = { ...layer.animations.out, preset: 'none' }
      d.layers.push(newLayer)
      right.layerId = newLayer.id
    }
    d.clips.push(right)
    touch(d)
  })
  return { project: next, newClipId }
}

export function deleteClips(project: Project, clipIds: string[]): Project {
  if (clipIds.length === 0) return project
  const ids = new Set(clipIds)
  const layerIds = new Set(project.clips.filter((c) => ids.has(c.id)).map((c) => c.layerId).filter(Boolean) as string[])
  return produce(project, (d) => {
    d.clips = d.clips.filter((c) => !ids.has(c.id))
    d.layers = d.layers.filter((l) => !layerIds.has(l.id))
    touch(d)
  })
}

export function duplicateClip(project: Project, clipId: string): { project: Project; clipId: string } {
  const clip = getClip(project, clipId)
  const newClipId = uid('clip')
  let base = project
  let trackId = clip.trackId
  let start = freeStart(project, trackId, clipEnd(clip), clip.duration, undefined, 'right')
  if (start === null) {
    const r = addTrack(project, clip.audio ? 'audio' : 'visual', clip.audio ? 'Audio' : 'Layer', project.tracks.findIndex((t) => t.id === clip.trackId))
    base = r.project
    trackId = r.trackId
    start = clip.start
  }
  const next = produce(base, (d) => {
    const copy: Clip = { ...clip, id: newClipId, trackId, start: start!, transitionIn: undefined }
    if (clip.layerId) {
      const layer = d.layers.find((l) => l.id === clip.layerId)!
      const nl = JSON.parse(JSON.stringify(layer)) as Layer
      nl.id = uid('layer')
      nl.name = `${layer.name} copy`
      nl.animations.keyframes = nl.animations.keyframes.map((k) => ({ ...k, id: uid('kf') }))
      d.layers.push(nl)
      copy.layerId = nl.id
      copy.name = nl.name
    }
    d.clips.push(copy)
    fitComposition(d, clipEnd(copy))
    touch(d)
  })
  return { project: next, clipId: newClipId }
}

/** Z-order: move a clip to the track above/below (creating a track when needed). */
export function setLayerOrder(project: Project, clipId: string, direction: 'forward' | 'backward' | 'front' | 'back'): Project {
  const clip = getClip(project, clipId)
  const track = getTrack(project, clip.trackId)
  assert(track.kind === 'visual', 'Only visual clips have a z-order')
  const visualTracks = project.tracks.filter((t) => t.kind === 'visual')
  const idx = visualTracks.findIndex((t) => t.id === track.id)
  const overlaps = (t: Track) => clipsOnTrack(project, t.id).some((c) => c.id !== clip.id && c.start < clipEnd(clip) && clipEnd(c) > clip.start)

  let targetIdx: number
  if (direction === 'front') targetIdx = 0
  else if (direction === 'back') targetIdx = visualTracks.length - 1
  else targetIdx = direction === 'forward' ? idx - 1 : idx + 1

  if (targetIdx >= 0 && targetIdx < visualTracks.length && targetIdx !== idx && !overlaps(visualTracks[targetIdx])) {
    return moveClip(project, clipId, clip.start, visualTracks[targetIdx].id)
  }
  if (targetIdx === idx) return project
  // Need a fresh track at the target position.
  const insertAt = direction === 'forward' || direction === 'front'
    ? project.tracks.findIndex((t) => t.id === visualTracks[Math.max(0, Math.min(targetIdx, visualTracks.length - 1))].id) + (direction === 'front' ? 0 : 0)
    : project.tracks.findIndex((t) => t.id === visualTracks[Math.max(0, Math.min(targetIdx, visualTracks.length - 1))].id) + 1
  const { project: withTrack, trackId } = addTrack(project, 'visual', 'Layer', Math.max(0, insertAt))
  return moveClip(withTrack, clipId, clip.start, trackId)
}

// ---------- markers ----------

export function addMarker(project: Project, time: number, label = 'Section', color = '#9a5bf5'): { project: Project; markerId: string } {
  assertTime(time, 'time')
  assertColor(color, 'color')
  const marker: Marker = { id: uid('mk'), time, label: String(label).slice(0, 40), color }
  // A marker that splits a section keeps that section's speed, so the picture does not change speed by surprise.
  const inside = project.markers.filter((m) => m.time < time).sort((a, b) => b.time - a.time)[0]
  if (inside?.speed && inside.speed !== 1) marker.speed = inside.speed
  return { project: produce(project, (d) => { d.markers.push(marker); touch(d) }), markerId: marker.id }
}

export function updateMarker(project: Project, markerId: string, patch: Partial<Omit<Marker, 'id'>>): Project {
  assert(project.markers.some((m) => m.id === markerId), `Unknown marker id "${markerId}"`)
  if (patch.time !== undefined) assertTime(patch.time, 'time')
  if (patch.color !== undefined) assertColor(patch.color, 'color')
  return produce(project, (d) => {
    const m = d.markers.find((x) => x.id === markerId)!
    if (patch.time !== undefined) m.time = patch.time
    if (patch.label !== undefined) m.label = String(patch.label).slice(0, 40)
    if (patch.color !== undefined) m.color = patch.color
    if (patch.speed !== undefined) { assertSpeed(patch.speed, 'speed'); if (patch.speed === 1) delete m.speed; else m.speed = round2(patch.speed) }
    touch(d)
  })
}

export function deleteMarker(project: Project, markerId: string): Project {
  return produce(project, (d) => { d.markers = d.markers.filter((m) => m.id !== markerId); touch(d) })
}

// ---------- speed ----------

const round2 = (v: number) => Math.round(v * 100) / 100
function assertSpeed(v: unknown, name: string): asserts v is number {
  assertFinite(v, name)
  assert(v >= MIN_SPEED && v <= MAX_SPEED, `${name} must be between ${MIN_SPEED}× and ${MAX_SPEED}×`)
}
/** Reject a speed that would export a video longer than the limit. */
function assertOutputLength(project: Project) {
  const out = outputDuration(project)
  assert(out <= MAX_OUTPUT_SECONDS + 1e-6, `That speed would make the exported video ${Math.round(out)}s long; the limit is ${MAX_OUTPUT_SECONDS / 60} minutes. Use a faster speed.`)
}

/** Speed of the whole video (1 = normal). It multiplies with each section's own speed. */
export function setProjectSpeed(project: Project, speed: number): Project {
  assertSpeed(speed, 'speed')
  const next = produce(project, (d) => {
    if (speed === 1) delete d.composition.speed
    else d.composition.speed = round2(speed)
    touch(d)
  })
  assertOutputLength(next)
  return next
}

/** Speed of the section that starts at a marker (1 = normal). */
export function setSectionSpeed(project: Project, markerId: string, speed: number): Project {
  assert(project.markers.some((m) => m.id === markerId), `Unknown marker id "${markerId}"`)
  assertSpeed(speed, 'speed')
  const next = updateMarker(project, markerId, { speed })
  assertOutputLength(next)
  return next
}

/** Put every section and the whole video back to normal speed. */
export function resetSpeeds(project: Project): Project {
  return produce(project, (d) => {
    delete d.composition.speed
    for (const m of d.markers) delete m.speed
    touch(d)
  })
}

// ---------- animation ----------

export function setAnimation(project: Project, layerId: string, which: 'in' | 'out', patch: Partial<EntranceAnimation>): Project {
  getLayer(project, layerId)
  if (patch.preset !== undefined) assert(ANIMATION_PRESETS.includes(patch.preset), `Unknown animation preset "${patch.preset}"`)
  if (patch.duration !== undefined) assertRange(patch.duration, 'duration', 0, 30)
  if (patch.easing !== undefined) assert(EASINGS.includes(patch.easing), `Unknown easing "${patch.easing}"`)
  if (patch.delay !== undefined) assertRange(patch.delay, 'delay', 0, 60)
  return produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    l.animations[which] = { ...l.animations[which], ...compact(patch) }
    touch(d)
  })
}

export function addKeyframe(project: Project, layerId: string, kf: Omit<Keyframe, 'id'> & { id?: string }): { project: Project; keyframeId: string } {
  getLayer(project, layerId)
  const clip = clipForLayer(project, layerId)
  assert(KEYFRAME_PROPERTIES.includes(kf.property), `Unsupported keyframe property "${kf.property}"`)
  assertTime(kf.time, 'keyframe time')
  if (clip) assert(kf.time <= clip.duration + 1e-6, `Keyframe time ${kf.time}s is beyond the clip duration (${clip.duration}s)`)
  assertFinite(kf.value, 'value')
  if (kf.property === 'opacity') assertRange(kf.value, 'opacity', 0, 1)
  if (kf.property === 'scale') assertRange(kf.value, 'scale', 0, 20)
  if (kf.property === 'width' || kf.property === 'height') assertPositive(kf.value, kf.property)
  assert(EASINGS.includes(kf.easing), `Unknown easing "${kf.easing}"`)
  const id = kf.id ?? uid('kf')
  const next = produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    // Replace an existing keyframe at the same property/time
    l.animations.keyframes = l.animations.keyframes.filter((k) => !(k.property === kf.property && Math.abs(k.time - kf.time) < 1e-6))
    l.animations.keyframes.push({ id, property: kf.property, time: kf.time, value: kf.value, easing: kf.easing })
    l.animations.keyframes.sort((a, b) => a.time - b.time)
    touch(d)
  })
  return { project: next, keyframeId: id }
}

export function updateKeyframe(project: Project, layerId: string, keyframeId: string, patch: Partial<Omit<Keyframe, 'id'>>): Project {
  const layer = getLayer(project, layerId)
  const existing = layer.animations.keyframes.find((k) => k.id === keyframeId)
  assert(existing, `Unknown keyframe id "${keyframeId}"`)
  const merged = { ...existing, ...patch }
  const removed = produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    l.animations.keyframes = l.animations.keyframes.filter((k) => k.id !== keyframeId)
  })
  return addKeyframe(removed, layerId, merged).project
}

export function deleteKeyframe(project: Project, layerId: string, keyframeId: string): Project {
  getLayer(project, layerId)
  return produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    l.animations.keyframes = l.animations.keyframes.filter((k) => k.id !== keyframeId)
    touch(d)
  })
}

export function clearKeyframes(project: Project, layerId: string, property?: Keyframe['property']): Project {
  getLayer(project, layerId)
  return produce(project, (d) => {
    const l = d.layers.find((x) => x.id === layerId)!
    l.animations.keyframes = property ? l.animations.keyframes.filter((k) => k.property !== property) : []
    touch(d)
  })
}

export function applyTransition(project: Project, clipId: string, transition: Transition | null): Project {
  const clip = getClip(project, clipId)
  if (transition) {
    assert(TRANSITION_TYPES.includes(transition.type), `Unknown transition "${transition.type}"`)
    assertRange(transition.duration, 'duration', 0, 10)
    const track = getTrack(project, clip.trackId)
    assert(track.kind === 'visual', 'Transitions apply to visual clips')
  }
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    c.transitionIn = transition && transition.type !== 'none' ? { ...transition } : undefined
    touch(d)
  })
}

// ---------- audio ----------

export function updateAudio(project: Project, clipId: string, patch: Partial<Omit<AudioSettings, 'assetId'>>): Project {
  const clip = getClip(project, clipId)
  assert(clip.audio, `Clip "${clip.name}" is not an audio clip`)
  if (patch.volume !== undefined) assertRange(patch.volume, 'volume', 0, 1)
  if (patch.fadeIn !== undefined) assertRange(patch.fadeIn, 'fadeIn', 0, clip.duration)
  if (patch.fadeOut !== undefined) assertRange(patch.fadeOut, 'fadeOut', 0, clip.duration)
  return produce(project, (d) => {
    const c = d.clips.find((x) => x.id === clipId)!
    Object.assign(c.audio!, compact(patch))
    touch(d)
  })
}

// ---------- composition ----------

export function updateComposition(project: Project, patch: Partial<Pick<Composition, 'duration' | 'fps' | 'backgroundColor' | 'backgroundAssetId'>>): Project {
  if (patch.duration !== undefined) assertRange(patch.duration, 'duration', 1, MAX_COMPOSITION_DURATION)
  if (patch.fps !== undefined) assert([24, 25, 30, 50, 60].includes(patch.fps), 'fps must be 24, 25, 30, 50 or 60')
  if (patch.backgroundColor !== undefined) assertColor(patch.backgroundColor, 'backgroundColor')
  if (patch.backgroundAssetId) assert(project.assets.some((a) => a.id === patch.backgroundAssetId && a.type === 'image'), 'backgroundAssetId must reference an image asset')
  return produce(project, (d) => {
    Object.assign(d.composition, compact(patch))
    if (patch.fps) d.export.fps = patch.fps
    touch(d)
  })
}

/** Does the layer cover (almost) the whole composition, like a background video or backdrop? */
export function isFullFrame(t: Transform, width: number, height: number): boolean {
  const tol = 0.04
  return t.x <= width * tol && t.y <= height * tol && t.x + t.width >= width * (1 - tol) && t.y + t.height >= height * (1 - tol) && Math.abs(t.rotation) < 0.5
}

/**
 * Change aspect ratio and resize the content to the new frame:
 * - full-frame layers (background video/images/backdrops) fill the new frame (media uses cover fit)
 * - media layers scale so they cover at least their relative share of the frame
 * - everything else scales uniformly around the composition centre.
 */
export function setAspectRatio(project: Project, aspect: AspectRatio): Project {
  const preset = ASPECT_PRESETS[aspect]
  assert(preset, `Unknown aspect ratio "${aspect}"`)
  const old = project.composition
  if (old.aspect === aspect && old.width === preset.width && old.height === preset.height) return project
  const s = Math.min(preset.width / old.width, preset.height / old.height)
  const ocx = old.width / 2
  const ocy = old.height / 2
  const ncx = preset.width / 2
  const ncy = preset.height / 2
  return produce(project, (d) => {
    d.composition.aspect = aspect
    d.composition.width = preset.width
    d.composition.height = preset.height
    d.export.width = preset.width
    d.export.height = preset.height
    for (const l of d.layers) {
      const t = l.transform
      if (isFullFrame(t, old.width, old.height)) {
        // Background-like layers keep filling the frame.
        t.x = 0
        t.y = 0
        t.width = preset.width
        t.height = preset.height
        if (l.type === 'image' || l.type === 'video') l.media.fit = l.media.fit === 'fill' ? 'fill' : 'cover'
        l.animations.keyframes = l.animations.keyframes.filter((k) => !['x', 'y', 'width', 'height'].includes(k.property))
        continue
      }
      const cx = t.x + t.width / 2
      const cy = t.y + t.height / 2
      t.width = Math.round(t.width * s)
      t.height = Math.round(t.height * s)
      t.x = Math.round(ncx + (cx - ocx) * s - t.width / 2)
      t.y = Math.round(ncy + (cy - ocy) * s - t.height / 2)
      if (l.type === 'text') l.text.fontSize = Math.max(4, Math.round(l.text.fontSize * s))
      for (const k of l.animations.keyframes) {
        if (k.property === 'x') k.value = Math.round(ncx + (k.value + t.width / (2 * s) - ocx) * s - t.width / 2)
        else if (k.property === 'y') k.value = Math.round(ncy + (k.value + t.height / (2 * s) - ocy) * s - t.height / 2)
        else if (k.property === 'width' || k.property === 'height') k.value = Math.round(k.value * s)
      }
    }
    touch(d)
  })
}

export function renameProject(project: Project, name: string): Project {
  assert(typeof name === 'string' && name.trim().length > 0 && name.length <= 80, 'Project name must be 1-80 characters')
  return produce(project, (d) => { d.name = name.trim(); touch(d) })
}

export function updateExportSettings(project: Project, patch: Partial<Project['export']>): Project {
  if (patch.width !== undefined) assertRange(patch.width, 'width', 16, 7680)
  if (patch.height !== undefined) assertRange(patch.height, 'height', 16, 7680)
  if (patch.fps !== undefined) assert([24, 25, 30, 50, 60].includes(patch.fps), 'fps must be 24, 25, 30, 50 or 60')
  return produce(project, (d) => { Object.assign(d.export, compact(patch)); touch(d) })
}

// ---------- assets ----------

export function addAsset(project: Project, asset: Project['assets'][number]): Project {
  return produce(project, (d) => {
    if (!d.assets.some((a) => a.id === asset.id)) d.assets.push(asset)
    touch(d)
  })
}

export function renameAsset(project: Project, assetId: string, name: string): Project {
  return produce(project, (d) => {
    const a = d.assets.find((x) => x.id === assetId)
    if (a) a.name = name.slice(0, 80) || a.name
    touch(d)
  })
}

/** Remove an asset and every clip/layer that references it. */
export function removeAsset(project: Project, assetId: string): Project {
  const layerIds = new Set(project.layers.filter((l) => (l.type === 'image' || l.type === 'video') && l.media.assetId === assetId).map((l) => l.id))
  const clipIds = project.clips.filter((c) => (c.layerId && layerIds.has(c.layerId)) || c.audio?.assetId === assetId).map((c) => c.id)
  const next = deleteClips(project, clipIds)
  return produce(next, (d) => {
    d.assets = d.assets.filter((a) => a.id !== assetId)
    if (d.composition.backgroundAssetId === assetId) d.composition.backgroundAssetId = null
    touch(d)
  })
}

/** Align selected layers inside the composition. */
export function alignLayers(project: Project, layerIds: string[], mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): Project {
  const c = project.composition
  return layerIds.reduce((p, id) => {
    const l = getLayer(p, id)
    const t = l.transform
    const patch: Partial<Transform> = {}
    if (mode === 'left') patch.x = 0
    if (mode === 'center') patch.x = Math.round((c.width - t.width) / 2)
    if (mode === 'right') patch.x = c.width - t.width
    if (mode === 'top') patch.y = 0
    if (mode === 'middle') patch.y = Math.round((c.height - t.height) / 2)
    if (mode === 'bottom') patch.y = c.height - t.height
    return updateLayer(p, id, { transform: patch })
  }, project)
}

/** Reset a layer's animations to defaults. */
export function resetAnimations(project: Project, layerId: string): Project {
  getLayer(project, layerId)
  return produce(project, (d) => {
    d.layers.find((x) => x.id === layerId)!.animations = defaultAnimations()
    touch(d)
  })
}
