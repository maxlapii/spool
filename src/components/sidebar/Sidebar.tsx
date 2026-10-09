import { Bot, Palette, Settings2, Sparkles } from 'lucide-react'
import { useEditor, type SidebarTab } from '@/store/editorStore'
import { StylePanel } from './StylePanel'
import { MotionPanel } from './MotionPanel'
import { ProjectPanel } from './ProjectPanel'
import { AssistantPanel } from '../assistant/AssistantPanel'

const TABS: { id: SidebarTab; label: string; icon: typeof Palette }[] = [
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'motion', label: 'Motion', icon: Sparkles },
  { id: 'project', label: 'Project', icon: Settings2 },
  { id: 'assistant', label: 'Claude', icon: Bot },
]

export function Sidebar() {
  const activeTab = useEditor((s) => s.activeTab)
  const open = useEditor((s) => s.sidebarOpen)
  const setActiveTab = useEditor((s) => s.setActiveTab)
  if (!open) return null

  return (
    <aside className="card flex w-[304px] shrink-0 flex-col overflow-hidden">
      <nav className="flex gap-1 border-b border-line p-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-colors ${active ? 'tab-active ' : ''}${active ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:bg-well hover:text-ink'}`}
            >
              <Icon size={13} /> {label}
            </button>
          )
        })}
      </nav>
      <div key={activeTab} className="fade-in flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'style' && <StylePanel />}
        {activeTab === 'motion' && <MotionPanel />}
        {activeTab === 'project' && <ProjectPanel />}
        {activeTab === 'assistant' && <AssistantPanel />}
      </div>
    </aside>
  )
}
