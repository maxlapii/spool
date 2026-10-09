import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Pause, Play, Plus, Sparkles } from 'lucide-react'
import { useEditor } from '@/store/editorStore'
import { useAssistant } from '@/store/assistantStore'
import { addMediaClip } from '@/engine/operations'
import { CompositionView } from './CompositionView'
import { AudioPlayback } from './AudioPlayback'

const PADDING = 56

export function Stage() {
  const project = useEditor((s) => s.project)!
  const canvasFit = useEditor((s) => s.canvasFit)
  const canvasZoom = useEditor((s) => s.canvasZoom)
  const setCanvasZoom = useEditor((s) => s.setCanvasZoom)
  const clearSelection = useEditor((s) => s.clearSelection)
  const commit = useEditor((s) => s.commit)
  const select = useEditor((s) => s.select)
  const showToast = useEditor((s) => s.showToast)
  const isPlaying = useEditor((s) => s.isPlaying)
  const togglePlay = useEditor((s) => s.togglePlay)
  const setActiveTab = useEditor((s) => s.setActiveTab)
  const requestFocus = useAssistant((s) => s.requestFocus)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [avail, setAvail] = useState({ w: 0, h: 0 })
  const [dragOver, setDragOver] = useState(false)

  useLayoutEffect(() => {
    const el = containerRef.current
    const wrapper = cardRef.current?.parentElement
    if (!el || !wrapper) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const w = wrapper.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
      setAvail({ w: w.width, h: w.height })
    })
    ro.observe(el)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [])

  const { width, height } = project.composition
  // The card hugs the composition: as wide as the video needs at the available height, never wider than the row.
  const FOOTER = 46
  const stageH = Math.max(0, avail.h - FOOTER)
  const hugWidth = avail.w > 0 ? Math.min(avail.w, Math.max(420, (stageH - PADDING * 2) * (width / height) + PADDING * 2)) : undefined
  const fitScale = size.w > 0 ? Math.min((size.w - PADDING * 2) / width, (size.h - PADDING * 2) / height, 1.5) : 0.1
  const scale = canvasFit ? Math.max(0.02, fitScale) : canvasZoom

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const current = useEditor.getState().canvasFit ? fitScale : useEditor.getState().canvasZoom
      setCanvasZoom(current * (e.deltaY < 0 ? 1.1 : 0.9))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [fitScale, setCanvasZoom])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const assetId = e.dataTransfer.getData('application/x-motion-asset')
    if (!assetId) return
    const comp = containerRef.current?.querySelector('[data-composition]') as HTMLElement | null
    const rect = comp?.getBoundingClientRect()
    const asset = project.assets.find((a) => a.id === assetId)
    if (!asset) return
    const playhead = useEditor.getState().playhead
    try {
      let newClip = ''
      commit((p) => {
        const r = addMediaClip(p, assetId, { start: playhead })
        newClip = r.clipId
        if (rect && asset.type !== 'audio' && r.layerId) {
          const layer = r.project.layers.find((l) => l.id === r.layerId)!
          const x = Math.round((e.clientX - rect.left) / scale - layer.transform.width / 2)
          const y = Math.round((e.clientY - rect.top) / scale - layer.transform.height / 2)
          return { ...r.project, layers: r.project.layers.map((l) => (l.id === r.layerId ? { ...l, transform: { ...l.transform, x, y } } : l)) }
        }
        return r.project
      })
      if (newClip) select([newClip])
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div ref={cardRef} className={`card @container relative flex min-w-0 flex-col overflow-hidden transition-[width] duration-200 ${dragOver ? 'ring-2 ring-inset ring-select' : ''}`} style={{ width: hugWidth ?? '100%', maxWidth: '100%' }}>
      <div
        ref={containerRef}
        className="stage-grid relative min-h-0 flex-1 overflow-auto scroll-thin"
        onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.stageBg) clearSelection() }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-motion-asset')) { e.preventDefault(); setDragOver(true) } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div data-stage-bg className="flex items-center justify-center" style={{ minWidth: '100%', minHeight: '100%', width: width * scale + PADDING * 2, height: height * scale + PADDING * 2 }}>
          <div style={{ width: width * scale, height: height * scale, flexShrink: 0 }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width, height }}>
              <CompositionView scale={scale} />
            </div>
          </div>
        </div>
      </div>
      <AudioPlayback />

      <div className="flex h-[46px] shrink-0 items-center justify-between gap-2 border-t border-line px-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-well p-0.5">
          <button className="icon-btn h-8 w-8 rounded-md" title="Zoom out" onClick={() => setCanvasZoom(scale / 1.2)}><Minus size={13} /></button>
          <button className="h-7 min-w-[48px] rounded-md px-1 font-mono text-[11px] font-semibold tabular-nums text-ink hover:bg-panel" onClick={() => setCanvasZoom('fit')} title="Fit to view">{Math.round(scale * 100)}%</button>
          <button className="icon-btn h-8 w-8 rounded-md" title="Zoom in" onClick={() => setCanvasZoom(scale * 1.2)}><Plus size={13} /></button>
          <span className="mx-0.5 h-4 w-px bg-line-strong/60" />
          <button className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold ${canvasFit ? 'bg-panel text-accent shadow-sm' : 'text-ink-muted hover:bg-panel'}`} title="Fit to view" onClick={() => setCanvasZoom('fit')}><Maximize2 size={11} /><span className="hidden @[460px]:inline">Fit</span></button>
        </div>
        <span className="hidden font-mono text-[10.5px] text-ink-faint @[620px]:inline">{width} × {height} · {project.composition.aspect}</span>
        <div className="flex items-center gap-1.5">
          <button className="btn-primary brand-gradient h-9 gap-1.5 px-3 hover:opacity-90" onClick={() => { setActiveTab('assistant'); requestFocus() }} title="Ask Claude (/)">
            <Sparkles size={14} /><span className="hidden @[520px]:inline">Ask Claude</span><kbd className="hidden rounded-md bg-white/25 px-1.5 py-0.5 font-mono text-[10px] @[520px]:inline">/</kbd>
          </button>
          <button className="btn-dark h-9 px-3" onClick={togglePlay} title={isPlaying ? 'Pause (Space)' : 'Play with sound (Space)'}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}<span className="hidden @[460px]:inline">{isPlaying ? 'Pause' : 'Play with sound'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
