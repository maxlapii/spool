import { APP_SLUG } from '@shared/brand'

/** Key for something this app keeps in the browser. */
export const storageKey = (name: string) => `${APP_SLUG}:${name}`

/** Keys used before the app was renamed. */
const LEGACY: [string, string][] = [
  ['motion-studio:projects', storageKey('projects')],
  ['ms:theme', storageKey('theme')],
  ['ms:timelineHeight', storageKey('timelineHeight')],
  ['ms:projectView', storageKey('projectView')],
]

/** Move values saved under the old name to the new keys once, so nothing is lost by the rename. */
export function migrateStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {
  try {
    for (const [oldKey, newKey] of LEGACY) {
      const value = storage.getItem(oldKey)
      if (value === null) continue
      if (storage.getItem(newKey) === null) storage.setItem(newKey, value)
      storage.removeItem(oldKey)
    }
  } catch { /* storage unavailable */ }
}
