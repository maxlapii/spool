import { beforeEach, describe, expect, it } from 'vitest'
import { ANIMATION_PRESETS, EASINGS, TRANSITION_TYPES } from '@/types'
import { easingFns } from '../easing'
import { evaluateLayer, clipContext } from '../animation'
import { createClip, createEmptyProject, createShapeLayer, createTextLayer } from '../project'
import { addAudioClip, addShapeLayer, addAsset, getClip, getLayer, updateLayer, ValidationError } from '../operations'
import { sceneAt } from '../scene'
import { executeTool } from '../toolExecutor'
import { useEditor } from '@/store/editorStore'
import { MUSIC_CATEGORIES, SAMPLE_TRACKS, barSeconds, sampleAsset } from '@shared/music'
import { toolSchemas } from '@shared/ai/tools'
import { parseToolInput } from '@shared/ai/tools'
import { TEMPLATES } from '../templates'
const MUSIC_FILES = Object.keys(import.meta.glob('/server/samples/*.mp3', { query: '?url', import: 'default' }))

describe('easing curves', () => {
  it('are monotonic where they should be, and the natural ones never overshoot', () => {
    for (const e of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out', 'quart-out', 'sine-in-out', 'smooth'] as const) {
      let prev = -1
      for (let i = 0; i <= 100; i++) {
        const v = easingFns[e](i / 100)
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9)
        expect(v).toBeLessThanOrEqual(1 + 1e-9)
        prev = v
      }
    }
    expect(EASINGS).toContain('expo-out')
  })
})

describe('entrance presets', () => {
  const base = { x: 100, y: 200, width: 400, height: 120, rotation: 0 }
  for (const preset of ANIMATION_PRESETS) {
    it(`${preset} settles to the neutral state and starts displaced`, () => {
      const layer = createTextLayer({ content: 'x' }, { transform: base, animations: { in: { preset, duration: 1, easing: 'linear', delay: 0 }, out: { preset: 'none', duration: 0.5, easing: 'linear' }, keyframes: [] } })
      const clip = createClip({ trackId: 't', name: 'x', start: 0, duration: 5, layerId: layer.id })
      const end = evaluateLayer(layer, clip, 2)
      expect(end.opacity).toBeCloseTo(1)
      expect(end.scale).toBeCloseTo(1)
      expect(end.dx).toBeCloseTo(0)
      expect(end.dy).toBeCloseTo(0)
      expect(end.blur).toBeCloseTo(0)
      expect(end.clip).toBeCloseTo(1)
      const start = evaluateLayer(layer, clip, 0.05)
      if (preset === 'none') expect(start.opacity).toBe(1)
      else expect(start.opacity < 1 || start.clip < 1 || start.scale !== 1 || start.dx !== 0 || start.dy !== 0).toBe(true)
    })
  }
  it('moves by modest, layer-proportional distances (natural settle, not a fly-in)', () => {
    const layer = createTextLayer({ content: 'x' }, { transform: { ...base, height: 300, width: 1800 }, animations: { in: { preset: 'slide-up', duration: 1, easing: 'linear', delay: 0 }, out: { preset: 'none', duration: 0.5, easing: 'linear' }, keyframes: [] } })
    const clip = createClip({ trackId: 't', name: 'x', start: 0, duration: 5, layerId: layer.id })
    expect(Math.abs(evaluateLayer(layer, clip, 0.01).dy)).toBeLessThanOrEqual(110)
  })
})

