import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useEditor } from '@/store/editorStore'
import { addMediaClip, addTrack, clipsOnTrack } from '@/engine/operations'
import { contentEnd } from '@/engine/project'
import { pxToTime, timeToPx } from '@/utils/time'
import { startDrag } from '@/utils/drag'
import { TimelineControls } from './TimelineControls'
import { MARKER_LANE_HEIGHT, MarkerLane, Ruler, RULER_HEIGHT } from './Ruler'
import { ClipBlock, TRACK_HEIGHT } from './ClipBlock'
import { HEADER_WIDTH, TrackHeader } from './TrackRow'

export function Timeline() {
  const project = useEditor((s) => s.project)!
  const playhead = useEditor((s) => s.playhead)
  const pxPerSecond = useEditor((s) => s.pxPerSecond)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const pause = useEditor((s) => s.pause)
  const clearSelection = useEditor((s) => s.clearSelection)
  const commit = useEditor((s) => s.commit)
  const select = useEditor((s) => s.select)
  const showToast = useEditor((s) => s.showToast)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null)

  // Long projects open zoomed out so the whole piece is visible.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || project.composition.duration <= 60) return
    const lane = el.clientWidth - HEADER_WIDTH - 24
    useEditor.getState().setPxPerSecond(Math.max(2, lane / project.composition.duration))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const totalSeconds = Math.max(project.composition.duration, contentEnd(project)) + Math.max(2, 240 / pxPerSecond)
  const laneWidth = Math.max(600, timeToPx(totalSeconds, pxPerSecond))

  const seekAt = useCallback((clientX: number) => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, pxToTime(clientX - rect.left - HEADER_WIDTH + el.scrollLeft, pxPerSecond))
  }, [pxPerSecond])

  const trackAt = useCallback((clientY: number): string | null => {
    const el = scrollRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top + el.scrollTop - RULER_HEIGHT - MARKER_LANE_HEIGHT
    return project.tracks[Math.floor(y / TRACK_HEIGHT)]?.id ?? null
  }, [project.tracks])

  const onLanePointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    pause()
    clearSelection()
    setPlayhead(seekAt(e.clientX))
    startDrag(e, { threshold: 0, onMove: (_dx, _dy, ev) => setPlayhead(seekAt(ev.clientX)) })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('application/x-motion-asset')
    if (!assetId) return
    const asset = project.assets.find((a) => a.id === assetId)
    if (!asset) return
    const time = seekAt(e.clientX)
    const track = project.tracks.find((t) => t.id === trackAt(e.clientY))
    const compatible = track && ((asset.type === 'audio' && track.kind === 'audio') || (asset.type !== 'audio' && track.kind === 'visual'))
    try {
      let newId = ''
      commit((p) => { const r = addMediaClip(p, assetId, { start: Math.round(time * 100) / 100, trackId: compatible ? track.id : undefined }); newId = r.clipId; return r.project })
      if (newId) select([newId])
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  const playheadX = timeToPx(playhead, pxPerSecond)
  const bodyHeight = RULER_HEIGHT + MARKER_LANE_HEIGHT + project.tracks.length * TRACK_HEIGHT

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <TimelineControls />
      <div
        ref={scrollRef}
        data-timeline-scroll
        className="relative min-h-0 flex-1 overflow-auto scroll-thin"
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-motion-asset')) e.preventDefault() }}
        onDrop={onDrop}
      >
        <div className="relative" style={{ width: HEADER_WIDTH + laneWidth, minHeight: '100%' }}>
          <div className="sticky top-0 z-30 flex" style={{ height: RULER_HEIGHT }}>
            <div className="sticky left-0 z-40 shrink-0 bg-panel" style={{ width: HEADER_WIDTH }} />
            <Ruler width={laneWidth} seekAt={seekAt} />
          </div>
          <div className="flex" style={{ height: MARKER_LANE_HEIGHT }}>
            <div className="sticky left-0 z-20 flex shrink-0 items-center border-y border-line bg-panel px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted" style={{ width: HEADER_WIDTH }}>
              Sections
            </div>
            <MarkerLane width={laneWidth} seekAt={seekAt} />
          </div>
          {project.tracks.map((track, i) => {
            const clips = clipsOnTrack(project, track.id)
            return (
              <div key={track.id} className="flex" style={{ height: TRACK_HEIGHT }}>
                <TrackHeader track={track} index={i} count={project.tracks.length} />
                <div
                  className={`relative border-b border-line ${track.kind === 'audio' ? 'bg-well/40' : 'bg-panel'} ${track.locked ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--line)_6px,var(--line)_12px)]' : ''}`}
                  style={{ width: laneWidth, backgroundImage: track.locked ? undefined : 'linear-gradient(to right, var(--line) 1px, transparent 1px)', backgroundSize: `${pxPerSecond}px 100%` }}
                  onPointerDown={onLanePointerDown}
                >
                  {clips.map((clip) => (
                    <ClipBlock key={clip.id} clip={clip} layer={clip.layerId ? project.layers.find((l) => l.id === clip.layerId) : undefined} trackLocked={track.locked} trackIndexAt={trackAt} onSnapIndicator={setSnapIndicator} />
                  ))}
                </div>
              </div>
            )
          })}
          <div className="flex" style={{ height: 40 }}>
            <div className="sticky left-0 z-20 flex shrink-0 items-center gap-1 bg-panel px-2" style={{ width: HEADER_WIDTH + 80 }}>
              <button className="btn h-8 px-2.5 text-[11px]" onClick={() => commit((p) => addTrack(p, 'visual', 'Layer').project)}><Plus size={11} /> Track</button>
              <button className="btn h-8 px-2.5 text-[11px]" onClick={() => commit((p) => addTrack(p, 'audio', 'Audio').project)}><Plus size={11} /> Audio</button>
            </div>
          </div>
          <div className="pointer-events-none absolute top-0 z-10 bg-ink/[0.04]" style={{ left: HEADER_WIDTH + timeToPx(project.composition.duration, pxPerSecond), right: 0, height: bodyHeight }} />
          {snapIndicator !== null && <div className="pointer-events-none absolute top-0 z-30 w-px bg-brand-orange" style={{ left: HEADER_WIDTH + timeToPx(snapIndicator, pxPerSecond), height: bodyHeight }} />}
          <div className="pointer-events-none absolute top-0 z-40" style={{ left: HEADER_WIDTH + playheadX, height: bodyHeight }}>
            <div className="absolute -left-[6px] top-0 h-3 w-3 rounded-sm bg-playhead" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
            <div className="h-full w-px bg-playhead" />
          </div>
        </div>
      </div>
    </div>
  )
}
