import type { Asset, Clip, Layer, Marker, Project, Track } from '@/types'
import { MAX_COMPOSITION_DURATION } from '@/types'
import { buildTemplateFile, parseTemplateFile, type ParsedTemplateFile } from './templateFile'
import { createClip, createEmptyProject, createShapeLayer, createTrack, defaultExportSettings } from './project'
import { MONTAGE_COLORS } from './templates/helpers'

/**
 * OpenTimelineIO (.otio): the open, JSON-based timeline interchange format of the Academy Software Foundation, read
 * and written by DaVinci Resolve, Premiere Pro and Avid (through adapters), Nuke Studio, Blender and others.
 *
 * Export writes every Spool track as an OTIO track with its clips, gaps, markers and media references. Text and shapes
 * have no media, so they are written as generator references with their key parameters. A full copy of each clip and
 * layer is also stored under the `spool` metadata key (OTIO's designated place for application data), so a file saved
 * by Spool opens in Spool exactly as it was. Other editors ignore that key and see a normal timeline.
 *
 * Import reads files from any application. Without Spool metadata each video clip becomes a coloured placeholder
 * frame of the right length and position (you drag your own media onto it), and audio clips are skipped because
 * their media cannot come with the file. Cuts, gaps, track names, markers and the frame rate are kept.
 */
export const OTIO_EXTENSION = '.otio'

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const MAX_ITEMS = 20000

const rt = (seconds: number, rate: number) => ({ OTIO_SCHEMA: 'RationalTime.1', rate, value: Math.round(seconds * rate * 1000) / 1000 })
const range = (start: number, duration: number, rate: number) => ({ OTIO_SCHEMA: 'TimeRange.1', start_time: rt(start, rate), duration: rt(duration, rate) })
const secondsOf = (t: unknown): number | null => {
  if (!isObj(t)) return null
  const rate = num(t.rate, 0)
  return rate > 0 ? num(t.value) / rate : null
}

