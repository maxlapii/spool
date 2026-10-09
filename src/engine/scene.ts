import type { Clip, Layer, Project, Track } from '@/types'
import { clipContextSorted, evaluateLayer, MAX_TRANSITION_SECONDS, visibleRange, type RenderState } from './animation'

export interface SceneEntry {
  clip: Clip
  layer: Layer
  state: RenderState
  trackMuted: boolean
  trackLocked: boolean
  /** Paint order: higher is in front. */
  z: number
  /** A faded stand-in for a selected layer that is not visible at the playhead (so it stays editable). */
  ghost: boolean
}

interface Lane { track: Track; clips: Clip[]; z: number }
interface Index { lanes: Lane[]; layers: Map<string, Layer> }

// Projects are immutable (every edit creates a new object), so an index can be cached per version.
const cache = new WeakMap<Project, Index>()

function indexOf(project: Project): Index {
  let idx = cache.get(project)
  if (idx) return idx
  const byTrack = new Map<string, Clip[]>()
  for (const c of project.clips) {
    const list = byTrack.get(c.trackId)
    if (list) list.push(c)
    else byTrack.set(c.trackId, [c])
  }
  const visual = project.tracks.filter((t) => t.kind === 'visual' && !t.hidden)
  // The first track is frontmost, so paint from the last one forward.
  const lanes: Lane[] = visual.map((track, i) => ({ track, clips: (byTrack.get(track.id) ?? []).sort((a, b) => a.start - b.start), z: (visual.length - i) * 100000 })).reverse()
  idx = { lanes, layers: new Map(project.layers.map((l) => [l.id, l])) }
  cache.set(project, idx)
  return idx
}

/**
 * Everything visible at `time`, back-to-front. Shared by the live preview and the export renderer so
 * they always agree. Only clips near `time` are evaluated, so long projects stay fast.
 */
export function sceneAt(project: Project, time: number, selected?: ReadonlySet<string>): SceneEntry[] {
  const idx = indexOf(project)
  const out: SceneEntry[] = []
  for (const lane of idx.lanes) {
    const { clips } = lane
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      if (clip.start - MAX_TRANSITION_SECONDS > time) break
      if (!clip.layerId) continue
      const isSelected = !!selected?.has(clip.id)
      if (clip.start + clip.duration + MAX_TRANSITION_SECONDS < time && !isSelected) continue
      const layer = idx.layers.get(clip.layerId)
      if (!layer) continue
      const ctx = clipContextSorted(clips, i)
      let state = evaluateLayer(layer, clip, time, ctx, project.composition)
      let ghost = false
      if (!state.visible && isSelected && !layer.hidden) {
        const range = visibleRange(clip, ctx)
        const t = Math.min(Math.max(time, clip.start + 0.001), clip.start + clip.duration - 0.001)
        const safe = Math.min(Math.max(t, range.start), range.end - 0.001)
        state = { ...evaluateLayer(layer, clip, safe, ctx, project.composition), opacity: 0.3, dx: 0, dy: 0, scale: 1, blur: 0, clip: 1 }
        ghost = true
      }
      if (!state.visible) continue
      out.push({ clip, layer, state, trackMuted: lane.track.muted, trackLocked: lane.track.locked, z: lane.z + i, ghost })
    }
  }
  return out.sort((a, b) => a.z - b.z)
}
