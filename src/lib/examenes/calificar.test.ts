import { describe, it, expect } from 'vitest'
import { calificar } from './calificar'

const correctas = { p1: 'a', p2: 'c', p3: 'b' } // pregunta_id -> opcion_id correcta

describe('calificar', () => {
  it('da 100% cuando todas son correctas', () => {
    const r = calificar(correctas, { p1: 'a', p2: 'c', p3: 'b' }, 80)
    expect(r.calificacion).toBe(100)
    expect(r.aprobado).toBe(true)
  })

  it('calcula el porcentaje correcto con respuestas parciales', () => {
    const r = calificar(correctas, { p1: 'a', p2: 'x', p3: 'b' }, 80)
    expect(r.calificacion).toBe(67) // 2 de 3 redondeado
    expect(r.aprobado).toBe(false)
  })

  it('aprueba justo en el mínimo', () => {
    const r = calificar({ p1: 'a', p2: 'b' }, { p1: 'a', p2: 'b' }, 100)
    expect(r.aprobado).toBe(true)
  })

  it('marca como incorrecta una pregunta sin responder', () => {
    const r = calificar(correctas, { p1: 'a' }, 80)
    expect(r.calificacion).toBe(33)
    expect(r.detalle.p2).toBe(false)
  })
})
