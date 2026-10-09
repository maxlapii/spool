import { Bookmark, Magnet, Maximize2, MousePointer2, Pause, Play, Redo2, Scissors, SkipBack, SkipForward, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { HEADER_WIDTH } from './TrackRow'
import { useEditor } from '@/store/editorStore'
import { addMarker, splitClip } from '@/engine/operations'
import { formatSpeed, hasSpeedChange, outputDuration, speedAt } from '@/engine/speed'

function fmt(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${m}:${sec.toFixed(1).padStart(4, '0')}`
}

export function TimelineControls() {
  const project = useEditor((s) => s.project)!
  const playhead = useEditor((s) => s.playhead)
  const isPlaying = useEditor((s) => s.isPlaying)
  const togglePlay = useEditor((s) => s.togglePlay)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const pxPerSecond = useEditor((s) => s.pxPerSecond)
  const setPxPerSecond = useEditor((s) => s.setPxPerSecond)
  const snapping = useEditor((s) => s.snapping)
  const setSnapping = useEditor((s) => s.setSnapping)
  const selectedClipIds = useEditor((s) => s.selectedClipIds)
  const deleteSelection = useEditor((s) => s.deleteSelection)
  const commit = useEditor((s) => s.commit)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const showToast = useEditor((s) => s.showToast)

  const fitZoom = () => {
    const el = document.querySelector('[data-timeline-scroll]') as HTMLElement | null
    const lane = (el?.clientWidth ?? 900) - HEADER_WIDTH - 24
    setPxPerSecond(Math.max(2, lane / Math.max(1, project.composition.duration)))
  }

  const split = () => {
    const id = selectedClipIds[0]
    if (!id) return
    try {
      commit((p) => splitClip(p, id, playhead).project)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-line px-2">
      <div className="flex items-center gap-0.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent" title="Select"><MousePointer2 size={14} /></span>
        <button className="icon-btn h-9 w-9" title="Split clip at playhead (S)" disabled={selectedClipIds.length === 0} onClick={split}><Scissors size={14} /></button>
        <button className="icon-btn h-9 w-9" title="Delete selected (⌫)" disabled={selectedClipIds.length === 0} onClick={deleteSelection}><Trash2 size={14} /></button>
        <button className="icon-btn h-9 w-9" title="Add section marker at playhead" onClick={() => commit((p) => addMarker(p, playhead, `Section ${p.markers.length + 1}`).project)}><Bookmark size={14} /></button>
        <button className={`icon-btn h-9 w-9 ${snapping ? 'active' : ''}`} title="Toggle snapping (hold ⌥ to bypass)" onClick={() => setSnapping(!snapping)}><Magnet size={14} /></button>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="mr-1.5 w-[60px] text-right font-mono text-[14px] font-semibold tabular-nums">{fmt(playhead)}</span>
        <button className="icon-btn h-9 w-9" title="Go to start (Home)" onClick={() => setPlayhead(0)}><SkipBack size={15} /></button>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-panel shadow-sm transition-opacity hover:opacity-90" title="Play / Pause (Space)" onClick={togglePlay}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button className="icon-btn h-9 w-9" title="Go to end (End)" onClick={() => setPlayhead(project.composition.duration)}><SkipForward size={15} /></button>
        <span className="ml-1.5 w-[60px] font-mono text-[14px] tabular-nums text-ink-faint" title={hasSpeedChange(project) ? `Timeline length. The exported video is ${fmt(outputDuration(project))} with your speed settings.` : undefined}>{fmt(project.composition.duration)}</span>
        {hasSpeedChange(project) && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent" title={`Playing at ${formatSpeed(speedAt(project, playhead))}. The exported video is ${fmt(outputDuration(project))}.`}>{formatSpeed(speedAt(project, playhead))} · {fmt(outputDuration(project))}</span>}
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <button className="icon-btn h-9 w-9" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}><Undo2 size={15} /></button>
        <button className="icon-btn h-9 w-9" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}><Redo2 size={15} /></button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button className="icon-btn h-9 w-9" title="Zoom out timeline" onClick={() => setPxPerSecond(pxPerSecond / 1.3)}><ZoomOut size={15} /></button>
        <input type="range" className="h-1 w-20" min={0} max={100} step={1} value={Math.round(Math.log(pxPerSecond / 2) / Math.log(300) * 100)} onChange={(e) => setPxPerSecond(2 * Math.pow(300, Number(e.target.value) / 100))} aria-label="Timeline zoom" />
        <button className="icon-btn h-9 w-9" title="Zoom in timeline" onClick={() => setPxPerSecond(pxPerSecond * 1.3)}><ZoomIn size={15} /></button>
        <button className="icon-btn h-9 w-9" title="Fit whole timeline" onClick={fitZoom}><Maximize2 size={13} /></button>
      </div>
    </div>
  )
}
