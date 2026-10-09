/**
 * Canvas 2D renderer used for export. Draws the same scene the DOM preview shows
 * (via `sceneAt`) so exported frames match the editor.
 */
import type { Layer, Project, TextProps } from '@/types'
import { sceneAt } from './scene'
import { degToRad } from '@/utils/math'

export type MediaElement = HTMLImageElement | HTMLVideoElement

export class MediaCache {
  private items = new Map<string, MediaElement>()

  async prepare(project: Project): Promise<void> {
    const needed = new Set<string>()
    for (const l of project.layers) if (l.type === 'image' || l.type === 'video') needed.add(l.media.assetId)
    if (project.composition.backgroundAssetId) needed.add(project.composition.backgroundAssetId)
    await Promise.all(
      [...needed].map(async (id) => {
        const asset = project.assets.find((a) => a.id === id)
        if (!asset || this.items.has(id)) return
        if (asset.type === 'image') {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = asset.url
          await img.decode().catch(() => {})
          this.items.set(id, img)
        } else if (asset.type === 'video') {
          const v = document.createElement('video')
          v.crossOrigin = 'anonymous'
          v.muted = true
          v.preload = 'auto'
          v.src = asset.url
          await new Promise<void>((resolve) => {
            v.onloadeddata = () => resolve()
            v.onerror = () => resolve()
            setTimeout(resolve, 8000)
          })
          this.items.set(id, v)
        }
      }),
    )
  }

  get(id: string) {
    return this.items.get(id)
  }

  /** Seek a video to `time` and wait for the frame to be ready. */
  async seek(id: string, time: number): Promise<void> {
    const v = this.items.get(id)
    if (!(v instanceof HTMLVideoElement)) return
    const target = Math.min(Math.max(0, time), Math.max(0, (v.duration || 0) - 0.001))
    if (Math.abs(v.currentTime - target) < 0.004 && v.readyState >= 2) return
    await new Promise<void>((resolve) => {
      const done = () => { v.removeEventListener('seeked', done); resolve() }
      v.addEventListener('seeked', done)
      v.currentTime = target
      setTimeout(done, 2000)
    })
  }

  dispose() {
    for (const el of this.items.values()) if (el instanceof HTMLVideoElement) { el.pause(); el.removeAttribute('src'); el.load() }
    this.items.clear()
  }
}

export function fontString(t: TextProps) {
  return `${t.italic ? 'italic ' : ''}${t.fontWeight} ${t.fontSize}px "${t.fontFamily}", sans-serif`
}

/** Preload every font used by the project so canvas text renders correctly. */
export async function loadProjectFonts(project: Project): Promise<void> {
  if (!('fonts' in document)) return
  const specs = new Set<string>()
  for (const l of project.layers) if (l.type === 'text') specs.add(`${l.text.italic ? 'italic ' : ''}${l.text.fontWeight} 32px "${l.text.fontFamily}"`)
  await Promise.all([...specs].map((s) => document.fonts.load(s).catch(() => undefined)))
  await document.fonts.ready
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Word-wrap text to a max width using the current ctx font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    lines.push(line)
  }
  return lines
}

