import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Clapperboard, Copy, LayoutGrid, LayoutTemplate, List, Plus, Search, Trash2, WifiOff } from 'lucide-react'
import type { AspectRatio, ProjectSummary } from '@/types'
import { ASPECT_PRESETS } from '@/types'
import { projectService } from '@/services/projects'
import { createEmptyProject } from '@/engine/project'
import { TEMPLATES, filterCounts, filterTemplates, type TemplateDef, type TemplateFilter } from '@/engine/templates'
import { navigate } from '@/hooks/useHashRoute'
import { uid } from '@/utils/id'
import { storageKey } from '@/utils/storage'
import { Segmented } from '../ui/fields'
import { TemplateCarousel } from './TemplateCarousel'
import { TemplateFilters } from './TemplateFilters'
import { Wordmark } from '../ui/Wordmark'
import { ThemeToggle } from '../ui/ThemeToggle'
import { ProjectPreview } from './ProjectPreview'

type View = 'list' | 'cards'
type Sort = 'recent' | 'name'

function useStoredView(key: string): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => (localStorage.getItem(key) === 'cards' ? 'cards' : 'list'))
  return [view, (v) => { setView(v); localStorage.setItem(key, v) }]
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: 'list', label: <span className="flex items-center gap-1"><List size={13} /> List</span>, title: 'List view' },
        { value: 'cards', label: <span className="flex items-center gap-1"><LayoutGrid size={13} /> Cards</span>, title: 'Card view' },
      ]}
      className="shrink-0"
    />
  )
}

