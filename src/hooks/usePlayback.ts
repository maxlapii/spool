import { useEffect } from 'react'
import { useEditor } from '@/store/editorStore'
import { advancePlayhead } from '@/engine/speed'

/** Drives the playhead with requestAnimationFrame while playing, at the speed of the section it is in. */
export function usePlayback() {
  const isPlaying = useEditor((s) => s.isPlaying)
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const { playhead, project, setPlayhead, pause } = useEditor.getState()
      const dt = (now - last) / 1000
      last = now
      if (!project) return
      const { time, ended } = advancePlayhead(project, playhead, dt)
      if (ended) {
        setPlayhead(project.composition.duration)
        pause()
        return
      }
      setPlayhead(time)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])
}
