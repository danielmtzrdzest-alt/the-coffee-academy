import { describe, it, expect } from 'vitest'
import { calcularDesbloqueo } from './desbloqueo'

describe('calcularDesbloqueo', () => {
  it('desbloquea solo el primero cuando nada está aprobado', () => {
    const r = calcularDesbloqueo([
      { id: 'a', estado: 'no_iniciado' },
      { id: 'b', estado: 'no_iniciado' },
    ])
    expect(r).toEqual([
      { id: 'a', desbloqueado: true, aprobado: false },
      { id: 'b', desbloqueado: false, aprobado: false },
    ])
  })

  it('desbloquea el siguiente cuando el anterior está aprobado', () => {
    const r = calcularDesbloqueo([
      { id: 'a', estado: 'aprobado' },
      { id: 'b', estado: 'no_iniciado' },
      { id: 'c', estado: 'no_iniciado' },
    ])
    expect(r[1].desbloqueado).toBe(true)
    expect(r[2].desbloqueado).toBe(false)
  })

  it('cuenta como completados los aprobados consecutivos', () => {
    const r = calcularDesbloqueo([
      { id: 'a', estado: 'aprobado' },
      { id: 'b', estado: 'aprobado' },
      { id: 'c', estado: 'no_iniciado' },
    ])
    expect(r[2].desbloqueado).toBe(true)
  })
})
