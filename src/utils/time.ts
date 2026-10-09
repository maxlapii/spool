/**
 * Single source of truth for timeline <-> screen conversions.
 * `pxPerSecond` is the timeline zoom level.
 */
export const timeToPx = (time: number, pxPerSecond: number) => time * pxPerSecond
export const pxToTime = (px: number, pxPerSecond: number) => px / pxPerSecond

/** Quantize a time to the frame grid. */
export const snapToFrame = (time: number, fps: number) => Math.round(time * fps) / fps

/** 00:12.40 style timecode (mm:ss.ff with fractional seconds, 2 decimals). */
export function formatTimecode(seconds: number, fps = 30): string {
  const s = Math.max(0, seconds)
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  const frames = Math.floor((s - Math.floor(s)) * fps)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds % 1 ? 1 : 0)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Choose a ruler tick interval (seconds) that keeps labels readable at a zoom level. */
export function rulerInterval(pxPerSecond: number): { major: number; minor: number } {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  for (const c of candidates) {
    if (c * pxPerSecond >= 70) return { major: c, minor: c / 5 }
  }
  return { major: 300, minor: 60 }
}
