import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../templates'
import { buildOtio, looksLikeOtio, otioColor, parseOtio } from '../otio'
import { parseImportFile } from '../importFile'

const build = (id: string) => TEMPLATES.find((t) => t.id === id)!.build()

describe('OpenTimelineIO (.otio)', () => {
  it('writes a valid OTIO timeline: tracks, clips, gaps, markers, generator and media references', () => {
    const src = build('travel-diary')
    const otio = JSON.parse(buildOtio(src))
    expect(otio.OTIO_SCHEMA).toBe('Timeline.1')
    expect(otio.tracks.OTIO_SCHEMA).toBe('Stack.1')
    const tracks = otio.tracks.children
    expect(tracks.length).toBe(src.tracks.length)
    expect(tracks.some((t: { kind: string }) => t.kind === 'Audio')).toBe(true)
    const clips = tracks.flatMap((t: { children: { OTIO_SCHEMA: string }[] }) => t.children.filter((c) => c.OTIO_SCHEMA === 'Clip.2'))
    expect(clips).toHaveLength(src.clips.length)
    const kinds = new Set(clips.map((c: { media_references: { DEFAULT_MEDIA: { OTIO_SCHEMA: string } } }) => c.media_references.DEFAULT_MEDIA.OTIO_SCHEMA))
    expect(kinds.has('GeneratorReference.1')).toBe(true)
    expect(kinds.has('ExternalReference.1')).toBe(true)
    expect(otio.tracks.markers).toHaveLength(src.markers.length)
    expect(looksLikeOtio(JSON.stringify(otio))).toBe(true)
  })

  it('round-trips a Spool project through OTIO with its layers, timing and markers intact', () => {
    const src = build('travel-diary')
    const { project, droppedClips } = parseOtio(buildOtio(src))
    expect(droppedClips).toBe(0)
    expect(project.id).not.toBe(src.id)
    expect(project.composition.duration).toBe(src.composition.duration)
    expect(project.clips).toHaveLength(src.clips.length)
    expect(project.layers).toHaveLength(src.layers.length)
    expect(project.markers.map((m) => m.time)).toEqual(src.markers.map((m) => m.time))
    expect(project.clips.find((c) => c.audio)!.audio!.assetId).toBe('music-golden-hour')
    const key = (c: { name: string; start: number; duration: number }) => `${c.start.toFixed(3)}|${c.name}|${c.duration.toFixed(3)}`
    const a = src.clips.map(key).sort()
    const b = project.clips.map(key).sort()
    expect(b).toEqual(a)
  })

  it('imports an OTIO file from another editor as placeholder clips, keeping cuts, gaps, names and markers', () => {
    const rate = 24
    const t = (s: number) => ({ OTIO_SCHEMA: 'RationalTime.1', rate, value: s * rate })
    const r = (s: number, d: number) => ({ OTIO_SCHEMA: 'TimeRange.1', start_time: t(s), duration: t(d) })
    const file = {
      OTIO_SCHEMA: 'Timeline.1', name: 'Resolve edit', metadata: {},
      tracks: {
        OTIO_SCHEMA: 'Stack.1', name: 'tracks', metadata: {}, markers: [{ OTIO_SCHEMA: 'Marker.2', name: 'Beat', marked_range: r(4, 0), color: 'RED', metadata: {} }],
        children: [
          { OTIO_SCHEMA: 'Track.1', name: 'V1', kind: 'Video', metadata: {}, children: [
            { OTIO_SCHEMA: 'Clip.2', name: 'Interview', source_range: r(10, 3), media_references: {}, metadata: {} },
            { OTIO_SCHEMA: 'Gap.1', source_range: r(0, 2), metadata: {} },
            { OTIO_SCHEMA: 'Clip.2', name: 'B-roll', source_range: r(0, 4), media_references: {}, metadata: {} },
            { OTIO_SCHEMA: 'Transition.1', name: 'dissolve' },
          ] },
          { OTIO_SCHEMA: 'Track.1', name: 'A1', kind: 'Audio', metadata: {}, children: [{ OTIO_SCHEMA: 'Clip.2', name: 'Voice', source_range: r(0, 9), media_references: {}, metadata: {} }] },
        ],
      },
    }
    const { project, droppedClips } = parseImportFile(JSON.stringify(file))
    expect(project.name).toBe('Resolve edit')
    expect(project.composition.fps).toBe(24)
    const visual = project.clips.filter((c) => project.tracks.find((x) => x.id === c.trackId)!.kind === 'visual').sort((a, b) => a.start - b.start)
    expect(visual.map((c) => [c.name, c.start, c.duration])).toEqual([['Interview', 0, 3], ['B-roll', 5, 4]])
    expect(project.layers.every((l) => l.type === 'shape')).toBe(true)
    expect(project.composition.duration).toBeCloseTo(9, 1)
    expect(project.markers).toHaveLength(1)
    expect(project.markers[0].time).toBe(4)
    expect(project.tracks.some((x) => x.name === 'V1')).toBe(true)
    expect(project.clips.some((c) => c.audio)).toBe(false)
    expect(droppedClips).toBe(2) // the audio clip and the transition
  })

  it('rejects files that are not OTIO timelines, and caps long timelines at 5 minutes', () => {
    expect(() => parseOtio('nope')).toThrow(/not valid JSON/)
    expect(() => parseOtio('{"OTIO_SCHEMA":"Clip.2"}')).toThrow(/not an OpenTimelineIO timeline/)
    expect(() => parseOtio('{"OTIO_SCHEMA":"Timeline.1","tracks":{"children":[]}}')).toThrow(/no video clips/)
    const long = { OTIO_SCHEMA: 'Timeline.1', name: 'Long', tracks: { OTIO_SCHEMA: 'Stack.1', children: [{ OTIO_SCHEMA: 'Track.1', kind: 'Video', name: 'V1', children: [
      { OTIO_SCHEMA: 'Clip.2', name: 'A', source_range: { start_time: { rate: 30, value: 0 }, duration: { rate: 30, value: 30 * 400 } } },
    ] }] } }
    expect(parseOtio(JSON.stringify(long)).project.composition.duration).toBe(300)
  })

  it('maps colours to OTIO marker names', () => {
    expect(otioColor('#ff0000')).toBe('RED')
    expect(otioColor('#3a8df7')).toBe('BLUE')
    expect(otioColor('#ffffff')).toBe('WHITE')
    expect(otioColor('nonsense')).toBe('PURPLE')
  })
})
