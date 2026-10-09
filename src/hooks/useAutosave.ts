import { useEffect, useRef } from 'react'
import { useEditor } from '@/store/editorStore'
import { projectService } from '@/services/projects'
import { storageKey } from '@/utils/storage'

const DEBOUNCE_MS = 1200

export async function saveNow(): Promise<void> {
  const { project, setSaveStatus } = useEditor.getState()
  if (!project) return
  setSaveStatus('saving')
  const ok = await projectService.save(project)
  setSaveStatus(ok ? 'saved' : 'offline', new Date().toISOString())
}

/** Save immediately if there are unsaved changes (used when leaving the editor). */
export function flushSave(): void {
  const { project, saveStatus } = useEditor.getState()
  if (project && saveStatus !== 'saved' && saveStatus !== 'idle') void projectService.save(project)
}

/** Debounced autosave whenever the project revision changes. */
export function useAutosave() {
  const revision = useEditor((s) => s.revision)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (revision === 0) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void saveNow() }, DEBOUNCE_MS)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [revision])


  useEffect(() => {
    const flush = () => {
      const { project, saveStatus } = useEditor.getState()
      if (!project || saveStatus === 'saved') return
      try { localStorage.setItem(storageKey('projects'), JSON.stringify({ ...JSON.parse(localStorage.getItem(storageKey('projects')) ?? '{}'), [project.id]: project })) } catch { /* ignore */ }
      void fetch(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project), keepalive: true }).catch(() => {})
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])
}
