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
  it('has unique ids and both reel-inspired templates', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(TEMPLATES.map((t) => t.id)).toEqual(expect.arrayContaining(['season-recap-reels', 'life-in-2026', 'music-montage']))
  })
})

describe('mood-track templates', () => {
  const byMood: Record<string, string[]> = {
    'music-drift': ['slow-travel-journal', 'morning-retreat'],
    'music-boom-bap': ['night-shift-lookbook', 'beat-lyric-video'],
    'music-plot-twist': ['surprise-trip-reveal', 'guess-the-place'],
    'music-good-vibes': ['friends-trip-recap', 'summer-fun-reel'],
  }
  it('has two 16:9 templates for each new track, all registered', () => {
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
  it('Plot Twist reveal shows a black "?" frame on each silent stop bar', () => {
    const p = TEMPLATES.find((x) => x.id === 'surprise-trip-reveal')!.build()
    const bar = barSeconds(trackById('music-plot-twist')!)
    // The track's stop bars are absolute bars 23 and 55; the film starts at bar 8.
    for (const [abs, glyph] of [[23, '?'], [55, '...']] as const) {
      const t = (abs - 8) * bar + bar / 2
      const text = sceneAt(p, t).filter((e) => e.layer.type === 'text' && e.state.visible).map((e) => (e.layer as { text: { content: string } }).text.content)
      expect(text).toContain(glyph)
    }
  })
})

describe('multi-music templates', () => {
  const ids = ['journey-four-moods', 'travel-mixtape', 'mood-switch']
  for (const id of ids) {
    it(`${id} plays several songs that crossfade without overlapping on one track`, () => {
      const t = TEMPLATES.find((x) => x.id === id)!
      expect(t.aspect).toBe('16:9')
      const p = t.build()
      const music = p.clips.filter((c) => c.audio).sort((a, b) => a.start - b.start)
      expect(new Set(music.map((c) => c.audio!.assetId)).size).toBeGreaterThan(2)
      expect(templateTracks(t).length).toBe(music.length)
      // songs overlap in time (crossfade) but never on the same audio track, and cover the whole film
      for (let i = 1; i < music.length; i++) {
        const prev = music[i - 1]
        const cur = music[i]
        expect(cur.start).toBeLessThan(prev.start + prev.duration)
        expect(cur.trackId).not.toBe(prev.trackId)
        expect(cur.audio!.fadeIn).toBeCloseTo(prev.start + prev.duration - cur.start, 2)
        expect(prev.audio!.fadeOut).toBeCloseTo(prev.start + prev.duration - cur.start, 2)
      }
      expect(music[0].start).toBe(0)
      const end = music[music.length - 1]
      expect(end.start + end.duration).toBeCloseTo(p.composition.duration, 1)
    })
  }
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
    expect(mix.map((t) => t.id)).toEqual(expect.arrayContaining(['journey-four-moods', 'travel-mixtape', 'mood-switch']))
    expect(mix.every((t) => templateTracks(t).length > 1)).toBe(true)
    expect(filterTemplates(TEMPLATES, '', 'brand').map((t) => t.id)).toContain('brand-launch-promo')
    for (const f of TEMPLATE_FILTERS) expect(filterCounts(TEMPLATES)[f.id]).toBe(filterTemplates(TEMPLATES, '', f.id).length)
  })
  it('searches name, song and format, requires every word, and combines with the category', () => {
    expect(filterTemplates(TEMPLATES, 'mixtape', 'all').map((t) => t.id)).toContain('travel-mixtape')
    expect(filterTemplates(TEMPLATES, 'DRIFT', 'all').length).toBeGreaterThan(2)
    expect(filterTemplates(TEMPLATES, '9:16', 'all').every((t) => t.aspect === '9:16')).toBe(true)
    expect(filterTemplates(TEMPLATES, 'quiz plot', 'all').map((t) => t.id)).toEqual(['guess-the-place'])
    expect(filterTemplates(TEMPLATES, 'zzzz', 'all')).toHaveLength(0)
    expect(filterTemplates(TEMPLATES, 'mixtape', 'hip').map((t) => t.id)).toEqual(['travel-mixtape'])
    expect(filterTemplates(TEMPLATES, 'mixtape', 'brand')).toHaveLength(0)
  })
})

describe('group trip story', () => {
  const t = TEMPLATES.find((x) => x.id === 'group-trip-story')!
  const p = t.build()
  it('is a 16:9 film under the length cap with seven crossfaded songs from five tracks', () => {
    expect(t.aspect).toBe('16:9')
    expect(p.composition.duration).toBeLessThanOrEqual(300)
    const music = p.clips.filter((c) => c.audio).sort((a, b) => a.start - b.start)
    expect(music).toHaveLength(7)
    expect(new Set(music.map((c) => c.audio!.assetId)).size).toBe(5)
    for (let i = 1; i < music.length; i++) {
      expect(music[i].trackId).not.toBe(music[i - 1].trackId)
      expect(music[i].start).toBeLessThan(music[i - 1].start + music[i - 1].duration)
    }
    expect(filterTemplates(TEMPLATES, '', 'mix').map((x) => x.id)).toContain('group-trip-story')
    expect(templateCategories(t)).toEqual(new Set(['chill', 'adventure', 'hip', 'enjoy', 'mix']))
  })
  it('keeps the music low under the members talking', () => {
    const members = p.clips.filter((c) => c.audio && c.audio.volume < 0.6)
    expect(members).toHaveLength(1)
    expect(members[0].duration).toBeGreaterThan(75)
    // six member cards, one per name
    const names = p.layers.filter((l) => l.type === 'text').map((l) => (l as { text: { content: string } }).text.content)
    for (const n of ['Mind', 'Joy', 'Tom', 'Anna', 'Leo', 'Mei']) expect(names).toContain(n)
    expect(names.filter((x) => /^MEMBER 0\d$/.test(x))).toHaveLength(6)
  })
  it('draws the route as the bus drives it: five wiped segments and a bus that ends at the arrival pin', () => {
    const route = p.layers.filter((l) => l.name.startsWith('Route '))
    expect(route).toHaveLength(5)
    for (const r of route) expect(r.animations.in.preset).toBe('wipe')
    const body = p.layers.find((l) => l.name === 'Bus · body')!
    const xs = body.animations.keyframes.filter((k) => k.property === 'x')
    const ys = body.animations.keyframes.filter((k) => k.property === 'y')
    expect(xs.at(-1)!.value + 70).toBe(1700)
    expect(ys.at(-1)!.value + 29 + 32).toBe(300)
    // keyframes are in time order and the bus never moves backwards in time
    for (const list of [xs, ys]) for (let i = 1; i < list.length; i++) expect(list[i].time).toBeGreaterThanOrEqual(list[i - 1].time)
  })
  it('shows the bus in front of the route and the pins at the right moments', () => {
    const bar = 60 / 112 * 4
    const start = p.clips.find((c) => c.name.startsWith('Departure pin'))!.start
    const mapStart = start - 0.8 * bar
    const visible = (time: number) => sceneAt(p, time).filter((e) => e.state.visible).map((e) => e.layer.name)
    expect(visible(mapStart + 1 * bar)).toEqual(expect.arrayContaining(['Departure pin', 'Bangkok to Chiang Mai']))
    expect(visible(mapStart + 8.5 * bar).filter((n) => n.startsWith('Route '))).toHaveLength(3)
    expect(visible(mapStart + 17 * bar)).toContain('Arrival pin')
    expect(visible(mapStart + 19 * bar)).not.toContain('Bus · body')
  })
})
