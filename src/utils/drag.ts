export interface DragHandlers {
  onStart?: (e: PointerEvent | React.PointerEvent) => void
  onMove: (dx: number, dy: number, e: PointerEvent) => void
  onEnd?: (dx: number, dy: number, e: PointerEvent, moved: boolean) => void
  /** Minimum movement before onMove fires (prevents click jitter). */
  threshold?: number
}

/** Begin a pointer drag from a React pointerdown event. Tracks global moves until release. */
export function startDrag(e: React.PointerEvent, handlers: DragHandlers) {
  const startX = e.clientX
  const startY = e.clientY
  const threshold = handlers.threshold ?? 2
  let moved = false
  let lastDx = 0
  let lastDy = 0
  handlers.onStart?.(e)
  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (!moved && Math.abs(dx) < threshold && Math.abs(dy) < threshold) return
    moved = true
    lastDx = dx
    lastDy = dy
    handlers.onMove(dx, dy, ev)
  }
  const onUp = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    handlers.onEnd?.(lastDx, lastDy, ev, moved)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
