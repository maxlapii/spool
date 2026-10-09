import type { Project } from '@/types'
import { MAX_SPEED, MIN_SPEED } from '@/types'

/** A stretch of the source timeline that plays at one constant speed. */
export interface SpeedSegment {
  src0: number
  src1: number
  /** Effective speed: the whole-video speed times the section speed. */
  speed: number
  out0: number
  out1: number
  /** Marker that starts this section; null before the first marker. */
  markerId: string | null
  label: string
}

const clampSpeed = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_SPEED, Math.max(MIN_SPEED, v)) : 1)
const round = (v: number) => Math.round(v * 1e6) / 1e6

export const projectSpeed = (project: Project) => clampSpeed(project.composition.speed ?? 1)

const cache = new WeakMap<Project, SpeedSegment[]>()

/**
 * Split the source timeline into constant-speed segments. Each section runs from its marker to the next one
 * (or to the end); the part before the first marker plays at the whole-video speed only. Playing the segments
 * in order gives the exported timeline, so output time = sum of (source length / speed).
 */
export function speedSegments(project: Project): SpeedSegment[] {
  const hit = cache.get(project)
  if (hit) return hit
  const dur = project.composition.duration
  const global = projectSpeed(project)
  const sorted = project.markers.filter((m) => m.time >= 0 && m.time < dur).slice().sort((a, b) => a.time - b.time)
  const raw: { t: number; speed: number; id: string | null; label: string }[] = []
  if (!sorted.length || sorted[0].time > 1e-6) raw.push({ t: 0, speed: 1, id: null, label: 'Start' })
  for (const m of sorted) {
    // two markers at the same time: the later one wins, so every segment has a positive length
    if (raw.length && Math.abs(raw[raw.length - 1].t - m.time) < 1e-6) raw.pop()
    raw.push({ t: m.time, speed: clampSpeed(m.speed ?? 1), id: m.id, label: m.label })
  }
  const segs: SpeedSegment[] = []
  let out = 0
  raw.forEach((r, i) => {
    const src1 = i + 1 < raw.length ? raw[i + 1].t : dur
    const speed = round(global * r.speed)
    const len = (src1 - r.t) / speed
    segs.push({ src0: r.t, src1, speed, out0: round(out), out1: round(out + len), markerId: r.id, label: r.label })
    out += len
  })
  cache.set(project, segs)
  return segs
}

export const hasSpeedChange = (project: Project) => speedSegments(project).some((s) => Math.abs(s.speed - 1) > 1e-6)

/** Length of the exported video in seconds. */
export const outputDuration = (project: Project) => {
  const segs = speedSegments(project)
  return segs.length ? segs[segs.length - 1].out1 : project.composition.duration
}

function find(segs: SpeedSegment[], t: number, key: 'src' | 'out') {
  for (let i = 0; i < segs.length; i++) {
    const end = key === 'src' ? segs[i].src1 : segs[i].out1
    if (t < end || i === segs.length - 1) return segs[i]
  }
  return segs[segs.length - 1]
}

/** Speed in effect at a point of the source timeline (what the preview should play at). */
export function speedAt(project: Project, srcTime: number): number {
  return find(speedSegments(project), srcTime, 'src')?.speed ?? 1
}

/** Source time to exported time. */
export function srcToOut(project: Project, srcTime: number): number {
  const segs = speedSegments(project)
  const s = find(segs, Math.max(0, srcTime), 'src')
  if (!s) return srcTime
  return s.out0 + (Math.min(Math.max(srcTime, s.src0), s.src1) - s.src0) / s.speed
}

/** Exported time to source time: which moment of the timeline is shown at this moment of the output. */
export function outToSrc(project: Project, outTime: number): number {
  const segs = speedSegments(project)
  const s = find(segs, Math.max(0, outTime), 'out')
  if (!s) return outTime
  return Math.min(s.src1, s.src0 + (Math.max(outTime, s.out0) - s.out0) * s.speed)
}

/**
 * Where the playhead is after `dt` real seconds of playback starting at `srcTime`, following the section speeds
 * exactly even when the step crosses a boundary. Returns `ended: true` once the end of the video is reached.
 */
export function advancePlayhead(project: Project, srcTime: number, dt: number): { time: number; ended: boolean } {
  const outNow = srcToOut(project, srcTime) + Math.max(0, dt)
  if (outNow >= outputDuration(project) - 1e-9) return { time: project.composition.duration, ended: true }
  return { time: outToSrc(project, outNow), ended: false }
}

/** Speed as shown on buttons and badges: "x0.5", "x1", "x1.25". */
export const formatSpeed = (v: number) => `x${Number(v.toFixed(2))}`

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

/** Sections as the speed panel lists them: every marker, with its time range and effective speed. */
export function sectionsOf(project: Project) {
  const segs = speedSegments(project)
  return project.markers
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((m) => {
      const seg = segs.find((s) => s.markerId === m.id)
      const next = project.markers.filter((x) => x.time > m.time).sort((a, b) => a.time - b.time)[0]
      return { marker: m, start: m.time, end: seg?.src1 ?? next?.time ?? project.composition.duration, speed: clampSpeed(m.speed ?? 1), active: !!seg }
    })
}
