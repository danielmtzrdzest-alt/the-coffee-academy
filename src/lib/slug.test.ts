import { describe, it, expect } from 'vitest'
import { slugify, generarSlugUnico } from './slug'

describe('slugify', () => {
  it('quita acentos y normaliza a kebab-case', () => {
    expect(slugify('Bienvenida a The Coffee')).toBe('bienvenida-a-the-coffee')
    expect(slugify('Inocuidad & Limpieza')).toBe('inocuidad-limpieza')
    expect(slugify('  Café con Leche  ')).toBe('cafe-con-leche')
  })
})

describe('generarSlugUnico', () => {
  it('devuelve la base si no colisiona', () => {
    expect(generarSlugUnico('barista', [])).toBe('barista')
  })
  it('agrega sufijo numérico al colisionar', () => {
    expect(generarSlugUnico('barista', ['barista'])).toBe('barista-2')
    expect(generarSlugUnico('barista', ['barista', 'barista-2'])).toBe('barista-3')
  })
})
