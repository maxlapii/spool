/**
 * The behaviour of Spool's eyes, shared by the wordmark in the page and the animated favicon so both do the same thing:
 * on start they glance left, then right, then settle; they follow the pointer; they blink at random (sometimes twice);
 * they glance around when the pointer is idle; and on touch screens they just glance around.
 * Anything that draws eyes subscribes with a sink and reacts to look / follow / blink.
 */
export interface EyeSink {
  /** Look in a direction: x and y from -1 to 1 (0, 0 is straight ahead). */
  look?(x: number, y: number): void
  /** The pointer moved; the sink works out where to look from its own position. */
  follow?(pointer: { x: number; y: number }): void
  /** Eyelids: true while the eyes are closed. */
  blink?(closed: boolean): void
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** Direction to look at a point `dx, dy` away from an eye. Near the eye the pupil moves only a little; `reach` pixels away it moves fully. */
export function lookVector(dx: number, dy: number, reach: number): { x: number; y: number } {
  const dist = Math.hypot(dx, dy)
  if (!dist) return { x: 0, y: 0 }
  const amount = Math.min(1, dist / reach)
  return { x: (dx / dist) * amount, y: (dy / dist) * amount }
}

const sinks = new Set<EyeSink>()
let stopAll: (() => void) | null = null
let wakeNow: (() => void) | null = null

function start(): () => void {
  const timers = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
  }
  const each = (fn: (s: EyeSink) => void) => sinks.forEach(fn)
  const look = (x: number, y: number) => each((s) => s.look?.(x, y))
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let alive = true
  let pointer: { x: number; y: number } | null = null
  let lastMove = 0
  let raf = 0

  // Waking up: glance left, glance right, settle.
  wakeNow = () => {
    look(0, 0)
    later(() => look(-1, 0.1), 900)
    later(() => look(1, -0.05), 1350)
    later(() => look(0, 0), 1800)
  }

  const blinkOnce = (done?: () => void) => {
    each((s) => s.blink?.(true))
    later(() => { each((s) => s.blink?.(false)); done?.() }, 130)
  }
  const scheduleBlink = () => {
    if (!alive) return
    later(() => blinkOnce(() => { if (Math.random() < 0.18) later(() => blinkOnce(scheduleBlink), 120); else scheduleBlink() }), rand(2400, 6200))
  }
  const wander = () => {
    if (!alive) return
    if (!pointer || performance.now() - lastMove > 3000) {
      const angle = rand(0, Math.PI * 2)
      const mag = Math.random() < 0.3 ? 0 : rand(0.5, 1)
      look(Math.cos(angle) * mag, Math.sin(angle) * mag)
    }
    later(wander, rand(1700, 3600))
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    pointer = { x: e.clientX, y: e.clientY }
    lastMove = performance.now()
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (pointer) each((s) => s.follow?.(pointer!)) })
  }
  const onLeave = () => { pointer = null; lastMove = 0 }

  if (!reduced) {
    later(scheduleBlink, 2200)
    later(wander, 3200)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
  }
  return () => {
    alive = false
    wakeNow = null
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    cancelAnimationFrame(raf)
    timers.forEach((t) => clearTimeout(t))
  }
}

/** Start sending eye events to `sink`. Returns the function that stops it. The behaviour runs while anyone is subscribed. */
export function subscribeEyes(sink: EyeSink): () => void {
  sinks.add(sink)
  if (!stopAll) { stopAll = start(); wakeNow?.() }
  return () => {
    sinks.delete(sink)
    if (!sinks.size) { stopAll?.(); stopAll = null }
  }
}

/** Replay the waking-up glances (the wordmark calls this each time it appears). */
export function wakeEyes() {
  wakeNow?.()
}
