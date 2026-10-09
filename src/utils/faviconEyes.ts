import { lookVector, subscribeEyes } from './eyes'

const SIZE = 64
const EYES = [{ x: 21.5, y: 33 }, { x: 42.5, y: 33 }]
const EYE_R = 12
const PUPIL_R = 5.4
const TRAVEL = 4.4

/**
 * The browser tab icon draws Spool's eyes on a canvas and swaps it in as the page icon whenever the eyes move, so the
 * favicon does the same thing as the eyes in the header: wakes up, follows the pointer, blinks and glances around.
 * When nothing moves it stops redrawing. If the browser ignores icon changes, the still SVG icon stays.
 */
export function startFaviconEyes(): () => void {
  if (typeof document === 'undefined') return () => {}
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  const icon = link

  const cur = { x: 0, y: 0, closed: 0 }
  const target = { x: 0, y: 0, closed: 0 }
  let timer = 0

  const draw = () => {
    ctx.clearRect(0, 0, SIZE, SIZE)
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE)
    g.addColorStop(0, '#9a5bf5')
    g.addColorStop(1, '#3a8df7')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(0, 0, SIZE, SIZE, 15)
    ctx.fill()
    const ry = Math.max(0.9, EYE_R * (1 - cur.closed * 0.92))
    for (const e of EYES) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(e.x, e.y, EYE_R, ry, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.clip()
      if (cur.closed < 0.6) {
        const px = e.x + cur.x * TRAVEL
        const py = e.y - 2.5 + cur.y * TRAVEL
        ctx.fillStyle = '#14182b'
        ctx.beginPath()
        ctx.arc(px, py, PUPIL_R, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(px + 1.8, py - 2.1, 1.7, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    icon.type = 'image/png'
    icon.href = canvas.toDataURL('image/png')
  }

  /** Ease toward the target and redraw; stop when settled so an idle tab costs nothing. */
  const step = () => {
    timer = 0
    const k = 0.4
    cur.x += (target.x - cur.x) * k
    cur.y += (target.y - cur.y) * k
    cur.closed += (target.closed - cur.closed) * 0.6
    draw()
    const moving = Math.abs(target.x - cur.x) > 0.02 || Math.abs(target.y - cur.y) > 0.02 || Math.abs(target.closed - cur.closed) > 0.02
    if (moving) timer = window.setTimeout(step, document.hidden ? 300 : 55)
  }
  const kick = () => { if (!timer) timer = window.setTimeout(step, 0) }

  draw()
  const stop = subscribeEyes({
    look(x, y) { target.x = x; target.y = y; kick() },
    // From the tab's point of view the pointer is somewhere in the window: look toward it.
    follow(p) {
      const v = lookVector(p.x - window.innerWidth / 2, p.y - window.innerHeight / 2, Math.min(window.innerWidth, window.innerHeight) / 2)
      target.x = v.x; target.y = v.y; kick()
    },
    blink(closed) { target.closed = closed ? 1 : 0; kick() },
  })
  return () => { stop(); clearTimeout(timer) }
}
