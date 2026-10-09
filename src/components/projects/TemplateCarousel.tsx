import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Music, Plus } from 'lucide-react'
import { formatDuration } from '@/utils/time'
import type { TemplateDef } from '@/engine/templates'
import { templateTracks } from '@/engine/templates'
import { TemplatePreview } from './TemplateCard'

const SPEED_PX_PER_S = 26
const CARD_W = 248
const GAP = 20
const PAD = 24

/** Short label for the songs a template plays. */
function musicLabel(t: TemplateDef) {
  const n = templateTracks(t).length
  if (!t.music) return null
  return n > 1 ? `${n} songs · ${t.music}` : t.music
}

/**
 * Full-bleed template strip. It glides on its own (paused while hovering, focused or interacting) and can be
 * browsed by hand: drag with a mouse, swipe on touch, scroll sideways with a trackpad or Shift + wheel, use the
 * arrow keys or the arrow buttons. Two copies of the cards make the loop seamless in both directions; motion is a
 * single transform updated every frame, so it stays sub-pixel smooth.
 */
export function TemplateCarousel({ templates, onUse, busy }: { templates: TemplateDef[]; onUse: (t: TemplateDef) => void; busy: boolean }) {
  const stripRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const nudgeRef = useRef<(dir: -1 | 1) => void>(() => {})
  const [loop, setLoop] = useState(true)

  // Only loop (and duplicate the cards) when they overflow the strip.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const update = () => {
      if (strip.clientWidth === 0) return // hidden: wait until it has a size
      setLoop(templates.length * (CARD_W + GAP) - GAP + PAD * 2 > strip.clientWidth)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(strip)
    return () => ro.disconnect()
  }, [templates.length])

  useEffect(() => {
    const strip = stripRef.current
    const track = trackRef.current
    if (!strip || !track) return
    track.style.transform = 'translate3d(0, 0, 0)'
    if (!loop) { nudgeRef.current = () => {}; return }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let x = 0 // distance scrolled, wrapped to [0, W)
    let vel = 0 // px/s from flicks, keys and arrow buttons; decays on its own
    let auto = 0 // current glide speed, eased toward its target
    let W = 0
    let hovering = false
    let focused = false
    let dragging = false
    let resumeAt = 0
    let last = performance.now()
    let raf = 0

    const measure = () => {
      const a = track.children[0] as HTMLElement | undefined
      const b = track.children[templates.length] as HTMLElement | undefined
      W = a && b ? b.offsetLeft - a.offsetLeft : 0
    }
    const pause = (ms: number) => { resumeAt = Math.max(resumeAt, performance.now() + ms) }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (W > 0) {
        if (!dragging) {
          const glide = !reduced && !hovering && !focused && now >= resumeAt && !document.hidden
          auto += ((glide ? SPEED_PX_PER_S : 0) - auto) * (1 - Math.exp(-dt * 6))
          x += (auto + vel) * dt
          vel *= Math.exp(-dt * 3.2)
          if (Math.abs(vel) < 2) vel = 0
        }
        x = ((x % W) + W) % W
        track.style.transform = `translate3d(${-x}px, 0, 0)`
      }
      raf = requestAnimationFrame(frame)
    }

    // --- pointer drag (mouse, touch, pen) ---
    let pid = -1
    let startX = 0
    let startPos = 0
    let moved = false
    let swallowClick = false
    let samples: { t: number; x: number }[] = []
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pid = e.pointerId
      startX = e.clientX
      startPos = x
      moved = false
      vel = 0
      samples = [{ t: e.timeStamp, x: e.clientX }]
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) > 6) {
        moved = true
        dragging = true
        try { strip.setPointerCapture(pid) } catch { /* the pointer already ended */ }
        strip.classList.add('is-dragging')
      }
      if (!moved) return
      x = startPos - dx
      samples.push({ t: e.timeStamp, x: e.clientX })
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift()
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = -1
      if (!moved) return
      const a = samples[0]
      const b = samples[samples.length - 1]
      const span = Math.max(16, b.t - a.t)
      vel = Math.max(-3200, Math.min(3200, (-(b.x - a.x) / span) * 1000))
      dragging = false
      moved = false
      swallowClick = true
      setTimeout(() => { swallowClick = false }, 0)
      strip.classList.remove('is-dragging')
      pause(e.pointerType === 'mouse' ? 0 : 1800)
    }
    const click = (e: MouseEvent) => { if (swallowClick) { e.preventDefault(); e.stopPropagation() } }
    const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') hovering = true }
    const leave = () => { hovering = false }

    // --- trackpad / Shift + wheel (vertical wheel keeps scrolling the page) ---
    const wheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? strip.clientWidth : 1
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!d) return
      e.preventDefault()
      x += d * unit
      vel = 0
      pause(1500)
    }

    // --- keyboard and focus ---
    const nudge = (dir: -1 | 1) => { vel += dir * 2200; pause(2200) }
    nudgeRef.current = nudge
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1) }
    }
    const focusIn = (e: FocusEvent) => {
      // Only keyboard focus pauses the glide; pressing a card with the mouse or a finger also focuses it.
      const target = e.target as HTMLElement
      focused = target.matches(':focus-visible')
      if (!focused) return
      const el = target.closest('li')
      if (!el) return
      const r = el.getBoundingClientRect()
      const s = strip.getBoundingClientRect()
      if (r.left < s.left + PAD) x -= s.left + PAD - r.left
      else if (r.right > s.right - PAD) x += r.right - (s.right - PAD)
    }
    const focusOut = () => { focused = false }
    const keepScrollLeftZero = () => { strip.scrollLeft = 0 } // focus() must not scroll the clipped strip itself

    measure()
    raf = requestAnimationFrame(frame)
    strip.addEventListener('pointerdown', down)
    strip.addEventListener('pointermove', move)
    strip.addEventListener('pointerup', up)
    strip.addEventListener('pointercancel', up)
    strip.addEventListener('pointerenter', enter)
    strip.addEventListener('pointerleave', leave)
    strip.addEventListener('click', click, true)
    strip.addEventListener('wheel', wheel, { passive: false })
    strip.addEventListener('keydown', key)
    strip.addEventListener('focusin', focusIn)
    strip.addEventListener('focusout', focusOut)
    strip.addEventListener('scroll', keepScrollLeftZero)
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      strip.removeEventListener('pointerdown', down)
      strip.removeEventListener('pointermove', move)
      strip.removeEventListener('pointerup', up)
      strip.removeEventListener('pointercancel', up)
      strip.removeEventListener('pointerenter', enter)
      strip.removeEventListener('pointerleave', leave)
      strip.removeEventListener('click', click, true)
      strip.removeEventListener('wheel', wheel)
      strip.removeEventListener('keydown', key)
      strip.removeEventListener('focusin', focusIn)
      strip.removeEventListener('focusout', focusOut)
      strip.removeEventListener('scroll', keepScrollLeftZero)
      strip.classList.remove('is-dragging')
    }
  }, [templates, loop])

  const nudge = useCallback((dir: -1 | 1) => nudgeRef.current(dir), [])
  const items = loop ? [...templates, ...templates] : templates

  return (
    <div
      ref={stripRef}
      className={`template-strip relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-5 ${loop ? 'is-loop' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Templates. Drag, swipe or use the arrow keys to browse."
    >
      <ul ref={trackRef} className={`marquee flex w-max gap-5 px-6 ${loop ? '' : 'mx-auto'}`}>
        {items.map((t, i) => {
          const copy = i >= templates.length
          const music = musicLabel(t)
          return (
            <li key={`${t.id}-${i}`} className="tcard flex w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel" aria-hidden={copy}>
              <button className="stage-grid tcard-media flex h-36 items-center justify-center overflow-hidden border-b border-line p-2" onClick={() => onUse(t)} disabled={busy} title={`Use “${t.name}”`} tabIndex={copy ? -1 : 0}>
                <TemplatePreview template={t} size={360} />
              </button>
              <div className="flex flex-1 flex-col p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12.5px] font-bold">{t.name}</p>
                  <span className="chip h-5 shrink-0">{t.aspect} · {formatDuration(t.duration)}</span>
                </div>
                {music && <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-accent" title={t.music}><Music size={11} className="shrink-0" /> <span className="truncate">{music}</span></p>}
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-muted">{t.description}</p>
                <button className="btn tcard-cta mt-2 h-8 w-full text-[11px] transition-colors duration-150" onClick={() => onUse(t)} disabled={busy} tabIndex={copy ? -1 : 0}><Plus size={12} /> Use template</button>
              </div>
            </li>
          )
        })}
      </ul>
      {loop && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-app to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-app to-transparent" />
          <button type="button" className="strip-arrow left-3" onClick={() => nudge(-1)} aria-label="Previous templates" tabIndex={-1}><ChevronLeft size={16} /></button>
          <button type="button" className="strip-arrow right-3" onClick={() => nudge(1)} aria-label="Next templates" tabIndex={-1}><ChevronRight size={16} /></button>
        </>
      )}
    </div>
  )
}
