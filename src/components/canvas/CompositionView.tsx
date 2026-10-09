import { useMemo, useState } from 'react'
import type { Layer } from '@/types'
import { useEditor } from '@/store/editorStore'
import { updateLayer } from '@/engine/operations'
import { sceneAt, type SceneEntry } from '@/engine/scene'
import { startDrag } from '@/utils/drag'
import { LayerContent, layerStyle } from './LayerView'
import { SelectionOverlay } from './SelectionOverlay'
import { TextEditor } from './TextEditor'

type Entry = SceneEntry

export function CompositionView({ scale }: { scale: number }) {
  const project = useEditor((s) => s.project)!
  const playhead = useEditor((s) => s.playhead)
  const selectedClipIds = useEditor((s) => s.selectedClipIds)
  const editingTextLayerId = useEditor((s) => s.editingTextLayerId)
  const select = useEditor((s) => s.select)
  const snapshot = useEditor((s) => s.snapshot)
  const patch = useEditor((s) => s.patch)
  const setEditingText = useEditor((s) => s.setEditingText)
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  const selected = useMemo(() => new Set(selectedClipIds), [selectedClipIds])
  const entries = useMemo(() => sceneAt(project, playhead, selected), [project, playhead, selected])
  const { width, height, backgroundColor, backgroundAssetId } = project.composition
  const bgAsset = backgroundAssetId ? project.assets.find((a) => a.id === backgroundAssetId) : undefined
  const primary = entries.find((e) => e.clip.id === selectedClipIds[0])

  const beginMove = (entry: Entry, e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const additive = e.shiftKey
    if (!selected.has(entry.clip.id) || additive) select([entry.clip.id], additive)
    if (entry.layer.locked || entry.trackLocked || entry.ghost) return
    // Move every selected, unlocked layer together.
    const ids = additive ? [entry.clip.id] : selected.has(entry.clip.id) ? [...selected, entry.clip.id] : [entry.clip.id]
    const movers = entries.filter((x) => ids.includes(x.clip.id) && !x.layer.locked && !x.trackLocked).map((x) => ({ id: x.layer.id, x: x.layer.transform.x, y: x.layer.transform.y, w: x.layer.transform.width, h: x.layer.transform.height }))
    const threshold = 6 / scale
    startDrag(e, {
      onStart: () => snapshot(),
      onMove: (sdx, sdy, ev) => {
        let dx = sdx / scale
        let dy = sdy / scale
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
        // Snap the primary layer's centre and edges to the composition
        const m = movers.find((x) => x.id === entry.layer.id) ?? movers[0]
        let gx: number | null = null
        let gy: number | null = null
        if (m && !ev.altKey) {
          const nx = m.x + dx
          const ny = m.y + dy
          const candX = [{ at: width / 2, v: nx + m.w / 2 }, { at: 0, v: nx }, { at: width, v: nx + m.w }]
          const candY = [{ at: height / 2, v: ny + m.h / 2 }, { at: 0, v: ny }, { at: height, v: ny + m.h }]
          for (const c of candX) if (Math.abs(c.v - c.at) < threshold) { dx += c.at - c.v; gx = c.at; break }
          for (const c of candY) if (Math.abs(c.v - c.at) < threshold) { dy += c.at - c.v; gy = c.at; break }
        }
        setGuides({ x: gx, y: gy })
        patch((p) => movers.reduce((acc, mv) => updateLayer(acc, mv.id, { transform: { x: Math.round(mv.x + dx), y: Math.round(mv.y + dy) } }), p))
      },
      onEnd: () => setGuides({ x: null, y: null }),
    })
  }

  return (
    <div
      className="relative overflow-hidden rounded-[2px] shadow-[0_2px_6px_rgba(30,20,10,0.12),0_24px_60px_-20px_rgba(30,20,10,0.35)]"
      style={{ width, height, backgroundColor }}
      data-composition
    >
      {bgAsset && <img src={bgAsset.url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {entries.map((entry) => {
        const editing = editingTextLayerId === entry.layer.id && entry.layer.type === 'text'
        return (
          <div
            key={entry.clip.id}
            style={{ ...layerStyle(entry.state), cursor: entry.layer.locked || entry.trackLocked ? 'default' : 'move', visibility: editing ? 'hidden' : 'visible' }}
            onPointerDown={(e) => beginMove(entry, e)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (entry.layer.type === 'text' && !entry.layer.locked && !entry.trackLocked) {
                select([entry.clip.id])
                setEditingText(entry.layer.id)
              }
            }}
          >
            <LayerContent layer={entry.layer} clip={entry.clip} asset={entry.layer.type === 'image' || entry.layer.type === 'video' ? project.assets.find((a) => a.id === (entry.layer as Extract<Layer, { type: 'image' | 'video' }>).media.assetId) : undefined} trackMuted={entry.trackMuted} />
          </div>
        )
      })}
      {guides.x !== null && <div className="pointer-events-none absolute top-0 h-full bg-brand-orange/80" style={{ left: guides.x, width: 1 / scale }} />}
      {guides.y !== null && <div className="pointer-events-none absolute left-0 w-full bg-brand-orange/80" style={{ top: guides.y, height: 1 / scale }} />}
      {primary && editingTextLayerId === primary.layer.id && primary.layer.type === 'text' && <TextEditor key={primary.layer.id} layer={primary.layer} state={primary.state} />}
      {primary && editingTextLayerId !== primary.layer.id && <SelectionOverlay layer={primary.layer} state={primary.state} scale={scale} ghost={primary.ghost} />}
      {entries.filter((e) => selected.has(e.clip.id) && e !== primary).map((e) => (
        <div
          key={`sel-${e.clip.id}`}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: e.state.width, height: e.state.height, transform: `translate(${e.state.x + e.state.dx}px, ${e.state.y + e.state.dy}px) rotate(${e.state.rotation}deg) scale(${e.state.scale})`, outline: `${1 / scale}px solid #c9b1fb` }}
        />
      ))}
    </div>
  )
}
