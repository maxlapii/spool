import { Diamond, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { Clip, Keyframe, KeyframeProperty, Layer } from '@/types'
import { ANIMATION_PRESETS, EASINGS, KEYFRAME_PROPERTIES, MAX_COMPOSITION_DURATION, TRANSITION_TYPES } from '@/types'
import { useEditor, useSelectedClip, useSelectedLayer } from '@/store/editorStore'
import {
  addKeyframe, applyTransition, clipsOnTrack, deleteKeyframe, moveClip, resetAnimations, setAnimation, setClipDuration, updateAudio, updateKeyframe,
} from '@/engine/operations'
import { evaluateLayer } from '@/engine/animation'
import { EmptyState, Field, NumberInput, Section, SelectInput } from '../ui/fields'
import { useState } from 'react'

const presetLabel = (p: string) => p.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export function MotionPanel() {
  const clip = useSelectedClip()
  const layer = useSelectedLayer()
  if (!clip) {
    return (
      <EmptyState
        icon={<Diamond size={22} />}
        title="Select a clip to animate"
        body={<>Entrance and exit presets, keyframes and transitions live here. Click an element on the canvas or a clip on the timeline.</>}
      />
    )
  }
  return (
    <div className="flex-1 overflow-y-auto scroll-thin">
      <Timing clip={clip} />
      {layer ? <LayerMotion clip={clip} layer={layer} /> : <AudioMotion clip={clip} />}
    </div>
  )
}

function Timing({ clip }: { clip: Clip }) {
  const commit = useEditor((s) => s.commit)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  return (
    <Section title="Timing" right={<button className="text-[10px] font-medium text-accent" onClick={() => setPlayhead(clip.start)}>Go to start</button>}>
      <Field label="Start" inline><NumberInput compact value={clip.start} min={0} max={MAX_COMPOSITION_DURATION} step={0.1} onChange={(v) => commit((p) => moveClip(p, clip.id, v))} suffix="s" /></Field>
      <Field label="Duration" inline><NumberInput compact value={clip.duration} min={0.1} max={MAX_COMPOSITION_DURATION} step={0.1} onChange={(v) => commit((p) => setClipDuration(p, clip.id, v))} suffix="s" /></Field>
      <Field label="End" inline><NumberInput compact value={clip.start + clip.duration} min={clip.start + 0.1} max={MAX_COMPOSITION_DURATION} step={0.1} onChange={(v) => commit((p) => setClipDuration(p, clip.id, v - clip.start))} suffix="s" /></Field>
    </Section>
  )
}

function AnimationEditor({ layer, which }: { layer: Layer; which: 'in' | 'out' }) {
  const commit = useEditor((s) => s.commit)
  const a = layer.animations[which]
  const update = (patch: Partial<typeof a>) => commit((p) => setAnimation(p, layer.id, which, patch))
  return (
    <Section title={which === 'in' ? 'Entrance' : 'Exit'}>
      <Field label="Preset" inline><SelectInput compact value={a.preset} options={ANIMATION_PRESETS.map((v) => ({ value: v, label: presetLabel(v) }))} onChange={(v) => update({ preset: v })} /></Field>
      {a.preset !== 'none' && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Duration" inline><NumberInput compact value={a.duration} min={0} max={30} step={0.1} onChange={(v) => update({ duration: v })} suffix="s" /></Field>
            {which === 'in' ? <Field label="Delay" inline><NumberInput compact value={a.delay ?? 0} min={0} max={60} step={0.1} onChange={(v) => update({ delay: v })} suffix="s" /></Field> : <span />}
          </div>
          <Field label="Easing" inline><SelectInput compact value={a.easing} options={EASINGS.map((v) => ({ value: v, label: presetLabel(v) }))} onChange={(v) => update({ easing: v })} /></Field>
        </>
      )}
    </Section>
  )
}

