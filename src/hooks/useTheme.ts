import { useEffect, useSyncExternalStore } from 'react'
import { storageKey } from '@/utils/storage'

export type ThemePreference = 'light' | 'dark'
const KEY = storageKey('theme')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePreference) {
  document.documentElement.dataset.theme = pref
}

export function setThemePreference(pref: ThemePreference) {
  localStorage.setItem(KEY, pref)
  applyTheme(pref)
  listeners.forEach((l) => l())
}

/** Apply the stored preference immediately (call once at startup). Light is the default. */
export function initTheme() {
  applyTheme(readPreference())
}

export function useTheme(): [ThemePreference, (p: ThemePreference) => void] {
  const pref = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, readPreference, () => 'light' as ThemePreference)
  useEffect(() => applyTheme(pref), [pref])
  return [pref, setThemePreference]
}
