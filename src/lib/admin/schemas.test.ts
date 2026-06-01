import { describe, it, expect } from 'vitest'
import { cursoSchema, moduloSchema, examenSchema, baristaSchema } from './schemas'

describe('cursoSchema', () => {
  it('acepta un curso válido', () => {
    const r = cursoSchema.parse({ titulo: 'Capacitación Barista', nivel: 'introductorio' })
    expect(r.activo).toBe(true)
    expect(r.rolesAuto).toEqual([])
  })
  it('rechaza título corto', () => {
    expect(() => cursoSchema.parse({ titulo: 'ab', nivel: 'introductorio' })).toThrow()
  })
})

describe('moduloSchema', () => {
  it('acepta podcastUrl vacía', () => {
    const r = moduloSchema.parse({
      cursoId: '00000000-0000-0000-0000-000000000000',
      numero: 1, titulo: 'Bienvenida', podcastUrl: '',
    })
    expect(r.examenMinAprob).toBe(80)
  })
})

describe('examenSchema', () => {
  const base = {
    moduloId: '00000000-0000-0000-0000-000000000000',
    preguntas: [{
      enunciado: '¿Pregunta?',
      opciones: [
        { texto: 'A', esCorrecta: true },
        { texto: 'B', esCorrecta: false },
      ],
    }],
  }
  it('acepta exactamente una opción correcta', () => {
    expect(() => examenSchema.parse(base)).not.toThrow()
  })
  it('rechaza si no hay exactamente una correcta', () => {
    const malo = { ...base, preguntas: [{
      enunciado: '¿Q?',
      opciones: [{ texto: 'A', esCorrecta: true }, { texto: 'B', esCorrecta: true }],
    }] }
    expect(() => examenSchema.parse(malo)).toThrow()
  })
})

describe('baristaSchema', () => {
  it('rechaza correo inválido', () => {
    expect(() => baristaSchema.parse({ nombre: 'Juan Pérez', correo: 'no-es-correo', sucursalId: null })).toThrow()
  })
})
