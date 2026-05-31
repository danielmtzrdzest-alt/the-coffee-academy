import { describe, it, expect } from 'vitest'
import { parsearModulo } from './loader'

const MD = `# Módulo 02 — El café espresso, calibración y extracción

*Capacitación para barra · The Coffee · Nivel: introductorio*

## De qué trata este módulo

Texto del contenido...
`

const GUIA = `# Guía de uso — Capacitación para Barra en módulos de podcast

## Para qué sirve este paquete

Texto...
`

describe('parsearModulo', () => {
  it('extrae número (de numeroStr) y título del encabezado de módulo', () => {
    const m = parsearModulo(MD, '02')
    expect(m.numero).toBe(2)
    expect(m.titulo).toBe('El café espresso, calibración y extracción')
  })

  it('genera un slug a partir del número y el título', () => {
    const m = parsearModulo(MD, '02')
    expect(m.slug).toBe('02-el-cafe-espresso-calibracion-y-extraccion')
  })

  it('conserva el markdown completo como contenido', () => {
    const m = parsearModulo(MD, '02')
    expect(m.contenidoMd).toContain('## De qué trata este módulo')
  })

  it('usa el primer H1 como título cuando el encabezado no es "# Módulo NN —"', () => {
    const m = parsearModulo(GUIA, '00')
    expect(m.numero).toBe(0)
    expect(m.titulo).toBe('Guía de uso — Capacitación para Barra en módulos de podcast')
    expect(m.slug).toBe('00-guia-de-uso-capacitacion-para-barra-en-modulos-de-podcast')
  })

  it('lanza error si no hay ningún encabezado H1', () => {
    expect(() => parsearModulo('texto sin encabezado\n', '03')).toThrow()
  })
})
