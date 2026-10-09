import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { TemplateDef } from '@/engine/templates'
import { loadProjectFonts, MediaCache, renderFrame } from '@/engine/render'

const previewCache = new Map<string, Promise<string>>()

async function renderPreview(template: TemplateDef, size: number): Promise<string> {
  const project = template.build()
  await loadProjectFonts(project)
  const { width, height } = project.composition
  const scale = Math.min(size / width, size / height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d', { alpha: false })!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  await renderFrame(ctx, project, template.previewTime, new MediaCache())
  return canvas.toDataURL('image/png')
}

/** Live thumbnail: renders the template with the same canvas renderer the exporter uses (cached per template/size). */
export function TemplatePreview({ template, size = 480, className = '' }: { template: TemplateDef; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const key = `${template.id}:${size}`
    if (!previewCache.has(key)) previewCache.set(key, renderPreview(template, size))
    void previewCache.get(key)!.then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [template, size])

  return <img src={src ?? undefined} alt="" draggable={false} className={`max-h-full max-w-full rounded-[3px] shadow-[0_6px_18px_rgba(30,20,10,0.22)] transition-opacity ${src ? 'opacity-100' : 'opacity-0'} ${className}`} />
}

export function TemplateCard({ template, onUse, busy }: { template: TemplateDef; onUse: (t: TemplateDef) => void; busy: boolean }) {
  return (
    <li className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <button className="stage-grid flex h-32 items-center justify-center border-b border-line p-2" onClick={() => onUse(template)} disabled={busy} title={`Use “${template.name}”`}>
        <TemplatePreview template={template} size={360} />
      </button>
      <div className="flex flex-1 flex-col p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[12.5px] font-bold">{template.name}</p>
          <span className="chip h-5 shrink-0">{template.aspect} · {template.duration}s</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-muted">{template.description}</p>
        <button className="btn-primary mt-2 h-8 w-full text-[11px]" onClick={() => onUse(template)} disabled={busy}><Plus size={12} /> Use template</button>
      </div>
    </li>
  )
}

export function TemplateRow({ template, onUse, busy }: { template: TemplateDef; onUse: (t: TemplateDef) => void; busy: boolean }) {
  return (
    <li className="flex items-center gap-3 border-b border-line px-2.5 py-1.5 last:border-b-0 hover:bg-well/60">
      <button className="stage-grid flex h-[52px] w-[84px] shrink-0 items-center justify-center rounded-md border border-line p-1" onClick={() => onUse(template)} disabled={busy} title={`Use “${template.name}”`}>
        <TemplatePreview template={template} size={160} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[12.5px] font-bold">{template.name}</p>
          <span className="chip h-5 shrink-0">{template.aspect} · {template.duration}s</span>
          <span className="chip h-5 shrink-0 capitalize">{template.category}</span>
        </div>
        <p className="truncate text-[11px] text-ink-muted">{template.description}</p>
      </div>
      <button className="btn-primary h-8 shrink-0 px-3 text-[11px]" onClick={() => onUse(template)} disabled={busy}><Plus size={12} /> Use template</button>
    </li>
  )
}
