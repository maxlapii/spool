import { MUSIC_CATEGORIES, SAMPLE_TRACKS, type MusicCategory } from '@shared/music'
import type { TemplateDef } from './travel'

export type TemplateFilter = 'all' | MusicCategory | 'mix' | 'brand'

export const TEMPLATE_FILTERS: { id: TemplateFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...MUSIC_CATEGORIES,
  { id: 'mix', label: 'Multi-music' },
  { id: 'brand', label: 'Brand' },
]

/** Bundled songs a template plays. `music` lists song names joined by " + ". */
export function templateTracks(t: TemplateDef) {
  return (t.music ?? '').split(' + ').map((n) => SAMPLE_TRACKS.find((s) => s.name === n.trim())).filter((s): s is NonNullable<typeof s> => !!s)
}

/** Categories a template belongs to: the mood of each song it plays, "mix" when it plays several, "brand" for brand pieces. */
export function templateCategories(t: TemplateDef): Set<TemplateFilter> {
  const tracks = templateTracks(t)
  const set = new Set<TemplateFilter>(tracks.map((s) => s.category))
  if (new Set(tracks.map((s) => s.id)).size > 1) set.add('mix')
  if (t.category === 'brand') set.add('brand')
  return set
}

const label = (id: TemplateFilter) => TEMPLATE_FILTERS.find((f) => f.id === id)?.label ?? id

/** Case-insensitive search over name, description, song names, format and category labels; every word must match. */
export function templateMatches(t: TemplateDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = [t.name, t.description, t.music ?? '', t.aspect, ...[...templateCategories(t)].map(label)].join(' ').toLowerCase()
  return words.every((w) => hay.includes(w))
}

export function filterTemplates(list: TemplateDef[], query: string, filter: TemplateFilter): TemplateDef[] {
  return list.filter((t) => (filter === 'all' || templateCategories(t).has(filter)) && templateMatches(t, query))
}

/** Number of templates in each filter (ignoring the search text), for the chip badges. */
export function filterCounts(list: TemplateDef[]): Record<TemplateFilter, number> {
  const counts = Object.fromEntries(TEMPLATE_FILTERS.map((f) => [f.id, 0])) as Record<TemplateFilter, number>
  for (const t of list) {
    counts.all++
    for (const c of templateCategories(t)) counts[c]++
  }
  return counts
}
