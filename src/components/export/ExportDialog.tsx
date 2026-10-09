import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, X } from 'lucide-react'
import { useEditor } from '@/store/editorStore'
import { updateExportSettings } from '@/engine/operations'
import { ASPECT_PRESETS, MAX_OUTPUT_SECONDS, type AspectRatio } from '@/types'
import { hasSpeedChange, outputDuration } from '@/engine/speed'
import { api } from '@/services/api'
import { ExportJob, type ExportProgress } from '@/services/exporter'
import { Field, Section, SelectInput } from '../ui/fields'

const RESOLUTIONS: Record<AspectRatio, { label: string; width: number; height: number }[]> = {
  '16:9': [{ label: '1080p · 1920×1080', width: 1920, height: 1080 }, { label: '720p · 1280×720', width: 1280, height: 720 }, { label: '4K · 3840×2160', width: 3840, height: 2160 }],
  '9:16': [{ label: '1080×1920', width: 1080, height: 1920 }, { label: '720×1280', width: 720, height: 1280 }],
  '1:1': [{ label: '1080×1080', width: 1080, height: 1080 }, { label: '720×720', width: 720, height: 720 }],
  '4:5': [{ label: '1080×1350', width: 1080, height: 1350 }, { label: '864×1080', width: 864, height: 1080 }],
  '4:3': [{ label: '1440×1080', width: 1440, height: 1080 }, { label: '960×720', width: 960, height: 720 }],
}

export function ExportDialog() {
  const open = useEditor((s) => s.exportOpen)
  const setOpen = useEditor((s) => s.setExportOpen)
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const pause = useEditor((s) => s.pause)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [ffmpeg, setFfmpeg] = useState<boolean | null>(null)
  const jobRef = useRef<ExportJob | null>(null)
  const ex = project.export
  const resolutions = RESOLUTIONS[project.composition.aspect] ?? RESOLUTIONS['16:9']
  const current = resolutions.findIndex((r) => r.width === ex.width && r.height === ex.height)

  useEffect(() => {
    if (!open) return
    setProgress(null)
    api<{ ffmpeg: boolean }>('/api/export/status').then((r) => setFfmpeg(r.ffmpeg)).catch(() => setFfmpeg(false))
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      jobRef.current?.cancel()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, setOpen])

  if (!open) return null
  const running = progress && (progress.phase === 'preparing' || progress.phase === 'rendering' || progress.phase === 'encoding')
  const outSeconds = outputDuration(project)
  const frames = Math.max(1, Math.round(outSeconds * ex.fps))
  const sped = hasSpeedChange(project)
  const tooLong = outSeconds > MAX_OUTPUT_SECONDS

  const start = () => {
    pause()
    const job = new ExportJob(project, { width: ex.width, height: ex.height, fps: ex.fps, format: ex.format, quality: ex.quality }, setProgress)
    jobRef.current = job
    void job.run()
  }
  const close = () => {
    if (running) jobRef.current?.cancel()
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onPointerDown={(e) => { if (e.target === e.currentTarget && !running) close() }}>
      <div className="scale-in w-[440px] overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold">Export video</h2>
            <p className="text-[11px] text-ink-muted">{project.name} · {Math.round(outSeconds * 10) / 10}s · {frames} frames</p>
            {sped && <p className="mt-0.5 text-[11px] font-semibold text-accent">Speed settings applied: timeline {Math.round(project.composition.duration * 10) / 10}s becomes {Math.round(outSeconds * 10) / 10}s</p>}
          </div>
          <button className="icon-btn" onClick={close} title="Close"><X size={15} /></button>
        </div>

        {!progress || progress.phase === 'cancelled' || progress.phase === 'error' ? (
          <>
            <Section title="Settings" className="border-b-0">
              <Field label="Aspect ratio"><input className="field" readOnly value={ASPECT_PRESETS[project.composition.aspect].label} /></Field>
              <Field label="Resolution">
                <SelectInput
                  value={current >= 0 ? current : 0}
                  options={resolutions.map((r, i) => ({ value: i, label: r.label }))}
                  onChange={(i) => commit((p) => updateExportSettings(p, { width: resolutions[i].width, height: resolutions[i].height }))}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Frame rate"><SelectInput value={ex.fps} options={[24, 25, 30, 50, 60].map((f) => ({ value: f, label: `${f} fps` }))} onChange={(v) => commit((p) => updateExportSettings(p, { fps: v }))} /></Field>
                <Field label="Format"><SelectInput value={ex.format} options={[{ value: 'mp4', label: 'MP4 (H.264)' }, { value: 'webm', label: 'WebM (VP9)' }]} onChange={(v) => commit((p) => updateExportSettings(p, { format: v }))} /></Field>
                <Field label="Quality"><SelectInput value={ex.quality} options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Small file' }]} onChange={(v) => commit((p) => updateExportSettings(p, { quality: v }))} /></Field>
              </div>
            </Section>
            {ffmpeg === false && (
              <div className="notice mx-4 mb-3 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Rendering backend unavailable</p>
                  <p className="mt-0.5">The API server could not find FFmpeg. Run <code>npm install</code> (bundles ffmpeg-static) or set <code>FFMPEG_PATH</code> in .env, then restart the server.</p>
                </div>
              </div>
            )}
            {progress?.phase === 'error' && (
              <div className="danger-box mx-4 mb-3">
                <p className="font-semibold">Export failed</p>
                <p className="mt-0.5 break-words">{progress.message}</p>
              </div>
            )}
            {progress?.phase === 'cancelled' && <p className="mx-4 mb-3 text-[11px] text-ink-muted">Export cancelled.</p>}
            {frames > 3000 && (
              <p className="mx-4 mb-3 rounded-lg bg-well px-3 py-2 text-[11px] text-ink-muted">Long export: {Math.round(outSeconds)}s at {ex.fps} fps is {frames.toLocaleString()} frames. Expect several minutes and keep this tab open.</p>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-[10px] leading-snug text-ink-faint">Frames render in your browser; FFmpeg encodes on the local server. Timelines up to 5 minutes; the exported video up to 20 minutes with speed changes.</p>
              <button className="btn-primary" disabled={ffmpeg === false || tooLong} onClick={start}><Download size={13} /> Render {ex.format.toUpperCase()}</button>
            </div>
          </>
        ) : (
          <div className="px-4 py-5">
            {progress.phase === 'done' ? (
              <div className="text-center">
                <p className="text-[13px] font-semibold">Your video is ready</p>
                <p className="mt-1 text-[11px] text-ink-muted">{ex.width}×{ex.height} · {ex.fps} fps · {ex.format.toUpperCase()}</p>
                <a href={progress.downloadUrl} download className="btn-primary mt-4 inline-flex h-9 px-4"><Download size={14} /> Download file</a>
                <div><button className="mt-3 text-[11px] text-ink-muted hover:underline" onClick={() => setProgress(null)}>Export again</button></div>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium capitalize">{progress.phase === 'preparing' ? 'Preparing' : progress.phase === 'rendering' ? 'Rendering frames' : 'Encoding'}</span>
                  <span className="font-mono text-ink-muted">{Math.round(progress.progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-well">
                  <div className="h-full bg-accent transition-[width]" style={{ width: `${progress.progress * 100}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-ink-muted">{progress.message}</p>
                <div className="mt-4 text-right">
                  <button className="btn" onClick={() => jobRef.current?.cancel()}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
