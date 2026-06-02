import { describe, it, expect } from 'vitest'
import {
  extensionDe,
  rutaPodcast,
  EXTENSIONES_PODCAST,
  TAMANO_MAX_PODCAST,
} from './podcast'

describe('extensionDe', () => {
  it('acepta formatos permitidos sin importar mayúsculas', () => {
    expect(extensionDe('clase.mp3')).toBe('mp3')
    expect(extensionDe('clase.M4A')).toBe('m4a')
    expect(extensionDe('clase.WAV')).toBe('wav')
    expect(extensionDe('clase.ogg')).toBe('ogg')
  })
  it('rechaza formatos no permitidos o sin extensión', () => {
    expect(extensionDe('notas.txt')).toBeNull()
    expect(extensionDe('sinextension')).toBeNull()
    expect(extensionDe('video.mp4')).toBeNull()
  })
})

describe('rutaPodcast', () => {
  it('produce slug-uuid.ext conservando extensión y slugificando la base', () => {
    expect(rutaPodcast('Bienvenida al Café.mp3')).toMatch(
      /^bienvenida-al-cafe-[0-9a-f]{8}\.mp3$/
    )
  })
  it('normaliza la extensión a minúsculas', () => {
    expect(rutaPodcast('Clase 1.M4A')).toMatch(/^clase-1-[0-9a-f]{8}\.m4a$/)
  })
  it('usa una base de respaldo cuando el nombre es solo extensión', () => {
    expect(rutaPodcast('.mp3')).toMatch(/^audio-[0-9a-f]{8}\.mp3$/)
  })
})

describe('constantes', () => {
  it('expone allowlist y tamaño máximo', () => {
    expect(EXTENSIONES_PODCAST).toEqual(['mp3', 'm4a', 'wav', 'ogg'])
    expect(TAMANO_MAX_PODCAST).toBe(50 * 1024 * 1024)
  })
})
