'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { slugify, generarSlugUnico } from '@/lib/slug'
import { moduloSchema, type ModuloInput } from '@/lib/admin/schemas'

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

export async function crearModulo(input: ModuloInput): Promise<{ id: string }> {
  await requireRol(['admin'])
  const d = moduloSchema.parse(input)
  const supabase = await createClient()

  const { data: existentes } = await supabase.from('lms_modulos').select('slug')
  const base = `${dosDigitos(d.numero)}-${slugify(d.titulo)}`
  const slug = generarSlugUnico(base, (existentes ?? []).map((m) => m.slug))

  const { data, error } = await supabase
    .from('lms_modulos')
    .insert({
      curso_id: d.cursoId,
      slug,
      numero: d.numero,
      titulo: d.titulo,
      contenido_md: d.contenidoMd,
      podcast_url: d.podcastUrl || null,
      examen_min_aprob: d.examenMinAprob,
      orden: d.orden,
      activo: d.activo,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${d.cursoId}`)
  return { id: data.id }
}

export async function actualizarModulo(id: string, input: ModuloInput): Promise<void> {
  await requireRol(['admin'])
  const d = moduloSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('lms_modulos')
    .update({
      numero: d.numero,
      titulo: d.titulo,
      contenido_md: d.contenidoMd,
      podcast_url: d.podcastUrl || null,
      examen_min_aprob: d.examenMinAprob,
      orden: d.orden,
      activo: d.activo,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/modulos/${id}`)
  revalidatePath(`/admin/cursos/${d.cursoId}`)
}
