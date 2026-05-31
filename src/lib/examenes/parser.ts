export interface OpcionParseada {
  texto: string
  esCorrecta: boolean
}

export interface PreguntaParseada {
  numero: number
  enunciado: string
  pista: string | null
  opciones: OpcionParseada[]
}

const RE_PREGUNTA = /^##\s+Pregunta\s+(\d+)\s*$/i
const RE_OPCION = /^-\s+\[( |x|X)\]\s+(.*)$/
const RE_PISTA = /^\*\*Pista:\*\*\s*(.*)$/i

export function parsearExamen(md: string): PreguntaParseada[] {
  const lineas = md.split('\n')
  const preguntas: PreguntaParseada[] = []
  let actual: PreguntaParseada | null = null
  const enunciadoBuffer: string[] = []

  const cerrarEnunciado = () => {
    if (actual && actual.enunciado === '' && enunciadoBuffer.length) {
      actual.enunciado = enunciadoBuffer.join(' ').trim()
    }
  }

  for (const lineaRaw of lineas) {
    const linea = lineaRaw.trimEnd()
    const mPregunta = linea.match(RE_PREGUNTA)
    if (mPregunta) {
      cerrarEnunciado()
      if (actual) preguntas.push(actual)
      actual = { numero: Number(mPregunta[1]), enunciado: '', pista: null, opciones: [] }
      enunciadoBuffer.length = 0
      continue
    }
    if (!actual) continue

    const mOpcion = linea.match(RE_OPCION)
    if (mOpcion) {
      cerrarEnunciado()
      actual.opciones.push({
        texto: mOpcion[2].trim(),
        esCorrecta: mOpcion[1].toLowerCase() === 'x',
      })
      continue
    }

    const mPista = linea.match(RE_PISTA)
    if (mPista) {
      actual.pista = mPista[1].trim()
      continue
    }

    // Línea de enunciado (antes de las opciones)
    if (actual.opciones.length === 0 && linea.trim() !== '') {
      enunciadoBuffer.push(linea.trim())
    }
  }
  cerrarEnunciado()
  if (actual) preguntas.push(actual)
  return preguntas
}
