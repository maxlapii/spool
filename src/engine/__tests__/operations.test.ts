import { describe, expect, it } from 'vitest'
import { createEmptyProject, createDemoProject } from '../project'
import * as ops from '../operations'
import { ValidationError } from '../validate'

const withText = () => {
  const p = createEmptyProject('t')
  const r = ops.addTextLayer(p, { content: 'Hello' }, { x: 100, y: 100, width: 400, height: 100 }, { start: 2, duration: 4 })
  return { project: r.project, clipId: r.clipId, layerId: r.layerId }
}

describe('adding layers', () => {
  it('creates a layer and a clip on a visual track', () => {
    const { project, clipId, layerId } = withText()
    const clip = ops.getClip(project, clipId)
    expect(clip.layerId).toBe(layerId)
    expect(clip.start).toBe(2)
    expect(clip.duration).toBe(4)
    expect(ops.getTrack(project, clip.trackId).kind).toBe('visual')
  })

  it('places overlapping clips on separate tracks', () => {
    const { project } = withText()
    const r = ops.addTextLayer(project, { content: 'Second' }, {}, { start: 3, duration: 2 })
    const a = ops.getClip(r.project, r.clipId)
    const first = r.project.clips.find((c) => c.id !== r.clipId)!
    expect(a.trackId).not.toBe(first.trackId)
  })

  it('rejects invalid styling', () => {
    const p = createEmptyProject('t')
    expect(() => ops.addTextLayer(p, { content: 'x', color: 'not-a-color' })).toThrow(ValidationError)
    expect(() => ops.addTextLayer(p, { content: 'x' }, {}, { duration: -1 })).toThrow(ValidationError)
    expect(() => ops.addShapeLayer(p, { fill: '#fff', strokeWidth: 9999 })).toThrow(ValidationError)
  })

  it('extends the composition when a clip runs past the end', () => {
    const p = createEmptyProject('t')
    const r = ops.addShapeLayer(p, {}, {}, { start: 14, duration: 4 })
    expect(r.project.composition.duration).toBe(18)
  })
})

describe('clip timing', () => {
  it('moves a clip and keeps it on the timeline', () => {
    const { project, clipId } = withText()
    const moved = ops.moveClip(project, clipId, 5)
    expect(ops.getClip(moved, clipId).start).toBe(5)
    expect(() => ops.moveClip(project, clipId, -1)).toThrow(ValidationError)
    expect(() => ops.moveClip(project, 'nope', 1)).toThrow(ValidationError)
  })

  it('moving onto an occupied slot snaps to the nearest free position', () => {
    const { project, clipId } = withText() // 2..6
    const trackId = ops.getClip(project, clipId).trackId
    const r = ops.addShapeLayer(project, {}, {}, { start: 8, duration: 2, trackId }) // 8..10
    const moved = ops.moveClip(r.project, r.clipId, 4) // would overlap 2..6 → lands at 6
    expect(ops.getClip(moved, r.clipId).start).toBe(6)
  })

  it('refuses to move a visual clip onto an audio track', () => {
    const { project, clipId } = withText()
    const audio = project.tracks.find((t) => t.kind === 'audio')!
    expect(() => ops.moveClip(project, clipId, 0, audio.id)).toThrow(ValidationError)
  })

  it('trims the start (keeping the end and advancing trimIn) and the end', () => {
    const { project, clipId } = withText() // 2..6
    const a = ops.getClip(ops.trimClip(project, clipId, 'start', 3), clipId)
    expect(a.start).toBe(3)
    expect(a.duration).toBe(3)
    expect(a.trimIn).toBe(1)
    const b = ops.getClip(ops.trimClip(project, clipId, 'end', 10), clipId)
    expect(b.start).toBe(2)
    expect(b.duration).toBe(8)
  })

  it('never trims below the minimum clip length', () => {
    const { project, clipId } = withText()
    const c = ops.getClip(ops.trimClip(project, clipId, 'end', 0), clipId)
    expect(c.duration).toBeGreaterThan(0)
    const d = ops.getClip(ops.trimClip(project, clipId, 'start', 100), clipId)
    expect(d.duration).toBeGreaterThan(0)
  })

  it('splits a clip into two adjacent clips with a cloned layer', () => {
    const { project, clipId, layerId } = withText() // 2..6
    const r = ops.splitClip(project, clipId, 4)
    const left = ops.getClip(r.project, clipId)
    const right = ops.getClip(r.project, r.newClipId)
    expect(left.duration).toBe(2)
    expect(right.start).toBe(4)
    expect(right.duration).toBe(2)
    expect(right.trimIn).toBe(2)
    expect(right.layerId).not.toBe(layerId)
    expect(r.project.layers).toHaveLength(2)
    expect(() => ops.splitClip(project, clipId, 2)).toThrow(ValidationError)
    expect(() => ops.splitClip(project, clipId, 9)).toThrow(ValidationError)
  })

  it('deletes clips and their layers', () => {
    const { project, clipId } = withText()
    const next = ops.deleteClips(project, [clipId])
    expect(next.clips).toHaveLength(0)
    expect(next.layers).toHaveLength(0)
  })

  it('rejects durations that would overlap a neighbour', () => {
    const { project, clipId } = withText() // 2..6
    const trackId = ops.getClip(project, clipId).trackId
    const r = ops.addShapeLayer(project, {}, {}, { start: 6, duration: 2, trackId })
    expect(() => ops.setClipDuration(r.project, clipId, 5)).toThrow(ValidationError)
    expect(ops.getClip(ops.setClipDuration(r.project, clipId, 3), clipId).duration).toBe(3)
  })
})

