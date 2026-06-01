'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRol } from '@/lib/auth/rol'
import { baristaSchema, type BaristaInput } from '@/lib/admin/schemas'

const REDIRECT = '/auth/confirm'

export async function crearBarista(input: BaristaInput): Promise<{ perfilId: string; enlace: string }> {
  await requireRol(['gerente', 'admin'])
  const d = baristaSchema.parse(input)
  const admin = createAdminClient()

  // 1. Crear o reutilizar el usuario auth (confirmado).
  let userId: string | undefined
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email: d.correo,
    email_confirm: true,
    user_metadata: { nombre: d.nombre },
  })
  if (errCrear) {
    const { data: lista, error: errLista } = await admin.auth.admin.listUsers()
    if (errLista) throw new Error(errLista.message)
    userId = lista.users.find((u) => u.email === d.correo)?.id
    if (!userId) throw new Error(errCrear.message)
  } else {
    userId = creado.user.id
  }

  // 2. Perfil LMS (barista). No degradar a un usuario staff existente.
  const { data: perfilExistente } = await admin.from('lms_perfiles').select('rol').eq('id', userId).single()
  if (perfilExistente && perfilExistente.rol !== 'barista') {
    throw new Error(`El usuario ya existe con rol '${perfilExistente.rol}'.`)
  }
  const { error: errPerfil } = await admin.from('lms_perfiles').upsert(
    { id: userId, nombre: d.nombre, rol: 'barista', sucursal_id: d.sucursalId },
    { onConflict: 'id' }
  )
  if (errPerfil) throw new Error(errPerfil.message)

  // 3. Enlace de acceso (magic link). Si hay SMTP, Supabase también envía correo.
  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: link, error: errLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: d.correo,
    options: { redirectTo: `${origen}${REDIRECT}` },
  })
  if (errLink) throw new Error(errLink.message)
  const tokenHash = link.properties?.hashed_token
  if (!tokenHash) throw new Error('No se generó el token del enlace.')
  const enlace = `${origen}${REDIRECT}?token_hash=${tokenHash}&type=magiclink`

  revalidatePath('/admin/personas')
  return { perfilId: userId, enlace }
}

export async function asignarCurso(perfilId: string, cursoId: string): Promise<void> {
  const sesion = await requireRol(['gerente', 'admin'])
  const supabase = await createClient()
  const { error } = await supabase.from('lms_inscripciones').upsert(
    { perfil_id: perfilId, curso_id: cursoId, estado: 'asignado', asignado_por: sesion.userId },
    { onConflict: 'perfil_id,curso_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/personas/${perfilId}`)
}

export async function quitarInscripcion(perfilId: string, cursoId: string): Promise<void> {
  await requireRol(['gerente', 'admin'])
  const supabase = await createClient()
  const { error } = await supabase
    .from('lms_inscripciones')
    .delete()
    .eq('perfil_id', perfilId)
    .eq('curso_id', cursoId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/personas/${perfilId}`)
}
