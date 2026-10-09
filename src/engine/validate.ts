export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message)
}

export function assertFinite(v: unknown, name: string): asserts v is number {
  assert(typeof v === 'number' && Number.isFinite(v), `${name} must be a finite number`)
}

export function assertRange(v: unknown, name: string, min: number, max: number): asserts v is number {
  assertFinite(v, name)
  assert(v >= min && v <= max, `${name} must be between ${min} and ${max} (got ${v})`)
}

export function assertNonNegative(v: unknown, name: string): asserts v is number {
  assertFinite(v, name)
  assert(v >= 0, `${name} must be >= 0 (got ${v})`)
}

export function assertPositive(v: unknown, name: string): asserts v is number {
  assertFinite(v, name)
  assert(v > 0, `${name} must be > 0 (got ${v})`)
}

const COLOR_RE = /^(#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|transparent)$/i

export function isColor(v: unknown): v is string {
  return typeof v === 'string' && COLOR_RE.test(v.trim())
}

export function assertColor(v: unknown, name: string): asserts v is string {
  assert(isColor(v), `${name} must be a CSS color like #9a5bf5 or rgba(0,0,0,0.5)`)
}