describe('layers and animation', () => {
  it('updates layer properties with validation', () => {
    const { project, layerId } = withText()
    const next = ops.updateLayer(project, layerId, { opacity: 0.5, transform: { x: 10 }, text: { fontSize: 40 } })
    const l = ops.getLayer(next, layerId)
    expect(l.opacity).toBe(0.5)
    expect(l.transform.x).toBe(10)
    expect(l.type === 'text' && l.text.fontSize).toBe(40)
    expect(() => ops.updateLayer(project, layerId, { opacity: 2 })).toThrow(ValidationError)
    expect(() => ops.updateLayer(project, layerId, { shape: { fill: '#fff' } })).toThrow(ValidationError)
  })

  it('adds, replaces and deletes keyframes', () => {
    const { project, layerId } = withText()
    let r = ops.addKeyframe(project, layerId, { property: 'x', time: 0, value: 0, easing: 'linear' })
    r = ops.addKeyframe(r.project, layerId, { property: 'x', time: 2, value: 100, easing: 'linear' })
    r = ops.addKeyframe(r.project, layerId, { property: 'x', time: 2, value: 200, easing: 'linear' })
    const kfs = ops.getLayer(r.project, layerId).animations.keyframes
    expect(kfs).toHaveLength(2)
    expect(kfs[1].value).toBe(200)
    expect(() => ops.addKeyframe(project, layerId, { property: 'opacity', time: 0, value: 3, easing: 'linear' })).toThrow(ValidationError)
    expect(() => ops.addKeyframe(project, layerId, { property: 'x', time: 99, value: 3, easing: 'linear' })).toThrow(ValidationError)
    const cleared = ops.deleteKeyframe(r.project, layerId, kfs[0].id)
    expect(ops.getLayer(cleared, layerId).animations.keyframes).toHaveLength(1)
  })

  it('sets entrance animations and transitions', () => {
    const { project, layerId, clipId } = withText()
    const next = ops.setAnimation(project, layerId, 'in', { preset: 'slide-up', duration: 1 })
    expect(ops.getLayer(next, layerId).animations.in.preset).toBe('slide-up')
    expect(() => ops.setAnimation(project, layerId, 'in', { preset: 'wobble' as never })).toThrow(ValidationError)
    const withTr = ops.applyTransition(project, clipId, { type: 'crossfade', duration: 0.5 })
    expect(ops.getClip(withTr, clipId).transitionIn).toEqual({ type: 'crossfade', duration: 0.5 })
    expect(ops.getClip(ops.applyTransition(withTr, clipId, { type: 'none', duration: 1 }), clipId).transitionIn).toBeUndefined()
  })
})

