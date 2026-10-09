import { describe, expect, it } from 'vitest'
import { createDemoProject, createEmptyProject } from '../project'
import { normalizeProject } from '../normalize'
import { addTextLayer, setAnimation, updateAudio, updateComposition } from '../operations'
import { evaluateLayer } from '../animation'
import { ease } from '../easing'
import type { Project } from '@/types'

describe('partial patches never erase fields', () => {
  it('setAnimation keeps easing/duration when the patch has undefined values', () => {
    const { project, layerId } = addTextLayer(createEmptyProject('t'), { content: 'x' })
    const next = setAnimation(project, layerId, 'in', { preset: 'fade', duration: undefined, easing: undefined, delay: undefined })
    const a = next.layers[0].animations.in
    expect(a.easing).toBe('expo-out')
    expect(a.duration).toBe(0.8)
    expect(() => evaluateLayer(next.layers[0], next.clips[0], 1)).not.toThrow()
  })
  it('updateComposition keeps fps when the patch has fps undefined', () => {
    const next = updateComposition(createEmptyProject('t'), { duration: 20, fps: undefined })
    expect(next.composition.fps).toBe(30)
    expect(next.composition.duration).toBe(20)
  })
  it('updateAudio keeps volume when the patch has undefined values', () => {
    const p = createEmptyProject('t')
    const withAsset: Project = { ...p, assets: [{ id: 'a1', name: 'song.mp3', type: 'audio', mime: 'audio/mpeg', size: 1, url: '/assets/a1.mp3', duration: 10, createdAt: '' }] }
    const audioTrack = withAsset.tracks.find((t) => t.kind === 'audio')!
    const clip = { id: 'c1', trackId: audioTrack.id, name: 'song', start: 0, duration: 5, trimIn: 0, audio: { assetId: 'a1', volume: 0.5, fadeIn: 0, fadeOut: 0, muted: false } }
    const next = updateAudio({ ...withAsset, clips: [clip] }, 'c1', { muted: true, volume: undefined })
    expect(next.clips[0].audio!.volume).toBe(0.5)
  })
})

describe('ease', () => {
  it('falls back to linear for unknown easings instead of throwing', () => {
    expect(ease(undefined, 0.5)).toBe(0.5)
    expect(ease('wobble' as never, 0.25)).toBe(0.25)
  })
})

describe('normalizeProject', () => {
  it('repairs missing fps and easing in a saved project', () => {
    const p = createDemoProject()
    const broken = JSON.parse(JSON.stringify(p)) as Project
    ;(broken.composition as { fps?: number }).fps = undefined
    ;(broken.layers[0].animations.in as { easing?: string }).easing = undefined
    ;(broken.layers[1].animations as { out?: unknown }).out = undefined
    const fixed = normalizeProject(broken)
    expect(fixed.composition.fps).toBe(30)
    expect(fixed.layers[0].animations.in.easing).toBe('expo-out')
    expect(fixed.layers[1].animations.out.preset).toBe('none')
    for (const l of fixed.layers) for (const c of fixed.clips) if (c.layerId === l.id) expect(() => evaluateLayer(l, c, c.start + 0.5)).not.toThrow()
  })
  it('is idempotent and keeps valid content', () => {
    const p = createDemoProject()
    const once = normalizeProject(p)
    expect(normalizeProject(once)).toEqual(once)
    expect(once.clips.map((c) => [c.id, c.start, c.duration])).toEqual(p.clips.map((c) => [c.id, c.start, c.duration]))
    expect(once.layers.map((l) => l.animations.in)).toEqual(p.layers.map((l) => ({ ...l.animations.in, delay: l.animations.in.delay ?? 0 })))
  })
})
