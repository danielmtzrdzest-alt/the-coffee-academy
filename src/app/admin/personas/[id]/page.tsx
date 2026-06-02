import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AsignarCursos } from './asignar-cursos'

export default async function DetalleBaristaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from('lms_perfiles')
    .select('id, nombre, rol')
    .eq('id', id)
    .single()
  if (!perfil) notFound()

  const { data: cursos } = await supabase
    .from('lms_cursos')
    .select('id, titulo')
    .eq('activo', true)
    .order('orden')

  const { data: inscripciones } = await supabase
    .from('lms_inscripciones')
    .select('curso_id')
    .eq('perfil_id', id)

  const { data: progreso } = await supabase
    .from('lms_progreso')
    .select('modulo_id, estado, ultima_calif')
    .eq('perfil_id', id)
    .eq('estado', 'aprobado')

  const asignados = (inscripciones ?? []).map((i) => i.curso_id)

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{perfil.nombre}</h1>

      <div>
        <h2 className="mb-2 font-semibold">Cursos asignados</h2>
        <AsignarCursos perfilId={id} cursos={(cursos ?? []) as { id: string; titulo: string }[]} asignadosInicial={asignados} />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Progreso</h2>
        <p className="text-sm opacity-70">{(progreso ?? []).length} módulos aprobados.</p>
      </div>
    </section>
  )
}