function LayerMotion({ clip, layer }: { clip: Clip; layer: Layer }) {
  const project = useEditor((s) => s.project)!
  const commit = useEditor((s) => s.commit)
  const playhead = useEditor((s) => s.playhead)
  const setPlayhead = useEditor((s) => s.setPlayhead)
  const [property, setProperty] = useState<KeyframeProperty>('y')
  const trackClips = clipsOnTrack(project, clip.trackId)
  const isFirst = trackClips[0]?.id === clip.id
  const tr = clip.transitionIn ?? { type: 'none' as const, duration: 0.6 }
  const kfs = layer.animations.keyframes
  const rel = Math.min(Math.max(playhead - clip.start, 0), clip.duration)

  const addAtPlayhead = () => {
    const state = evaluateLayer(layer, clip, clip.start + rel, {}, project.composition)
    const value = property === 'x' ? state.x : property === 'y' ? state.y : property === 'width' ? state.width : property === 'height' ? state.height : property === 'rotation' ? state.rotation : property === 'opacity' ? layer.opacity : state.scale
    const base = property === 'opacity' ? kfs.filter((k) => k.property === 'opacity').length ? value : layer.opacity : value
    commit((p) => addKeyframe(p, layer.id, { property, time: Math.round(rel * 100) / 100, value: Math.round(base * 100) / 100, easing: 'ease-in-out' }).project)
  }

  return (
    <>
      <AnimationEditor layer={layer} which="in" />
      <AnimationEditor layer={layer} which="out" />
      <Section title="Transition from previous clip">
        {isFirst ? (
          <p className="text-[11px] text-ink-faint">This is the first clip on its track. Transitions are set on the clip that follows another clip on the same track.</p>
        ) : (
          <>
            <Field label="Type" inline><SelectInput compact value={tr.type} options={TRANSITION_TYPES.map((v) => ({ value: v, label: presetLabel(v) }))} onChange={(v) => commit((p) => applyTransition(p, clip.id, { type: v, duration: tr.duration || 0.6 }))} /></Field>
            {tr.type !== 'none' && <Field label="Duration" inline><NumberInput compact value={tr.duration} min={0.1} max={10} step={0.1} onChange={(v) => commit((p) => applyTransition(p, clip.id, { type: tr.type, duration: v }))} suffix="s" /></Field>}
          </>
        )}
      </Section>
      <Section
        title="Keyframes"
        right={<button className="flex items-center gap-1 text-[10px] font-medium text-ink-muted hover:text-danger" onClick={() => commit((p) => resetAnimations(p, layer.id))} title="Reset all animations"><RotateCcw size={10} /> Reset</button>}
      >
        <div className="flex items-center gap-1.5">
          <SelectInput value={property} options={KEYFRAME_PROPERTIES.map((v) => ({ value: v, label: presetLabel(v) }))} onChange={setProperty} className="min-w-0 flex-1" />
          <button className="btn h-9 shrink-0 px-2.5" onClick={addAtPlayhead} title={`Add ${property} keyframe at ${rel.toFixed(2)}s`}><Plus size={12} /> Add at {rel.toFixed(1)}s</button>
        </div>
        {kfs.length === 0 ? (
          <p className="text-[10px] text-ink-faint">Move the playhead inside the clip and add keyframes for a property. Two or more keyframes animate between values.</p>
        ) : (
          <ul className="space-y-1">
            {[...kfs].sort((a, b) => a.property.localeCompare(b.property) || a.time - b.time).map((k) => (
              <KeyframeRow key={k.id} k={k} layerId={layer.id} clipStart={clip.start} onSeek={setPlayhead} onChange={(patch) => commit((p) => updateKeyframe(p, layer.id, k.id, patch))} onDelete={() => commit((p) => deleteKeyframe(p, layer.id, k.id))} />
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function KeyframeRow({ k, clipStart, onSeek, onChange, onDelete }: { k: Keyframe; layerId: string; clipStart: number; onSeek: (t: number) => void; onChange: (p: Partial<Keyframe>) => void; onDelete: () => void }) {
  return (
    <li className="grid grid-cols-[56px_60px_64px_minmax(0,1fr)_24px] items-center gap-1 rounded-lg bg-well py-1 pl-2 pr-1">
      <button className="flex items-center gap-1 truncate text-[10.5px] font-semibold text-accent" onClick={() => onSeek(clipStart + k.time)} title="Go to keyframe"><Diamond size={9} className="shrink-0 fill-current" /> {k.property}</button>
      <NumberInput compact value={k.time} min={0} step={0.1} onChange={(v) => onChange({ time: v })} suffix="s" />
      <NumberInput compact value={k.value} step={k.property === 'opacity' || k.property === 'scale' ? 0.1 : 1} onChange={(v) => onChange({ value: v })} />
      <SelectInput compact value={k.easing} options={EASINGS.map((v) => ({ value: v, label: presetLabel(v) }))} onChange={(v) => onChange({ easing: v })} />
      <button className="icon-btn h-6 w-6 hover:text-danger" onClick={onDelete} title="Delete keyframe"><Trash2 size={11} /></button>
    </li>
  )
}

function AudioMotion({ clip }: { clip: Clip }) {
  const commit = useEditor((s) => s.commit)
  const a = clip.audio!
  return (
    <Section title="Audio fades">
      <Field label="Fade in" inline><NumberInput compact value={a.fadeIn} min={0} max={clip.duration} step={0.1} onChange={(v) => commit((p) => updateAudio(p, clip.id, { fadeIn: v }))} suffix="s" /></Field>
      <Field label="Fade out" inline><NumberInput compact value={a.fadeOut} min={0} max={clip.duration} step={0.1} onChange={(v) => commit((p) => updateAudio(p, clip.id, { fadeOut: v }))} suffix="s" /></Field>
    </Section>
  )
}
