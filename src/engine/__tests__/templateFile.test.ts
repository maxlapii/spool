import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../templates'
import { createEmptyProject, createMediaLayer, createClip, createTrack } from '../project'
import { buildTemplateFile, parseTemplateFile, templateFileName, TEMPLATE_FILE_FORMAT } from '../templateFile'

const build = (id: string) => TEMPLATES.find((t) => t.id === id)!.build()

describe('template files (.spool)', () => {
  it('round-trips a bundled template with a fresh id and the same content', () => {
    const src = build('travel-diary')
    const { project, droppedClips } = parseTemplateFile(buildTemplateFile(src))
    expect(droppedClips).toBe(0)
    expect(project.id).not.toBe(src.id)
    expect(project.name).toBe(src.name)
    expect(project.clips).toHaveLength(src.clips.length)
    expect(project.layers).toHaveLength(src.layers.length)
    expect(project.markers).toHaveLength(src.markers.length)
    expect(project.composition.duration).toBe(src.composition.duration)
  })

  it('keeps the bundled music and rebuilds its asset from the local catalogue, never from file URLs', () => {
    const src = build('company-trip-recap')
    const file = JSON.parse(buildTemplateFile(src))
    file.project.assets.find((a: { id: string }) => a.id === 'music-good-vibes').url = 'https://evil.example/x.mp3'
    const { project } = parseTemplateFile(JSON.stringify(file))
    expect(project.clips.find((c) => c.audio)!.audio!.assetId).toBe('music-good-vibes')
    expect(project.assets.find((a) => a.id === 'music-good-vibes')!.url).toBe('/assets/music-good-vibes.mp3')
  })

  it('drops clips that need uploaded media and counts them', () => {
    const p = createEmptyProject('With media', '16:9')
    const track = createTrack('visual', 'Footage')
    p.tracks.push(track)
    const layer = createMediaLayer('image', 'asset_uploaded_1')
    p.layers.push(layer)
    p.clips.push(createClip({ trackId: track.id, name: 'photo', start: 0, duration: 3, layerId: layer.id }))
    p.assets.push({ id: 'asset_uploaded_1', name: 'photo.jpg', type: 'image', mime: 'image/jpeg', size: 10, url: '/assets/photo.jpg', createdAt: new Date().toISOString() })
    const { project, droppedClips } = parseTemplateFile(buildTemplateFile(p))
    expect(droppedClips).toBe(1)
    expect(project.clips).toHaveLength(0)
    expect(project.layers).toHaveLength(0)
    expect(project.assets).toHaveLength(0)
  })

  it('rejects files that are not Spool templates, with a plain message', () => {
    expect(() => parseTemplateFile('not json')).toThrow(/not valid JSON/)
    expect(() => parseTemplateFile('{"hello":1}')).toThrow(/not a Spool template/)
    expect(() => parseTemplateFile(JSON.stringify({ format: TEMPLATE_FILE_FORMAT, version: 1, project: {} }))).toThrow(/invalid/)
    const src = JSON.parse(buildTemplateFile(build('travel-diary')))
    src.project.composition.duration = 9999
    expect(() => parseTemplateFile(JSON.stringify(src))).toThrow(/composition\.duration/)
    const bad = JSON.parse(buildTemplateFile(build('travel-diary')))
    bad.version = 2
    expect(() => parseTemplateFile(JSON.stringify(bad))).toThrow()
  })

  it('names files from the template name', () => {
    expect(templateFileName('Road trip diary · 2:58')).toBe('road-trip-diary-2-58.spool')
    expect(templateFileName('···')).toBe('template.spool')
  })
})
