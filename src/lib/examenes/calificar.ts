export interface ResultadoCalificacion {
  calificacion: number // 0-100
  aprobado: boolean
  detalle: Record<string, boolean> // pregunta_id -> acertó
}

export function calificar(
  correctas: Record<string, string>,
  respuestas: Record<string, string>,
  minAprob: number
): ResultadoCalificacion {
  const ids = Object.keys(correctas)
  const detalle: Record<string, boolean> = {}
  let aciertos = 0
  for (const id of ids) {
    const acerto = respuestas[id] === correctas[id]
    detalle[id] = acerto
    if (acerto) aciertos++
  }
  const calificacion = ids.length ? Math.round((aciertos / ids.length) * 100) : 0
  return { calificacion, aprobado: calificacion >= minAprob, detalle }
}
