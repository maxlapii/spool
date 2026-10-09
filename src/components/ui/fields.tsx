import { useState, useEffect, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  if (inline) {
    return (
      <label className="flex h-8 min-w-0 items-center gap-2 rounded-lg bg-well pl-2.5 pr-1">
        <span className="shrink-0 text-[12px] text-ink-muted">{label}</span>
        <span className="flex min-w-0 flex-1 items-center justify-end">{children}</span>
      </label>
    )
  }
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

/** Collapsible panel section with an uppercase title, mtioon-style. */
export function Section({ title, children, right, className = '', defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; className?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`border-b border-line px-3 py-2.5 last:border-b-0 ${className}`}>
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted" onClick={() => setOpen((o) => !o)}>
          {title}
          <ChevronDown size={12} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {right}
      </div>
      {open && <div className="mt-1.5 space-y-2">{children}</div>}
    </section>
  )
}

interface NumberInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  decimals?: number
  className?: string
  compact?: boolean
}

/** Number field that commits on blur / Enter and supports arrow-key stepping. */
export function NumberInput({ value, onChange, min = -Infinity, max = Infinity, step = 1, suffix, decimals = 2, className = '', compact }: NumberInputProps) {
  const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(decimals).replace(/\.?0+$/, ''))
  const [text, setText] = useState(format(value))
  useEffect(() => setText(format(value)), [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (raw: string) => {
    const n = parseFloat(raw)
    if (Number.isFinite(n)) {
      const clamped = Math.min(max, Math.max(min, n))
      if (clamped !== value) onChange(clamped)
      setText(format(clamped))
    } else setText(format(value))
  }
  return (
    <div className={`relative ${compact ? 'flex w-full justify-end' : ''} ${className}`}>
      <input
        className={`field pr-6 text-right font-mono tabular-nums ${compact ? `h-7 max-w-[124px] bg-transparent px-1.5 hover:bg-panel ${suffix && suffix.length > 1 ? 'pr-7' : 'pr-5'}` : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step)
            commit(String((parseFloat(text) || 0) + delta))
          }
        }}
      />
      {suffix && <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] text-ink-faint ${compact ? 'right-1.5' : 'right-2'}`}>{suffix}</span>}
    </div>
  )
}

export function SelectInput<T extends string | number>({ value, options, onChange, className = '', compact }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string; compact?: boolean }) {
  return (
    <div className={`relative ${compact ? 'w-full max-w-[168px]' : ''} ${className}`}>
      <select
        className={`field appearance-none pr-6 ${compact ? 'h-7 bg-transparent px-1.5 text-right hover:bg-panel' : ''}`}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value
          const opt = options.find((o) => String(o.value) === raw)
          if (opt) onChange(opt.value)
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint" />
    </div>
  )
}

export function ColorInput({ value, onChange, allowNone, onDragStart }: { value: string | null; onChange: (v: string | null) => void; allowNone?: boolean; onDragStart?: () => void }) {
  const [text, setText] = useState(value ?? '')
  useEffect(() => setText(value ?? ''), [value])
  const hex = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : value && /^#[0-9a-fA-F]{3}$/.test(value) ? '#' + value.slice(1).split('').map((c) => c + c).join('') : '#000000'
  return (
    <div className="flex w-full max-w-[150px] items-center gap-1.5">
      <input type="color" value={hex} onMouseDown={onDragStart} onChange={(e) => onChange(e.target.value)} aria-label="Pick color" />
      <input
        className="field h-7 min-w-0 bg-transparent px-1.5 font-mono hover:bg-panel"
        value={text}
        placeholder={allowNone ? 'none' : '#000000'}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = text.trim()
          if (v === '' && allowNone) onChange(null)
          else if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) || /^(rgba?|hsla?)\(/.test(v) || v === 'transparent') onChange(v)
          else setText(value ?? '')
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  )
}

export function SliderInput({ value, min, max, step = 0.01, onChange, onDragStart, suffix, format }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onDragStart?: () => void; suffix?: string; format?: (v: number) => string }) {
  return (
    <div className="flex w-full items-center gap-2 pr-1.5">
      <input type="range" className="h-1 min-w-0 flex-1" min={min} max={max} step={step} value={value} onPointerDown={onDragStart} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-muted">{format ? format(value) : `${Math.round(value * 100) / 100}${suffix ?? ''}`}</span>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex h-8 w-full items-center justify-between rounded-lg bg-well pl-2.5 pr-2 text-[12px] text-ink-muted">
      {label}
      <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, className = '' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`inline-flex h-8 items-center rounded-lg bg-well p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex h-full flex-1 items-center justify-center rounded-md px-2 text-[11px] font-semibold ${o.value === value ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, body }: { icon?: ReactNode; title: string; body?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      {body && <div className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{body}</div>}
    </div>
  )
}
