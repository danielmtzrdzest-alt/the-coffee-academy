'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { examenSchema, type ExamenInput } from '@/lib/admin/schemas'

export interface PreguntaEditor {
  enunciado: string
  pista: string | null
  opciones: { texto: string; esCorrecta: boolean }[]
}

export async function cargarExamen(moduloId: string): Promise<PreguntaEditor[]> {
  await requireRol(['admin'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('lms_preguntas')
    .select('enunciado, pista, orden, lms_opciones(texto, es_correcta, orden)')
    .eq('modulo_id', moduloId)
    .order('orden')

  return (data ?? []).map((p) => ({
    enunciado: p.enunciado,
    pista: p.pista,
    opciones: [...((p.lms_opciones as { texto: string; es_correcta: boolean; orden: number }[]) ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((o) => ({ texto: o.texto, esCorrecta: o.es_correcta })),
  }))
}

export async function guardarExamen(input: ExamenInput): Promise<void> {
  await requireRol(['admin'])
  const d = examenSchema.parse(input)
  const supabase = await createClient()

  // Borrar y recrear (las opciones caen por ON DELETE CASCADE de pregunta_id).
  await supabase.from('lms_preguntas').delete().eq('modulo_id', d.moduloId)

  for (let i = 0; i < d.preguntas.length; i++) {
    const p = d.preguntas[i]
    const { data: pregRow, error: errPreg } = await supabase
      .from('lms_preguntas')
      .insert({ modulo_id: d.moduloId, numero: i + 1, enunciado: p.enunciado, pista: p.pista, orden: i + 1 })
      .select('id')
      .single()
    if (errPreg) throw new Error(errPreg.message)

    const opciones = p.opciones.map((o, j) => ({
      pregunta_id: pregRow.id,
      texto: o.texto,
      es_correcta: o.esCorrecta,
      orden: j,
    }))
    const { error: errOpc } = await supabase.from('lms_opciones').insert(opciones)
    if (errOpc) throw new Error(errOpc.message)
  }

  revalidatePath(`/admin/modulos/${d.moduloId}/examen`)
}
