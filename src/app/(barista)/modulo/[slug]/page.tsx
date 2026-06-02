import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ModuloTabs } from './modulo-tabs'

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: modulo } = await supabase
    .from('lms_modulos')
    .select('id, numero, titulo, contenido_md, podcast_url, examen_min_aprob')
    .eq('slug', slug)
    .single()
  if (!modulo) notFound()

  // Preguntas SIN es_correcta (service role server-side, devolvemos solo id/texto)
  const admin = createAdminClient()
  const { data: preguntasRaw } = await admin
    .from('lms_preguntas')
    .select('id, numero, enunciado, pista, orden, lms_opciones(id, texto, orden)')
    .eq('modulo_id', modulo.id)
    .order('orden')

  const preguntas = (preguntasRaw ?? []).map((p) => ({
    id: p.id,
    numero: p.numero,
    enunciado: p.enunciado,
    pista: p.pista,
    opciones: [...((p.lms_opciones as { id: string; texto: string; orden: number }[]) ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((o) => ({ id: o.id, texto: o.texto })),
  }))

  const { data: prog } = await supabase
    .from('lms_progreso')
    .select('leido, estado, ultima_calif')
    .eq('perfil_id', user.id)
    .eq('modulo_id', modulo.id)
    .maybeSingle()

  return (
    <ModuloTabs
      modulo={modulo}
      preguntas={preguntas}
      leidoInicial={prog?.leido ?? false}
      estadoInicial={prog?.estado ?? 'no_iniciado'}
    />
  )
}
