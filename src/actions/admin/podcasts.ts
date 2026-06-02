'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireRol } from '@/lib/auth/rol'
import { extensionDe, rutaPodcast } from '@/lib/admin/podcast'

export async function crearUrlSubidaPodcast(
  nombreArchivo: string
): Promise<
  { ok: true; path: string; token: string } | { ok: false; error: string }
> {
  await requireRol(['admin'])

  if (!extensionDe(nombreArchivo)) {
    return { ok: false, error: 'Formato no permitido' }
  }

  const path = rutaPodcast(nombreArchivo)
  const sb = createAdminClient()
  const { data, error } = await sb.storage
    .from('podcasts')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'No se pudo crear la URL de subida',
    }
  }

  return { ok: true, path: data.path, token: data.token }
}