/** The closest OTIO marker colour name for a hex colour. */
export function otioColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 'PURPLE'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max - min < 0.1) return max > 0.8 ? 'WHITE' : max < 0.25 ? 'BLACK' : 'WHITE'
  const d = max - min
  const h = ((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360
  return h < 15 || h >= 345 ? 'RED' : h < 40 ? 'ORANGE' : h < 70 ? 'YELLOW' : h < 160 ? 'GREEN' : h < 200 ? 'CYAN' : h < 255 ? 'BLUE' : h < 290 ? 'PURPLE' : h < 330 ? 'MAGENTA' : 'PINK'
}

function mediaReference(clip: Clip, layer: Layer | undefined, assets: Map<string, Asset>, rate: number) {
  const external = (a: Asset) => ({
    OTIO_SCHEMA: 'ExternalReference.1',
    name: a.name,
    target_url: a.url,
    available_range: a.duration ? range(0, a.duration, rate) : null,
    metadata: {},
  })
  if (clip.audio) {
    const a = assets.get(clip.audio.assetId)
    return a ? external(a) : { OTIO_SCHEMA: 'MissingReference.1', name: clip.name, metadata: {} }
  }
  if (layer && (layer.type === 'image' || layer.type === 'video')) {
    const a = assets.get(layer.media.assetId)
    return a ? external(a) : { OTIO_SCHEMA: 'MissingReference.1', name: clip.name, metadata: {} }
  }
  if (layer?.type === 'text') {
    return { OTIO_SCHEMA: 'GeneratorReference.1', name: clip.name, generator_kind: 'spool.text', parameters: { text: layer.text.content, font: layer.text.fontFamily, size: layer.text.fontSize, color: layer.text.color }, metadata: {} }
  }
  if (layer?.type === 'shape') {
    return { OTIO_SCHEMA: 'GeneratorReference.1', name: clip.name, generator_kind: 'spool.shape', parameters: { shape: layer.shape.shape, fill: layer.shape.fill }, metadata: {} }
  }
  return { OTIO_SCHEMA: 'MissingReference.1', name: clip.name, metadata: {} }
}

/** Serialise a project as the text of an .otio file. */
export function buildOtio(project: Project): string {
  const rate = project.composition.fps
  const assets = new Map(project.assets.map((a) => [a.id, a]))
  const layers = new Map(project.layers.map((l) => [l.id, l]))
  const ordered = [...project.tracks.filter((t) => t.kind === 'visual').reverse(), ...project.tracks.filter((t) => t.kind === 'audio')]
  const tracks = ordered.map((track) => {
    const clips = project.clips.filter((c) => c.trackId === track.id).sort((a, b) => a.start - b.start)
    const children: unknown[] = []
    let cursor = 0
    for (const c of clips) {
      if (c.start - cursor > 1e-6) children.push({ OTIO_SCHEMA: 'Gap.1', name: '', source_range: range(0, c.start - cursor, rate), effects: [], markers: [], metadata: {} })
      const layer = c.layerId ? layers.get(c.layerId) : undefined
      children.push({
        OTIO_SCHEMA: 'Clip.2',
        name: c.name,
        source_range: range(c.trimIn, c.duration, rate),
        media_references: { DEFAULT_MEDIA: mediaReference(c, layer, assets, rate) },
        active_media_reference_key: 'DEFAULT_MEDIA',
        effects: [],
        markers: [],
        metadata: { spool: { clip: c, layer: layer ?? null } },
      })
      cursor = c.start + c.duration
    }
    return { OTIO_SCHEMA: 'Track.1', name: track.name, kind: track.kind === 'audio' ? 'Audio' : 'Video', children, effects: [], markers: [], metadata: { spool: { track } } }
  })
  const markers = project.markers.map((m) => ({
    OTIO_SCHEMA: 'Marker.2', name: m.label, marked_range: range(m.time, 0, rate), color: otioColor(m.color), comment: '', metadata: { spool: { marker: m } },
  }))
  const timeline = {
    OTIO_SCHEMA: 'Timeline.1',
    name: project.name,
    global_start_time: rt(0, rate),
    tracks: { OTIO_SCHEMA: 'Stack.1', name: 'tracks', children: tracks, effects: [], markers, metadata: {} },
    metadata: { spool: { version: 1, composition: project.composition, export: project.export, assets: project.assets } },
  }
  return JSON.stringify(timeline, null, 2)
}

/** Does this text look like an OTIO timeline? (Cheap check used to pick the importer.) */
export function looksLikeOtio(text: string): boolean {
  return /"OTIO_SCHEMA"\s*:\s*"Timeline\./.test(text)
}

/** Read an .otio file (from Spool or any other editor) into a fresh project. Throws an Error with a plain message. */
export function parseOtio(text: string): ParsedTemplateFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This is not a valid OpenTimelineIO file: it is not valid JSON.')
  }
  if (!isObj(raw) || !str(raw.OTIO_SCHEMA).startsWith('Timeline.')) throw new Error('This is not an OpenTimelineIO timeline.')
  const stack = raw.tracks
  if (!isObj(stack) || !Array.isArray(stack.children)) throw new Error('This OpenTimelineIO file has no tracks.')
  const meta = isObj(raw.metadata) && isObj(raw.metadata.spool) ? raw.metadata.spool : null

  // Frame rate: from Spool metadata, else the first rate found in the file.
  let rate = meta && isObj(meta.composition) ? num(meta.composition.fps, 0) : 0
  if (!(rate >= 1 && rate <= 120)) {
    rate = 0
    const scan = (v: unknown, depth = 0) => {
      if (rate || depth > 8) return
      if (isObj(v)) {
        if (str(v.OTIO_SCHEMA).startsWith('RationalTime') && num(v.rate) >= 1 && num(v.rate) <= 120) { rate = num(v.rate); return }
        for (const k of Object.keys(v)) scan(v[k], depth + 1)
      } else if (Array.isArray(v)) for (const x of v) scan(x, depth + 1)
    }
    scan(stack)
    rate = rate || 30
  }
  const fps = Math.max(1, Math.min(120, Math.round(rate)))

  const base = createEmptyProject(str(raw.name, 'Imported timeline').slice(0, 200) || 'Imported timeline', '16:9')
  const hasNative = !!(meta && isObj(meta.composition))
  const project: Project = hasNative
    ? { ...base, composition: meta!.composition as Project['composition'], export: (isObj(meta!.export) ? meta!.export : base.export) as Project['export'], assets: arr(meta!.assets) as Asset[], tracks: [], clips: [], layers: [], markers: [] }
    : { ...base, tracks: [], clips: [], layers: [], markers: [], composition: { ...base.composition, fps, backgroundColor: '#0b0b10' } }
  if (!hasNative) project.export = defaultExportSettings(project.composition)

  let dropped = 0
  let seen = 0
  let colorIndex = 0
  let end = 0
  const visual: Track[] = []
  const audio: Track[] = []
  const W = project.composition.width, H = project.composition.height

  for (const t of stack.children) {
    if (!isObj(t) || !str(t.OTIO_SCHEMA).startsWith('Track')) { dropped++; continue }
    const tMeta = isObj(t.metadata) && isObj(t.metadata.spool) && isObj(t.metadata.spool.track) ? (t.metadata.spool.track as unknown as Track) : null
    const isAudio = str(t.kind).toLowerCase() === 'audio'
    const track: Track = hasNative && tMeta ? { ...createTrack(tMeta.kind === 'audio' ? 'audio' : 'visual', str(tMeta.name, str(t.name, 'Track')), str(tMeta.id) || undefined), locked: !!tMeta.locked, hidden: !!tMeta.hidden, muted: !!tMeta.muted }
      : createTrack(isAudio ? 'audio' : 'visual', str(t.name, isAudio ? 'Audio' : 'Video') || (isAudio ? 'Audio' : 'Video'))
    let cursor = 0
    let used = false
    for (const item of arr(t.children)) {
      if (++seen > MAX_ITEMS) throw new Error('This timeline has too many items to import.')
      if (!isObj(item)) { dropped++; continue }
      const schema = str(item.OTIO_SCHEMA)
      const sr = isObj(item.source_range) ? item.source_range : null
      let dur = sr ? secondsOf(sr.duration) : null
      if (dur === null && schema.startsWith('Clip') && isObj(item.media_references)) {
        const ref = (item.media_references as Json)[str(item.active_media_reference_key, 'DEFAULT_MEDIA')] ?? Object.values(item.media_references as Json)[0]
        if (isObj(ref) && isObj(ref.available_range)) dur = secondsOf(ref.available_range.duration)
      }
      if (schema.startsWith('Gap')) { if (dur && dur > 0) cursor += dur; continue }
      if (!schema.startsWith('Clip')) { dropped++; continue }
      if (!dur || dur <= 0) { dropped++; continue }
      const start = cursor
      cursor += dur
      if (start >= MAX_COMPOSITION_DURATION) { dropped++; continue }
      const duration = Math.min(dur, MAX_COMPOSITION_DURATION - start)
      const cMeta = isObj(item.metadata) && isObj(item.metadata.spool) ? item.metadata.spool : null
      if (hasNative && cMeta && isObj(cMeta.clip)) {
        const clip = { ...(cMeta.clip as unknown as Clip), trackId: track.id, name: str(item.name, str((cMeta.clip as Json).name, 'Clip')), start, duration }
        project.clips.push(clip)
        if (isObj(cMeta.layer)) project.layers.push(cMeta.layer as unknown as Layer)
        used = true
        end = Math.max(end, start + duration)
        continue
      }
      // A clip from another application.
      if (isAudio) { dropped++; continue }
      const name = str(item.name, 'Clip') || 'Clip'
      const color = MONTAGE_COLORS[colorIndex++ % MONTAGE_COLORS.length]
      const layer = createShapeLayer({ shape: 'rect', fill: color, borderRadius: 0 }, { name: `${name} (replace with your clip)`, transform: { x: 0, y: 0, width: W, height: H } })
      project.layers.push(layer)
      project.clips.push(createClip({ trackId: track.id, name, start, duration, layerId: layer.id }))
      used = true
      end = Math.max(end, start + duration)
    }
    if (used || arr(t.children).length === 0) (track.kind === 'audio' ? audio : visual).push(track)
  }
  if (project.clips.length === 0 && !hasNative) throw new Error('This timeline has no video clips that Spool can import.')
  // OTIO lists the bottom track first; Spool lists the frontmost (top) track first.
  project.tracks = hasNative ? [...visual, ...audio] : [...visual.reverse(), ...(audio.length ? audio : [createTrack('audio', 'Audio')])]
  if (!hasNative) project.composition.duration = Math.max(1, Math.min(MAX_COMPOSITION_DURATION, Math.ceil(end * 100) / 100))

  for (const m of arr(stack.markers)) {
    if (!isObj(m)) continue
    const mm = isObj(m.metadata) && isObj(m.metadata.spool) && isObj(m.metadata.spool.marker) ? (m.metadata.spool.marker as unknown as Marker) : null
    const mr = isObj(m.marked_range) ? m.marked_range : null
    const time = mr ? secondsOf(mr.start_time) : null
    if (time === null || time < 0 || time > project.composition.duration) continue
    project.markers.push({ id: mm?.id ?? `mk_${project.markers.length}`, time: Math.round(time * 100) / 100, label: str(m.name, 'Marker').slice(0, 200), color: mm?.color ?? '#9a5bf5', ...(mm?.speed ? { speed: mm.speed } : {}) })
  }

  // The same validation and clean-up as a .spool file: bundled music is rebuilt locally, uploaded media is dropped.
  const checked = parseTemplateFile(buildTemplateFile(project))
  return { project: checked.project, droppedClips: checked.droppedClips + dropped }
}
