'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { enviarExamen, type RespuestaExamen } from '@/actions/examen'

export interface PreguntaCliente {
  id: string
  numero: number
  enunciado: string
  pista: string | null
  opciones: { id: string; texto: string }[]
}

export function Examen({
  moduloId,
  preguntas,
  minAprob,
  yaAprobado,
}: {
  moduloId: string
  preguntas: PreguntaCliente[]
  minAprob: number
  yaAprobado: boolean
}) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [pistaVisible, setPistaVisible] = useState<Record<string, boolean>>({})
  const [resultado, setResultado] = useState<RespuestaExamen | null>(null)
  const [enviando, setEnviando] = useState(false)

  const completo = preguntas.every((p) => respuestas[p.id])

  async function enviar() {
    setEnviando(true)
    try {
      const r = await enviarExamen({ moduloId, respuestas })
      setResultado(r)
      if (r.aprobado) toast.success(`¡Aprobado! ${r.calificacion}%`)
      else toast.error(`Reprobado: ${r.calificacion}% (mínimo ${minAprob}%)`)
    } catch {
      toast.error('No se pudo enviar el examen.')
    } finally {
      setEnviando(false)
    }
  }

  if (yaAprobado && !resultado) {
    return <p className="text-green-700">Ya aprobaste este módulo ✓</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {preguntas.map((p) => (
        <div key={p.id} className="flex flex-col gap-2">
          <p className="font-medium">{p.numero}. {p.enunciado}</p>
          {p.opciones.map((o) => {
            const sel = respuestas[p.id] === o.id
            const acerto = resultado?.detalle[p.id]
            const mostrarColor = resultado && sel
            return (
              <button
                key={o.id}
                disabled={!!resultado}
                onClick={() => setRespuestas((r) => ({ ...r, [p.id]: o.id }))}
                className={`rounded border p-3 text-left text-sm ${
                  mostrarColor
                    ? acerto ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
                    : sel ? 'border-[var(--cafe)] bg-[var(--cafe)]/10' : 'border-[var(--cafe)]/20'
                }`}
              >
                {o.texto}
              </button>
            )
          })}
          {p.pista && !resultado && (
            <button
              onClick={() => setPistaVisible((v) => ({ ...v, [p.id]: !v[p.id] }))}
              className="self-start text-xs underline opacity-70"
            >
              {pistaVisible[p.id] ? p.pista : 'Ver pista'}
            </button>
          )}
        </div>
      ))}

      {!resultado ? (
        <button
          onClick={enviar}
          disabled={!completo || enviando}
          className="rounded bg-[var(--cafe)] p-3 font-semibold text-white disabled:opacity-40"
        >
          {enviando ? 'Calificando…' : 'Enviar examen'}
        </button>
      ) : (
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{resultado.calificacion}%</p>
          <p className={resultado.aprobado ? 'text-green-700' : 'text-red-700'}>
            {resultado.aprobado ? '¡Aprobado!' : 'Reprobado'}
          </p>
          {!resultado.aprobado && (
            <button
              onClick={() => { setResultado(null); setRespuestas({}) }}
              className="mt-3 rounded bg-[var(--cafe)] px-4 py-2 text-sm text-white"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
