import { useEffect, useRef, useState } from 'react'
import { FileAudio, FileVideo, Image as ImageIcon, Pause, Play, Plus, Search, Trash2, Upload } from 'lucide-react'
import type { Asset } from '@/types'
import { useEditor } from '@/store/editorStore'
import { addAsset, addAudioClip, addMediaClip, removeAsset, renameAsset } from '@/engine/operations'
import { MUSIC_CATEGORIES, SAMPLE_TRACKS, barSeconds, sampleAsset, type MusicCategory, type SampleTrack } from '@shared/music'
import { assetService, assetTypeFor } from '@/services/assets'
import { formatDuration } from '@/utils/time'

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function MediaLibrary() {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const select = useEditor((s) => s.select)
  const showToast = useEditor((s) => s.showToast)
  const playhead = useEditor((s) => s.playhead)
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!assetTypeFor(file)) {
        showToast(`Unsupported file: ${file.name}`, 'error')
        continue
      }
      setUploading((u) => [...u, file.name])
      try {
        const asset = await assetService.upload(file)
        commit((p) => addAsset(p, asset))
      } catch (e) {
        showToast(`Upload failed: ${(e as Error).message}`, 'error')
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name))
      }
    }
  }

  const place = (asset: Asset) => {
    try {
      let id = ''
      commit((p) => { const r = addMediaClip(p, asset.id, { start: Math.round(playhead * 100) / 100 }); id = r.clipId; return r.project })
      select([id])
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  const remove = async (asset: Asset) => {
    const used = project.clips.some((c) => c.audio?.assetId === asset.id || project.layers.some((l) => l.id === c.layerId && (l.type === 'image' || l.type === 'video') && l.media.assetId === asset.id))
    if (used && !window.confirm(`"${asset.name}" is used on the timeline. Delete it and its clips?`)) return
    commit((p) => removeAsset(p, asset.id))
    try { await assetService.remove(asset.id) } catch { /* server offline */ }
  }

  const assets = project.assets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex flex-col">
      <div className="pb-2">
        <div
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center ${dragOver ? 'border-accent bg-accent-soft' : 'border-line-strong bg-well'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files) }}
        >
          <Upload size={16} className="text-ink-faint" />
          <p className="text-[11px] text-ink-muted">Drop images, video or audio here</p>
          <button className="btn h-7 px-2 text-[11px]" onClick={() => inputRef.current?.click()}>Browse files</button>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = '' }} />
        </div>
        {uploading.length > 0 && <p className="mt-2 text-[10px] text-accent">Uploading {uploading.join(', ')}…</p>}
        <div className="relative mt-2">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="field pl-6" placeholder="Search media" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <ul className="-mx-1">
        {assets.length === 0 && <li className="px-2 py-6 text-center text-[11px] text-ink-faint">{project.assets.length === 0 ? 'No media yet. Uploads are stored with the project.' : 'No matches.'}</li>}
        {assets.map((a) => (
          <li
            key={a.id}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('application/x-motion-asset', a.id); e.dataTransfer.effectAllowed = 'copy' }}
            className="group flex cursor-grab items-center gap-2 rounded-lg p-1.5 hover:bg-well"
          >
            <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-line text-ink-muted">
              {a.thumbnailUrl ? <img src={a.thumbnailUrl} alt="" className="h-full w-full object-cover" draggable={false} /> : a.type === 'audio' ? <FileAudio size={16} /> : a.type === 'video' ? <FileVideo size={16} /> : <ImageIcon size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              {renaming === a.id ? (
                <input autoFocus className="field h-6" defaultValue={a.name} onBlur={(e) => { commit((p) => renameAsset(p, a.id, e.target.value)); setRenaming(null) }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }} />
              ) : (
                <p className="truncate text-[11px] font-medium" onDoubleClick={() => setRenaming(a.id)} title="Double-click to rename">{a.name}</p>
              )}
              <p className="text-[10px] text-ink-faint">
                {a.type}{a.width ? ` · ${a.width}×${a.height}` : ''}{a.duration ? ` · ${formatDuration(a.duration)}` : ''} · {formatBytes(a.size)}
              </p>
            </div>
            <button className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100" title="Add at playhead" onClick={() => place(a)}><Plus size={13} /></button>
            <button className="icon-btn h-6 w-6 opacity-0 hover:text-danger group-hover:opacity-100" title="Delete asset" onClick={() => void remove(a)}><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <p className="pt-2 text-[10.5px] text-ink-faint">Drag media onto the canvas or timeline, or click + to add at the playhead.</p>
    </div>
  )
}

