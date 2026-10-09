import { useEffect } from 'react'
import { useEditor } from '@/store/editorStore'
import { duplicateClip, layerForClip, splitClip, updateLayer } from '@/engine/operations'
import { saveNow } from './useAutosave'
import { useAssistant } from '@/store/assistantStore'

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const s = useEditor.getState()
      if (!s.project) return
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); return }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void saveNow(); return }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const id = s.selectedClipIds[0]
        if (id) {
          let newId = ''
          s.commit((p) => { const r = duplicateClip(p, id); newId = r.clipId; return r.project })
          if (newId) s.select([newId])
        }
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        s.select(s.project.clips.map((c) => c.id))
        return
      }
      if (mod) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          s.setActiveTab('assistant')
          useAssistant.getState().requestFocus()
          return
        case ' ':
          e.preventDefault()
          s.togglePlay()
          return
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          s.deleteSelection()
          return
        case 'Escape':
          s.clearSelection()
          s.pause()
          return
        case 'Home':
          s.setPlayhead(0)
          return
        case 'End':
          s.setPlayhead(s.project.composition.duration)
          return
        case 's':
        case 'S': {
          const id = s.selectedClipIds[0]
          if (!id) return
          try {
            s.commit((p) => splitClip(p, id, s.playhead).project)
          } catch { /* outside clip */ }
          return
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          const ids = s.selectedClipIds
          if (ids.length === 0) {
            // Step the playhead by one frame
            e.preventDefault()
            const frame = 1 / s.project.composition.fps
            if (e.key === 'ArrowLeft') s.setPlayhead(s.playhead - (e.shiftKey ? 1 : frame))
            if (e.key === 'ArrowRight') s.setPlayhead(s.playhead + (e.shiftKey ? 1 : frame))
            return
          }
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          s.commit((p) =>
            ids.reduce((acc, id) => {
              const layer = layerForClip(acc, id)
              if (!layer || layer.locked) return acc
              return updateLayer(acc, layer.id, { transform: { x: layer.transform.x + dx, y: layer.transform.y + dy } })
            }, p),
          )
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
