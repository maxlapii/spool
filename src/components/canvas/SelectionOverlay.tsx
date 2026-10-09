import type { Layer } from '@/types'
import type { RenderState } from '@/engine/animation'
import { useEditor } from '@/store/editorStore'
import { updateLayer } from '@/engine/operations'
import { startDrag } from '@/utils/drag'
import { degToRad } from '@/utils/math'

type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const HANDLES: { id: HandleId; x: number; y: number; cursor: string }[] = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
]

interface Props {
  layer: Layer
  state: RenderState
  scale: number
  ghost?: boolean
}

/** Selection outline with resize and rotate handles, drawn in composition space. */
export function SelectionOverlay({ layer, state, scale, ghost }: Props) {
  const snapshot = useEditor((s) => s.snapshot)
  const patch = useEditor((s) => s.patch)
  const t = layer.transform
  const hs = 9 / scale // handle size in composition px
  const stroke = 1.5 / scale
  const locked = layer.locked
  const keepAspect = layer.type === 'image' || layer.type === 'video'

  const onResize = (h: HandleId, e: React.PointerEvent) => {
    e.stopPropagation()
    if (locked) return
    const start = { ...t }
    const rad = degToRad(t.rotation)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    startDrag(e, {
      onStart: () => snapshot(),
      onMove: (sdx, sdy, ev) => {
        // Convert screen delta into the layer's local (rotated) axes
        const dx = (sdx * cos + sdy * sin) / scale
        const dy = (-sdx * sin + sdy * cos) / scale
        let { x, y, width, height } = start
        const minSize = 8
        const lockAspect = keepAspect !== ev.shiftKey && h.length === 2
        const ratio = start.width / start.height
        if (h.includes('e')) width = Math.max(minSize, start.width + dx)
        if (h.includes('s')) height = Math.max(minSize, start.height + dy)
        if (h.includes('w')) { width = Math.max(minSize, start.width - dx); x = start.x + (start.width - width) }
        if (h.includes('n')) { height = Math.max(minSize, start.height - dy); y = start.y + (start.height - height) }
        if (lockAspect) {
          if (Math.abs(width - start.width) >= Math.abs(height - start.height) * ratio) height = width / ratio
          else width = height * ratio
          if (h.includes('w')) x = start.x + (start.width - width)
          if (h.includes('n')) y = start.y + (start.height - height)
        }
        // Keep the visual centre stable when rotated: recompute position so the opposite edge stays put
        if (t.rotation !== 0) {
          const cx0 = start.x + start.width / 2
          const cy0 = start.y + start.height / 2
          const lx = (x + width / 2) - cx0
          const ly = (y + height / 2) - cy0
          const ncx = cx0 + lx * cos - ly * sin
          const ncy = cy0 + lx * sin + ly * cos
          x = ncx - width / 2
          y = ncy - height / 2
        }
        patch((p) => updateLayer(p, layer.id, { transform: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) } }))
      },
    })
  }

  const onRotate = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (locked) return
    const target = e.currentTarget as HTMLElement
    const box = target.parentElement!.getBoundingClientRect()
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
    const startRot = t.rotation
    startDrag(e, {
      onStart: () => snapshot(),
      onMove: (_dx, _dy, ev) => {
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx)
        let deg = startRot + ((angle - startAngle) * 180) / Math.PI
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15
        deg = ((deg + 180) % 360 + 360) % 360 - 180
        patch((p) => updateLayer(p, layer.id, { transform: { rotation: Math.round(deg * 10) / 10 } }))
      },
    })
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width: state.width,
        height: state.height,
        transform: `translate(${state.x + state.dx}px, ${state.y + state.dy}px) rotate(${state.rotation}deg) scale(${state.scale})`,
        transformOrigin: 'center center',
        outline: `${stroke}px ${ghost ? 'dashed' : 'solid'} #9a5bf5`,
        outlineOffset: 0,
      }}
    >
      {!locked && HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => onResize(h.id, e)}
          className="pointer-events-auto absolute rounded-[3px] border border-accent bg-white"
          style={{ width: hs, height: hs, left: h.x * state.width - hs / 2, top: h.y * state.height - hs / 2, cursor: h.cursor, borderWidth: stroke }}
        />
      ))}
      {!locked && (
        <>
          <div className="absolute left-1/2 bg-accent" style={{ width: stroke, height: 22 / scale, top: -22 / scale, transform: 'translateX(-50%)' }} />
          <div
            onPointerDown={onRotate}
            className="pointer-events-auto absolute left-1/2 rounded-full border border-accent bg-white"
            style={{ width: hs * 1.2, height: hs * 1.2, top: -22 / scale - hs * 0.6, transform: 'translateX(-50%)', cursor: 'grab', borderWidth: stroke }}
            title="Rotate (hold Shift to snap)"
          />
        </>
      )}
    </div>
  )
}
