import { slugify } from '@/lib/slug'

export const EXTENSIONES_PODCAST = ['mp3', 'm4a', 'wav', 'ogg'] as const

export const TAMANO_MAX_PODCAST = 50 * 1024 * 1024 // 50 MB

export function extensionDe(nombre: string): string | null {
  const punto = nombre.lastIndexOf('.')
  if (punto === -1) return null
  const ext = nombre.slice(punto + 1).toLowerCase()
  return (EXTENSIONES_PODCAST as readonly string[]).includes(ext) ? ext : null
}

export function rutaPodcast(nombre: string): string {
  const ext = extensionDe(nombre)
  if (!ext) throw new Error('Formato no permitido')
  const punto = nombre.lastIndexOf('.')
  // Fallback 'audio' evita rutas inválidas cuando el nombre es solo extensión.
  const base = slugify(nombre.slice(0, punto)) || 'audio'
  const uuidCorto = crypto.randomUUID().slice(0, 8)
  return `${base}-${uuidCorto}.${ext}`
}
