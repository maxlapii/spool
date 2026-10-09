/**
 * Executes validated Claude tool calls against the editor store.
 * Every mutation goes through the same operations the UI uses.
 */
import { z } from 'zod'
import type { Clip, Layer, Project } from '@/types'
import { isToolName, parseToolInput, toolSchemas, type ToolName } from '@shared/ai/tools'
import { useEditor } from '@/store/editorStore'
import * as ops from './operations'
import { sampleAsset, trackById } from '@shared/music'
import { ValidationError } from './validate'
import { outputDuration } from './speed'

export interface ToolOutcome {
  name: string
  ok: boolean
  summary: string
  result: unknown
}

function layerSummary(layer: Layer) {
  const base = { id: layer.id, name: layer.name, type: layer.type, ...layer.transform, opacity: layer.opacity, hidden: layer.hidden, locked: layer.locked, animationIn: layer.animations.in.preset, animationOut: layer.animations.out.preset, keyframes: layer.animations.keyframes.length }
  if (layer.type === 'text') return { ...base, text: layer.text.content.slice(0, 80), fontFamily: layer.text.fontFamily, fontSize: layer.text.fontSize, color: layer.text.color }
  if (layer.type === 'shape') return { ...base, shape: layer.shape.shape, fill: layer.shape.fill }
  return { ...base, assetId: layer.media.assetId }
}

function clipSummary(project: Project, clip: Clip) {
  const layer = clip.layerId ? project.layers.find((l) => l.id === clip.layerId) : undefined
  return {
    clipId: clip.id,
    name: clip.name,
    trackId: clip.trackId,
    start: clip.start,
    duration: clip.duration,
    end: Math.round((clip.start + clip.duration) * 1000) / 1000,
    transitionIn: clip.transitionIn ?? null,
    ...(clip.audio ? { audio: clip.audio } : {}),
    ...(layer ? { layer: layerSummary(layer) } : {}),
  }
}

/** Compact project description sent to Claude with each user message. */
export function summarizeProject(project: Project) {
  return {
    name: project.name,
    composition: project.composition,
    tracks: project.tracks.map((t, i) => ({ id: t.id, name: t.name, kind: t.kind, zIndexFromFront: i, locked: t.locked, hidden: t.hidden })),
    clips: [...project.clips].sort((a, b) => a.start - b.start).map((c) => clipSummary(project, c)),
    markers: project.markers,
    speed: { video: project.composition.speed ?? 1, outputSeconds: Math.round(outputDuration(project) * 100) / 100, note: 'Each marker may carry a speed; a section runs from its marker to the next one.' },
    assets: project.assets.map((a) => ({ id: a.id, name: a.name, type: a.type, width: a.width, height: a.height, duration: a.duration })),
  }
}

function fullLayer(project: Project, layerId: string) {
  const layer = ops.getLayer(project, layerId)
  const clip = ops.clipForLayer(project, layerId)
  return { layer, clip: clip ? clipSummary(project, clip) : null }
}

function describe(name: ToolName, input: Record<string, unknown>, result: Record<string, unknown>): string {
  switch (name) {
    case 'create_text_layer': return `Added text “${String(input.content).slice(0, 30)}”`
    case 'create_shape_layer': return `Added ${input.shape} shape`
    case 'add_media_clip': return 'Placed media on the timeline'
    case 'update_layer': return `Updated layer ${result.name ?? input.layerId}`
    case 'move_clip': return `Moved clip to ${input.start}s`
    case 'trim_clip': return `Trimmed clip ${input.edge} to ${input.time}s`
    case 'set_clip_duration': return `Set clip duration to ${input.duration}s`
    case 'split_clip': return `Split clip at ${input.time}s`
    case 'delete_clips': return `Deleted ${(input.clipIds as string[]).length} clip(s)`
    case 'set_animation': return `Set ${input.which === 'in' ? 'entrance' : 'exit'} animation: ${input.preset}`
    case 'add_keyframe': return `Keyframe ${input.property}=${input.value} at ${input.time}s`
    case 'clear_keyframes': return 'Cleared keyframes'
    case 'apply_transition': return `Transition: ${input.type}`
    case 'update_composition': return 'Updated composition settings'
    case 'update_audio': return 'Updated audio settings'
    case 'add_marker': return `Added marker “${input.label}”`
    case 'set_speed': return input.target === 'video' ? `Whole video speed ${input.speed}×` : `Section speed ${input.speed}×`
    case 'align_layers': return `Aligned layers (${input.mode})`
    case 'set_layer_order': return `Changed layer order (${input.direction})`
    case 'add_sample_music': return `Added music “${trackById(String(input.trackId))?.name ?? input.trackId}”`
    case 'request_preview_update': return `Preview at ${input.time}s`
    default: return name.replace(/_/g, ' ')
  }
}