function drawText(ctx: CanvasRenderingContext2D, layer: Extract<Layer, { type: 'text' }>, w: number, h: number) {
  const t = layer.text
  if (t.backgroundColor) {
    ctx.fillStyle = t.backgroundColor
    roundedRectPath(ctx, 0, 0, w, h, t.borderRadius)
    ctx.fill()
  }
  ctx.font = fontString(t)
  ctx.fillStyle = t.color
  ctx.textBaseline = 'middle'
  ctx.textAlign = t.align
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${t.letterSpacing}px`
  const innerW = Math.max(1, w - t.padding * 2)
  const lines = wrapText(ctx, t.content, innerW)
  const lh = t.fontSize * t.lineHeight
  const totalH = lines.length * lh
  const startY = h / 2 - totalH / 2 + lh / 2
  const x = t.align === 'left' ? t.padding : t.align === 'right' ? w - t.padding : w / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(-t.padding - 24, -24, w + t.padding * 2 + 48, h + 48)
  ctx.clip()
  if (t.shadow && t.shadow > 0) {
    // Canvas shadows ignore the current transform, so scale by the output scale ourselves.
    const k = ctx.getTransform().a
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = t.shadow * k
    ctx.shadowOffsetY = Math.max(1, Math.round(t.shadow * 0.25)) * k
  }
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lh))
  ctx.restore()
}

function shapeFill(ctx: CanvasRenderingContext2D, s: Extract<Layer, { type: 'shape' }>['shape'], w: number, h: number): string | CanvasGradient {
  const g = s.gradient
  if (!g) return s.fill
  if (g.type === 'radial') {
    const r = Math.hypot(w, h) / 2
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r)
    grad.addColorStop(0.45, s.fill)
    grad.addColorStop(1, g.to)
    return grad
  }
  // CSS angle: 0deg points to the top, 90deg to the right.
  const a = (g.angle * Math.PI) / 180
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const len = Math.abs(w * dx) + Math.abs(h * dy)
  const grad = ctx.createLinearGradient(w / 2 - (dx * len) / 2, h / 2 - (dy * len) / 2, w / 2 + (dx * len) / 2, h / 2 + (dy * len) / 2)
  grad.addColorStop(0, s.fill)
  grad.addColorStop(1, g.to)
  return grad
}

function drawShape(ctx: CanvasRenderingContext2D, layer: Extract<Layer, { type: 'shape' }>, w: number, h: number) {
  const s = layer.shape
  ctx.fillStyle = shapeFill(ctx, s, w, h)
  ctx.strokeStyle = s.stroke
  ctx.lineWidth = s.strokeWidth
  switch (s.shape) {
    case 'rect':
      roundedRectPath(ctx, 0, 0, w, h, s.borderRadius)
      ctx.fill()
      if (s.strokeWidth > 0) ctx.stroke()
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      if (s.strokeWidth > 0) ctx.stroke()
      break
    case 'line': {
      const th = Math.max(2, s.strokeWidth || 6)
      roundedRectPath(ctx, 0, h / 2 - th / 2, w, th, s.borderRadius)
      ctx.fill()
      break
    }
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(w / 2, h * 0.02)
      ctx.lineTo(w * 0.98, h * 0.98)
      ctx.lineTo(w * 0.02, h * 0.98)
      ctx.closePath()
      ctx.fill()
      if (s.strokeWidth > 0) ctx.stroke()
      break
  }
}

function drawMedia(ctx: CanvasRenderingContext2D, el: MediaElement | undefined, fit: 'cover' | 'contain' | 'fill', radius: number, w: number, h: number) {
  if (radius > 0) {
    roundedRectPath(ctx, 0, 0, w, h, radius)
    ctx.clip()
  }
  if (!el) {
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, w, h)
    return
  }
  const iw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth
  const ih = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight
  if (!iw || !ih) return
  if (fit === 'fill') {
    ctx.drawImage(el, 0, 0, w, h)
    return
  }
  const scale = fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

/**
 * Render one frame of the project at `time` into `ctx` at the composition size.
 * Caller scales the context when exporting at a different resolution.
 */
export async function renderFrame(ctx: CanvasRenderingContext2D, project: Project, time: number, media: MediaCache): Promise<void> {
  const { width, height, backgroundColor, backgroundAssetId } = project.composition
  ctx.save()
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
  if (backgroundAssetId) {
    ctx.save()
    drawMedia(ctx, media.get(backgroundAssetId), 'cover', 0, width, height)
    ctx.restore()
  }
  const entries = sceneAt(project, time)
  const outScale = ctx.getTransform().a
  const canBlur = 'filter' in ctx
  // Seek all videos first
  for (const e of entries) {
    if (e.layer.type === 'video') await media.seek(e.layer.media.assetId, time - e.clip.start + e.clip.trimIn)
  }
  for (const { layer, state } of entries) {
    const w = state.width
    const h = state.height
    ctx.save()
    ctx.globalAlpha = state.opacity
    if (canBlur && state.blur > 0.2) (ctx as CanvasRenderingContext2D & { filter: string }).filter = `blur(${(state.blur * outScale).toFixed(2)}px)`
    ctx.translate(state.x + state.dx + w / 2, state.y + state.dy + h / 2)
    ctx.rotate(degToRad(state.rotation))
    ctx.scale(state.scale, state.scale)
    ctx.translate(-w / 2, -h / 2)
    if (state.clip < 0.999) {
      ctx.beginPath()
      ctx.rect(0, 0, w * state.clip, h)
      ctx.clip()
    }
    switch (layer.type) {
      case 'text': drawText(ctx, layer, w, h); break
      case 'shape': drawShape(ctx, layer, w, h); break
      case 'image':
      case 'video': drawMedia(ctx, media.get(layer.media.assetId), layer.media.fit, layer.media.borderRadius, w, h); break
    }
    ctx.restore()
  }
  ctx.restore()
}
