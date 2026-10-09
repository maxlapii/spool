import { create } from 'zustand'
import type { Project } from '@/types'
import { deleteClips, layerForClip } from '@/engine/operations'

export type SidebarTab = 'style' | 'motion' | 'project' | 'assistant'
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline'

const HISTORY_LIMIT = 100

export interface EditorState {
  project: Project | null
  past: Project[]
  future: Project[]
  /** Version counter bumped on every project change (used by autosave). */
  revision: number

  selectedClipIds: string[]
  editingTextLayerId: string | null
  playhead: number
  isPlaying: boolean

  activeTab: SidebarTab
  sidebarOpen: boolean
  /** Canvas zoom factor; when `canvasFit` is true the stage computes it. */
  canvasZoom: number
  canvasFit: boolean
  pxPerSecond: number
  snapping: boolean
  exportOpen: boolean
  saveStatus: SaveStatus
  lastSavedAt: string | null
  toast: { id: number; message: string; kind: 'info' | 'error' } | null

  loadProject: (project: Project | null) => void
  /** Apply an operation and push the previous state to history. */
  commit: (fn: (p: Project) => Project) => void
  /** Apply an operation without recording history (used mid-drag). */
  patch: (fn: (p: Project) => Project) => void
  /** Push the current state to history (call before a transient drag starts). */
  snapshot: () => void
  /** Restore to a given snapshot without pushing (used to cancel AI changes). */
  restore: (project: Project) => void
  undo: () => void
  redo: () => void

  select: (clipIds: string[], additive?: boolean) => void
  clearSelection: () => void
  setEditingText: (layerId: string | null) => void
  deleteSelection: () => void

  setPlayhead: (t: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void

  setActiveTab: (tab: SidebarTab) => void
  toggleSidebar: (open?: boolean) => void
  setCanvasZoom: (zoom: number | 'fit') => void
  setPxPerSecond: (v: number) => void
  setSnapping: (v: boolean) => void
  setExportOpen: (v: boolean) => void
  setSaveStatus: (s: SaveStatus, at?: string) => void
  showToast: (message: string, kind?: 'info' | 'error') => void
}

export const useEditor = create<EditorState>((set, get) => ({
  project: null,
  past: [],
  future: [],
  revision: 0,
  selectedClipIds: [],
  editingTextLayerId: null,
  playhead: 0,
  isPlaying: false,
  activeTab: 'style',
  sidebarOpen: true,
  canvasZoom: 1,
  canvasFit: true,
  pxPerSecond: 60,
  snapping: true,
  exportOpen: false,
  saveStatus: 'idle',
  lastSavedAt: null,
  toast: null,

  loadProject: (project) =>
    set({
      project, past: [], future: [], revision: 0, selectedClipIds: [], editingTextLayerId: null, isPlaying: false,
      // Open a little way in so entrance animations have played and the canvas isn't blank.
      playhead: project && project.clips.length > 0 ? Math.min(1.5, project.composition.duration / 2) : 0,
      saveStatus: project ? 'saved' : 'idle',
    }),

  commit: (fn) => {
    const { project, past } = get()
    if (!project) return
    const next = fn(project)
    if (next === project) return
    set({ project: next, past: [...past.slice(-HISTORY_LIMIT + 1), project], future: [], revision: get().revision + 1, saveStatus: 'dirty' })
  },

  patch: (fn) => {
    const { project } = get()
    if (!project) return
    const next = fn(project)
    if (next === project) return
    set({ project: next, revision: get().revision + 1, saveStatus: 'dirty' })
  },

  snapshot: () => {
    const { project, past } = get()
    if (!project) return
    set({ past: [...past.slice(-HISTORY_LIMIT + 1), project], future: [] })
  },

  restore: (project) => set({ project, revision: get().revision + 1, saveStatus: 'dirty' }),

  undo: () => {
    const { project, past, future } = get()
    if (!project || past.length === 0) return
    const prev = past[past.length - 1]
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future], revision: get().revision + 1, saveStatus: 'dirty', editingTextLayerId: null })
    pruneSelection(set, get)
  },

