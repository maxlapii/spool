import { describe, expect, it } from 'vitest'
import { createDemoProject } from '../project'
import { summarize } from '@/services/projects'

describe('project persistence', () => {
  it('survives a JSON round-trip without losing structure', () => {
    const p = createDemoProject()
    const copy = JSON.parse(JSON.stringify(p))
    expect(copy).toEqual(p)
    expect(copy.clips.every((c: { layerId?: string }) => !c.layerId || copy.layers.some((l: { id: string }) => l.id === c.layerId))).toBe(true)
  })
  it('summarises for the project list', () => {
    const p = createDemoProject()
    const s = summarize(p)
    expect(s).toMatchObject({ id: p.id, name: p.name, aspect: '16:9', clipCount: p.clips.length })
  })
})
