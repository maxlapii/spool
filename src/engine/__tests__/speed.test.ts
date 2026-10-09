import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../project'
import { addMarker, resetSpeeds, setProjectSpeed, setSectionSpeed, updateMarker, ValidationError } from '../operations'
import { advancePlayhead, formatSpeed, hasSpeedChange, outToSrc, outputDuration, sectionsOf, speedAt, speedSegments, srcToOut } from '../speed'
import { normalizeProject } from '../normalize'
import { executeTool } from '../toolExecutor'
import { useEditor } from '@/store/editorStore'
import { toolSchemas } from '@shared/ai/tools'
import { atempoChain, cleanSegments, needsWarp, warpAudioFilters, warpedDuration } from '../../../server/audioSpeed'
import type { Project } from '@/types'

/** A 40 s project with sections at 0 s ("Intro"), 10 s ("Middle") and 30 s ("End"). */
function sample(): { project: Project; a: string; b: string; c: string } {
  let p = createEmptyProject('speed')
  p = { ...p, composition: { ...p.composition, duration: 40 }, markers: [] }
  const a = addMarker(p, 0, 'Intro'); p = a.project
  const b = addMarker(p, 10, 'Middle'); p = b.project
  const c = addMarker(p, 30, 'End'); p = c.project
  return { project: p, a: a.markerId, b: b.markerId, c: c.markerId }
}

describe('speed segments', () => {
  it('is the identity when nothing changes', () => {
    const { project } = sample()
    expect(hasSpeedChange(project)).toBe(false)
    expect(outputDuration(project)).toBeCloseTo(40)
    for (const t of [0, 5, 10, 25, 39.9]) { expect(srcToOut(project, t)).toBeCloseTo(t); expect(outToSrc(project, t)).toBeCloseTo(t) }
  })

  it('speeds up one section and shortens the output', () => {
    const s = sample()
    const p = setSectionSpeed(s.project, s.b, 2) // 10 s to 30 s plays twice as fast: 20 s becomes 10 s
    expect(outputDuration(p)).toBeCloseTo(30)
    expect(speedAt(p, 5)).toBe(1)
    expect(speedAt(p, 15)).toBe(2)
    expect(speedAt(p, 35)).toBe(1)
    expect(srcToOut(p, 10)).toBeCloseTo(10)
    expect(srcToOut(p, 20)).toBeCloseTo(15)
    expect(srcToOut(p, 30)).toBeCloseTo(20)
    expect(srcToOut(p, 40)).toBeCloseTo(30)
  })

  it('slows a section down and lengthens the output', () => {
    const s = sample()
    const p = setSectionSpeed(s.project, s.a, 0.5) // first 10 s take 20 s
    expect(outputDuration(p)).toBeCloseTo(50)
    expect(srcToOut(p, 10)).toBeCloseTo(20)
    expect(outToSrc(p, 10)).toBeCloseTo(5)
  })

  it('multiplies the whole-video speed with section speeds', () => {
    const s = sample()
    let p = setProjectSpeed(s.project, 2)
    p = setSectionSpeed(p, s.b, 2) // 4x for 20 s => 5 s
    expect(speedAt(p, 15)).toBe(4)
    expect(outputDuration(p)).toBeCloseTo(5 + 5 + 5) // 10 s @2x, 20 s @4x, 10 s @2x
  })

  it('maps output time back to source time and forth (round trip)', () => {
    const s = sample()
    let p = setSectionSpeed(s.project, s.b, 3)
    p = setSectionSpeed(p, s.c, 0.5)
    for (const t of [0, 3, 9.99, 10, 17.5, 29.9, 30, 36, 39.99]) expect(outToSrc(p, srcToOut(p, t))).toBeCloseTo(t, 4)
    for (const t of [0, 4, 11, 20, 30, outputDuration(p) - 0.01]) expect(srcToOut(p, outToSrc(p, t))).toBeCloseTo(t, 4)
    // frame times of an export never run backwards
    let last = -1
    for (let i = 0; i < outputDuration(p) * 30; i++) { const src = outToSrc(p, i / 30); expect(src).toBeGreaterThanOrEqual(last); last = src }
  })

  it('treats the part before the first marker as normal speed and ignores markers past the end', () => {
    let p = createEmptyProject('x')
    p = { ...p, composition: { ...p.composition, duration: 20 }, markers: [] }
    const m = addMarker(p, 5, 'Late'); p = m.project
    p = setSectionSpeed(p, m.markerId, 2)
    const segs = speedSegments(p)
    expect(segs.map((x) => [x.src0, x.src1, x.speed])).toEqual([[0, 5, 1], [5, 20, 2]])
    expect(outputDuration(p)).toBeCloseTo(5 + 7.5)
    const far = addMarker(p, 25, 'Beyond')
    expect(speedSegments(far.project)).toHaveLength(2)
  })

  it('lets the later marker win when two share a time, and lists sections for the panel', () => {
    const s = sample()
    const dup = addMarker(s.project, 10, 'Twin')
    const p = setSectionSpeed(dup.project, dup.markerId, 2)
    const segs = speedSegments(p)
    expect(segs.filter((x) => x.src0 === 10)).toHaveLength(1)
    expect(segs.find((x) => x.src0 === 10)!.markerId).toBe(dup.markerId)
    const list = sectionsOf(p)
    expect(list.map((x) => x.marker.label)).toContain('Middle')
    expect(list.find((x) => x.marker.id === s.b)!.active).toBe(false)
  })
})