type ToolGradient = { to: string; angle?: number; type?: 'linear' | 'radial' } | null | undefined
/** Normalise the tool's gradient (angle optional, null clears) into the project model. */
function normShape<T extends { gradient?: ToolGradient }>(s: T | undefined) {
  if (!s) return undefined
  const { gradient, ...rest } = s
  if (gradient === undefined) return rest
  return { ...rest, gradient: gradient ? { to: gradient.to, angle: gradient.angle ?? 180, ...(gradient.type ? { type: gradient.type } : {}) } : null }
}
/** For creating layers there is nothing to clear, so a null gradient is simply dropped. */
function forCreate<T extends { gradient?: ToolGradient }>(s: T | undefined) {
  const n = normShape(s)
  if (!n) return {}
  const { gradient, ...rest } = n as { gradient?: { to: string; angle: number; type?: 'linear' | 'radial' } | null }
  return gradient ? { ...rest, gradient } : rest
}

const pick = <T extends object>(obj: T | undefined, keys: (keyof T)[]) => {
  if (!obj) return undefined
  const out: Partial<T> = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return Object.keys(out).length ? out : undefined
}

/**
 * Run a tool. Mutations use `patch` so that a whole assistant turn is one undo step
 * (the caller takes a snapshot before the turn starts).
 */
export function executeTool(rawName: string, rawInput: unknown): ToolOutcome {
  if (!isToolName(rawName)) return { name: rawName, ok: false, summary: `Unknown tool ${rawName}`, result: { error: `Unknown tool "${rawName}"` } }
  const name = rawName
  const store = useEditor.getState()
  const project = store.project
  if (!project) return { name, ok: false, summary: 'No project open', result: { error: 'No project is open' } }

  let input: Record<string, unknown>
  try {
    input = parseToolInput(name, rawInput ?? {}) as Record<string, unknown>
  } catch (e) {
    const message = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') : (e as Error).message
    return { name, ok: false, summary: `Invalid input for ${name}`, result: { error: `Invalid input: ${message}` } }
  }

  try {
    const result = run(name, input, project)
    return { name, ok: true, summary: describe(name, input, result as Record<string, unknown>), result }
  } catch (e) {
    const message = e instanceof ValidationError ? e.message : `Operation failed: ${(e as Error).message}`
    return { name, ok: false, summary: `${name.replace(/_/g, ' ')} failed`, result: { error: message } }
  }
}

