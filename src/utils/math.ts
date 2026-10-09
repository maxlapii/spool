export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const round = (v: number, decimals = 2) => {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
export const degToRad = (d: number) => (d * Math.PI) / 180
