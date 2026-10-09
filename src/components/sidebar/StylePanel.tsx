import {
  AlignCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine,
  BringToFront, Circle, Copy, Eye, EyeOff, Heading, Italic, Lock, LockOpen, Minus, SendToBack, Square, Trash2, Triangle, Type,
} from 'lucide-react'
import type { Clip, Layer } from '@/types'
import { useEditor, useSelectedClip, useSelectedLayer } from '@/store/editorStore'
import {
  addShapeLayer, addTextLayer, alignLayers, duplicateClip, setLayerOrder, updateAudio, updateComposition, updateLayer, type LayerPatch,
} from '@/engine/operations'
import { FONT_FAMILIES } from '@/engine/project'
import { ColorInput, EmptyState, Field, NumberInput, Section, Segmented, SelectInput, SliderInput, Toggle } from '../ui/fields'

export function StylePanel() {
  const clip = useSelectedClip()
  const layer = useSelectedLayer()
  if (clip && clip.audio) return <AudioInspector clip={clip} />
  if (clip && layer) return <LayerInspector clip={clip} layer={layer} />
  return <CompositionStyle />
}

function CompositionStyle() {
  const project = useEditor((s) => s.project)!
  const playhead = useEditor((s) => s.playhead)
  const commit = useEditor((s) => s.commit)
  const select = useEditor((s) => s.select)
  const snapshot = useEditor((s) => s.snapshot)
  const patch = useEditor((s) => s.patch)
  const c = project.composition

  const addText = (heading: boolean) => {
    let id = ''
    commit((p) => {
      const r = addTextLayer(
        p,
        heading ? { content: 'Headline', fontSize: Math.round(c.width * 0.05), fontWeight: 800 } : { content: 'Body text', fontSize: Math.round(c.width * 0.022), fontWeight: 400, color: '#374151' },
        {},
        { start: Math.round(playhead * 100) / 100, duration: 4, animations: { in: { preset: 'rise', duration: 0.8, easing: 'expo-out', delay: 0 } } },
      )
      id = r.clipId
      return r.project
    })
    select([id])
  }
  const addShape = (shape: 'rect' | 'ellipse' | 'line' | 'triangle') => {
    let id = ''
    commit((p) => {
      const size = Math.round(Math.min(c.width, c.height) * 0.25)
      const r = addShapeLayer(p, { shape, fill: shape === 'line' ? '#111827' : '#9a5bf5', strokeWidth: shape === 'line' ? 8 : 0 }, shape === 'line' ? { width: size * 2, height: 24 } : { width: size, height: size }, { start: Math.round(playhead * 100) / 100, duration: 4 })
      id = r.clipId
      return r.project
    })
    select([id])
  }

  const images = project.assets.filter((a) => a.type === 'image')
  const visualTracks = project.tracks.filter((t) => t.kind === 'visual')

  return (
    <div className="flex-1 overflow-y-auto scroll-thin">
      <Section title="Add to canvas">
        <div className="grid grid-cols-3 gap-1.5">
          <AddButton icon={<Heading size={15} />} label="Heading" onClick={() => addText(true)} />
          <AddButton icon={<Type size={15} />} label="Text" onClick={() => addText(false)} />
          <AddButton icon={<Square size={15} />} label="Rect" onClick={() => addShape('rect')} />
          <AddButton icon={<Circle size={15} />} label="Ellipse" onClick={() => addShape('ellipse')} />
          <AddButton icon={<Minus size={15} />} label="Line" onClick={() => addShape('line')} />
          <AddButton icon={<Triangle size={15} />} label="Triangle" onClick={() => addShape('triangle')} />
        </div>
        <p className="text-[10.5px] leading-relaxed text-ink-faint">New elements start at the playhead. Images, video and audio live under Project → Media.</p>
      </Section>
      <Section title="Background">
        <Field label="Color" inline>
          <ColorInput value={c.backgroundColor} onDragStart={snapshot} onChange={(v) => v && patch((p) => updateComposition(p, { backgroundColor: v }))} />
        </Field>
        <Field label="Image" inline>
          <SelectInput
            compact
            value={c.backgroundAssetId ?? ''}
            options={[{ value: '', label: 'None' }, ...images.map((a) => ({ value: a.id, label: a.name }))]}
            onChange={(v) => commit((p) => updateComposition(p, { backgroundAssetId: v || null }))}
          />
        </Field>
      </Section>
      <Section title="Layers">
        {project.clips.filter((cl) => cl.layerId).length === 0 && <p className="text-[11px] text-ink-faint">No layers yet.</p>}
        <ul className="space-y-0.5">
          {visualTracks.map((track) =>
            project.clips
              .filter((cl) => cl.trackId === track.id && cl.layerId)
              .sort((a, b) => a.start - b.start)
              .map((cl) => {
                const l = project.layers.find((x) => x.id === cl.layerId)
                if (!l) return null
                const atPlayhead = playhead >= cl.start && playhead < cl.start + cl.duration
                return (
                  <li key={cl.id} className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-well/60">
                    <button className={`min-w-0 flex-1 truncate text-left text-[11px] ${atPlayhead ? 'text-ink' : 'text-ink-faint'}`} onClick={() => select([cl.id])} title={`${track.name} · ${cl.start.toFixed(1)}s`}>
                      {l.name}
                    </button>
                    <button className="icon-btn h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => commit((p) => updateLayer(p, l.id, { hidden: !l.hidden }))}>{l.hidden ? <EyeOff size={11} /> : <Eye size={11} />}</button>
                    <button className="icon-btn h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => commit((p) => updateLayer(p, l.id, { locked: !l.locked }))}>{l.locked ? <Lock size={11} /> : <LockOpen size={11} />}</button>
                  </li>
                )
              }),
          )}
        </ul>
      </Section>
    </div>
  )
}

function AddButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl bg-well text-[10.5px] font-semibold text-ink-muted hover:bg-accent-soft hover:text-accent">
      {icon}
      {label}
    </button>
  )
}

function LayerInspector({ clip, layer }: { clip: Clip; layer: Layer }) {
  const commit = useEditor((s) => s.commit)
  const patch = useEditor((s) => s.patch)
  const snapshot = useEditor((s) => s.snapshot)
  const select = useEditor((s) => s.select)
  const deleteSelection = useEditor((s) => s.deleteSelection)
  const selectedIds = useEditor((s) => s.selectedClipIds)
  const project = useEditor((s) => s.project)!
  const t = layer.transform
  const set = (p: LayerPatch) => commit((pr) => updateLayer(pr, layer.id, p))
  const live = (p: LayerPatch) => patch((pr) => updateLayer(pr, layer.id, p))
  const selectedLayerIds = selectedIds.map((id) => project.clips.find((c) => c.id === id)?.layerId).filter(Boolean) as string[]

  const typeLabel = layer.type === 'text' ? 'Text' : layer.type === 'shape' ? 'Shape' : layer.type === 'image' ? 'Image' : 'Video'
  return (
    <div className="flex-1 overflow-y-auto scroll-thin">
      <div className="border-b border-line px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <input
              className="w-full truncate rounded-md border border-transparent bg-transparent text-[17px] font-bold tracking-tight outline-none hover:bg-well focus:border-select focus:bg-panel"
              value={layer.name}
              onChange={(e) => live({ name: e.target.value })}
              onFocus={snapshot}
              aria-label="Layer name"
            />
            <p className="mt-0.5 text-[11px] text-ink-muted">{typeLabel}{layer.locked ? ' · locked' : ''}{layer.hidden ? ' · hidden' : ''}</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button className="icon-btn" title={layer.hidden ? 'Show' : 'Hide'} onClick={() => set({ hidden: !layer.hidden })}>{layer.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            <button className="icon-btn" title={layer.locked ? 'Unlock' : 'Lock'} onClick={() => set({ locked: !layer.locked })}>{layer.locked ? <Lock size={14} className="text-select" /> : <LockOpen size={14} />}</button>
            <button className="icon-btn" title="Duplicate (⌘D)" onClick={() => { let id = ''; commit((p) => { const r = duplicateClip(p, clip.id); id = r.clipId; return r.project }); select([id]) }}><Copy size={14} /></button>
            <button className="icon-btn hover:text-danger" title="Delete (⌫)" onClick={deleteSelection}><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex gap-0.5">
            {([['left', ArrowLeftToLine], ['center', AlignHorizontalJustifyCenter], ['right', ArrowRightToLine], ['top', ArrowUpToLine], ['middle', AlignVerticalJustifyCenter], ['bottom', ArrowDownToLine]] as const).map(([mode, Icon]) => (
              <button key={mode} className="icon-btn h-6 w-6" title={`Align ${mode}`} onClick={() => commit((p) => alignLayers(p, selectedLayerIds, mode))}><Icon size={13} /></button>
            ))}
          </div>
          <div className="flex gap-0.5">
            <button className="icon-btn h-6 w-6" title="Bring forward" onClick={() => commit((p) => setLayerOrder(p, clip.id, 'forward'))}><BringToFront size={13} /></button>
            <button className="icon-btn h-6 w-6" title="Send backward" onClick={() => commit((p) => setLayerOrder(p, clip.id, 'backward'))}><SendToBack size={13} /></button>
          </div>
        </div>
        <div className="mt-2">
          <Field label="Opacity" inline>
            <SliderInput value={layer.opacity} min={0} max={1} onDragStart={snapshot} onChange={(v) => live({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
          </Field>
        </div>
      </div>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="X" inline><NumberInput compact value={t.x} onChange={(v) => set({ transform: { x: v } })} suffix="px" /></Field>
          <Field label="Y" inline><NumberInput compact value={t.y} onChange={(v) => set({ transform: { y: v } })} suffix="px" /></Field>
          <Field label="W" inline><NumberInput compact value={t.width} min={1} onChange={(v) => set({ transform: { width: v } })} suffix="px" /></Field>
          <Field label="H" inline><NumberInput compact value={t.height} min={1} onChange={(v) => set({ transform: { height: v } })} suffix="px" /></Field>
        </div>
        <Field label="Rotation" inline><NumberInput compact value={t.rotation} min={-360} max={360} onChange={(v) => set({ transform: { rotation: v } })} suffix="°" /></Field>
      </Section>

      {layer.type === 'text' && <TextStyle layer={layer} set={set} live={live} snapshot={snapshot} />}
      {layer.type === 'shape' && <ShapeStyle layer={layer} set={set} live={live} snapshot={snapshot} />}
      {(layer.type === 'image' || layer.type === 'video') && <MediaStyle layer={layer} set={set} live={live} snapshot={snapshot} />}
    </div>
  )
}

type StyleProps<L> = { layer: L; set: (p: LayerPatch) => void; live: (p: LayerPatch) => void; snapshot: () => void }

function TextStyle({ layer, set, live, snapshot }: StyleProps<Extract<Layer, { type: 'text' }>>) {
  const tx = layer.text
  return (
    <>
      <Section title="Text">
        <textarea className="field h-20 resize-none py-1.5 leading-snug" value={tx.content} onChange={(e) => live({ text: { content: e.target.value } })} onFocus={snapshot} />
        <Field label="Font" inline><SelectInput compact value={tx.fontFamily} options={FONT_FAMILIES.map((f) => ({ value: f, label: f }))} onChange={(v) => set({ text: { fontFamily: v } })} /></Field>
        <Field label="Weight" inline>
          <SelectInput compact value={tx.fontWeight} options={[{ value: 400, label: 'Regular' }, { value: 500, label: 'Medium' }, { value: 600, label: 'Semibold' }, { value: 700, label: 'Bold' }, { value: 800, label: 'Extra bold' }]} onChange={(v) => set({ text: { fontWeight: v } })} />
        </Field>
        <Field label="Size" inline><NumberInput compact value={tx.fontSize} min={4} max={800} onChange={(v) => set({ text: { fontSize: v } })} suffix="px" /></Field>
        <Field label="Tracking" inline><NumberInput compact value={tx.letterSpacing} min={-50} max={200} step={0.5} onChange={(v) => set({ text: { letterSpacing: v } })} suffix="px" /></Field>
        <Field label="Line height" inline><NumberInput compact value={tx.lineHeight} min={0.5} max={4} step={0.1} onChange={(v) => set({ text: { lineHeight: v } })} /></Field>
        <Field label="Shadow" inline><NumberInput compact value={tx.shadow ?? 0} min={0} max={60} onChange={(v) => set({ text: { shadow: v } })} suffix="px" /></Field>
        <div className="flex items-center gap-2">
          <Segmented value={tx.align} options={[{ value: 'left', label: <AlignLeft size={13} /> }, { value: 'center', label: <AlignCenter size={13} /> }, { value: 'right', label: <AlignRight size={13} /> }]} onChange={(v) => set({ text: { align: v } })} className="flex-1" />
          <button className={`icon-btn h-9 w-9 rounded-lg bg-well ${tx.italic ? 'active' : ''}`} title="Italic" onClick={() => set({ text: { italic: !tx.italic } })}><Italic size={13} /></button>
        </div>
      </Section>
      <Section title="Colour">
        <Field label="Text" inline><ColorInput value={tx.color} onDragStart={snapshot} onChange={(v) => v && live({ text: { color: v } })} /></Field>
        <Field label="Pill" inline><ColorInput value={tx.backgroundColor} allowNone onDragStart={snapshot} onChange={(v) => live({ text: { backgroundColor: v } })} /></Field>
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Pad" inline><NumberInput compact value={tx.padding} min={0} max={400} onChange={(v) => set({ text: { padding: v } })} suffix="px" /></Field>
          <Field label="Radius" inline><NumberInput compact value={tx.borderRadius} min={0} max={1000} onChange={(v) => set({ text: { borderRadius: v } })} suffix="px" /></Field>
        </div>
      </Section>
    </>
  )
}

function ShapeStyle({ layer, set, live, snapshot }: StyleProps<Extract<Layer, { type: 'shape' }>>) {
  const s = layer.shape
  return (
    <Section title="Shape">
      <Field label="Type" inline><SelectInput compact value={s.shape} options={[{ value: 'rect', label: 'Rectangle' }, { value: 'ellipse', label: 'Ellipse' }, { value: 'line', label: 'Line' }, { value: 'triangle', label: 'Triangle' }]} onChange={(v) => set({ shape: { shape: v } })} /></Field>
      <Field label="Fill" inline><ColorInput value={s.fill} onDragStart={snapshot} onChange={(v) => v && live({ shape: { fill: v } })} /></Field>
      <Field label="Outline" inline><ColorInput value={s.stroke} onDragStart={snapshot} onChange={(v) => v && live({ shape: { stroke: v } })} /></Field>
      <Field label={s.shape === 'line' ? 'Thickness' : 'Outline width'} inline><NumberInput compact value={s.strokeWidth} min={0} max={200} onChange={(v) => set({ shape: { strokeWidth: v } })} suffix="px" /></Field>
      {(s.shape === 'rect' || s.shape === 'line') && <Field label="Radius" inline><NumberInput compact value={s.borderRadius} min={0} max={1000} onChange={(v) => set({ shape: { borderRadius: v } })} suffix="px" /></Field>}
      {s.shape !== 'triangle' && (
        <>
          <Field label="Gradient to" inline>
            <ColorInput value={s.gradient?.to ?? null} allowNone onDragStart={snapshot} onChange={(v) => live({ shape: { gradient: v ? { to: v, angle: s.gradient?.angle ?? 180, ...(s.gradient?.type ? { type: s.gradient.type } : {}) } : null } })} />
          </Field>
          {s.gradient && (
            <>
              <Field label="Style" inline><SelectInput compact value={s.gradient.type ?? 'linear'} options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]} onChange={(v) => set({ shape: { gradient: { ...s.gradient!, type: v } } })} /></Field>
              {(s.gradient.type ?? 'linear') === 'linear' && <Field label="Angle" inline><NumberInput compact value={s.gradient.angle} min={-360} max={360} onChange={(v) => set({ shape: { gradient: { ...s.gradient!, angle: v } } })} suffix="°" /></Field>}
            </>
          )}
        </>
      )}
    </Section>
  )
}

function MediaStyle({ layer, set, live, snapshot }: StyleProps<Extract<Layer, { type: 'image' | 'video' }>>) {
  const m = layer.media
  return (
    <Section title={layer.type === 'video' ? 'Video' : 'Image'}>
      <Segmented value={m.fit} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Stretch' }]} onChange={(v) => set({ media: { fit: v } })} className="w-full" />
      <Field label="Radius" inline><NumberInput compact value={m.borderRadius} min={0} max={1000} onChange={(v) => set({ media: { borderRadius: v } })} suffix="px" /></Field>
      {layer.type === 'video' && (
        <>
          <Field label="Volume" inline><SliderInput value={m.volume} min={0} max={1} onDragStart={snapshot} onChange={(v) => live({ media: { volume: v } })} format={(v) => `${Math.round(v * 100)}%`} /></Field>
          <Toggle checked={m.muted} onChange={(v) => set({ media: { muted: v } })} label="Mute video audio" />
        </>
      )}
    </Section>
  )
}

function AudioInspector({ clip }: { clip: Clip }) {
  const commit = useEditor((s) => s.commit)
  const patch = useEditor((s) => s.patch)
  const snapshot = useEditor((s) => s.snapshot)
  const deleteSelection = useEditor((s) => s.deleteSelection)
  const a = clip.audio!
  return (
    <div className="flex-1 overflow-y-auto scroll-thin">
      <Section title="Audio clip" right={<button className="icon-btn h-6 w-6 hover:text-danger" title="Delete" onClick={deleteSelection}><Trash2 size={12} /></button>}>
        <p className="truncate text-[12px] font-medium">{clip.name}</p>
        <Field label="Volume" inline><SliderInput value={a.volume} min={0} max={1} onDragStart={snapshot} onChange={(v) => patch((p) => updateAudio(p, clip.id, { volume: v }))} format={(v) => `${Math.round(v * 100)}%`} /></Field>
        <Field label="Fade in" inline><NumberInput compact value={a.fadeIn} min={0} max={clip.duration} step={0.1} onChange={(v) => commit((p) => updateAudio(p, clip.id, { fadeIn: v }))} suffix="s" /></Field>
        <Field label="Fade out" inline><NumberInput compact value={a.fadeOut} min={0} max={clip.duration} step={0.1} onChange={(v) => commit((p) => updateAudio(p, clip.id, { fadeOut: v }))} suffix="s" /></Field>
        <Toggle checked={a.muted} onChange={(v) => commit((p) => updateAudio(p, clip.id, { muted: v }))} label="Muted" />
      </Section>
      <EmptyState title="Timing lives in the Motion tab" body="Trim the clip on the timeline or edit its start and duration under Motion." />
    </div>
  )
}
