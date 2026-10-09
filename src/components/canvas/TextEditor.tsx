import { useEffect, useRef } from 'react'
import type { Layer } from '@/types'
import type { RenderState } from '@/engine/animation'
import { useEditor } from '@/store/editorStore'
import { updateLayer } from '@/engine/operations'

/** Inline text editor overlaid on a text layer. */
export function TextEditor({ layer, state }: { layer: Extract<Layer, { type: 'text' }>; state: RenderState }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const commit = useEditor((s) => s.commit)
  const setEditingText = useEditor((s) => s.setEditingText)
  const t = layer.text
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  const finish = () => {
    const value = ref.current?.value ?? t.content
    if (value !== t.content) commit((p) => updateLayer(p, layer.id, { text: { content: value } }))
    setEditingText(null)
  }

  return (
    <textarea
      ref={ref}
      defaultValue={t.content}
      onBlur={finish}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') { e.preventDefault(); setEditingText(null) }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); finish() }
      }}
      className="absolute left-0 top-0 resize-none overflow-hidden outline-none"
      style={{
        width: state.width,
        height: state.height,
        transform: `translate(${state.x + state.dx}px, ${state.y + state.dy}px) rotate(${state.rotation}deg)`,
        transformOrigin: 'center center',
        fontFamily: `"${t.fontFamily}", sans-serif`,
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        fontStyle: t.italic ? 'italic' : 'normal',
        color: t.color,
        textAlign: t.align,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
        backgroundColor: t.backgroundColor ?? 'rgba(255,255,255,0.6)',
        padding: t.padding,
        borderRadius: t.borderRadius,
        border: 'none',
        boxShadow: '0 0 0 2px #9a5bf5',
      }}
    />
  )
}