describe('speed labels', () => {
  it('put the x first: x0.5, x1, x1.25, x4', () => {
    expect([0.5, 1, 1.25, 1.5, 2, 4, 0.75].map(formatSpeed)).toEqual(['x0.5', 'x1', 'x1.25', 'x1.5', 'x2', 'x4', 'x0.75'])
  })
})

describe('playback follows the speed', () => {
  it('advances at the section speed and crosses boundaries exactly', () => {
    const s = sample()
    const p = setSectionSpeed(s.project, s.b, 2)
    expect(advancePlayhead(p, 2, 1).time).toBeCloseTo(3) // normal speed
    expect(advancePlayhead(p, 12, 1).time).toBeCloseTo(14) // 2x
    // 0.5 s of real time before the boundary at 10 s (normal speed), then 0.5 s at 2x
    const crossed = advancePlayhead(p, 9.5, 1)
    expect(crossed.time).toBeCloseTo(9.5 + 0.5 + 1)
    expect(advancePlayhead(p, 0, 1000).ended).toBe(true)
    expect(advancePlayhead(p, 39.9, 0.2).ended).toBe(true)
    // slow motion
    const slow = setSectionSpeed(s.project, s.a, 0.5)
    expect(advancePlayhead(slow, 0, 1).time).toBeCloseTo(0.5)
  })
  it('playing the whole video takes as long as the exported video', () => {
    const s = sample()
    const p = setSectionSpeed(setSectionSpeed(s.project, s.b, 4), s.a, 0.5)
    let t = 0
    let elapsed = 0
    while (elapsed < 1000) { const r = advancePlayhead(p, t, 1 / 60); elapsed += 1 / 60; if (r.ended) break; t = r.time }
    expect(elapsed).toBeCloseTo(outputDuration(p), 1)
  })
})

