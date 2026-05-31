import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Lock, PlayCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function CursoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: curso } = await supabase
    .from('lms_cursos')
    .select('id, titulo, lms_modulos(id, slug, numero, titulo, orden)')
    .eq('slug', slug)
    .single()
  if (!curso) notFound()

  const modulos = [...(curso.lms_modulos ?? [])].sort((a, b) => a.orden - b.orden)

  const { data: progreso } = await supabase
    .from('lms_progreso')
    .select('modulo_id, estado')
    .eq('perfil_id', user.id)

  const estadoPorModulo = new Map(
    (progreso ?? []).map((p) => [p.modulo_id, p.estado])
  )

  // Desbloqueo progresivo: un módulo está desbloqueado si es el primero o el
  // anterior está aprobado.
  let anteriorAprobado = true

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">{curso.titulo}</h1>
      {modulos.map((m) => {
        const estado = estadoPorModulo.get(m.id) ?? 'no_iniciado'
        const aprobado = estado === 'aprobado'
        const desbloqueado = anteriorAprobado
        anteriorAprobado = aprobado // para el siguiente del loop

        const Icono = aprobado ? CheckCircle2 : desbloqueado ? PlayCircle : Lock
        const inner = (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
            <Icono size={22} className={aprobado ? 'text-green-600' : 'opacity-70'} />
            <div>
              <p className="text-xs opacity-60">Módulo {m.numero}</p>
              <p className="font-medium">{m.titulo}</p>
            </div>
          </div>
        )
        return desbloqueado ? (
          <Link key={m.id} href={`/modulo/${m.slug}`}>{inner}</Link>
        ) : (
          <div key={m.id} className="opacity-50">{inner}</div>
        )
      })}
    </section>
  )
}
