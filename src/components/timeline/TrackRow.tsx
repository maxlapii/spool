import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Lock, LockOpen, Music, Trash2, Volume2, VolumeX } from 'lucide-react'
import type { Track } from '@/types'
import { useEditor } from '@/store/editorStore'
import { deleteTrack, layerForClip, moveTrack, updateTrack } from '@/engine/operations'
import { CLIP_COLORS, TRACK_HEIGHT } from './ClipBlock'

export const HEADER_WIDTH = 150

export function TrackHeader({ track, index, count }: { track: Track; index: number; count: number }) {
  const commit = useEditor((s) => s.commit)
  const [editing, setEditing] = useState(false)
  const project = useEditor((s) => s.project)!
  const clips = project.clips.filter((c) => c.trackId === track.id)
  const kinds = [...new Set(clips.map((c) => (c.audio ? 'audio' : layerForClip(project, c.id)?.type ?? 'shape')))]

  return (
    <div className="group sticky left-0 z-20 flex shrink-0 items-center gap-1.5 border-b border-line bg-panel pl-2 pr-1" style={{ width: HEADER_WIDTH, height: TRACK_HEIGHT }}>
      <div className="flex shrink-0 -space-x-1">
        {(kinds.length ? kinds.slice(0, 2) : [track.kind === 'audio' ? 'audio' : 'none']).map((k, i) => {
          const c = k === 'none' ? null : CLIP_COLORS[k as keyof typeof CLIP_COLORS]
          const Icon = c ? c.Icon : track.kind === 'audio' ? Music : Layers
          return (
            <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-md ring-2 ring-panel ${c ? c.cls : 'clip-none'}`} style={{ color: 'var(--edge)' }}>
              <Icon size={12} />
            </span>
          )
        })}
      </div>
      {editing ? (
        <input
          autoFocus
          className="h-6 min-w-0 flex-1 rounded-md border border-accent bg-panel px-1 text-[11.5px] outline-none"
          defaultValue={track.name}
          onBlur={(e) => { commit((p) => updateTrack(p, track.id, { name: e.target.value })); setEditing(false) }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false) }}
        />
      ) : (
        <button className="min-w-0 flex-1 truncate text-left text-[11.5px] font-semibold" onDoubleClick={() => setEditing(true)} title="Double-click to rename">{track.name}</button>
      )}
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center rounded-lg bg-panel pl-1 opacity-0 shadow-[-8px_0_8px_-4px_var(--surface-panel)] group-hover:opacity-100">
        <button className="icon-btn h-6 w-6" title={track.locked ? 'Unlock track' : 'Lock track'} onClick={() => commit((p) => updateTrack(p, track.id, { locked: !track.locked }))}>
          {track.locked ? <Lock size={11} className="text-select" /> : <LockOpen size={11} />}
        </button>
        {track.kind === 'visual' ? (
          <button className="icon-btn h-6 w-6" title={track.hidden ? 'Show track' : 'Hide track'} onClick={() => commit((p) => updateTrack(p, track.id, { hidden: !track.hidden }))}>
            {track.hidden ? <EyeOff size={11} className="text-select" /> : <Eye size={11} />}
          </button>
        ) : (
          <button className="icon-btn h-6 w-6" title={track.muted ? 'Unmute track' : 'Mute track'} onClick={() => commit((p) => updateTrack(p, track.id, { muted: !track.muted }))}>
            {track.muted ? <VolumeX size={11} className="text-select" /> : <Volume2 size={11} />}
          </button>
        )}
        <div className="flex flex-col">
          <button className="flex h-3 w-4 items-center justify-center text-ink-faint hover:text-ink disabled:opacity-30" disabled={index === 0} title="Move track up" onClick={() => commit((p) => moveTrack(p, track.id, 'up'))}><ChevronUp size={10} /></button>
          <button className="flex h-3 w-4 items-center justify-center text-ink-faint hover:text-ink disabled:opacity-30" disabled={index === count - 1} title="Move track down" onClick={() => commit((p) => moveTrack(p, track.id, 'down'))}><ChevronDown size={10} /></button>
        </div>
        <button
          className="icon-btn h-6 w-6 hover:text-danger"
          title="Delete track"
          onClick={() => { if (clips.length === 0 || window.confirm(`Delete track "${track.name}" and its clips?`)) commit((p) => deleteTrack(p, track.id)) }}
        >
          <Trash2 size={11} />
        </button>
      </div>
      {(track.locked || track.hidden || track.muted) && (
        <span className="absolute right-1.5 flex items-center gap-0.5 text-select group-hover:hidden">
          {track.locked && <Lock size={10} />}{track.hidden && <EyeOff size={10} />}{track.muted && <VolumeX size={10} />}
        </span>
      )}
    </div>
  )
}