describe('transitions', () => {
  const mk = (type: (typeof TRANSITION_TYPES)[number]) => {
    const la = createShapeLayer({}, { transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0 } })
    const lb = createShapeLayer({}, { transform: { x: 0, y: 0, width: 1920, height: 1080, rotation: 0 } })
    const a = createClip({ trackId: 't', name: 'a', start: 0, duration: 4, layerId: la.id })
    const b = createClip({ trackId: 't', name: 'b', start: 4, duration: 4, layerId: lb.id, transitionIn: { type, duration: 1 } })
    return { la, lb, a, b, ctxA: clipContext(a, [a, b]), ctxB: clipContext(b, [a, b]) }
  }
  it('wipe reveals the incoming clip from the left and leaves the outgoing one alone', () => {
    const { lb, la, a, b, ctxA, ctxB } = mk('wipe')
    const mid = evaluateLayer(lb, b, 4, ctxB)
    expect(mid.clip).toBeCloseTo(0.5, 1)
    expect(mid.opacity).toBe(1)
    expect(evaluateLayer(la, a, 4, ctxA).clip).toBe(1)
  })
  it('blur-dissolve blurs the incoming clip at first and the outgoing one at the end', () => {
    const { lb, la, a, b, ctxA, ctxB } = mk('blur-dissolve')
    expect(evaluateLayer(lb, b, 3.51, ctxB).blur).toBeGreaterThan(8)
    expect(evaluateLayer(lb, b, 4.6, ctxB).blur).toBeCloseTo(0, 0)
    expect(evaluateLayer(la, a, 4.49, ctxA).blur).toBeGreaterThan(8)
  })
  it('every transition type evaluates without throwing across its window', () => {
    for (const type of TRANSITION_TYPES) {
      const { la, lb, a, b, ctxA, ctxB } = mk(type)
      for (let t = 3.4; t <= 4.6; t += 0.05) {
        expect(() => evaluateLayer(la, a, t, ctxA)).not.toThrow()
        expect(() => evaluateLayer(lb, b, t, ctxB)).not.toThrow()
      }
    }
  })
  it("skips a clip's own exit animation while a transition takes it out", () => {
    const la = createShapeLayer({}, { animations: { in: { preset: 'none', duration: 1, easing: 'linear' }, out: { preset: 'fade', duration: 1, easing: 'linear' }, keyframes: [] } })
    const lb = createShapeLayer({})
    const a = createClip({ trackId: 't', name: 'a', start: 0, duration: 4, layerId: la.id })
    const b = createClip({ trackId: 't', name: 'b', start: 4, duration: 4, layerId: lb.id, transitionIn: { type: 'crossfade', duration: 1 } })
    expect(evaluateLayer(la, a, 3.8, clipContext(a, [a, b])).opacity).toBe(1)
  })
})

describe('gradients and text shadow', () => {
  it('accepts a gradient, validates it, and removes it with null', () => {
    const p = createEmptyProject('t')
    const r = addShapeLayer(p, { fill: 'rgba(0,0,0,0)', gradient: { to: 'rgba(0,0,0,0.6)', angle: 180 } })
    const l = getLayer(r.project, r.layerId)
    expect(l.type === 'shape' && l.shape.gradient).toEqual({ to: 'rgba(0,0,0,0.6)', angle: 180 })
    expect(() => addShapeLayer(p, { gradient: { to: 'nope', angle: 0 } })).toThrow(ValidationError)
    const cleared = updateLayer(r.project, r.layerId, { shape: { gradient: null } })
    const c = getLayer(cleared, r.layerId)
    expect(c.type === 'shape' && c.shape.gradient).toBeUndefined()
    const kept = updateLayer(r.project, r.layerId, { shape: { fill: '#ffffff' } })
    const k = getLayer(kept, r.layerId)
    expect(k.type === 'shape' && k.shape.gradient).toBeDefined()
  })
  it('validates text shadow', () => {
    const p = createEmptyProject('t')
    const r = addShapeLayer(p, {})
    void r
    const t = createTextLayer({ content: 'hi', shadow: 12 })
    expect(t.type === 'text' && t.text.shadow).toBe(12)
  })
})

