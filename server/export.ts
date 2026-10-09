import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { ASSETS_DIR, EXPORTS_DIR, safeId } from './paths'
import { APP_SLUG } from '../shared/brand'
import { cleanSegments, needsWarp, warpAudioFilters, warpedDuration, type SpeedSeg } from './audioSpeed'

const router = Router()
/** Longest export once speed changes are applied (the edited timeline itself is limited to 5 minutes). */
const MAX_OUTPUT_SECONDS = 1200

/** Resolve the ffmpeg binary: env override, else the ffmpeg-static package. */
async function resolveFfmpeg(): Promise<string | null> {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH
  try {
    const mod = await import('ffmpeg-static')
    const p = (mod.default ?? mod) as unknown as string | null
    if (p && fs.existsSync(p)) return p
  } catch { /* not installed */ }
  return null
}

export interface ExportAudioInput {
  /** Asset url like /assets/asset_abc.mp3 */
  url: string
  start: number
  trimIn: number
  duration: number
  volume: number
  fadeIn: number
  fadeOut: number
}

interface JobSpec {
  width: number
  height: number
  fps: number
  format: 'mp4' | 'webm'
  quality: 'high' | 'medium' | 'low'
  frameCount: number
  /** Length of the exported video in seconds (after speed changes). */
  duration: number
  /** Length of the timeline that was edited, before speed changes. */
  sourceDuration: number
  /** Constant-speed stretches of the source timeline, in order. Empty when nothing is sped up or slowed down. */
  speed: SpeedSeg[]
  audio: ExportAudioInput[]
}

interface Job {
  id: string
  spec: JobSpec
  dir: string
  status: 'collecting' | 'encoding' | 'done' | 'error' | 'cancelled'
  received: number
  progress: number
  error?: string
  outputPath?: string
  proc?: ChildProcess
  createdAt: number
}

const jobs = new Map<string, Job>()

function cleanupJob(job: Job) {
  fsp.rm(job.dir, { recursive: true, force: true }).catch(() => {})
  jobs.delete(job.id)
}

// Expire finished jobs after 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const job of jobs.values()) if (now - job.createdAt > 30 * 60 * 1000) cleanupJob(job)
}, 60_000).unref()

router.get('/status', async (_req, res) => {
  const ffmpeg = await resolveFfmpeg()
  res.json({ ffmpeg: !!ffmpeg, path: ffmpeg ? path.basename(ffmpeg) : null })
})

router.post('/jobs', async (req, res) => {
  const ffmpeg = await resolveFfmpeg()
  if (!ffmpeg) return res.status(503).json({ error: 'FFmpeg is not available. Install ffmpeg-static (npm install) or set FFMPEG_PATH.' })
  const s = req.body as Partial<JobSpec>
  const width = Number(s.width), height = Number(s.height), fps = Number(s.fps), frameCount = Number(s.frameCount), duration = Number(s.duration)
  if (![width, height, fps, frameCount, duration].every((n) => Number.isFinite(n) && n > 0)) return res.status(400).json({ error: 'Invalid export spec' })
  if (width > 7680 || height > 7680 || frameCount > MAX_OUTPUT_SECONDS * 60 || duration > MAX_OUTPUT_SECONDS) return res.status(400).json({ error: `Export is too large (maximum ${MAX_OUTPUT_SECONDS / 60} minutes after speed changes)` })
  const sourceDuration = Number(s.sourceDuration) > 0 ? Math.min(300, Number(s.sourceDuration)) : duration
  const speed = cleanSegments(s.speed)
  const format = s.format === 'webm' ? 'webm' : 'mp4'
  const quality = s.quality === 'low' || s.quality === 'medium' ? s.quality : 'high'
  const audio: ExportAudioInput[] = Array.isArray(s.audio)
    ? s.audio.filter((a) => a && typeof a.url === 'string' && a.url.startsWith('/assets/') && safeId(path.basename(a.url).split('.')[0]))
    : []
  const id = `exp_${crypto.randomBytes(6).toString('hex')}`
  const dir = path.join(EXPORTS_DIR, id)
  await fsp.mkdir(path.join(dir, 'frames'), { recursive: true })
  const job: Job = {
    id, dir, status: 'collecting', received: 0, progress: 0, createdAt: Date.now(),
    spec: { width: Math.round(width / 2) * 2, height: Math.round(height / 2) * 2, fps, format, quality, frameCount, duration, sourceDuration, speed, audio },
  }
  jobs.set(id, job)
  res.status(201).json({ jobId: id })
})

const frameUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 120 } })

router.post('/jobs/:id/frames', frameUpload.array('frames', 120), async (req, res) => {
  const job = jobs.get(String(req.params.id))
  if (!job) return res.status(404).json({ error: 'Unknown export job' })
  if (job.status !== 'collecting') return res.status(409).json({ error: `Job is ${job.status}` })
  const files = (req.files as Express.Multer.File[]) ?? []
  for (const f of files) {
    const index = Number(path.parse(f.originalname).name)
    if (!Number.isInteger(index) || index < 0 || index >= job.spec.frameCount) continue
    await fsp.writeFile(path.join(job.dir, 'frames', `${String(index).padStart(6, '0')}.jpg`), f.buffer)
    job.received++
  }
  res.json({ received: job.received })
})

/** Duration check used by tests and logs. */
export const exportedLength = (segs: SpeedSeg[]) => warpedDuration(segs)

