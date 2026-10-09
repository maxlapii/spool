import type { Easing } from '@/types'

const c1 = 1.70158
const c3 = c1 + 1

export const easingFns: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t * t,
  'ease-out': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  'expo-out': (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  'quart-out': (t) => 1 - Math.pow(1 - t, 4),
  'sine-in-out': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  smooth: (t) => t * t * t * (t * (t * 6 - 15) + 10),
  'back-out': (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  bounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
}

export function ease(easing: Easing | undefined, t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  const fn = (easing && easingFns[easing]) || easingFns.linear
  return fn(clamped)
}
