'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { guardarExamen, type PreguntaEditor } from '@/actions/admin/examenes'

const PREGUNTA_VACIA: PreguntaEditor = {
  enunciado: '',
  pista: null,
  opciones: [{ texto: '', esCorrecta: true }, { texto: '', esCorrecta: false }],
}

export function ExamenEditor({ moduloId, inicial }: { moduloId: string; inicial: PreguntaEditor[] }) {
  const [preguntas, setPreguntas] = useState<PreguntaEditor[]>(
    inicial.length ? inicial : [structuredClone(PREGUNTA_VACIA)]
  )
  const [guardando, setGuardando] = useState(false)

  function actualizar(i: number, patch: Partial<PreguntaEditor>) {
    setPreguntas((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  }
  function setCorrecta(pi: number, oi: number) {
    setPreguntas((ps) => ps.map((p, k) =>
      k === pi ? { ...p, opciones: p.opciones.map((o, j) => ({ ...o, esCorrecta: j === oi })) } : p))
  }
  function setTextoOpcion(pi: number, oi: number, texto: string) {
    setPreguntas((ps) => ps.map((p, k) =>
      k === pi ? { ...p, opciones: p.opciones.map((o, j) => (j === oi ? { ...o, texto } : o)) } : p))
  }

  async function guardar() {
    setGuardando(true)
    try {
      await guardarExamen({
        moduloId,
        preguntas: preguntas.map((p) => ({ ...p, pista: p.pista || null })),
      })
      toast.success('Examen guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {preguntas.map((p, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Pregunta {i + 1}</span>
            <button type="button" onClick={() => setPreguntas((ps) => ps.filter((_, k) => k !== i))}
              className="text-xs text-red-600">Eliminar</button>
          </div>
          <input value={p.enunciado} onChange={(e) => actualizar(i, { enunciado: e.target.value })}
            placeholder="Enunciado" className="rounded border border-[var(--cafe)]/30 p-2" />
          {p.opciones.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`correcta-${i}`} checked={o.esCorrecta} onChange={() => setCorrecta(i, oi)} />
              <input value={o.texto} onChange={(e) => setTextoOpcion(i, oi, e.target.value)}
                placeholder={`Opción ${oi + 1}`} className="flex-1 rounded border border-[var(--cafe)]/30 p-2" />
              <button type="button" onClick={() => actualizar(i, { opciones: p.opciones.filter((_, j) => j !== oi) })}
                className="text-xs opacity-60">✕</button>
            </div>
          ))}
          <button type="button"
            onClick={() => actualizar(i, { opciones: [...p.opciones, { texto: '', esCorrecta: false }] })}
            className="self-start text-xs underline">+ opción</button>
          <input value={p.pista ?? ''} onChange={(e) => actualizar(i, { pista: e.target.value })}
            placeholder="Pista (opcional)" className="rounded border border-[var(--cafe)]/30 p-2 text-sm" />
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={() => setPreguntas((ps) => [...ps, structuredClone(PREGUNTA_VACIA)])}
          className="rounded border border-[var(--cafe)]/30 px-3 py-2 text-sm">+ Pregunta</button>
        <button type="button" onClick={guardar} disabled={guardando}
          className="rounded bg-[var(--cafe)] px-4 py-2 font-semibold text-white disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar examen'}
        </button>
      </div>
    </div>
  )
}
