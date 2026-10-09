import type { Project, ProjectSummary } from '@/types'
import { api } from './api'
import { storageKey } from '@/utils/storage'

const LOCAL_KEY = storageKey('projects')

/**
 * Project persistence. The API server is the source of truth; when it is
 * unreachable we fall back to localStorage so nothing is lost offline.
 */
function readLocal(): Record<string, Project> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeLocal(all: Record<string, Project>) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch { /* quota */ }
}

export function summarize(p: Project): ProjectSummary {
  return {
    id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt,
    aspect: p.composition.aspect, duration: p.composition.duration, clipCount: p.clips.length,
  }
}

export const projectService = {
  async list(): Promise<{ projects: ProjectSummary[]; offline: boolean }> {
    try {
      const projects = await api<ProjectSummary[]>('/api/projects')
      return { projects, offline: false }
    } catch {
      return { projects: Object.values(readLocal()).map(summarize), offline: true }
    }
  },

  async load(id: string): Promise<Project | null> {
    try {
      return await api<Project>(`/api/projects/${id}`)
    } catch {
      return readLocal()[id] ?? null
    }
  },

  /** Save a project. Returns true if the server accepted it, false if saved locally only. */
  async save(project: Project): Promise<boolean> {
    const local = readLocal()
    local[project.id] = project
    writeLocal(local)
    try {
      await api(`/api/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(project) })
      return true
    } catch {
      return false
    }
  },

  async remove(id: string): Promise<void> {
    const local = readLocal()
    delete local[id]
    writeLocal(local)
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' })
    } catch { /* offline */ }
  },
}
