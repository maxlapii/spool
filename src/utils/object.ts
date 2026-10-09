/** Return a shallow copy without keys whose value is `undefined` (so partial patches never erase fields). */
export function compact<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(obj) as (keyof T)[]) if (obj[key] !== undefined) out[key] = obj[key]
  return out
}
