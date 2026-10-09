import { describe, expect, it } from 'vitest'
import { APP_NAME, APP_SLUG } from '@shared/brand'
import { migrateStorage, storageKey } from '@/utils/storage'
import { createDemoProject } from '../project'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null }
  setItem(k: string, v: string) { this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
  keys() { return [...this.data.keys()].sort() }
}

describe('product name', () => {
  it('is Spool, with a matching slug used for storage keys', () => {
    expect(APP_NAME).toBe('Spool')
    expect(APP_SLUG).toBe('spool')
    expect(storageKey('theme')).toBe('spool:theme')
  })

  it('uses the name in the demo composition', () => {
    const demo = createDemoProject()
    const texts = demo.layers.filter((l) => l.type === 'text').map((l) => (l as { text: { content: string } }).text.content)
    expect(texts).toContain('Spool')
    expect(texts).not.toContain('Motion Studio')
  })

  it('moves browser data saved under the old name to the new keys', () => {
    const s = new MemoryStorage()
    s.setItem('motion-studio:projects', '{"p1":{}}')
    s.setItem('ms:theme', 'dark')
    s.setItem('ms:timelineHeight', '300')
    s.setItem('ms:projectView', 'cards')
    migrateStorage(s)
    expect(s.keys()).toEqual(['spool:projectView', 'spool:projects', 'spool:theme', 'spool:timelineHeight'])
    expect(s.getItem('spool:theme')).toBe('dark')
    expect(s.getItem('spool:projects')).toBe('{"p1":{}}')
  })

  it('never overwrites newer data and is safe to run twice', () => {
    const s = new MemoryStorage()
    s.setItem('ms:theme', 'dark')
    s.setItem('spool:theme', 'light')
    migrateStorage(s)
    migrateStorage(s)
    expect(s.getItem('spool:theme')).toBe('light')
    expect(s.getItem('ms:theme')).toBeNull()
  })
})

describe('logo assets', () => {
  const files = import.meta.glob('/public/favicon.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const html = (import.meta.glob('/index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)['/index.html']
  const oldIcon = import.meta.glob('/src/components/ui/AppLogo.tsx')
  it('uses the wordmark as the logo: the old icon component is gone', () => {
    expect(Object.keys(oldIcon)).toHaveLength(0)
  })
  it('ships a favicon of the two eyes and links it from the page', () => {
    const svg = files['/public/favicon.svg']
    expect(svg).toContain('aria-label="Spool"')
    expect(svg.match(/r="12" fill="#fff"/g) ?? []).toHaveLength(2)
    expect(html).toContain('rel="icon"')
    expect(html).toContain('/favicon.svg')
    expect(html).toContain('<title>Spool</title>')
  })
})

describe('eye behaviour shared by the wordmark and the favicon', () => {
  it('looks toward a point: a little when near, fully from far away, never past 1', async () => {
    const { lookVector } = await import('@/utils/eyes')
    expect(lookVector(0, 0, 100)).toEqual({ x: 0, y: 0 })
    const near = lookVector(20, 0, 100)
    expect(near.x).toBeCloseTo(0.2)
    expect(near.y).toBeCloseTo(0)
    const far = lookVector(300, -400, 100)
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(1)
    expect(far.x).toBeCloseTo(0.6)
    expect(far.y).toBeCloseTo(-0.8)
  })
})
