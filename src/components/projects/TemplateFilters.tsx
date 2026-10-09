import { Search, X } from 'lucide-react'
import { TEMPLATE_FILTERS, type TemplateFilter } from '@/engine/templates'

/** Category chips (with "All") and a search box for the template strip. */
export function TemplateFilters({
  query, onQuery, filter, onFilter, counts,
}: {
  query: string
  onQuery: (q: string) => void
  filter: TemplateFilter
  onFilter: (f: TemplateFilter) => void
  counts: Record<TemplateFilter, number>
}) {
  return (
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-0.5" role="group" aria-label="Filter templates by category">
        {TEMPLATE_FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(f.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[12px] font-semibold transition-colors duration-150 ${active ? 'border-accent bg-accent text-white' : 'border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink'}`}
            >
              {f.label}
              <span className={`font-mono text-[10px] ${active ? 'text-white/80' : 'text-ink-faint'}`}>{counts[f.id]}</span>
            </button>
          )
        })}
      </div>
      <label className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          className="field h-9 w-52 bg-panel pl-7 pr-7"
          placeholder="Search templates"
          aria-label="Search templates"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onQuery('') }}
        />
        {query && (
          <button type="button" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:bg-well hover:text-ink" onClick={() => onQuery('')} aria-label="Clear search"><X size={12} /></button>
        )}
      </label>
    </div>
  )
}
