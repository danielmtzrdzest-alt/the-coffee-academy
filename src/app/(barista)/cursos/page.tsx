import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface CursoConAvance {
  id: string
  slug: string
  titulo: string
  total: number
  aprobados: number
}

export default async function CursosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Cursos en los que el barista está inscrito
  const { data: inscripciones } = await supabase
    .from('lms_inscripciones')
    .select('curso:lms_cursos(id, slug, titulo, lms_modulos(id))')
    .eq('perfil_id', user.id)

  // Progreso aprobado del barista
  const { data: progreso } = await supabase
    .from('lms_progreso')
    .select('modulo_id, estado')
    .eq('perfil_id', user.id)
    .eq('estado', 'aprobado')

  const aprobadosSet = new Set((progreso ?? []).map((p) => p.modulo_id))

  const cursos: CursoConAvance[] = (inscripciones ?? []).map((ins) => {
    const raw = ins.curso
    // Supabase may return the relation as array or object depending on generated types
    const c = Array.isArray(raw) ? raw[0] : raw
    const modulos: { id: string }[] = (c as { lms_modulos?: { id: string }[] })?.lms_modulos ?? []
    const aprobados = modulos.filter((m) => aprobadosSet.has(m.id)).length
    return {
      id: (c as { id: string }).id,
      slug: (c as { slug: string }).slug,
      titulo: (c as { titulo: string }).titulo,
      total: modulos.length,
      aprobados,
    }
  })

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Mis Cursos</h1>
      {cursos.length === 0 && (
        <p className="text-sm opacity-70">Aún no tienes cursos asignados.</p>
      )}
      {cursos.map((c) => {
        const pct = c.total ? Math.round((c.aprobados / c.total) * 100) : 0
        return (
          <Link
            key={c.id}
            href={`/curso/${c.slug}`}
            className="rounded-xl border border-[var(--cafe)]/15 bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">{c.titulo}</h2>
            <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--cafe)]/10">
              <div className="h-full bg-[var(--cafe)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs opacity-70">
              {c.aprobados} de {c.total} módulos · {pct}%
            </p>
          </Link>
        )
      })}
    </section>
  )
}
