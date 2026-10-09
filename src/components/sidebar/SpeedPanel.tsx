import { FastForward, RotateCcw, Plus } from 'lucide-react'
import { MAX_OUTPUT_SECONDS, MAX_SPEED, MIN_SPEED } from '@/types'
import { useEditor } from '@/store/editorStore'
import { addMarker, resetSpeeds, setProjectSpeed, setSectionSpeed } from '@/engine/operations'
import { formatSpeed, hasSpeedChange, outputDuration, projectSpeed, sectionsOf } from '@/engine/speed'
import { formatDuration } from '@/utils/time'
import { NumberInput, Section } from '../ui/fields'

const QUICK = [0.5, 1, 1.5, 2, 4]

/** Preset chips plus a free number, for one speed value. */
function SpeedControls({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {QUICK.map((q) => (
        <button
          key={q}
          type="button"
          aria-pressed={Math.abs(value - q) < 1e-6}
          onClick={() => onChange(q)}
          className={`h-7 min-w-0 flex-1 rounded-md border px-1 font-mono text-[10.5px] font-semibold transition-colors ${Math.abs(value - q) < 1e-6 ? 'border-accent bg-accent text-white' : 'border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink'}`}
        >
          {formatSpeed(q)}
        </button>
      ))}
      <div className="w-[70px] shrink-0">
        <NumberInput compact value={value} min={MIN_SPEED} max={MAX_SPEED} step={0.25} onChange={onChange} suffix="x" />
      </div>
    </div>
  )
}

/** Speed up or slow down the whole video or one section, and show what the export will be. */
export function SpeedPanel() {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const playhead = useEditor((s) => s.playhead)
  const showToast = useEditor((s) => s.showToast)
  const setPlayhead = useEditor((s) => s.setPlayhead)

  const run = (fn: (p: typeof project) => typeof project) => {
    try { commit(fn) } catch (e) { showToast((e as Error).message, 'error') }
  }
  const sections = sectionsOf(project)
  const out = outputDuration(project)
  const changed = hasSpeedChange(project)
  const tooLong = out > MAX_OUTPUT_SECONDS

  return (
    <Section title="Speed" right={changed ? <span className="chip h-5 text-accent">{formatDuration(out)} output</span> : <FastForward size={12} className="text-ink-faint" />}>
      <p className="text-[10.5px] leading-relaxed text-ink-faint">Speed up or slow down the whole video, or any section. A section runs from its marker to the next marker. The preview and the exported video both follow it.</p>

      <div>
        <p className="mb-1 text-[11px] font-semibold">Whole video</p>
        <SpeedControls label="Whole video speed" value={projectSpeed(project)} onChange={(v) => run((p) => setProjectSpeed(p, v))} />
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold">By section</p>
        {sections.length === 0 ? (
          <div className="rounded-lg bg-well p-2.5 text-[11px] text-ink-muted">
            <p>No sections yet. Add a marker where each section starts.</p>
            <button className="btn mt-2 h-8 w-full text-[11px]" onClick={() => run((p) => addMarker(p, Math.min(playhead, p.composition.duration - 0.1), `Section ${p.markers.length + 1}`).project)}><Plus size={12} /> Add section at playhead</button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {sections.map((s) => {
              const len = s.end - s.start
              const eff = projectSpeed(project) * s.speed
              return (
                <li key={s.marker.id} className="rounded-lg bg-well p-1.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.marker.color }} />
                    <button className="min-w-0 flex-1 truncate text-left text-[11.5px] font-semibold hover:underline" onClick={() => setPlayhead(s.start)} title="Go to the start of this section">{s.marker.label}</button>
                    <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                      {len.toFixed(1)}s{Math.abs(eff - 1) > 1e-6 ? ` → ${(len / eff).toFixed(1)}s` : ''}
                    </span>
                  </div>
                  <SpeedControls label={`${s.marker.label} speed`} value={s.speed} onChange={(v) => run((p) => setSectionSpeed(p, s.marker.id, v))} />
                  {!s.active && <p className="mt-1 text-[10px] text-ink-faint">Starts at the same time as another section, so it has no length.</p>}
                </li>
              )
            })}
          </ul>
        )}
        {sections.length > 0 && sections[0].start > 0.05 && <p className="mt-1 text-[10px] text-ink-faint">Before the first marker only the whole-video speed applies.</p>}
      </div>

      <div className={`rounded-lg px-2.5 py-2 text-[11px] ${tooLong ? 'danger-box' : 'bg-well text-ink-muted'}`}>
        <div className="flex items-center justify-between">
          <span>Timeline</span><span className="font-mono">{formatDuration(project.composition.duration)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between font-semibold text-ink">
          <span>Exported video</span><span className="font-mono">{formatDuration(out)}</span>
        </div>
        {tooLong && <p className="mt-1">Exports can be up to {MAX_OUTPUT_SECONDS / 60} minutes. Use a faster speed.</p>}
      </div>
      {changed && <button className="btn w-full text-[11px]" onClick={() => run((p) => resetSpeeds(p))}><RotateCcw size={12} /> Reset all speeds</button>}
    </Section>
  )
}