  redo: () => {
    const { project, past, future } = get()
    if (!project || future.length === 0) return
    const next = future[0]
    set({ project: next, past: [...past, project], future: future.slice(1), revision: get().revision + 1, saveStatus: 'dirty', editingTextLayerId: null })
    pruneSelection(set, get)
  },

  select: (clipIds, additive = false) => {
    const current = get().selectedClipIds
    if (additive) {
      const next = new Set(current)
      for (const id of clipIds) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      set({ selectedClipIds: [...next], editingTextLayerId: null })
    } else {
      if (current.length === clipIds.length && current.every((id, i) => id === clipIds[i])) return
      set({ selectedClipIds: clipIds, editingTextLayerId: null })
    }
  },
  clearSelection: () => set({ selectedClipIds: [], editingTextLayerId: null }),
  setEditingText: (layerId) => set({ editingTextLayerId: layerId }),

  deleteSelection: () => {
    const { selectedClipIds, project } = get()
    if (!project || selectedClipIds.length === 0) return
    const deletable = selectedClipIds.filter((id) => {
      const layer = layerForClip(project, id)
      const clip = project.clips.find((c) => c.id === id)
      const track = project.tracks.find((t) => t.id === clip?.trackId)
      return !(layer?.locked || track?.locked)
    })
    get().commit((p) => deleteClips(p, deletable))
    set({ selectedClipIds: [], editingTextLayerId: null })
  },

  setPlayhead: (t) => {
    const project = get().project
    const max = project ? project.composition.duration : Infinity
    set({ playhead: Math.max(0, Math.min(max, t)) })
  },
  play: () => {
    const { project, playhead } = get()
    if (!project) return
    if (playhead >= project.composition.duration - 1e-3) set({ playhead: 0 })
    set({ isPlaying: true, editingTextLayerId: null })
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => (get().isPlaying ? get().pause() : get().play()),

  setActiveTab: (tab) => set({ activeTab: tab, sidebarOpen: true }),
  toggleSidebar: (open) => set({ sidebarOpen: open ?? !get().sidebarOpen }),
  setCanvasZoom: (zoom) => (zoom === 'fit' ? set({ canvasFit: true }) : set({ canvasFit: false, canvasZoom: Math.max(0.05, Math.min(4, zoom)) })),
  setPxPerSecond: (v) => set({ pxPerSecond: Math.max(2, Math.min(600, v)) }),
  setSnapping: (v) => set({ snapping: v }),
  setExportOpen: (v) => set({ exportOpen: v }),
  setSaveStatus: (s, at) => set({ saveStatus: s, ...(at ? { lastSavedAt: at } : {}) }),
  showToast: (message, kind = 'info') => {
    const id = Date.now()
    set({ toast: { id, message, kind } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 3500)
  },
}))

function pruneSelection(set: (s: Partial<EditorState>) => void, get: () => EditorState) {
  const { project, selectedClipIds } = get()
  if (!project) return
  const valid = selectedClipIds.filter((id) => project.clips.some((c) => c.id === id))
  if (valid.length !== selectedClipIds.length) set({ selectedClipIds: valid })
}

// ---------- selectors ----------

export const useProject = () => useEditor((s) => s.project)

export function useSelectedClip() {
  return useEditor((s) => {
    const id = s.selectedClipIds[0]
    return id && s.project ? s.project.clips.find((c) => c.id === id) ?? null : null
  })
}

export function useSelectedLayer() {
  return useEditor((s) => {
    const id = s.selectedClipIds[0]
    if (!id || !s.project) return null
    const clip = s.project.clips.find((c) => c.id === id)
    return clip?.layerId ? s.project.layers.find((l) => l.id === clip.layerId) ?? null : null
  })
}
