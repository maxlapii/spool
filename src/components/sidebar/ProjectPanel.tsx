import { Copy, Keyboard, Trash2 } from 'lucide-react'
import { ASPECT_PRESETS, MAX_COMPOSITION_DURATION, type AspectRatio } from '@/types'
import { useEditor } from '@/store/editorStore'
import { deleteMarker, renameProject, setAspectRatio, updateComposition, updateMarker } from '@/engine/operations'
import { projectService } from '@/services/projects'
import { navigate } from '@/hooks/useHashRoute'
import { uid } from '@/utils/id'
import { APP_NAME } from '@shared/brand'
import { ColorInput, Field, NumberInput, Section, SelectInput } from '../ui/fields'
import { MediaLibrary, MusicLibrary } from './MediaPanel'
import { SpeedPanel } from './SpeedPanel'

const SHORTCUTS: [string, string][] = [
  ['/', 'Ask Claude'], ['Space', 'Play / pause'], ['⌫', 'Delete selection'], ['⌘Z / ⇧⌘Z', 'Undo / redo'], ['⌘S', 'Save'], ['⌘D', 'Duplicate clip'],
  ['S', 'Split at playhead'], ['← →', 'Step a frame / nudge'], ['⇧ + drag', 'Constrain / multi-select'], ['⌥ + drag', 'Disable snapping'], ['⌘ + scroll', 'Zoom canvas'],
]

export function ProjectPanel() {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const patch = useEditor((s) => s.patch)
  const snapshot = useEditor((s) => s.snapshot)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const showToast = useEditor((s) => s.showToast)
  const setCanvasZoom = useEditor((s) => s.setCanvasZoom)
  const c = project.composition

  const duplicate = async () => {
    const now = new Date().toISOString()
    const copy = { ...project, id: uid('proj'), name: `${project.name} copy`, createdAt: now, updatedAt: now }
    await projectService.save(copy)
    showToast('Project duplicated')
    navigate({ page: 'editor', projectId: copy.id })
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-thin">
      <div className="border-b border-line px-3 py-3">
        <input className="w-full rounded-md border border-transparent bg-transparent text-[17px] font-bold tracking-tight outline-none hover:bg-well focus:border-select focus:bg-panel" value={project.name} onChange={(e) => patch((p) => renameProject(p, e.target.value || 'Untitled'))} onFocus={snapshot} aria-label="Project name" />
        <p className="mt-0.5 text-[11px] text-ink-muted">{ASPECT_PRESETS[c.aspect].label} · {c.width}×{c.height} · {c.duration}s · {c.fps} fps</p>
      </div>
      <Section title="Composition">
        <Field label="Aspect" inline>
          <SelectInput compact value={c.aspect} options={(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => ({ value: a, label: ASPECT_PRESETS[a].label }))} onChange={(v) => { commit((p) => setAspectRatio(p, v)); setCanvasZoom('fit') }} />
        </Field>
        <Field label="Duration" inline><NumberInput compact value={c.duration} min={1} max={MAX_COMPOSITION_DURATION} step={0.5} onChange={(v) => commit((p) => updateComposition(p, { duration: v }))} suffix="s" /></Field>
        <Field label="Frame rate" inline><SelectInput compact value={c.fps} options={[24, 25, 30, 50, 60].map((f) => ({ value: f, label: `${f} fps` }))} onChange={(v) => commit((p) => updateComposition(p, { fps: v }))} /></Field>
        <Field label="Background" inline><ColorInput value={c.backgroundColor} onDragStart={snapshot} onChange={(v) => v && patch((p) => updateComposition(p, { backgroundColor: v }))} /></Field>
        <p className="text-[10.5px] text-ink-faint">Compositions can be up to 5 minutes (300s) long.</p>
        <button className="btn w-full" onClick={duplicate}><Copy size={12} /> Duplicate project</button>
      </Section>
      <SpeedPanel />
      <Section title="Media">
        <MediaLibrary />
      </Section>
      <Section title="Music library">
        <p className="text-[10.5px] leading-relaxed text-ink-faint">Royalty-free tracks composed for {APP_NAME}. Preview, choose where to start (e.g. the chorus) and add to the timeline.</p>
        <MusicLibrary />
      </Section>

      <Section title="Sections">
        {project.markers.length === 0 && <p className="text-[11px] text-ink-faint">Add section markers from the timeline toolbar.</p>}
        <ul className="space-y-1">
          {[...project.markers].sort((a, b) => a.time - b.time).map((m) => (
            <li key={m.id} className="grid grid-cols-[26px_1fr_64px_24px] items-center gap-1 rounded-lg bg-well p-1">
              <input type="color" value={m.color} onChange={(e) => commit((p) => updateMarker(p, m.id, { color: e.target.value }))} aria-label="Marker color" />
              <input className="field h-7 bg-transparent hover:bg-panel" value={m.label} onChange={(e) => patch((p) => updateMarker(p, m.id, { label: e.target.value }))} onFocus={snapshot} onDoubleClick={() => setPlayhead(m.time)} title="Double-click to seek" />
              <NumberInput compact value={m.time} min={0} step={0.1} onChange={(v) => commit((p) => updateMarker(p, m.id, { time: v }))} suffix="s" />
              <button className="icon-btn h-6 w-6 hover:text-danger" onClick={() => commit((p) => deleteMarker(p, m.id))} title="Delete"><Trash2 size={11} /></button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Shortcuts" right={<Keyboard size={12} className="text-ink-faint" />}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-ink-muted">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  )
}
