import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { CursoForm } from '../curso-form'
import type { CursoInput } from '@/lib/admin/schemas'

export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()

  const { data: curso } = await supabase
    .from('lms_cursos')
    .select('id, titulo, descripcion, nivel, orden, activo, roles_auto')
    .eq('id', id)
    .single()
  if (!curso) notFound()

  const { data: modulos } = await supabase
    .from('lms_modulos')
    .select('id, numero, titulo, activo')
    .eq('curso_id', id)
    .order('orden')

  const inicial: CursoInput = {
    titulo: curso.titulo,
    descripcion: curso.descripcion ?? '',
    nivel: curso.nivel as CursoInput['nivel'],
    orden: curso.orden,
    activo: curso.activo,
    rolesAuto: (curso.roles_auto ?? []) as CursoInput['rolesAuto'],
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Editar curso</h1>
      <CursoForm id={id} inicial={inicial} />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Módulos</h2>
        <Link href={`/admin/modulos/nuevo?curso=${id}`} className="rounded bg-[var(--cafe)] px-3 py-1.5 text-sm font-semibold text-white">
          Nuevo módulo
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(modulos ?? []).map((m) => (
          <li key={m.id}>
            <Link href={`/admin/modulos/${m.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
              <span>{m.numero}. {m.titulo}</span>
              <span className="text-xs opacity-60">{m.activo ? 'activo' : 'inactivo'}</span>
            </Link>
          </li>
        ))}
        {(modulos ?? []).length === 0 && <p className="text-sm opacity-70">Sin módulos aún.</p>}
      </ul>
    </section>
  )
}
