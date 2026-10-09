import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(here, '..')
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data')
export const PROJECTS_DIR = path.join(DATA_DIR, 'projects')
export const ASSETS_DIR = path.join(DATA_DIR, 'assets')
export const EXPORTS_DIR = path.join(DATA_DIR, 'exports')
export const TRASH_DIR = path.join(DATA_DIR, 'trash')
export const DIST_DIR = path.join(ROOT, 'dist')

for (const dir of [DATA_DIR, PROJECTS_DIR, ASSETS_DIR, EXPORTS_DIR]) fs.mkdirSync(dir, { recursive: true })

// Bundled royalty-free sample music used by the templates (served from /assets like uploads).
export const SAMPLES_DIR = path.join(ROOT, 'server', 'samples')
if (fs.existsSync(SAMPLES_DIR)) {
  for (const f of fs.readdirSync(SAMPLES_DIR)) {
    if (!f.endsWith('.mp3')) continue
    const target = path.join(ASSETS_DIR, f)
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(SAMPLES_DIR, f), target)
  }
}

/** Only allow simple ids to be used in file paths. */
export function safeId(id: string): string | null {
  return /^[a-zA-Z0-9_-]{1,80}$/.test(id) ? id : null
}
