import type { Asset, AssetType } from '@/types'
import { api } from './api'

export const ACCEPTED_MIME: Record<string, AssetType> = {
  'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'image/gif': 'image', 'image/svg+xml': 'image',
  'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
  'audio/mpeg': 'audio', 'audio/mp3': 'audio', 'audio/wav': 'audio', 'audio/x-wav': 'audio', 'audio/ogg': 'audio', 'audio/aac': 'audio', 'audio/mp4': 'audio', 'audio/x-m4a': 'audio',
}
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024

export function assetTypeFor(file: File): AssetType | null {
  return ACCEPTED_MIME[file.type] ?? null
}

interface Probe { width?: number; height?: number; duration?: number; thumbnail?: Blob }

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = url
  })
}

async function probeFile(file: File, type: AssetType): Promise<Probe> {
  const url = URL.createObjectURL(file)
  try {
    if (type === 'image') {
      const img = await loadImage(url)
      return { width: img.naturalWidth, height: img.naturalHeight }
    }
    if (type === 'video') {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      video.src = url
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Could not decode video'))
      })
      const probe: Probe = { width: video.videoWidth, height: video.videoHeight, duration: video.duration }
      try {
        video.currentTime = Math.min(0.5, video.duration / 2)
        await new Promise<void>((resolve) => { video.onseeked = () => resolve(); setTimeout(resolve, 1500) })
        const canvas = document.createElement('canvas')
        const s = Math.min(1, 320 / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * s)
        canvas.height = Math.round(video.videoHeight * s)
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
        probe.thumbnail = await new Promise<Blob | undefined>((r) => canvas.toBlob((b) => r(b ?? undefined), 'image/jpeg', 0.8))
      } catch { /* thumbnail optional */ }
      return probe
    }
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src = url
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve()
      audio.onerror = () => reject(new Error('Could not decode audio'))
    })
    return { duration: audio.duration }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const assetService = {
  async upload(file: File, onProgress?: (pct: number) => void): Promise<Asset> {
    const type = assetTypeFor(file)
    if (!type) throw new Error(`Unsupported file type: ${file.type || file.name}`)
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('File is larger than 250 MB')
    const probe = await probeFile(file, type)
    const form = new FormData()
    form.append('file', file)
    if (probe.thumbnail) form.append('thumbnail', probe.thumbnail, 'thumb.jpg')
    form.append('meta', JSON.stringify({ name: file.name, type, width: probe.width, height: probe.height, duration: probe.duration }))
    onProgress?.(0)
    const asset = await api<Asset>('/api/assets', { method: 'POST', body: form })
    onProgress?.(100)
    return asset
  },
  async remove(assetId: string): Promise<void> {
    await api(`/api/assets/${assetId}`, { method: 'DELETE' })
  },
}
