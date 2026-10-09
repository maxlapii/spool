import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Project, ProjectSummary } from '../shared/types'
import { PROJECTS_DIR, TRASH_DIR, safeId } from './paths'

const router = Router()

function fileFor(id: string) {
  return path.join(PROJECTS_DIR, `${id}.json`)
}

async function readProject(id: string): Promise<Project | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(id), 'utf8')) as Project
  } catch {
    return null
  }
}

function summarize(p: Project): ProjectSummary {
  return {
    id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt,
    aspect: p.composition?.aspect ?? '16:9', duration: p.composition?.duration ?? 0, clipCount: p.clips?.length ?? 0,
  }
}

function isProject(body: unknown): body is Project {
  const p = body as Project
  return !!p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && !!p.composition && Array.isArray(p.clips) && Array.isArray(p.layers) && Array.isArray(p.tracks)
}

router.get('/', async (_req, res) => {
  const files = (await fs.readdir(PROJECTS_DIR)).filter((f) => f.endsWith('.json'))
  const projects: ProjectSummary[] = []
  for (const f of files) {
    const p = await readProject(f.replace(/\.json$/, ''))
    if (p) projects.push(summarize(p))
  }
  projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  res.json(projects)
})

router.get('/:id', async (req, res) => {
  const id = safeId(String(req.params.id))
  if (!id) return res.status(400).json({ error: 'Invalid project id' })
  const p = await readProject(id)
  if (!p) return res.status(404).json({ error: 'Project not found' })
  res.json(p)
})

router.put('/:id', async (req, res) => {
  const id = safeId(String(req.params.id))
  if (!id) return res.status(400).json({ error: 'Invalid project id' })
  if (!isProject(req.body) || req.body.id !== id) return res.status(400).json({ error: 'Invalid project payload' })
  const tmp = fileFor(id) + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(req.body))
  await fs.rename(tmp, fileFor(id))
  res.json({ ok: true, updatedAt: req.body.updatedAt })
})

/** Deleting moves the file to data/trash/<id>.<timestamp>.json so it can be recovered by hand. */
router.delete('/:id', async (req, res) => {
  const id = safeId(String(req.params.id))
  if (!id) return res.status(400).json({ error: 'Invalid project id' })
  try {
    await fs.mkdir(TRASH_DIR, { recursive: true })
    await fs.rename(fileFor(id), path.join(TRASH_DIR, `${id}.${Date.now()}.json`))
    console.log(`[projects] moved ${id} to trash`)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  res.status(204).end()
})

export default router
