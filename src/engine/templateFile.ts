import { z } from 'zod'
import type { Asset, Project } from '@/types'
import { MAX_COMPOSITION_DURATION } from '@/types'
import { sampleAsset, trackById } from './templates/samples'
import { uid } from '@/utils/id'

/**
 * Spool template files (.spool): a JSON document that holds one project as a reusable template.
 *
 *   { "format": "spool-template", "version": 1, "name": "...", "exportedAt": "...", "project": { ... } }
 *
 * The file carries the layout, text, shapes, animations, timing and markers, plus references to the bundled music.
 * It does not carry uploaded media (images, video, audio): those files stay on the machine they were uploaded to, so
 * on import any clip that depends on one is dropped and counted, and the rest of the template opens as normal.
 * Everything in the file is treated as untrusted: it is validated, bundled assets are rebuilt from the local catalogue
 * (never from URLs in the file) and the project gets a fresh id.
 */
export const TEMPLATE_FILE_EXTENSION = '.spool'
export const TEMPLATE_FILE_FORMAT = 'spool-template'
export const TEMPLATE_FILE_VERSION = 1
export const TEMPLATE_FILE_MAX_BYTES = 25 * 1024 * 1024

const finite = z.number().finite()
const envelope = z.object({
  format: z.literal(TEMPLATE_FILE_FORMAT),
  version: z.literal(TEMPLATE_FILE_VERSION),
  name: z.string().max(200).optional(),
  exportedAt: z.string().optional(),
  project: z.object({
    name: z.string().max(200).optional(),
    version: z.literal(1),
    composition: z.object({
      width: finite.min(16).max(8192),
      height: finite.min(16).max(8192),
      aspect: z.enum(['16:9', '9:16', '1:1', '4:5', '4:3']),
      fps: finite.min(1).max(120),
      duration: finite.gt(0).max(MAX_COMPOSITION_DURATION),
      backgroundColor: z.string().max(64),
      backgroundAssetId: z.string().nullable(),
      speed: finite.min(0.25).max(4).optional(),
    }),
    assets: z.array(z.object({ id: z.string() }).passthrough()).max(2000),
    tracks: z.array(z.object({ id: z.string(), name: z.string(), kind: z.enum(['visual', 'audio']) }).passthrough()).max(500),
    clips: z.array(z.object({ id: z.string(), trackId: z.string(), start: finite.min(0), duration: finite.gt(0) }).passthrough()).max(20000),
    layers: z.array(z.object({ id: z.string(), type: z.enum(['text', 'shape', 'image', 'video']), transform: z.object({ x: finite, y: finite, width: finite, height: finite, rotation: finite }) }).passthrough()).max(20000),
    markers: z.array(z.object({ id: z.string(), time: finite.min(0), label: z.string().max(200) }).passthrough()).max(2000),
    export: z.object({ width: finite, height: finite, fps: finite, format: z.enum(['mp4', 'webm']), quality: z.enum(['high', 'medium', 'low']) }),
  }).passthrough(),
}).passthrough()

export interface ParsedTemplateFile {
  project: Project
  /** Clips that were dropped because their uploaded media is not part of the file. */
  droppedClips: number
}

/** Serialise a project as the text of a .spool file. */
export function buildTemplateFile(project: Project): string {
  return JSON.stringify({ format: TEMPLATE_FILE_FORMAT, version: TEMPLATE_FILE_VERSION, name: project.name, exportedAt: new Date().toISOString(), project }, null, 2)
}

/** A readable file name for a template: "Road trip diary" becomes "road-trip-diary.spool". */
export function templateFileName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return `${slug || 'template'}${TEMPLATE_FILE_EXTENSION}`
}

/** Validate the text of a .spool file and turn it into a fresh, ready-to-open project. Throws an Error with a plain message. */
export function parseTemplateFile(text: string): ParsedTemplateFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('This is not a Spool template file: it is not valid JSON.')
  }
  const parsed = envelope.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.length ? ` (${first.path.join('.')})` : ''
    if (typeof raw === 'object' && raw && (raw as { format?: unknown }).format !== TEMPLATE_FILE_FORMAT) throw new Error('This is not a Spool template file.')
    throw new Error(`This template file is invalid${where}: ${first?.message ?? 'unknown problem'}.`)
  }
  const src = parsed.data.project as unknown as Project

  // Bundled music is rebuilt from the local catalogue; any other asset is uploaded media that this file cannot carry.
  const bundled = new Map<string, Asset>()
  for (const a of src.assets) {
    const track = trackById(a.id)
    if (track) bundled.set(a.id, sampleAsset(track))
  }
  const layerById = new Map(src.layers.map((l) => [l.id, l]))
  const trackIds = new Set(src.tracks.map((t) => t.id))
  const dropped = new Set<string>()
  const keptClips = src.clips.filter((c) => {
    if (!trackIds.has(c.trackId)) { dropped.add(c.id); return false }
    if (c.audio) {
      const ok = bundled.has(c.audio.assetId)
      if (!ok) dropped.add(c.id)
      return ok
    }
    const layer = c.layerId ? layerById.get(c.layerId) : undefined
    if (!layer) { dropped.add(c.id); return false }
    if (layer.type === 'image' || layer.type === 'video') {
      const ok = bundled.has(layer.media.assetId)
      if (!ok) dropped.add(c.id)
      return ok
    }
    return true
  })
  const usedLayers = new Set(keptClips.map((c) => c.layerId).filter(Boolean))
  const now = new Date().toISOString()
  const project: Project = {
    ...src,
    id: uid('proj'),
    name: (parsed.data.name ?? src.name ?? 'Imported template').slice(0, 200),
    createdAt: now,
    updatedAt: now,
    assets: [...bundled.values()],
    clips: keptClips,
    layers: src.layers.filter((l) => usedLayers.has(l.id)),
    composition: { ...src.composition, backgroundAssetId: src.composition.backgroundAssetId && bundled.has(src.composition.backgroundAssetId) ? src.composition.backgroundAssetId : null },
  }
  return { project, droppedClips: dropped.size }
}
