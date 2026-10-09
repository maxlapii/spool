import { useMemo, useState } from 'react'
import { useEditor } from '@/store/editorStore'
import { deleteMarker, updateMarker } from '@/engine/operations'
import { rulerInterval, timeToPx } from '@/utils/time'
import { startDrag } from '@/utils/drag'
import { formatSpeed } from '@/engine/speed'

export const RULER_HEIGHT = 24
export const MARKER_LANE_HEIGHT = 26

const label = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}${t % 1 ? `.${Math.round((t % 1) * 10)}` : ''}`

export function Ruler({ width, seekAt }: { width: number; seekAt: (clientX: number) => number }) {
  const pxPerSecond = useEditor((s) => s.pxPerSecond)
  const duration = useEditor((s) => s.project!.composition.duration)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const pause = useEditor((s) => s.pause)

  const ticks = useMemo(() => {
    const { major, minor } = rulerInterval(pxPerSecond)
    const total = width / pxPerSecond
    const out: { t: number; major: boolean }[] = []
    for (let t = 0; t <= total + 1e-6; t += minor) {
      const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6
      out.push({ t: Math.round(t * 1000) / 1000, major: isMajor })
    }
    return out
  }, [pxPerSecond, width])

  const scrub = (e: React.PointerEvent) => {
    e.preventDefault()
    pause()
    setPlayhead(seekAt(e.clientX))
    startDrag(e, { threshold: 0, onMove: (_dx, _dy, ev) => setPlayhead(seekAt(ev.clientX)) })
  }

  return (
    <div className="relative select-none bg-panel" style={{ height: RULER_HEIGHT, width }} onPointerDown={scrub}>
      {ticks.map(({ t, major }) => (
        <div key={t} className="absolute bottom-0" style={{ left: timeToPx(t, pxPerSecond) }}>
          <div className={`w-px ${major ? 'h-2 bg-ink-faint' : 'h-1 bg-line-strong'}`} />
          {major && <span className={`absolute bottom-2.5 whitespace-nowrap font-mono text-[9.5px] text-ink-muted ${t === 0 ? 'left-1' : 'left-0 -translate-x-1/2'}`}>{label(t)}</span>}
        </div>
      ))}
      <div className="absolute top-0 h-full bg-well" style={{ left: timeToPx(duration, pxPerSecond), right: 0 }} />
    </div>
  )
}

export function MarkerLane({ width, seekAt }: { width: number; seekAt: (clientX: number) => number }) {
  const markers = useEditor((s) => s.project!.markers)
  const pxPerSecond = useEditor((s) => s.pxPerSecond)
  const commit = useEditor((s) => s.commit)
  const patch = useEditor((s) => s.patch)
  const snapshot = useEditor((s) => s.snapshot)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const [editing, setEditing] = useState<string | null>(null)
  const sorted = [...markers].sort((a, b) => a.time - b.time)

  return (
    <div className="relative border-y border-line bg-panel" style={{ height: MARKER_LANE_HEIGHT, width }}>
      <div className="absolute inset-0" onPointerDown={(e) => setPlayhead(seekAt(e.clientX))} />
      {sorted.map((m, i) => {
        const next = sorted[i + 1]
        const left = timeToPx(m.time, pxPerSecond)
        const w = next ? timeToPx(next.time - m.time, pxPerSecond) : Math.max(120, timeToPx(5, pxPerSecond))
        return (
          <div
            key={m.id}
            className="group absolute top-1 flex h-[18px] items-center overflow-hidden rounded-md px-1.5"
            style={{ left: left + 1, width: Math.max(28, w - 3), background: `${m.color}1f`, color: m.color }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(m.id) }}
            onPointerDown={(e) => {
              if (editing === m.id) return
              e.stopPropagation()
              const startTime = m.time
              startDrag(e, {
                onStart: () => snapshot(),
                onMove: (dx) => patch((p) => updateMarker(p, m.id, { time: Math.max(0, startTime + dx / pxPerSecond) })),
                onEnd: (_dx, _dy, _ev, moved) => { if (!moved) setPlayhead(m.time) },
              })
            }}
            title="Click to seek · drag to move · double-click to rename"
          >
            {editing === m.id ? (
              <input
                autoFocus
                className="h-4 w-full bg-transparent text-[10.5px] font-semibold outline-none"
                defaultValue={m.label}
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => { commit((p) => updateMarker(p, m.id, { label: e.target.value })); setEditing(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditing(null)
                  if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) { commit((p) => deleteMarker(p, m.id)); setEditing(null) }
                  e.stopPropagation()
                }}
              />
            ) : (
              <span className="truncate text-[10.5px] font-semibold">{m.label}{m.speed && m.speed !== 1 ? <span className="ml-1 rounded bg-current/15 px-1 font-mono text-[9.5px]">{formatSpeed(m.speed)}</span> : null}</span>
            )}
            <button
              className="ml-auto hidden h-4 w-4 shrink-0 items-center justify-center rounded text-[11px] opacity-70 hover:opacity-100 group-hover:flex"
              title="Delete marker"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); commit((p) => deleteMarker(p, m.id)) }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
