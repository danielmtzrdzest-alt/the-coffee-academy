'use client'
export interface PreguntaCliente {
  id: string
  numero: number
  enunciado: string
  pista: string | null
  opciones: { id: string; texto: string }[]
}
export function Examen(_: {
  moduloId: string
  preguntas: PreguntaCliente[]
  minAprob: number
  yaAprobado: boolean
}) {
  return <p>Examen (pendiente)</p>
}