describe('speed operations', () => {
  it('validates ranges and ids', () => {
    const s = sample()
    expect(() => setProjectSpeed(s.project, 0)).toThrow(ValidationError)
    expect(() => setProjectSpeed(s.project, 4.5)).toThrow(ValidationError)
    expect(() => setProjectSpeed(s.project, 0.1)).toThrow(ValidationError)
    expect(() => setProjectSpeed(s.project, NaN)).toThrow(ValidationError)
    expect(() => setSectionSpeed(s.project, 'nope', 2)).toThrow(/Unknown marker/)
    expect(() => setSectionSpeed(s.project, s.a, 9)).toThrow(ValidationError)
  })

  it('rejects a speed that would export too long', () => {
    let p = createEmptyProject('long')
    p = { ...p, composition: { ...p.composition, duration: 300 }, markers: [] }
    p = setProjectSpeed(p, 0.25) // 1200 s: exactly at the limit
    expect(outputDuration(p)).toBeCloseTo(1200)
    const m = addMarker(p, 0, 'All')
    expect(() => setSectionSpeed(m.project, m.markerId, 0.25)).toThrow(/limit/)
  })

  it('stores 1x as no value, rounds to two decimals, and resets', () => {
    const s = sample()
    let p = setSectionSpeed(s.project, s.b, 1.2345)
    expect(p.markers.find((m) => m.id === s.b)!.speed).toBe(1.23)
    p = setSectionSpeed(p, s.b, 1)
    expect(p.markers.find((m) => m.id === s.b)!.speed).toBeUndefined()
    p = setProjectSpeed(setSectionSpeed(p, s.c, 2), 1.5)
    expect(p.composition.speed).toBe(1.5)
    p = resetSpeeds(p)
    expect(p.composition.speed).toBeUndefined()
    expect(p.markers.every((m) => m.speed === undefined)).toBe(true)
    expect(setProjectSpeed(p, 1).composition.speed).toBeUndefined()
  })

  it('a marker added inside a sped-up section keeps that speed', () => {
    const s = sample()
    const p = setSectionSpeed(s.project, s.b, 2)
    const split = addMarker(p, 20, 'Split')
    expect(split.project.markers.find((m) => m.id === split.markerId)!.speed).toBe(2)
    expect(outputDuration(split.project)).toBeCloseTo(outputDuration(p))
    // but one added in a normal-speed section does not get a speed
    const plain = addMarker(p, 35, 'Plain')
    expect(plain.project.markers.find((m) => m.id === plain.markerId)!.speed).toBeUndefined()
  })

  it('updateMarker accepts speed through the same validation', () => {
    const s = sample()
    expect(updateMarker(s.project, s.a, { speed: 2 }).markers.find((m) => m.id === s.a)!.speed).toBe(2)
    expect(() => updateMarker(s.project, s.a, { speed: 20 })).toThrow(ValidationError)
  })

  it('normalizing a saved project clamps bad speeds and drops 1x', () => {
    const s = sample()
    const dirty = JSON.parse(JSON.stringify(s.project)) as Project
    dirty.composition.speed = 99
    dirty.markers[0].speed = -3
    dirty.markers[1].speed = 1
    dirty.markers[2].speed = 'fast' as unknown as number
    const fixed = normalizeProject(dirty)
    expect(fixed.composition.speed).toBe(4)
    expect(fixed.markers[0].speed).toBe(0.25)
    expect(fixed.markers[1].speed).toBeUndefined()
    expect(fixed.markers[2].speed).toBeUndefined()
    expect(normalizeProject(fixed)).toEqual(fixed)
  })
})

