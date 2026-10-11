import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_FILTERS, filterCounts, filterTemplates, templateCategories, templateTracks } from '../templates'
import { normalizeProject } from '../normalize'
import { overlapsOnTrack } from '../operations'
import { sceneAt } from '../scene'
import { MOOD_TEMPLATES } from '../templates/moods'
import { barSeconds, trackById } from '@shared/music'

describe('bundled templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.name} builds a valid, overlap-free project`, () => {
      const p = t.build()
      expect(p.composition.aspect).toBe(t.aspect)
      expect(p.composition.duration).toBe(t.duration)
      expect(p.clips.length).toBeGreaterThan(0)
      // valid references
      for (const c of p.clips) {
        expect(p.tracks.some((tr) => tr.id === c.trackId)).toBe(true)
        if (c.layerId) expect(p.layers.some((l) => l.id === c.layerId)).toBe(true)
        expect(c.start).toBeGreaterThanOrEqual(0)
        expect(c.start + c.duration).toBeLessThanOrEqual(p.composition.duration + 1e-6)
        expect(overlapsOnTrack(p, c.trackId, c.start, c.duration, c.id)).toBeUndefined()
      }
      // the renderer never throws across the whole timeline
      for (let time = 0; time <= p.composition.duration; time += 0.25) expect(() => sceneAt(p, time)).not.toThrow()
      // nothing to repair
      expect(normalizeProject(p)).toEqual(normalizeProject(normalizeProject(p)))
      expect(p.tracks.some((tr) => tr.kind === 'audio')).toBe(true)
      if (t.category === 'travel') {
        const music = p.clips.find((c) => c.audio)
        expect(music).toBeDefined()
        expect(p.assets.some((a) => a.id === music!.audio!.assetId && a.type === 'audio')).toBe(true)
        expect(music!.start + music!.duration).toBeLessThanOrEqual(p.composition.duration + 1e-6)
      }
    })
  }
  it('has unique ids and the short social templates', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(TEMPLATES.map((t) => t.id)).toEqual(expect.arrayContaining(['travel-diary', 'wanderlust-quote']))
  })
})

describe('mood-track templates', () => {
  const byMood: Record<string, string[]> = {
    'music-drift': ['slow-travel-journal'],
  }
  it('has a 16:9 template for the Drift track, all registered', () => {
    for (const [track, ids] of Object.entries(byMood)) {
      for (const id of ids) {
        const t = TEMPLATES.find((x) => x.id === id)
        expect(t, id).toBeDefined()
        expect(t!.aspect).toBe('16:9')
        const p = t!.build()
        expect(p.composition.width).toBe(1920)
        expect(p.composition.height).toBe(1080)
        expect(p.clips.find((c) => c.audio)!.audio!.assetId).toBe(track)
      }
    }
    expect(MOOD_TEMPLATES.every((t) => t.aspect === '16:9')).toBe(true)
  })
  it('starts each song on a bar line and runs a whole number of bars', () => {
    for (const [track, ids] of Object.entries(byMood)) {
      const bar = barSeconds(trackById(track)!)
      for (const id of ids) {
        const p = TEMPLATES.find((x) => x.id === id)!.build()
        const music = p.clips.find((c) => c.audio)!
        expect(music.trimIn / bar).toBeCloseTo(Math.round(music.trimIn / bar), 2)
        expect(p.composition.duration / bar).toBeCloseTo(Math.round(p.composition.duration / bar), 1)
      }
    }
  })
})

describe('vlog intro', () => {
  it('is a 16:9 intro on Open Road that runs a whole number of bars and ends on a fade to black', () => {
    const t = TEMPLATES.find((x) => x.id === 'vlog-intro')!
    expect(t.aspect).toBe('16:9')
    const p = t.build()
    expect(p.composition.width).toBe(1920)
    expect(p.composition.duration).toBeCloseTo(t.duration, 2)
    const bar = barSeconds(trackById('music-open-road')!)
    expect(p.composition.duration / bar).toBeCloseTo(8, 1)
    expect(p.clips.find((c) => c.audio)!.audio!.assetId).toBe('music-open-road')
    expect(t.previewTime).toBeLessThan(t.duration)
  })
})

describe('company trip recap', () => {
  it('is a 16:9, three-minute film on Good Vibes that runs a whole number of bars', () => {
    const t = TEMPLATES.find((x) => x.id === 'company-trip-recap')!
    expect(t.aspect).toBe('16:9')
    const p = t.build()
    expect(p.composition.duration).toBeCloseTo(180, 1)
    expect(p.composition.duration / barSeconds(trackById('music-good-vibes')!)).toBeCloseTo(75, 1)
    expect(p.clips.find((c) => c.audio)!.audio!.assetId).toBe('music-good-vibes')
    expect(p.markers.length).toBeGreaterThan(4)
  })
})

describe('template search and filters', () => {
  it('has an All filter that matches every template', () => {
    expect(TEMPLATE_FILTERS[0]).toEqual({ id: 'all', label: 'All' })
    expect(filterTemplates(TEMPLATES, '', 'all')).toHaveLength(TEMPLATES.length)
    expect(filterCounts(TEMPLATES).all).toBe(TEMPLATES.length)
  })
  it('filters by mood, multi-music and brand', () => {
    const chill = filterTemplates(TEMPLATES, '', 'chill')
    expect(chill.length).toBeGreaterThan(0)
    expect(chill.every((t) => templateCategories(t).has('chill'))).toBe(true)
    const mix = filterTemplates(TEMPLATES, '', 'mix')
    expect(mix.every((t) => templateTracks(t).length > 1)).toBe(true)
    expect(filterTemplates(TEMPLATES, '', 'brand').map((t) => t.id)).toContain('brand-launch-promo')
    for (const f of TEMPLATE_FILTERS) expect(filterCounts(TEMPLATES)[f.id]).toBe(filterTemplates(TEMPLATES, '', f.id).length)
  })
  it('searches name, song and format, requires every word, and combines with the category', () => {
    expect(filterTemplates(TEMPLATES, 'polaroid', 'all').map((t) => t.id)).toContain('travel-diary')
    expect(filterTemplates(TEMPLATES, 'DRIFT', 'all').length).toBeGreaterThan(0)
    expect(filterTemplates(TEMPLATES, '9:16', 'all').every((t) => t.aspect === '9:16')).toBe(true)
    expect(filterTemplates(TEMPLATES, 'quote golden', 'all').map((t) => t.id)).toContain('wanderlust-quote')
    expect(filterTemplates(TEMPLATES, 'zzzz', 'all')).toHaveLength(0)
    expect(filterTemplates(TEMPLATES, 'wanderlust', 'brand')).toHaveLength(0)
  })
})
