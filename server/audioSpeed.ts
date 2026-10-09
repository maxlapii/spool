/** One stretch of the source timeline that plays at a constant speed. */
export interface SpeedSeg {
  src0: number
  src1: number
  speed: number
}

/** Widest effective speed range the editor can produce: 0.25 x 0.25 up to 4 x 4. */
export const MIN_EFFECTIVE_SPEED = 0.0625
export const MAX_EFFECTIVE_SPEED = 16

const f = (n: number) => n.toFixed(6)

/** ffmpeg's atempo handles 0.5 to 2 per stage with pitch kept, so bigger changes are chained. */
export function atempoChain(speed: number): string {
  const stages: number[] = []
  let s = speed
  while (s > 2 + 1e-9) { stages.push(2); s /= 2 }
  while (s < 0.5 - 1e-9) { stages.push(0.5); s *= 2 }
  if (Math.abs(s - 1) > 1e-9 || stages.length === 0) stages.push(s)
  return stages.map((x) => `atempo=${f(x)}`).join(',')
}

/** Keep valid, positive-length segments and join neighbours that share a speed. */
export function cleanSegments(segs: unknown): SpeedSeg[] {
  if (!Array.isArray(segs)) return []
  const out: SpeedSeg[] = []
  for (const s of segs.slice(0, 400)) {
    const src0 = Number(s?.src0), src1 = Number(s?.src1), speed = Number(s?.speed)
    if (![src0, src1, speed].every(Number.isFinite) || src1 <= src0 || src0 < 0 || speed < MIN_EFFECTIVE_SPEED || speed > MAX_EFFECTIVE_SPEED) continue
    const last = out[out.length - 1]
    if (last && Math.abs(last.speed - speed) < 1e-6 && Math.abs(last.src1 - src0) < 1e-6) last.src1 = src1
    else out.push({ src0, src1, speed })
  }
  return out
}

export const needsWarp = (segs: SpeedSeg[]) => segs.some((s) => Math.abs(s.speed - 1) > 1e-6)

/** Length of the warped audio in seconds. */
export const warpedDuration = (segs: SpeedSeg[]) => segs.reduce((n, s) => n + (s.src1 - s.src0) / s.speed, 0)

/**
 * Filter statements that cut the audio at `inLabel` into sections, change each one's tempo (pitch is kept) and
 * join them back into `outLabel`. The input must run at least to the last segment's end.
 */
export function warpAudioFilters(segs: SpeedSeg[], inLabel: string, outLabel: string): string[] {
  const n = segs.length
  const split = `[${inLabel}]asplit=${n}${segs.map((_, i) => `[w${i}in]`).join('')}`
  const parts = segs.map((s, i) => {
    const chain = [`atrim=start=${f(s.src0)}:end=${f(s.src1)}`, 'asetpts=PTS-STARTPTS']
    if (Math.abs(s.speed - 1) > 1e-6) chain.push(atempoChain(s.speed))
    chain.push('asetpts=PTS-STARTPTS')
    return `[w${i}in]${chain.join(',')}[w${i}]`
  })
  const join = `${segs.map((_, i) => `[w${i}]`).join('')}concat=n=${n}:v=0:a=1[${outLabel}]`
  return n === 1 ? [`[${inLabel}]${[`atrim=start=${f(segs[0].src0)}:end=${f(segs[0].src1)}`, 'asetpts=PTS-STARTPTS', atempoChain(segs[0].speed)].join(',')}[${outLabel}]`] : [split, ...parts, join]
}
