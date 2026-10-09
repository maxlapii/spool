import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

/** Light / dark switch (icons only), remembered per browser. */
export function ThemeToggle() {
  const [pref, setPref] = useTheme()
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-lg bg-well p-0.5" role="radiogroup" aria-label="Colour theme">
      {([['light', Sun, 'Light'], ['dark', Moon, 'Dark']] as const).map(([value, Icon, label]) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          title={label}
          aria-label={label}
          onClick={() => setPref(value)}
          className={`theme-opt flex h-8 w-9 items-center justify-center rounded-md transition-colors duration-150 ${pref === value ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
