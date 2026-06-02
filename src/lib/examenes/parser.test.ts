import { describe, it, expect } from 'vitest'
import { parsearExamen } from './parser'

const MD = `# Examen — Módulo 01

## Pregunta 1
¿Cuál es el propósito de los manuales?

- [x] Asegurar calidad consistente
- [ ] Cumplir requisitos legales
- [ ] Reducir colaboradores

**Pista:** Piensa en la reputación entre sucursales.

## Pregunta 2
¿Qué categoría tiene un café de 86 puntos?

- [ ] White (W)
- [x] Craft (K)
- [ ] Black (B)
`

describe('parsearExamen', () => {
  it('extrae todas las preguntas', () => {
    const preguntas = parsearExamen(MD)
    expect(preguntas).toHaveLength(2)
  })

  it('extrae enunciado, opciones y la correcta', () => {
    const [p1] = parsearExamen(MD)
    expect(p1.numero).toBe(1)
    expect(p1.enunciado).toBe('¿Cuál es el propósito de los manuales?')
    expect(p1.opciones).toHaveLength(3)
    expect(p1.opciones[0]).toEqual({ texto: 'Asegurar calidad consistente', esCorrecta: true })
    expect(p1.opciones[1].esCorrecta).toBe(false)
  })

  it('extrae la pista cuando existe y es null cuando no', () => {
    const [p1, p2] = parsearExamen(MD)
    expect(p1.pista).toBe('Piensa en la reputación entre sucursales.')
    expect(p2.pista).toBeNull()
  })
})
