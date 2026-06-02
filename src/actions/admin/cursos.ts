'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { slugify, generarSlugUnico } from '@/lib/slug'
import { cursoSchema, type CursoInput } from '@/lib/admin/schemas'

export async function crearCurso(input: CursoInput): Promise<{ id: string }> {
  await requireRol(['admin'])
  const datos = cursoSchema.parse(input)
  const supabase = await createClient()

  const { data: existentes } = await supabase.from('lms_cursos').select('slug')
  const slug = generarSlugUnico(slugify(datos.titulo), (existentes ?? []).map((c) => c.slug))

  const { data, error } = await supabase
    .from('lms_cursos')
    .insert({
      slug,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      nivel: datos.nivel,
      orden: datos.orden,
      activo: datos.activo,
      roles_auto: datos.rolesAuto,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No se creó el curso')

  revalidatePath('/admin/cursos')
  return { id: data.id }
}

export async function actualizarCurso(id: string, input: CursoInput): Promise<void> {
  await requireRol(['admin'])
  const datos = cursoSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('lms_cursos')
    .update({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      nivel: datos.nivel,
      orden: datos.orden,
      activo: datos.activo,
      roles_auto: datos.rolesAuto,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/cursos')
  revalidatePath(`/admin/cursos/${id}`)
}