function run(name: ToolName, input: Record<string, unknown>, project: Project): unknown {
  const store = useEditor.getState()
  const apply = (fn: (p: Project) => Project) => store.patch(fn)
  const anim = (a?: { preset: string; duration?: number; easing?: string; delay?: number }) =>
    a ? { preset: a.preset as Layer['animations']['in']['preset'], duration: a.duration ?? 0.8, easing: (a.easing ?? 'expo-out') as Layer['animations']['in']['easing'], delay: a.delay ?? 0 } : undefined
  const transform = pick(input as { x?: number; y?: number; width?: number; height?: number; rotation?: number }, ['x', 'y', 'width', 'height', 'rotation'])

  switch (name) {
    case 'get_project_summary':
      return summarizeProject(project)
    case 'get_selected_layer': {
      const clipId = store.selectedClipIds[0]
      if (!clipId) return { selected: null }
      const clip = project.clips.find((c) => c.id === clipId)
      if (!clip) return { selected: null }
      return { selected: clipSummary(project, clip), layer: clip.layerId ? ops.getLayer(project, clip.layerId) : null }
    }
    case 'get_layer':
      return fullLayer(project, input.layerId as string)
    case 'list_clips': {
      const { trackId, from, to } = input as { trackId?: string; from?: number; to?: number }
      return project.clips
        .filter((c) => (!trackId || c.trackId === trackId) && (from === undefined || c.start + c.duration >= from) && (to === undefined || c.start <= to))
        .sort((a, b) => a.start - b.start)
        .map((c) => clipSummary(project, c))
    }
    case 'create_text_layer': {
      const i = input as z.infer<typeof toolSchemas.create_text_layer.schema>
      let out = { clipId: '', layerId: '' }
      apply((p) => {
        const r = ops.addTextLayer(p, { content: i.content, ...(i.style ?? {}) }, transform ?? {}, {
          start: i.start, duration: i.duration, trackId: i.trackId, name: i.name,
          animations: { ...(anim(i.animationIn) ? { in: anim(i.animationIn)! } : {}), ...(anim(i.animationOut) ? { out: anim(i.animationOut)! } : {}) },
        })
        out = { clipId: r.clipId, layerId: r.layerId }
        return r.project
      })
      return { ok: true, ...out }
    }
    case 'create_shape_layer': {
      const i = input as z.infer<typeof toolSchemas.create_shape_layer.schema>
      let out = { clipId: '', layerId: '' }
      apply((p) => {
        const r = ops.addShapeLayer(p, { shape: i.shape, ...forCreate(i.style) }, transform ?? {}, {
          start: i.start, duration: i.duration, trackId: i.trackId, name: i.name,
          animations: { ...(anim(i.animationIn) ? { in: anim(i.animationIn)! } : {}), ...(anim(i.animationOut) ? { out: anim(i.animationOut)! } : {}) },
        })
        out = { clipId: r.clipId, layerId: r.layerId }
        return r.project
      })
      return { ok: true, ...out }
    }
    case 'add_media_clip': {
      const i = input as z.infer<typeof toolSchemas.add_media_clip.schema>
      let out: { clipId: string; layerId?: string } = { clipId: '' }
      apply((p) => {
        const r = ops.addMediaClip(p, i.assetId, { start: i.start, duration: i.duration, trackId: i.trackId, transform, media: i.style })
        out = { clipId: r.clipId, layerId: r.layerId }
        return r.project
      })
      return { ok: true, ...out }
    }
    case 'update_layer': {
      const i = input as z.infer<typeof toolSchemas.update_layer.schema>
      apply((p) => ops.updateLayer(p, i.layerId, { name: i.name, opacity: i.opacity, hidden: i.hidden, locked: i.locked, transform, text: i.text, shape: normShape(i.shape), media: i.media }))
      return { ok: true, name: ops.getLayer(useEditor.getState().project!, i.layerId).name }
    }
    case 'move_clip': {
      const i = input as z.infer<typeof toolSchemas.move_clip.schema>
      apply((p) => ops.moveClip(p, i.clipId, i.start, i.trackId))
      return { ok: true }
    }
    case 'trim_clip': {
      const i = input as z.infer<typeof toolSchemas.trim_clip.schema>
      apply((p) => ops.trimClip(p, i.clipId, i.edge, i.time))
      const c = ops.getClip(useEditor.getState().project!, i.clipId)
      return { ok: true, start: c.start, duration: c.duration }
    }
    case 'set_clip_duration': {
      const i = input as z.infer<typeof toolSchemas.set_clip_duration.schema>
      apply((p) => ops.setClipDuration(p, i.clipId, i.duration))
      return { ok: true }
    }
    case 'split_clip': {
      const i = input as z.infer<typeof toolSchemas.split_clip.schema>
      let newClipId = ''
      apply((p) => { const r = ops.splitClip(p, i.clipId, i.time); newClipId = r.newClipId; return r.project })
      return { ok: true, newClipId }
    }
    case 'delete_clips': {
      const i = input as z.infer<typeof toolSchemas.delete_clips.schema>
      for (const id of i.clipIds) ops.getClip(project, id)
      apply((p) => ops.deleteClips(p, i.clipIds))
      store.select([])
      return { ok: true, deleted: i.clipIds.length }
    }
    case 'set_animation': {
      const i = input as z.infer<typeof toolSchemas.set_animation.schema>
      apply((p) => ops.setAnimation(p, i.layerId, i.which, { preset: i.preset, duration: i.duration, easing: i.easing, delay: i.delay }))
      return { ok: true }
    }
    case 'add_keyframe': {
      const i = input as z.infer<typeof toolSchemas.add_keyframe.schema>
      let keyframeId = ''
      apply((p) => { const r = ops.addKeyframe(p, i.layerId, { property: i.property, time: i.time, value: i.value, easing: i.easing ?? 'ease-in-out' }); keyframeId = r.keyframeId; return r.project })
      return { ok: true, keyframeId }
    }
    case 'clear_keyframes': {
      const i = input as z.infer<typeof toolSchemas.clear_keyframes.schema>
      apply((p) => ops.clearKeyframes(p, i.layerId, i.property))
      return { ok: true }
    }
    case 'apply_transition': {
      const i = input as z.infer<typeof toolSchemas.apply_transition.schema>
      apply((p) => ops.applyTransition(p, i.clipId, { type: i.type, duration: i.duration ?? 0.6 }))
      return { ok: true }
    }
    case 'update_composition': {
      const i = input as z.infer<typeof toolSchemas.update_composition.schema>
      apply((p) => {
        let next = p
        if (i.aspect) next = ops.setAspectRatio(next, i.aspect)
        return ops.updateComposition(next, { duration: i.duration, fps: i.fps, backgroundColor: i.backgroundColor })
      })
      if (i.aspect) store.setCanvasZoom('fit')
      return { ok: true, composition: useEditor.getState().project!.composition }
    }
    case 'update_audio': {
      const i = input as z.infer<typeof toolSchemas.update_audio.schema>
      apply((p) => ops.updateAudio(p, i.clipId, { volume: i.volume, fadeIn: i.fadeIn, fadeOut: i.fadeOut, muted: i.muted }))
      return { ok: true }
    }
    case 'add_marker': {
      const i = input as z.infer<typeof toolSchemas.add_marker.schema>
      let markerId = ''
      apply((p) => { const r = ops.addMarker(p, i.time, i.label, i.color ?? '#9a5bf5'); markerId = r.markerId; return r.project })
      return { ok: true, markerId }
    }
    case 'set_speed': {
      const i = input as z.infer<typeof toolSchemas.set_speed.schema>
      if (i.target === 'video') {
        apply((p) => ops.setProjectSpeed(p, i.speed))
        return { ok: true, outputSeconds: Math.round(outputDuration(useEditor.getState().project!) * 100) / 100 }
      }
      const markers = useEditor.getState().project!.markers
      const found = i.markerId ? markers.find((m) => m.id === i.markerId) : markers.find((m) => m.label.toLowerCase() === (i.sectionLabel ?? '').toLowerCase())
      if (!found) throw new ValidationError(i.markerId ? `Unknown marker id "${i.markerId}"` : `No section named "${i.sectionLabel ?? ''}". Add a marker first, or use one of: ${markers.map((m) => m.label).join(', ') || '(no markers yet)'}`)
      apply((p) => ops.setSectionSpeed(p, found.id, i.speed))
      return { ok: true, markerId: found.id, outputSeconds: Math.round(outputDuration(useEditor.getState().project!) * 100) / 100 }
    }
    case 'align_layers': {
      const i = input as z.infer<typeof toolSchemas.align_layers.schema>
      apply((p) => ops.alignLayers(p, i.layerIds, i.mode))
      return { ok: true }
    }
    case 'set_layer_order': {
      const i = input as z.infer<typeof toolSchemas.set_layer_order.schema>
      apply((p) => ops.setLayerOrder(p, i.clipId, i.direction))
      return { ok: true }
    }
    case 'add_sample_music': {
      const i = input as z.infer<typeof toolSchemas.add_sample_music.schema>
      const track = trackById(i.trackId)
      if (!track) throw new ValidationError(`Unknown music track "${i.trackId}"`)
      let clipId = ''
      apply((p) => {
        const start = i.start ?? 0
        const from = i.fromSeconds ?? 0
        const available = Math.max(0.5, track.duration - from)
        const duration = Math.min(i.duration ?? available, available, i.duration ? Infinity : Math.max(0.5, p.composition.duration - start))
        const r = ops.addAudioClip(ops.addAsset(p, sampleAsset(track)), track.id, {
          start, duration, trimIn: from, name: track.name,
          audio: { volume: i.volume ?? 0.9, fadeIn: Math.min(i.fadeIn ?? 1, duration), fadeOut: Math.min(i.fadeOut ?? Math.min(4, duration / 4), duration) },
        })
        clipId = r.clipId
        return r.project
      })
      return { ok: true, clipId, track: track.name, bpm: track.bpm }
    }
    case 'request_preview_update': {
      const i = input as z.infer<typeof toolSchemas.request_preview_update.schema>
      store.pause()
      store.setPlayhead(i.time)
      return { ok: true }
    }
  }
}