function buildArgs(ffmpeg: string, job: Job): string[] {
  const { spec } = job
  const args = ['-y', '-framerate', String(spec.fps), '-i', path.join(job.dir, 'frames', '%06d.jpg')]
  const filters: string[] = []
  spec.audio.forEach((a, i) => {
    const file = path.join(ASSETS_DIR, path.basename(a.url))
    args.push('-i', file)
    const inIdx = i + 1
    const chain = [
      `atrim=start=${a.trimIn.toFixed(3)}:duration=${a.duration.toFixed(3)}`,
      'asetpts=PTS-STARTPTS',
      `volume=${a.volume.toFixed(3)}`,
    ]
    if (a.fadeIn > 0) chain.push(`afade=t=in:st=0:d=${a.fadeIn.toFixed(3)}`)
    if (a.fadeOut > 0) chain.push(`afade=t=out:st=${Math.max(0, a.duration - a.fadeOut).toFixed(3)}:d=${a.fadeOut.toFixed(3)}`)
    const delay = Math.round(a.start * 1000)
    chain.push(`adelay=${delay}|${delay}`)
    filters.push(`[${inIdx}:a]${chain.join(',')}[a${i}]`)
  })
  if (spec.audio.length > 0) {
    const inputs = spec.audio.map((_, i) => `[a${i}]`).join('')
    if (needsWarp(spec.speed)) {
      // Mix on the source timeline (so fades and delays stay where they were set), pad to its full length, then retime each section.
      filters.push(`${inputs}amix=inputs=${spec.audio.length}:normalize=0:duration=longest,apad=whole_dur=${spec.sourceDuration.toFixed(3)}[mix]`)
      filters.push(...warpAudioFilters(spec.speed, 'mix', 'warped'))
      filters.push('[warped]apad[aout]')
    } else {
      filters.push(`${inputs}amix=inputs=${spec.audio.length}:normalize=0:duration=longest,apad[aout]`)
    }
    args.push('-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[aout]')
  } else {
    args.push('-map', '0:v')
  }
  if (spec.format === 'mp4') {
    const crf = spec.quality === 'high' ? 18 : spec.quality === 'medium' ? 23 : 28
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
    if (spec.audio.length > 0) args.push('-c:a', 'aac', '-b:a', '192k')
  } else {
    const crf = spec.quality === 'high' ? 24 : spec.quality === 'medium' ? 31 : 37
    args.push('-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-row-mt', '1', '-pix_fmt', 'yuv420p')
    if (spec.audio.length > 0) args.push('-c:a', 'libopus', '-b:a', '128k')
  }
  args.push('-t', spec.duration.toFixed(3), '-r', String(spec.fps))
  job.outputPath = path.join(job.dir, `output.${spec.format}`)
  args.push(job.outputPath)
  void ffmpeg
  return args
}

router.post('/jobs/:id/finish', async (req, res) => {
  const job = jobs.get(String(req.params.id))
  if (!job) return res.status(404).json({ error: 'Unknown export job' })
  if (job.status !== 'collecting') return res.status(409).json({ error: `Job is ${job.status}` })
  if (job.received < job.spec.frameCount) return res.status(400).json({ error: `Only ${job.received} of ${job.spec.frameCount} frames were received` })
  const ffmpeg = await resolveFfmpeg()
  if (!ffmpeg) return res.status(503).json({ error: 'FFmpeg is not available' })

  job.status = 'encoding'
  job.progress = 0
  const args = buildArgs(ffmpeg, job)
  const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  job.proc = proc
  let stderr = ''
  proc.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    stderr = (stderr + text).slice(-4000)
    const m = /frame=\s*(\d+)/g
    let last: RegExpExecArray | null = null
    let r: RegExpExecArray | null
    while ((r = m.exec(text))) last = r
    if (last) job.progress = Math.min(0.99, Number(last[1]) / job.spec.frameCount)
  })
  proc.on('error', (err) => {
    job.status = 'error'
    job.error = `Could not start ffmpeg: ${err.message}`
  })
  proc.on('close', (code) => {
    job.proc = undefined
    if (job.status === 'cancelled') return
    if (code === 0 && job.outputPath && fs.existsSync(job.outputPath)) {
      job.status = 'done'
      job.progress = 1
      fsp.rm(path.join(job.dir, 'frames'), { recursive: true, force: true }).catch(() => {})
    } else {
      job.status = 'error'
      job.error = `ffmpeg exited with code ${code}. ${stderr.split('\n').filter(Boolean).slice(-3).join(' ')}`
    }
  })
  res.json({ status: job.status })
})

router.get('/jobs/:id', (req, res) => {
  const job = jobs.get(String(req.params.id))
  if (!job) return res.status(404).json({ error: 'Unknown export job' })
  res.json({
    status: job.status, progress: job.progress, received: job.received, frameCount: job.spec.frameCount, error: job.error ?? null,
    downloadUrl: job.status === 'done' ? `/api/export/jobs/${job.id}/download` : null,
  })
})

router.get('/jobs/:id/download', (req, res) => {
  const job = jobs.get(String(req.params.id))
  if (!job || job.status !== 'done' || !job.outputPath) return res.status(404).json({ error: 'Export not ready' })
  res.download(job.outputPath, `${APP_SLUG}-export.${job.spec.format}`)
})

router.delete('/jobs/:id', (req, res) => {
  const job = jobs.get(String(req.params.id))
  if (!job) return res.status(404).json({ error: 'Unknown export job' })
  job.status = 'cancelled'
  job.proc?.kill('SIGKILL')
  cleanupJob(job)
  res.status(204).end()
})

export default router
