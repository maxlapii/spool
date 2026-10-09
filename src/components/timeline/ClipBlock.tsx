import { ArrowRightLeft, Lock, Music, Image as ImageIcon, Shapes, Type, Video } from 'lucide-react'
import type { Clip, Layer, Project } from '@/types'
import { useEditor } from '@/store/editorStore'
import { moveClip, trimClip } from '@/engine/operations'
import { snapCandidates, snapTime } from '@/engine/snap'
import { timeToPx } from '@/utils/time'
import { startDrag } from '@/utils/drag'

export const TRACK_HEIGHT = 44

/** Themed via .clip-* classes in index.css (light and dark values). */
export const CLIP_COLORS: Record<Layer['type'] | 'audio', { cls: string; Icon: typeof Type }> = {
  text: { cls: 'clip-text', Icon: Type },
  shape: { cls: 'clip-shape', Icon: Shapes },
  image: { cls: 'clip-media', Icon: ImageIcon },
  video: { cls: 'clip-media', Icon: Video },
  audio: { cls: 'clip-audio', Icon: Music },
}

interface Props {
  clip: Clip
  layer?: Layer
  trackLocked: boolean
  trackIndexAt: (clientY: number) => string | null
  onSnapIndicator: (time: number | null) => void
}

export function ClipBlock({ clip, layer, trackLocked, trackIndexAt, onSnapIndicator }: Props) {
  const pxPerSecond = useEditor((s) => s.pxPerSecond)
  const selected = useEditor((s) => s.selectedClipIds.includes(clip.id))
  const select = useEditor((s) => s.select)
  const snapshot = useEditor((s) => s.snapshot)
  const patch = useEditor((s) => s.patch)
  const snappingOn = useEditor((s) => s.snapping)
  const kind = clip.audio ? 'audio' : layer?.type ?? 'shape'
  const color = CLIP_COLORS[kind]
  const locked = trackLocked || !!layer?.locked
  const left = timeToPx(clip.start, pxPerSecond)
  const width = Math.max(6, timeToPx(clip.duration, pxPerSecond))

  const snapper = (project: Project, exclude: string[], altKey: boolean) => {
    const on = snappingOn !== altKey
    if (!on) return (t: number) => ({ time: t, target: null as number | null })
    const cands = snapCandidates(project, useEditor.getState().playhead, exclude)
    return (t: number) => snapTime(t, cands, 8 / pxPerSecond)
  }

  const beginMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const additive = e.shiftKey || e.metaKey
    if (!selected || additive) select([clip.id], additive)
    if (locked) return
    const state = useEditor.getState()
    const ids = additive ? [clip.id] : state.selectedClipIds.includes(clip.id) ? state.selectedClipIds : [clip.id]
    const project = state.project!
    const starts = ids.map((id) => project.clips.find((c) => c.id === id)!).filter(Boolean).map((c) => ({ id: c.id, start: c.start, duration: c.duration, trackId: c.trackId }))
    const primaryStart = clip.start
    startDrag(e, {
      onStart: () => snapshot(),
      onMove: (dx, _dy, ev) => {
        const snap = snapper(project, ids, ev.altKey)
        let delta = dx / pxPerSecond
        const s1 = snap(primaryStart + delta)
        const s2 = snap(primaryStart + clip.duration + delta)
        let target: number | null = null
        if (s1.target !== null) { delta = s1.time - primaryStart; target = s1.target }
        else if (s2.target !== null) { delta = s2.time - clip.duration - primaryStart; target = s2.target }
        const minStart = Math.min(...starts.map((s) => s.start))
        if (minStart + delta < 0) delta = -minStart
        onSnapIndicator(target)
        const targetTrack = ids.length === 1 ? trackIndexAt(ev.clientY) : null
        patch((p) =>
          starts.reduce((acc, s) => {
            let trackId: string | undefined
            if (targetTrack && targetTrack !== s.trackId) {
              const t = acc.tracks.find((x) => x.id === targetTrack)
              const c = acc.clips.find((x) => x.id === s.id)!
              if (t && !t.locked && ((c.audio && t.kind === 'audio') || (!c.audio && t.kind === 'visual'))) trackId = targetTrack
            }
            try {
              return moveClip(acc, s.id, Math.max(0, s.start + delta), trackId)
            } catch {
              return acc
            }
          }, p),
        )
      },
      onEnd: () => onSnapIndicator(null),
    })
  }

  const beginTrim = (edge: 'start' | 'end', e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    select([clip.id])
    if (locked) return
    const project = useEditor.getState().project!
    const origStart = clip.start
    const origEnd = clip.start + clip.duration
    startDrag(e, {
      onStart: () => snapshot(),
      onMove: (dx, _dy, ev) => {
        const snap = snapper(project, [clip.id], ev.altKey)
        const raw = (edge === 'start' ? origStart : origEnd) + dx / pxPerSecond
        const s = snap(raw)
        onSnapIndicator(s.target)
        patch((p) => trimClip(p, clip.id, edge, s.time))
      },
      onEnd: () => onSnapIndicator(null),
    })
  }

  const Icon = color.Icon
  const grip = <span className="flex h-3 items-center gap-[2px] opacity-40"><span className="h-full w-px bg-current" /><span className="h-full w-px bg-current" /></span>
  return (
    <div
      className={`group absolute top-1.5 flex h-[calc(100%-12px)] items-center overflow-hidden rounded-md border text-[11.5px] font-semibold no-select transition-[box-shadow,border-color] duration-150 ${color.cls} ${selected ? 'border-accent shadow-[0_0_0_1px_var(--accent)]' : 'border-transparent'} ${locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ left, width, opacity: layer?.hidden ? 0.45 : 1 }}
      onPointerDown={beginMove}
      title={`${clip.name} · ${clip.start.toFixed(2)}s → ${(clip.start + clip.duration).toFixed(2)}s`}
    >
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: 'var(--edge)' }} />
      <div className="ml-[3px] flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center" onPointerDown={(e) => beginTrim('start', e)}>{!locked && grip}</div>
      <span className="flex min-w-0 flex-1 items-center gap-1 truncate pr-1">
        {clip.transitionIn && clip.transitionIn.type !== 'none' && <ArrowRightLeft size={10} className="shrink-0 opacity-80" />}
        <Icon size={11} className="shrink-0 opacity-90" />
        <span className="truncate">{clip.name}</span>
        {locked && <Lock size={9} className="shrink-0 opacity-70" />}
      </span>
      <div className="flex h-full w-3 shrink-0 cursor-ew-resize items-center justify-center" onPointerDown={(e) => beginTrim('end', e)}>{!locked && grip}</div>
    </div>
  )
}
