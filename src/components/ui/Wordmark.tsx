import { useEffect, useRef } from 'react'
import { APP_NAME } from '@shared/brand'
import { lookVector, subscribeEyes, wakeEyes } from '@/utils/eyes'

/**
 * Spool's logo is its name: "spool", where the bowl of the p is a solid three-window film reel, and the two o's are eyes.
 *
 * The p is a bold ink letter whose bowl is a solid film reel with three open windows. The reel winds in and the stem
 * unrolls on load; when the pointer enters, the reel turns a third of a turn, and a click turns it a full turn (with the
 * eye wink). The three windows are identical, so every move settles back into the same letter.
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
    // The three windows are identical, so a third of a turn looks the same as no turn.
    const reel = root.querySelector<SVGElement>('.wm-reel')
    let angle = 0
    const turn = (by: number) => { angle += by; reel?.style.setProperty('--turn', `${angle}deg`) }
    const onEnter = () => turn(120)
    const onClick = () => { wink(); turn(360) }
    root.addEventListener('pointerenter', onEnter)
    root.addEventListener('click', onClick)
    return () => { stop(); root.removeEventListener('pointerenter', onEnter); root.removeEventListener('click', onClick); later.forEach((t) => clearTimeout(t)) }
  }, [])

  const eye = (i: number) => (
    <span className="wm-eye" style={{ ['--i' as string]: i }} aria-hidden>
      <span className="wm-ball"><span className="wm-pupil" /></span>
    </span>
  )
  const letter = (c: string, i: number, extra = '') => <span className={`wm-letter ${extra}`} style={{ ['--i' as string]: i }} aria-hidden>{c}</span>

  // The p, drawn in a 68x80 box (1 unit = 0.01em, baseline at y=60): a solid reel disc with three open windows and a hub
  // hole (even-odd fill, so the page shows through), and the stem in front of it.
  const film = (
    <span className="wm-p wm-letter" style={{ ['--i' as string]: 1 }} aria-hidden>
      <svg className="wm-strip" viewBox="0 0 68 80">
        <path className="wm-reel" fillRule="evenodd" d="M8.00 30.00a30 30 0 1 0 60 0a30 30 0 1 0 -60 0zM47.10 30.00a7.4 7.4 0 1 0 14.8 0a7.4 7.4 0 1 0 -14.8 0zM22.35 44.29a7.4 7.4 0 1 0 14.8 0a7.4 7.4 0 1 0 -14.8 0zM22.35 15.71a7.4 7.4 0 1 0 14.8 0a7.4 7.4 0 1 0 -14.8 0zM34.40 30.00a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0z" />
        <rect className="wm-stem" x="0" y="0" width="17" height="80" />
      </svg>
    </span>
  )

  return (
    <span ref={rootRef} className={`wordmark ${className}`} style={{ fontSize: size }} role="img" aria-label={APP_NAME}>
      {letter('s', 0)}
      {film}
      {eye(2)}
      {eye(3)}
      {letter('l', 4, 'wm-l')}
    </span>
  )
}
