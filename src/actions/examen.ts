'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calificar } from '@/lib/examenes/calificar'

const schema = z.object({
  moduloId: z.string().uuid(),
  respuestas: z.record(z.string(), z.string()), // pregunta_id -> opcion_id
})

export interface RespuestaExamen {
  calificacion: number
  aprobado: boolean
  detalle: Record<string, boolean>
}

export async function enviarExamen(input: {
  moduloId: string
  respuestas: Record<string, string>
}): Promise<RespuestaExamen> {
  const { moduloId, respuestas } = schema.parse(input)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Respuestas correctas + mínimo: se leen con service role (no llegan al cliente)
  const admin = createAdminClient()
  const { data: modulo } = await admin
    .from('lms_modulos')
    .select('examen_min_aprob')
    .eq('id', moduloId)
    .single()
  const { data: preguntas } = await admin
    .from('lms_preguntas')
    .select('id, lms_opciones(id, es_correcta)')
    .eq('modulo_id', moduloId)

  const correctas: Record<string, string> = {}
  for (const p of preguntas ?? []) {
    const correcta = (p.lms_opciones as { id: string; es_correcta: boolean }[] ?? []).find((o) => o.es_correcta)
    if (correcta) correctas[p.id] = correcta.id
  }

  const min = modulo?.examen_min_aprob ?? 80
  const resultado = calificar(correctas, respuestas, min)

  // Registrar intento (RLS: perfil_id = auth.uid())
  await supabase.from('lms_intentos').insert({
    perfil_id: user.id,
    modulo_id: moduloId,
    calificacion: resultado.calificacion,
    aprobado: resultado.aprobado,
    respuestas,
  })

  // Actualizar progreso
  await supabase.from('lms_progreso').upsert(
    {
      perfil_id: user.id,
      modulo_id: moduloId,
      estado: resultado.aprobado ? 'aprobado' : 'reprobado',
      ultima_calif: resultado.calificacion,
      completado_at: resultado.aprobado ? new Date().toISOString() : null,
    },
    { onConflict: 'perfil_id,modulo_id' }
  )

  // Incrementar contador de intentos
  await supabase.rpc('lms_incrementar_intentos', {
    p_perfil: user.id,
    p_modulo: moduloId,
  })

  return resultado
}