/** Bundled royalty-free music: preview a track, pick where in the song to start, and add it to the timeline. */
export function MusicLibrary() {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const select = useEditor((s) => s.select)
  const showToast = useEditor((s) => s.showToast)
  const playhead = useEditor((s) => s.playhead)
  const [playing, setPlaying] = useState<string | null>(null)
  const [cue, setCue] = useState<Record<string, number>>({})
  const [category, setCategory] = useState<MusicCategory | 'all'>('all')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const preview = (t: SampleTrack) => {
    audioRef.current?.pause()
    if (playing === t.id) return setPlaying(null)
    const a = new Audio(t.url)
    a.volume = 0.8
    a.currentTime = (t.cues[cue[t.id] ?? 0]?.bar ?? 0) * barSeconds(t)
    a.onended = () => setPlaying(null)
    a.play().catch(() => showToast('Could not play the preview. Is the API server running?', 'error'))
    audioRef.current = a
    setPlaying(t.id)
  }

  const add = (t: SampleTrack) => {
    audioRef.current?.pause()
    setPlaying(null)
    const from = (t.cues[cue[t.id] ?? 0]?.bar ?? 0) * barSeconds(t)
    let id = ''
    try {
      commit((p) => {
        const start = p.composition.duration - playhead < 4 ? 0 : Math.round(playhead * 100) / 100
        const duration = Math.max(0.5, Math.min(t.duration - from, p.composition.duration - start))
        const r = addAudioClip(addAsset(p, sampleAsset(t)), t.id, {
          start, duration, trimIn: from, name: t.name,
          audio: { volume: 0.9, fadeIn: Math.min(1, duration), fadeOut: Math.min(4, duration / 4) },
        })
        id = r.clipId
        return r.project
      })
      if (id) { select([id]); showToast(`Added “${t.name}” to the timeline`) }
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  const tracks = category === 'all' ? SAMPLE_TRACKS : SAMPLE_TRACKS.filter((t) => t.category === category)
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Filter music by mood">
        {[{ id: 'all' as const, label: 'All' }, ...MUSIC_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`h-6 rounded-md px-2 text-[10.5px] font-semibold transition-colors ${category === c.id ? 'bg-accent text-white' : 'bg-well text-ink-muted hover:text-ink'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5">
      {tracks.map((t) => {
        const isPlaying = playing === t.id
        const used = project.clips.some((c) => c.audio?.assetId === t.id)
        return (
          <li key={t.id} className="rounded-lg border border-line bg-panel p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold">{t.name}{used && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[9.5px] font-semibold text-accent">in project</span>}</p>
                <p className="truncate text-[10.5px] text-ink-muted">{t.mood}</p>
              </div>
              <span className="chip h-5 shrink-0">{t.bpm} BPM · {formatDuration(t.duration)}</span>
            </div>
            {t.cues.length > 1 && <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-ink-faint">{t.description}</p>}
            <div className="mt-2 flex items-center gap-1.5">
              <button className="icon-btn h-8 w-8 shrink-0 rounded-lg bg-well" title={isPlaying ? 'Stop preview' : 'Preview from the selected section'} onClick={() => preview(t)}>
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              {t.cues.length > 1 ? (
                <select className="field h-8 min-w-0 flex-1 text-[11px]" value={cue[t.id] ?? 0} onChange={(e) => setCue({ ...cue, [t.id]: Number(e.target.value) })} aria-label={`Start ${t.name} from`}>
                  {t.cues.map((c, i) => <option key={c.label} value={i}>Start: {c.label}</option>)}
                </select>
              ) : <span className="flex-1" />}
              <button className="btn h-8 shrink-0 px-2.5 text-[11px]" onClick={() => add(t)}><Plus size={12} /> Add</button>
            </div>
          </li>
        )
      })}
      </ul>
    </div>
  )
}
