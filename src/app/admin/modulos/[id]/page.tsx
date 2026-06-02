import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { ModuloForm } from './modulo-form'
import type { ModuloInput } from '@/lib/admin/schemas'

export default async function EditarModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()

  const { data: m } = await supabase
    .from('lms_modulos')
    .select('id, curso_id, numero, titulo, contenido_md, podcast_url, examen_min_aprob, orden, activo')
    .eq('id', id)
    .single()
  if (!m) notFound()

  const inicial: ModuloInput = {
    cursoId: m.curso_id,
    numero: m.numero,
    titulo: m.titulo,
    contenidoMd: m.contenido_md ?? '',
    podcastUrl: m.podcast_url ?? '',
    examenMinAprob: m.examen_min_aprob,
    orden: m.orden,
    activo: m.activo,
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Editar módulo</h1>
      <ModuloForm id={id} cursoId={m.curso_id} inicial={inicial} />
    </section>
  )
}
