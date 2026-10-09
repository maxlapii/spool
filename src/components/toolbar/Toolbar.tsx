import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Cloud, CloudOff, Crop, Download, Loader2, PanelLeft } from 'lucide-react'
import { useEditor } from '@/store/editorStore'
import { renameProject, setAspectRatio } from '@/engine/operations'
import { ASPECT_PRESETS, type AspectRatio } from '@/types'
import { navigate } from '@/hooks/useHashRoute'
import { ThemeToggle } from '../ui/ThemeToggle'
import { saveNow } from '@/hooks/useAutosave'

export function Toolbar() {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const sidebarOpen = useEditor((s) => s.sidebarOpen)
  const toggleSidebar = useEditor((s) => s.toggleSidebar)
  const saveStatus = useEditor((s) => s.saveStatus)
  const setExportOpen = useEditor((s) => s.setExportOpen)
  const setCanvasZoom = useEditor((s) => s.setCanvasZoom)
  const [title, setTitle] = useState(project.name)
  useEffect(() => setTitle(project.name), [project.name])

  const commitTitle = () => {
    const t = title.trim()
    if (t && t !== project.name) commit((p) => renameProject(p, t))
    else setTitle(project.name)
  }

  const save = { idle: ['Saved', Check], dirty: ['Unsaved', Cloud], saving: ['Saving…', Loader2], saved: ['Saved', Check], error: ['Save failed', CloudOff], offline: ['Saved locally', CloudOff] } as const
  const [saveLabel, SaveIcon] = save[saveStatus]

  return (
    <header className="card flex h-14 shrink-0 items-center gap-2 px-3">
      <button className="btn h-9 gap-1 pl-2 pr-3" onClick={() => navigate({ page: 'projects' })}><ChevronLeft size={14} /> Projects</button>
      <button className={`icon-btn ${sidebarOpen ? '' : 'active'}`} title={sidebarOpen ? 'Hide panel' : 'Show panel'} onClick={() => toggleSidebar()}><PanelLeft size={15} /></button>
      <input
        className="h-8 w-56 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-bold tracking-tight outline-none hover:bg-well focus:border-select focus:bg-panel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setTitle(project.name); (e.target as HTMLInputElement).blur() } }}
        aria-label="Project title"
      />
      <button className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium text-ink-faint hover:bg-well" onClick={() => void saveNow()} title="Save now (⌘S)">
        <SaveIcon size={12} className={saveStatus === 'saving' ? 'animate-spin' : ''} /> {saveLabel}
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <label className="flex h-9 items-center gap-1.5 rounded-lg bg-well pl-2.5 pr-1 text-ink-muted" title="Aspect ratio">
          <Crop size={14} />
          <select
            className="h-7 appearance-none rounded-md bg-panel px-2 font-mono text-[11px] font-semibold text-ink outline-none"
            value={project.composition.aspect}
            onChange={(e) => { commit((p) => setAspectRatio(p, e.target.value as AspectRatio)); setCanvasZoom('fit') }}
            aria-label="Aspect ratio"
          >
            {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <button className="btn-dark" onClick={() => setExportOpen(true)}><Download size={14} /> Export</button>
      </div>
    </header>
  )
}