describe('set_speed tool', () => {
  beforeEach(() => {
    const s = sample()
    useEditor.getState().loadProject(s.project)
  })
  it('is in the tool list with a validated schema', () => {
    expect(toolSchemas.set_speed.mutates).toBe(true)
    expect(() => toolSchemas.set_speed.schema.parse({ target: 'video', speed: 0.1 })).toThrow()
    expect(() => toolSchemas.set_speed.schema.parse({ target: 'video', speed: 8 })).toThrow()
    expect(toolSchemas.set_speed.schema.parse({ target: 'section', speed: 2, sectionLabel: 'Middle' })).toBeTruthy()
  })
  it('changes the whole video and reports the new length', () => {
    const r = executeTool('set_speed', { target: 'video', speed: 2 })
    expect(r.ok).toBe(true)
    expect((r.result as { outputSeconds: number }).outputSeconds).toBeCloseTo(20)
    expect(useEditor.getState().project!.composition.speed).toBe(2)
  })
  it('changes one section by label (case-insensitive) or id, and undoes with the request snapshot', () => {
    useEditor.getState().snapshot() // the assistant takes one snapshot per request
    const r = executeTool('set_speed', { target: 'section', sectionLabel: 'middle', speed: 2 })
    expect(r.ok).toBe(true)
    expect(useEditor.getState().project!.markers.find((m) => m.label === 'Middle')!.speed).toBe(2)
    const id = useEditor.getState().project!.markers.find((m) => m.label === 'End')!.id
    expect(executeTool('set_speed', { target: 'section', markerId: id, speed: 0.5 }).ok).toBe(true)
    useEditor.getState().undo()
    const markers = useEditor.getState().project!.markers
    expect(markers.every((m) => m.speed === undefined)).toBe(true)
  })
  it('explains unknown sections and out-of-range speeds', () => {
    const r = executeTool('set_speed', { target: 'section', sectionLabel: 'Nope', speed: 2 })
    expect(r.ok).toBe(false)
    expect((r.result as { error: string }).error).toMatch(/Intro, Middle, End/)
    expect(executeTool('set_speed', { target: 'video', speed: 9 }).ok).toBe(false)
  })
})

describe('export audio retiming', () => {
  it('chains atempo stages inside the 0.5 to 2 range', () => {
    expect(atempoChain(1.5)).toBe('atempo=1.500000')
    expect(atempoChain(2)).toBe('atempo=2.000000')
    expect(atempoChain(4)).toBe('atempo=2.000000,atempo=2.000000')
    expect(atempoChain(0.25)).toBe('atempo=0.500000,atempo=0.500000')
    expect(atempoChain(0.75)).toBe('atempo=0.750000')
    const product = (s: number) => atempoChain(s).split(',').reduce((n, x) => n * Number(x.split('=')[1]), 1)
    for (const s of [0.0625, 0.3, 0.6, 1, 1.3, 2.5, 7, 16]) {
      expect(product(s)).toBeCloseTo(s, 5)
      for (const stage of atempoChain(s).split(',')) { const v = Number(stage.split('=')[1]); expect(v).toBeGreaterThanOrEqual(0.5 - 1e-9); expect(v).toBeLessThanOrEqual(2 + 1e-9) }
    }
  })
  it('cleans segments: drops bad ones and merges neighbours with the same speed', () => {
    const segs = cleanSegments([{ src0: 0, src1: 5, speed: 1 }, { src0: 5, src1: 10, speed: 1 }, { src0: 10, src1: 10, speed: 2 }, { src0: 10, src1: 20, speed: 99 }, { src0: 10, src1: 20, speed: 2 }, 'x', null])
    expect(segs).toEqual([{ src0: 0, src1: 10, speed: 1 }, { src0: 10, src1: 20, speed: 2 }])
    expect(needsWarp(segs)).toBe(true)
    expect(needsWarp([{ src0: 0, src1: 10, speed: 1 }])).toBe(false)
    expect(warpedDuration(segs)).toBeCloseTo(15)
    expect(cleanSegments('nope')).toEqual([])
  })
  it('builds a split, retime and concat filter graph', () => {
    const f = warpAudioFilters([{ src0: 0, src1: 10, speed: 1 }, { src0: 10, src1: 30, speed: 4 }], 'mix', 'out')
    expect(f[0]).toBe('[mix]asplit=2[w0in][w1in]')
    expect(f[1]).toContain('atrim=start=0.000000:end=10.000000')
    expect(f[1]).not.toContain('atempo')
    expect(f[2]).toContain('atempo=2.000000,atempo=2.000000')
    expect(f[3]).toBe('[w0][w1]concat=n=2:v=0:a=1[out]')
    expect(warpAudioFilters([{ src0: 0, src1: 8, speed: 2 }], 'mix', 'out')[0]).toBe('[mix]atrim=start=0.000000:end=8.000000,asetpts=PTS-STARTPTS,atempo=2.000000[out]')
  })
})
