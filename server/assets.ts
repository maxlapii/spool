import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type { Asset, AssetType } from '../shared/types'
import { ASSETS_DIR, safeId } from './paths'

const router = Router()

const ALLOWED: Record<string, { type: AssetType; ext: string }> = {
  'image/png': { type: 'image', ext: 'png' },
  'image/jpeg': { type: 'image', ext: 'jpg' },
  'image/webp': { type: 'image', ext: 'webp' },
  'image/gif': { type: 'image', ext: 'gif' },
  'image/svg+xml': { type: 'image', ext: 'svg' },
  'video/mp4': { type: 'video', ext: 'mp4' },
  'video/webm': { type: 'video', ext: 'webm' },
  'video/quicktime': { type: 'video', ext: 'mov' },
  'audio/mpeg': { type: 'audio', ext: 'mp3' },
  'audio/mp3': { type: 'audio', ext: 'mp3' },
  'audio/wav': { type: 'audio', ext: 'wav' },
  'audio/x-wav': { type: 'audio', ext: 'wav' },
  'audio/ogg': { type: 'audio', ext: 'ogg' },
  'audio/aac': { type: 'audio', ext: 'aac' },
  'audio/mp4': { type: 'audio', ext: 'm4a' },
  'audio/x-m4a': { type: 'audio', ext: 'm4a' },
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024, files: 2 },
})

router.post('/', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined
  const file = files?.file?.[0]
  if (!file) return res.status(400).json({ error: 'No file uploaded' })
  const allowed = ALLOWED[file.mimetype]
  if (!allowed) return res.status(415).json({ error: `Unsupported file type: ${file.mimetype}` })

  let meta: { name?: string; width?: number; height?: number; duration?: number } = {}
  try {
    meta = JSON.parse(String(req.body?.meta ?? '{}'))
  } catch { /* ignore */ }

  const id = `asset_${crypto.randomBytes(6).toString('hex')}`
  const filename = `${id}.${allowed.ext}`
  await fs.writeFile(path.join(ASSETS_DIR, filename), file.buffer)

  let thumbnailUrl: string | undefined
  const thumb = files?.thumbnail?.[0]
  if (thumb && thumb.mimetype === 'image/jpeg') {
    await fs.writeFile(path.join(ASSETS_DIR, `${id}.thumb.jpg`), thumb.buffer)
    thumbnailUrl = `/assets/${id}.thumb.jpg`
  } else if (allowed.type === 'image') {
    thumbnailUrl = `/assets/${filename}`
  }

  const asset: Asset = {
    id,
    name: (meta.name || file.originalname || filename).slice(0, 120),
    type: allowed.type,
    mime: file.mimetype,
    size: file.size,
    url: `/assets/${filename}`,
    thumbnailUrl,
    width: typeof meta.width === 'number' ? meta.width : undefined,
    height: typeof meta.height === 'number' ? meta.height : undefined,
    duration: typeof meta.duration === 'number' && Number.isFinite(meta.duration) ? meta.duration : undefined,
    createdAt: new Date().toISOString(),
  }
  res.status(201).json(asset)
})

router.delete('/:id', async (req, res) => {
  const id = safeId(String(req.params.id))
  if (!id) return res.status(400).json({ error: 'Invalid asset id' })
  const files = await fs.readdir(ASSETS_DIR)
  await Promise.all(files.filter((f) => f.startsWith(`${id}.`)).map((f) => fs.rm(path.join(ASSETS_DIR, f), { force: true })))
  res.status(204).end()
})

export default router
