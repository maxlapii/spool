import { useEffect, useRef } from 'react'
import { APP_NAME } from '@shared/brand'
import { lookVector, subscribeEyes, wakeEyes } from '@/utils/eyes'

/**
 * Spool's logo is its name: "spool", where the two o's are eyes.
 *
 * On load the letters rise in one by one, the eyes open as if waking up and glance left, then right. After that the
 * pupils follow the pointer, the eyes blink at random (sometimes twice), they glance around when nobody is moving the
 * pointer (and on touch screens), widen on hover and one eye winks when you click. With reduced motion everything
 * stays still and the eyes look straight ahead.
 */
export function Wordmark({ size = 32, className = '' }: { size?: number; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const balls = Array.from(root.querySelectorAll<HTMLElement>('.wm-ball'))
    const pupils = balls.map((b) => b.querySelector<HTMLElement>('.wm-pupil')!)
    const aim = (el: HTMLElement, x: number, y: number) => { el.style.setProperty('--tx', x.toFixed(3)); el.style.setProperty('--ty', y.toFixed(3)) }
    const later = new Set<number>()
    // Eyes behave the same here and in the favicon (src/utils/eyes.ts); this sink draws them with CSS.
    const stop = subscribeEyes({
      look: (x, y) => pupils.forEach((p) => aim(p, x, y)),
      follow: (pointer) => balls.forEach((ball, i) => {
        const r = ball.getBoundingClientRect()
        const v = lookVector(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2), 160)
        aim(pupils[i], v.x, v.y)
      }),
      blink: (closed) => balls.forEach((b) => b.classList.toggle('is-blink', closed)),
    })
    wakeEyes()
    // A wink on click: the left eye closes for a moment.
    const wink = () => { balls[0].classList.add('is-blink'); later.add(window.setTimeout(() => balls[0].classList.remove('is-blink'), 380)) }
    root.addEventListener('click', wink)
    return () => { stop(); root.removeEventListener('click', wink); later.forEach((t) => clearTimeout(t)) }
  }, [])

  const eye = (i: number) => (
    <span className="wm-eye" style={{ ['--i' as string]: i }} aria-hidden>
      <span className="wm-ball"><span className="wm-pupil" /></span>
    </span>
  )
  const letter = (c: string, i: number, extra = '') => <span className={`wm-letter ${extra}`} style={{ ['--i' as string]: i }} aria-hidden>{c}</span>

  return (
    <span ref={rootRef} className={`wordmark ${className}`} style={{ fontSize: size }} role="img" aria-label={APP_NAME}>
      {letter('s', 0)}
      {letter('p', 1, 'wm-p')}
      {eye(2)}
      {eye(3)}
      {letter('l', 4, 'wm-l')}
    </span>
  )
}
