import type { Project } from '@/types'
import { api } from './api'
import { loadProjectFonts, MediaCache, renderFrame } from '@/engine/render'
import { hasSpeedChange, outToSrc, outputDuration, speedSegments } from '@/engine/speed'

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'done' | 'error' | 'cancelled'
  /** 0..1 within the current phase */
  progress: number
  message?: string
  downloadUrl?: string
}

export interface ExportOptions {
  width: number
  height: number
  fps: number
  format: 'mp4' | 'webm'
  quality: 'high' | 'medium' | 'low'
}

const BATCH = 24

/**
 * Encode a frame as JPEG synchronously. `toBlob`/`convertToBlob` are scheduled
 * with the compositor and crawl when the tab is hidden or throttled; `toDataURL`
 * runs immediately (~5 ms per 720p frame) so long exports keep moving.
 */
function encodeFrame(canvas: HTMLCanvasElement, quality: number): Blob {
  const url = canvas.toDataURL('image/jpeg', quality)
  const comma = url.indexOf(',')
  if (comma < 0) throw new Error('Frame encoding failed')
  const bin = atob(url.slice(comma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

function audioInputs(project: Project) {
  const inputs: { url: string; start: number; trimIn: number; duration: number; volume: number; fadeIn: number; fadeOut: number }[] = []
  for (const clip of project.clips) {
    const track = project.tracks.find((t) => t.id === clip.trackId)
    if (clip.audio && !clip.audio.muted && !track?.muted) {
      const asset = project.assets.find((a) => a.id === clip.audio!.assetId)
      if (asset) inputs.push({ url: asset.url, start: clip.start, trimIn: clip.trimIn, duration: clip.duration, volume: clip.audio.volume, fadeIn: clip.audio.fadeIn, fadeOut: clip.audio.fadeOut })
    } else if (clip.layerId) {
      const layer = project.layers.find((l) => l.id === clip.layerId)
      if (layer?.type === 'video' && !layer.media.muted && !layer.hidden && !track?.hidden && !track?.muted && layer.media.volume > 0) {
        const asset = project.assets.find((a) => a.id === layer.media.assetId)
        if (asset) inputs.push({ url: asset.url, start: clip.start, trimIn: clip.trimIn, duration: clip.duration, volume: layer.media.volume, fadeIn: 0, fadeOut: 0 })
      }
    }
  }
  return inputs
}

export class ExportJob {
  private cancelled = false
  private jobId: string | null = null

  constructor(private project: Project, private options: ExportOptions, private onProgress: (p: ExportProgress) => void) {}

  cancel() {
    this.cancelled = true
    if (this.jobId) void api(`/api/export/jobs/${this.jobId}`, { method: 'DELETE' }).catch(() => {})
  }

  async run(): Promise<void> {
    const { project, options } = this
    // With speed changes the exported video is longer or shorter than the timeline: frame i shows the
    // moment of the timeline that plays at output time i / fps.
    const sourceDuration = project.composition.duration
    const duration = outputDuration(project)
    const frameCount = Math.max(1, Math.round(duration * options.fps))
    const speed = hasSpeedChange(project) ? speedSegments(project).map((s) => ({ src0: s.src0, src1: s.src1, speed: s.speed })) : []
    const media = new MediaCache()
    try {
      this.onProgress({ phase: 'preparing', progress: 0, message: 'Loading fonts and media' })
      const { jobId } = await api<{ jobId: string }>('/api/export/jobs', {
        method: 'POST',
        body: JSON.stringify({ ...options, frameCount, duration, sourceDuration, speed, audio: audioInputs(project) }),
      })
      this.jobId = jobId
      await loadProjectFonts(project)
      await media.prepare(project)
      if (this.cancelled) return this.onProgress({ phase: 'cancelled', progress: 0 })

      const canvas = document.createElement('canvas')
      canvas.width = options.width
      canvas.height = options.height
      const ctx = canvas.getContext('2d', { alpha: false })!
      const sx = options.width / project.composition.width
      const sy = options.height / project.composition.height

      let batch: { index: number; blob: Blob }[] = []
      const flush = async () => {
        if (batch.length === 0) return
        const form = new FormData()
        for (const f of batch) form.append('frames', f.blob, `${f.index}.jpg`)
        batch = []
        await api(`/api/export/jobs/${jobId}/frames`, { method: 'POST', body: form })
      }

      for (let i = 0; i < frameCount; i++) {
        if (this.cancelled) return this.onProgress({ phase: 'cancelled', progress: i / frameCount })
        const time = Math.min(sourceDuration, outToSrc(project, i / options.fps))
        ctx.setTransform(sx, 0, 0, sy, 0, 0)
        await renderFrame(ctx, project, time, media)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        batch.push({ index: i, blob: encodeFrame(canvas, frameCount > 3000 ? 0.9 : 0.94) })
        if (batch.length >= BATCH) await flush()
        this.onProgress({ phase: 'rendering', progress: (i + 1) / frameCount, message: `Frame ${i + 1} of ${frameCount}` })
      }
      await flush()
      if (this.cancelled) return this.onProgress({ phase: 'cancelled', progress: 1 })

      await api(`/api/export/jobs/${jobId}/finish`, { method: 'POST', body: '{}' })
      this.onProgress({ phase: 'encoding', progress: 0, message: 'Encoding video with FFmpeg' })
      while (!this.cancelled) {
        await new Promise((r) => setTimeout(r, 600))
        const st = await api<{ status: string; progress: number; error: string | null; downloadUrl: string | null }>(`/api/export/jobs/${jobId}`)
        if (st.status === 'done' && st.downloadUrl) return this.onProgress({ phase: 'done', progress: 1, downloadUrl: st.downloadUrl })
        if (st.status === 'error') return this.onProgress({ phase: 'error', progress: 0, message: st.error ?? 'Encoding failed' })
        if (st.status === 'cancelled') return this.onProgress({ phase: 'cancelled', progress: 0 })
        this.onProgress({ phase: 'encoding', progress: st.progress, message: `Encoding ${Math.round(st.progress * 100)}%` })
      }
      this.onProgress({ phase: 'cancelled', progress: 0 })
    } catch (e) {
      if (this.cancelled) return this.onProgress({ phase: 'cancelled', progress: 0 })
      this.onProgress({ phase: 'error', progress: 0, message: (e as Error).message })
    } finally {
      media.dispose()
    }
  }
}
