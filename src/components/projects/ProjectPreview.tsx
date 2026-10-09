import { useEffect, useState } from 'react'
import { Clapperboard } from 'lucide-react'
import { projectService } from '@/services/projects'
import { normalizeProject } from '@/engine/normalize'
import { loadProjectFonts, MediaCache, renderFrame } from '@/engine/render'

const cache = new Map<string, Promise<HTMLCanvasElement | null>>()

async function render(projectId: string, updatedAt: string, size: number): Promise<HTMLCanvasElement | null> {
  const raw = await projectService.load(projectId)
  if (!raw) return null
  const project = normalizeProject(raw)
  await loadProjectFonts(project)
  const media = new MediaCache()
  await media.prepare(project)
  const { width, height, duration } = project.composition
  const scale = Math.min(size / width, size / height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d', { alpha: false })!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  await renderFrame(ctx, project, Math.min(1.5, duration / 2), media)
  media.dispose()
  void updatedAt
  return canvas
}

/** Thumbnail of a saved project, rendered with the editor's canvas renderer and cached per revision. */
export function ProjectPreview({ projectId, updatedAt, aspect, size = 400 }: { projectId: string; updatedAt: string; aspect: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const key = `${projectId}:${updatedAt}:${size}`
    if (!cache.has(key)) cache.set(key, render(projectId, updatedAt, size).catch(() => null))
    void cache.get(key)!.then((canvas) => {
      if (cancelled) return
      if (!canvas) return setFailed(true)
      setSrc(canvas.toDataURL('image/png'))
    })
    return () => { cancelled = true }
  }, [projectId, updatedAt, size])

  const vertical = aspect === '9:16' || aspect === '4:5'
  if (src) return <img src={src} alt="" className="max-h-full max-w-full rounded-[3px] shadow-[0_6px_18px_rgba(30,20,10,0.22)]" draggable={false} />
  return (
    <div className={`flex items-center justify-center rounded-[3px] bg-panel/80 text-ink-faint shadow-sm ${vertical ? 'h-[82%] w-[46%]' : 'h-[64%] w-[82%]'}`}>
      {failed ? <Clapperboard size={16} /> : <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-line-strong" />}
    </div>
  )
}
