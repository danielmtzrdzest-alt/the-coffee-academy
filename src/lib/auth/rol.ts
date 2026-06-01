import { createClient } from '@/lib/supabase/server'

export type Rol = 'barista' | 'gerente' | 'admin'

export interface SesionRol {
  userId: string
  rol: Rol
}

export async function obtenerSesionRol(): Promise<SesionRol | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('lms_perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (!data) return null
  return { userId: user.id, rol: data.rol as Rol }
}

export function esStaff(rol: Rol): boolean {
  return rol === 'gerente' || rol === 'admin'
}

export async function requireRol(roles: Rol[]): Promise<SesionRol> {
  const s = await obtenerSesionRol()
  if (!s || !roles.includes(s.rol)) throw new Error('No autorizado')
  return s
}
