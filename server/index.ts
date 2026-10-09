import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import projects from './projects'
import assets from './assets'
import ai from './ai'
import exportRoutes from './export'
import { ASSETS_DIR, DIST_DIR } from './paths'
import { APP_NAME } from '../shared/brand'

const app = express()
const PORT = Number(process.env.API_PORT || 4100)

app.use(express.json({ limit: '25mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/projects', projects)
app.use('/api/assets', assets)
app.use('/api/ai', ai)
app.use('/api/export', exportRoutes)
app.use('/assets', express.static(ASSETS_DIR, { maxAge: '1h', acceptRanges: true }))

// Production: serve the built client
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api|\/assets).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal error'
  const status = (err as { status?: number })?.status ?? 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`${APP_NAME} API listening on http://localhost:${PORT}`)
  console.log('Claude assistant: via Claude Code sign-in (Claude Agent SDK)')
})
