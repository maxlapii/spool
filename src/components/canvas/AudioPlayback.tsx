import { useEffect, useRef } from 'react'
import { useEditor } from '@/store/editorStore'
import { audioGain } from '@/engine/animation'
import { speedAt } from '@/engine/speed'

/** Hidden audio elements that follow the playhead for every audio clip. */
export function AudioPlayback() {
  const project = useEditor((s) => s.project)
  const playhead = useEditor((s) => s.playhead)
  const isPlaying = useEditor((s) => s.isPlaying)
  const refs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const audioClips = project?.clips.filter((c) => c.audio) ?? []

  useEffect(() => {
    if (!project) return
    for (const clip of audioClips) {
      const el = refs.current.get(clip.id)
      if (!el) continue
      const track = project.tracks.find((t) => t.id === clip.trackId)
      const inRange = playhead >= clip.start && playhead < clip.start + clip.duration
      const gain = track?.muted ? 0 : audioGain(clip, playhead)
      el.volume = gain
      el.muted = gain === 0
      const target = Math.max(0, playhead - clip.start + clip.trimIn)
      // Follow the section speed (pitch is kept); browsers play between 0.0625x and 16x.
      el.preservesPitch = true
      el.playbackRate = Math.min(16, Math.max(0.0625, speedAt(project, playhead)))
      if (isPlaying && inRange) {
        if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target
        if (el.paused) el.play().catch(() => {})
      } else {
        if (!el.paused) el.pause()
        if (inRange && Math.abs(el.currentTime - target) > 0.05) el.currentTime = target
      }
    }
  }, [project, audioClips, playhead, isPlaying])

  if (!project) return null
  return (
    <div hidden>
      {audioClips.map((clip) => {
        const asset = project.assets.find((a) => a.id === clip.audio!.assetId)
        if (!asset) return null
        return (
          <audio
            key={clip.id}
            src={asset.url}
            preload="auto"
            ref={(el) => {
              if (el) refs.current.set(clip.id, el)
              else refs.current.delete(clip.id)
            }}
          />
        )
      })}
    </div>
  )
}
