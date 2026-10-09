const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Short, URL-safe unique id with an optional prefix (e.g. "clip_x7k2m9ab"). */
export function uid(prefix = ''): string {
  let id = ''
  const bytes = new Uint8Array(10)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  for (const b of bytes) id += alphabet[b % alphabet.length]
  return prefix ? `${prefix}_${id}` : id
}
