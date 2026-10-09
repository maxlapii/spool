import type { Project } from '@/types'

/** Collect snap candidate times: zero, playhead, markers, clip edges, composition end. */
export function snapCandidates(project: Project, playhead: number, excludeClipIds: string[] = []): number[] {
  const ex = new Set(excludeClipIds)
  const times = [0, playhead, project.composition.duration, ...project.markers.map((m) => m.time)]
  for (const c of project.clips) {
    if (ex.has(c.id)) continue
    times.push(c.start, c.start + c.duration)
  }
  return times
}

/** Snap a time to the nearest candidate within `threshold` seconds. Returns the snapped time and the target it snapped to (or null). */
export function snapTime(time: number, candidates: number[], threshold: number): { time: number; target: number | null } {
  let best: number | null = null
  let bestDist = threshold
  for (const c of candidates) {
    const d = Math.abs(c - time)
    if (d < bestDist) { best = c; bestDist = d }
  }
  return best === null ? { time, target: null } : { time: best, target: best }
}
