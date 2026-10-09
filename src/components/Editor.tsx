import { useEffect, useState } from 'react'
import { useEditor } from '@/store/editorStore'
import { projectService } from '@/services/projects'
import { usePlayback } from '@/hooks/usePlayback'
import { flushSave, useAutosave } from '@/hooks/useAutosave'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Toolbar } from './toolbar/Toolbar'
import { Sidebar } from './sidebar/Sidebar'
import { Stage } from './canvas/Stage'
import { Timeline } from './timeline/Timeline'
import { ExportDialog } from './export/ExportDialog'
import { navigate } from '@/hooks/useHashRoute'
import { normalizeProject } from '@/engine/normalize'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { storageKey } from '@/utils/storage'

export function Editor({ projectId }: { projectId: string }) {
  const project = useEditor((s) => s.project)
  const loadProject = useEditor((s) => s.loadProject)
  const toast = useEditor((s) => s.toast)
  const [missing, setMissing] = useState(false)
  const [timelineHeight, setTimelineHeight] = useState(() => Number(localStorage.getItem(storageKey('timelineHeight'))) || 280)

  useEffect(() => {
    let cancelled = false
    void projectService.load(projectId).then((p) => {
      if (cancelled) return
      if (p) loadProject(normalizeProject(p))
      else setMissing(true)
    })
    return () => { cancelled = true; flushSave() }
  }, [projectId, loadProject])

  usePlayback()
  useAutosave()
  useKeyboardShortcuts()

  if (missing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-[13px] font-semibold">Project not found</p>
        <button className="btn" onClick={() => navigate({ page: 'projects' })}>Back to projects</button>
      </div>
    )
  }
  if (!project || project.id !== projectId) return <div className="flex h-full items-center justify-center text-[12px] text-ink-muted">Loading project…</div>

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = timelineHeight
    const onMove = (ev: PointerEvent) => setTimelineHeight(Math.max(170, Math.min(window.innerHeight * 0.7, startH + (startY - ev.clientY))))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setTimelineHeight((h) => { localStorage.setItem(storageKey('timelineHeight'), String(h)); return h })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <ErrorBoundary onReset={() => { const s = useEditor.getState(); s.pause(); s.clearSelection(); if (s.past.length) s.undo() }}>
    <div className="flex h-full flex-col gap-2.5 overflow-hidden p-2.5">
      <Toolbar />
      <div className="flex min-h-0 flex-1 gap-2.5">
        <Sidebar />
        <div className="flex min-w-0 flex-1 justify-center">
          <Stage />
        </div>
      </div>
      <div className="group relative -my-1.5 h-3 shrink-0 cursor-row-resize" onPointerDown={startResize} title="Drag to resize timeline">
        <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-line-strong/60 group-hover:bg-accent/60" />
      </div>
      <div style={{ height: timelineHeight }} className="shrink-0">
        <Timeline />
      </div>
      <ExportDialog />
      {toast && (
        <div key={toast.id} className={`slide-up pointer-events-none fixed bottom-6 left-1/2 z-50 rounded-lg px-4 py-2.5 text-[12px] font-semibold shadow-lg ${toast.kind === 'error' ? 'bg-danger text-white' : 'bg-ink text-panel'}`}>
          {toast.message}
        </div>
      )}
    </div>
    </ErrorBoundary>
  )
}