describe('composition', () => {
  it('rescales layers when the aspect ratio changes', () => {
    const p = createDemoProject()
    const v = ops.setAspectRatio(p, '9:16')
    expect(v.composition.width).toBe(1080)
    expect(v.composition.height).toBe(1920)
    const headline = v.layers.find((l) => l.name === 'Headline')!
    const original = p.layers.find((l) => l.name === 'Headline')!
    const s = Math.min(1080 / 1920, 1920 / 1080)
    expect(headline.transform.width).toBe(Math.round(original.transform.width * s))
    expect(Math.abs(headline.transform.x + headline.transform.width / 2 - (540 + (original.transform.x + original.transform.width / 2 - 960) * s))).toBeLessThanOrEqual(1)
  })

  it('validates composition settings', () => {
    const p = createEmptyProject('t')
    expect(() => ops.updateComposition(p, { fps: 17 as never })).toThrow(ValidationError)
    expect(() => ops.updateComposition(p, { duration: 0 })).toThrow(ValidationError)
    expect(ops.updateComposition(p, { backgroundColor: '#123456' }).composition.backgroundColor).toBe('#123456')
  })

  it('demo project has no overlapping clips on a track', () => {
    const p = createDemoProject()
    for (const c of p.clips) expect(ops.overlapsOnTrack(p, c.trackId, c.start, c.duration, c.id)).toBeUndefined()
  })
})

describe('5 minute limit', () => {
  it('allows compositions up to 300s and rejects longer ones', () => {
    const p = createEmptyProject('t')
    expect(ops.updateComposition(p, { duration: 300 }).composition.duration).toBe(300)
    expect(() => ops.updateComposition(p, { duration: 301 })).toThrow(ValidationError)
  })
  it('rejects clips that would run past 300s', () => {
    const p = createEmptyProject('t')
    expect(ops.addShapeLayer(p, {}, {}, { start: 290, duration: 10 }).project.composition.duration).toBe(300)
    expect(() => ops.addShapeLayer(p, {}, {}, { start: 295, duration: 10 })).toThrow(ValidationError)
    const { project, clipId } = withText()
    expect(() => ops.moveClip(project, clipId, 299)).toThrow(ValidationError)
  })
})

describe('aspect ratio resize', () => {
  it('stretches full-frame layers to fill the new frame', () => {
    const p = createDemoProject()
    const backdrop = p.layers.find((l) => l.name === 'Dark backdrop')!
    expect(ops.isFullFrame(backdrop.transform, 1920, 1080)).toBe(true)
    const v = ops.setAspectRatio(p, '9:16')
    const after = v.layers.find((l) => l.id === backdrop.id)!
    expect(after.transform).toEqual({ x: 0, y: 0, width: 1080, height: 1920, rotation: 0 })
  })
  it('makes a full-frame video cover the new frame', () => {
    const p = createEmptyProject('t')
    const withAsset = { ...p, assets: [{ id: 'v1', name: 'clip.mp4', type: 'video' as const, mime: 'video/mp4', size: 1, url: '/assets/v1.mp4', width: 1920, height: 1080, duration: 8, createdAt: '' }] }
    const r = ops.addMediaClip(withAsset, 'v1', { media: { fit: 'contain' } })
    const layer = r.project.layers.find((l) => l.id === r.layerId)!
    expect(ops.isFullFrame(layer.transform, 1920, 1080)).toBe(true)
    const v = ops.setAspectRatio(r.project, '1:1')
    const after = v.layers.find((l) => l.id === r.layerId)!
    expect(after.transform.width).toBe(1080)
    expect(after.transform.height).toBe(1080)
    expect(after.type === 'video' && after.media.fit).toBe('cover')
  })
  it('keeps small layers scaled and centred', () => {
    const p = createDemoProject()
    const sun = p.layers.find((l) => l.name === 'Sun')!
    const v = ops.setAspectRatio(p, '9:16')
    const after = v.layers.find((l) => l.id === sun.id)!
    expect(after.transform.width).toBe(Math.round(260 * (1080 / 1920)))
    expect(after.transform.x + after.transform.width).toBeLessThanOrEqual(1080)
  })
})