describe('bundled music', () => {
  it('has full-length tracks that are whole bars (bars = BPM for 4:00) with files on disk', () => {
    for (const t of SAMPLE_TRACKS) {
      expect(MUSIC_FILES).toContain(`/server/samples/${t.id}.mp3`)
      if (t.duration >= 240) expect(Math.abs(t.bpm * barSeconds(t) - 240)).toBeLessThan(1e-9)
      for (const c of t.cues) expect(c.bar * barSeconds(t)).toBeLessThan(t.duration)
    }
  })
  it('covers the chill, hip, surprise and enjoy moods with unique ids and sorted, in-range cues', () => {
    const ids = SAMPLE_TRACKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const mood of ['chill', 'hip', 'surprise', 'enjoy'] as const) expect(SAMPLE_TRACKS.some((t) => t.category === mood && t.duration >= 240)).toBe(true)
    for (const t of SAMPLE_TRACKS) {
      expect(MUSIC_CATEGORIES.map((c) => c.id)).toContain(t.category)
      const bars = t.cues.map((c) => c.bar)
      expect([...bars].sort((a, b) => a - b)).toEqual(bars)
      expect(bars[0]).toBe(0)
    }
  })
  it('lists every bundled track in the Claude tool description', () => {
    for (const t of SAMPLE_TRACKS) expect(toolSchemas.add_sample_music.description).toContain(t.id)
  })
  it('sampleAsset describes an audio asset served from /assets', () => {
    const a = sampleAsset(SAMPLE_TRACKS[0])
    expect(a.type).toBe('audio')
    expect(a.url.startsWith('/assets/')).toBe(true)
  })
})

describe('add_sample_music tool', () => {
  beforeEach(() => useEditor.getState().loadProject(createEmptyProject('music')))
  it('adds the asset and a trimmed audio clip, capped to the composition', () => {
    const r = executeTool('add_sample_music', { trackId: 'music-trailhead', fromSeconds: 68.6, volume: 0.8 })
    expect(r.ok).toBe(true)
    const p = useEditor.getState().project!
    const clip = getClip(p, (r.result as { clipId: string }).clipId)
    expect(clip.trimIn).toBeCloseTo(68.6)
    expect(clip.duration).toBeLessThanOrEqual(p.composition.duration)
    expect(clip.audio?.volume).toBe(0.8)
    expect(p.assets.some((a) => a.id === 'music-trailhead')).toBe(true)
  })
  it('rejects unknown tracks and invalid values', () => {
    expect(executeTool('add_sample_music', { trackId: 'nope' }).ok).toBe(false)
    expect(executeTool('add_sample_music', { trackId: 'music-summit', volume: 3 }).ok).toBe(false)
    expect(() => parseToolInput('add_sample_music', { trackId: 'music-summit', start: -1 })).toThrow()
  })
  it('accepts the new presets, easings, transitions and shape gradient through the tool schemas', () => {
    expect(parseToolInput('set_animation', { layerId: 'l', which: 'in', preset: 'blur-in', easing: 'expo-out' })).toBeTruthy()
    expect(parseToolInput('apply_transition', { clipId: 'c', type: 'wipe' })).toBeTruthy()
    expect(parseToolInput('create_shape_layer', { shape: 'rect', style: { fill: 'rgba(0,0,0,0)', gradient: { to: 'rgba(0,0,0,0.6)', angle: 180 } } })).toBeTruthy()
    expect(parseToolInput('create_text_layer', { content: 'x', style: { shadow: 16 } })).toBeTruthy()
  })
})

describe('long projects stay fast', () => {
  it('evaluates a 4-minute template scene many times quickly', () => {
    const t = TEMPLATES.find((x) => x.id === 'epic-adventure-film')!
    const p = t.build()
    expect(p.clips.length).toBeGreaterThan(150)
    const t0 = performance.now()
    for (let i = 0; i < 2000; i++) sceneAt(p, (i / 2000) * p.composition.duration)
    expect(performance.now() - t0).toBeLessThan(1500)
  })
  it('addAsset + addAudioClip survive a project round-trip', () => {
    const p = createEmptyProject('t')
    const t = SAMPLE_TRACKS[1]
    const r = addAudioClip(addAsset(p, sampleAsset(t)), t.id, { start: 1, duration: 5, trimIn: 12 })
    expect(JSON.parse(JSON.stringify(r.project))).toEqual(r.project)
  })
})