function SectionHeader({ icon, title, count, subtitle, children }: { icon: React.ReactNode; title: string; count: number; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">{icon}</span>
        <h2 className="flex items-center gap-2 text-[14px] font-bold tracking-tight">
          {title}
          <span className="rounded-md bg-well px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-muted">{count}</span>
        </h2>
        <p className="hidden text-[11.5px] text-ink-muted lg:block">· {subtitle}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} d ago`
  return new Date(iso).toLocaleDateString()
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [aspect, setAspect] = useState<AspectRatio>('16:9')
  const [creating, setCreating] = useState(false)
  const [projectView, setProjectView] = useStoredView(storageKey('projectView'))
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [tplQuery, setTplQuery] = useState('')
  const [tplFilter, setTplFilter] = useState<TemplateFilter>('all')

  const refresh = async () => {
    const r = await projectService.list()
    setProjects(r.projects)
    setOffline(r.offline)
  }
  useEffect(() => { void refresh() }, [])

  const createNew = async () => {
    setCreating(true)
    const project = createEmptyProject('Untitled project', aspect)
    await projectService.save(project)
    navigate({ page: 'editor', projectId: project.id })
  }
  const useTemplate = async (t: TemplateDef) => {
    setCreating(true)
    const project = t.build()
    await projectService.save(project)
    navigate({ page: 'editor', projectId: project.id })
  }
  const duplicate = async (id: string) => {
    const p = await projectService.load(id)
    if (!p) return
    const now = new Date().toISOString()
    await projectService.save({ ...p, id: uid('proj'), name: `${p.name} copy`, createdAt: now, updatedAt: now })
    await refresh()
  }
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await projectService.remove(id)
    await refresh()
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (projects ?? []).filter((p) => !q || p.name.toLowerCase().includes(q))
    return list.sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)))
  }, [projects, query, sort])

  const tplCounts = useMemo(() => filterCounts(TEMPLATES), [])
  const shownTemplates = useMemo(() => filterTemplates(TEMPLATES, tplQuery, tplFilter), [tplQuery, tplFilter])

  const open = (id: string) => navigate({ page: 'editor', projectId: id })

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col p-2.5">
      <header className="card sticky top-2.5 z-30 flex h-14 shrink-0 items-center gap-3 px-4">
        <Wordmark size={34} className="ml-1" />
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          {offline && (
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-notice px-2.5 py-1.5 text-[11px] font-semibold text-notice-ink md:flex" title="Projects are stored in this browser until the API server is running">
              <WifiOff size={12} /> API offline
            </span>
          )}
          <label className="flex h-9 items-center gap-1.5 rounded-lg bg-well pl-3 pr-1 text-[11px] font-semibold text-ink-muted" title="Aspect ratio for a new blank project">
            <span className="hidden whitespace-nowrap md:inline">Blank</span>
            <select className="h-7 appearance-none rounded-md bg-panel px-2 font-mono text-[11px] font-semibold text-ink outline-none" value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)} aria-label="Aspect ratio for a new project">
              {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <button className="btn-primary" onClick={createNew} disabled={creating}><Plus size={14} /> New project</button>
        </div>
      </header>

      <main className="w-full flex-1 px-1 py-5 sm:px-2">
        <section className="mb-6">
          <SectionHeader icon={<LayoutTemplate size={15} />} title="Templates" count={shownTemplates.length === TEMPLATES.length ? TEMPLATES.length : shownTemplates.length} subtitle="Travel films cut to music. Every element stays editable; drop your own clips onto the placeholders.">
            <span className="hidden text-[11px] text-ink-faint md:inline">Drag or swipe to browse · hover to pause</span>
          </SectionHeader>
          <TemplateFilters query={tplQuery} onQuery={setTplQuery} filter={tplFilter} onFilter={setTplFilter} counts={tplCounts} />
          {shownTemplates.length === 0 ? (
            <div className="card mt-3 border border-dashed border-line-strong p-8 text-center">
              <LayoutTemplate size={28} className="mx-auto mb-3 text-ink-faint" />
              <p className="text-[13px] font-semibold">No templates match</p>
              <p className="mt-1 text-[12px] text-ink-muted">Try another word or category.</p>
              <button className="btn mx-auto mt-3 h-8 text-[11px]" onClick={() => { setTplQuery(''); setTplFilter('all') }}>Show all templates</button>
            </div>
          ) : (
            <TemplateCarousel templates={shownTemplates} onUse={useTemplate} busy={creating} />
          )}
        </section>

        <section>
          <SectionHeader icon={<Clapperboard size={15} />} title="Your projects" count={projects?.length ?? 0} subtitle={offline ? 'Stored in this browser while the API server is offline.' : 'Saved locally on this machine and autosaved while you edit.'}>
            <label className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input className="field h-8 w-44 bg-panel pl-7" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button className="btn h-9" onClick={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))} title="Change sort order"><ArrowUpDown size={13} /> {sort === 'recent' ? 'Recent' : 'Name'}</button>
            <ViewToggle value={projectView} onChange={setProjectView} />
          </SectionHeader>

          {projects === null ? (
            <p className="text-[12px] text-ink-muted">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="card border border-dashed border-line-strong p-8 text-center">
              <Clapperboard size={28} className="mx-auto mb-3 text-ink-faint" />
              <p className="text-[13px] font-semibold">{projects.length === 0 ? 'No projects yet' : 'No projects match your search'}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{projects.length === 0 ? 'Pick a template above or create a blank project.' : 'Try a different name.'}</p>
            </div>
          ) : projectView === 'cards' ? (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((p) => (
                <li key={p.id} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                  <button className="stage-grid flex h-32 items-center justify-center border-b border-line p-2" onClick={() => open(p.id)}>
                    <ProjectPreview projectId={p.id} updatedAt={p.updatedAt} aspect={p.aspect} size={360} />
                  </button>
                  <div className="flex flex-1 flex-col p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <button className="truncate text-left text-[12.5px] font-bold hover:underline" onClick={() => open(p.id)}>{p.name}</button>
                      <span className="chip h-5 shrink-0">{p.aspect} · {p.duration}s</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{p.clipCount} clips · edited {relative(p.updatedAt)}</p>
                    <div className="mt-2 flex gap-1.5">
                      <button className="btn h-8 flex-1 text-[11px]" onClick={() => open(p.id)}>Open</button>
                      <button className="icon-btn h-8 w-8 rounded-lg bg-well" title="Duplicate" onClick={() => duplicate(p.id)}><Copy size={13} /></button>
                      <button className="icon-btn h-8 w-8 rounded-lg bg-well hover:text-danger" title="Delete" onClick={() => remove(p.id, p.name)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="card overflow-hidden">
              <li className="hidden grid-cols-[112px_minmax(0,1fr)_120px_80px_70px_110px_150px] items-center gap-3 border-b border-line px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted md:grid">
                <span>Preview</span><span>Name</span><span>Format</span><span>Length</span><span>Clips</span><span>Edited</span><span className="text-right">Actions</span>
              </li>
              {visible.map((p) => (
                <li key={p.id} className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 border-b border-line px-2.5 py-2 last:border-b-0 transition-colors hover:bg-well/60 md:grid-cols-[112px_minmax(0,1fr)_120px_80px_70px_110px_150px]">
                  <button className="stage-grid flex h-[60px] w-[96px] items-center justify-center rounded-md border border-line p-1" onClick={() => open(p.id)} title={`Open “${p.name}”`}>
                    <ProjectPreview projectId={p.id} updatedAt={p.updatedAt} aspect={p.aspect} size={192} />
                  </button>
                  <div className="min-w-0">
                    <button className="block max-w-full truncate text-left text-[12.5px] font-bold hover:underline" onClick={() => open(p.id)}>{p.name}</button>
                    <p className="text-[11px] text-ink-muted md:hidden">{p.aspect} · {p.duration}s · {p.clipCount} clips · {relative(p.updatedAt)}</p>
                  </div>
                  <span className="hidden text-[12px] text-ink-muted md:block">{ASPECT_PRESETS[p.aspect]?.label ?? p.aspect}</span>
                  <span className="hidden font-mono text-[12px] text-ink-muted md:block">{p.duration}s</span>
                  <span className="hidden font-mono text-[12px] text-ink-muted md:block">{p.clipCount}</span>
                  <span className="hidden text-[12px] text-ink-muted md:block" title={new Date(p.updatedAt).toLocaleString()}>{relative(p.updatedAt)}</span>
                  <div className="col-span-2 flex items-center justify-end gap-1.5 md:col-span-1">
                    <button className="btn h-8 px-3 text-[11px]" onClick={() => open(p.id)}>Open</button>
                    <button className="icon-btn h-8 w-8 rounded-lg bg-well" title="Duplicate" onClick={() => duplicate(p.id)}><Copy size={13} /></button>
                    <button className="icon-btn h-8 w-8 rounded-lg bg-well hover:text-danger" title="Delete" onClick={() => remove(p.id, p.name)}><Trash2 size={13} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
