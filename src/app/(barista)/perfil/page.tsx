import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const ROL_LABEL: Record<string, string> = {
  barista: 'Barista',
  gerente: 'Gerente',
  admin: 'Administrador',
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('lms_perfiles')
    .select('nombre, rol, sucursal:sucursales(nombre)')
    .eq('id', user.id)
    .single()

  const { data: inscripciones } = await supabase
    .from('lms_inscripciones')
    .select('curso:lms_cursos(lms_modulos(id))')
    .eq('perfil_id', user.id)

  const { data: progreso } = await supabase
    .from('lms_progreso')
    .select('modulo_id')
    .eq('perfil_id', user.id)
    .eq('estado', 'aprobado')

  const aprobadosSet = new Set((progreso ?? []).map((p) => p.modulo_id))
  let totalModulos = 0
  for (const ins of inscripciones ?? []) {
    const raw = (ins as { curso: unknown }).curso
    const c = Array.isArray(raw) ? raw[0] : raw
    const modulos = (c as { lms_modulos?: { id: string }[] })?.lms_modulos ?? []
    totalModulos += modulos.length
  }
  const aprobados = aprobadosSet.size
  const pct = totalModulos ? Math.round((aprobados / totalModulos) * 100) : 0

  const nombre = perfil?.nombre ?? user.email ?? 'Barista'
  const rol = perfil?.rol ? (ROL_LABEL[perfil.rol] ?? perfil.rol) : 'Barista'
  const sucursalRaw = (perfil as { sucursal?: unknown } | null)?.sucursal
  const sucursal = Array.isArray(sucursalRaw) ? sucursalRaw[0] : sucursalRaw
  const sucursalNombre = (sucursal as { nombre?: string } | null | undefined)?.nombre
  const esStaff = perfil?.rol === 'gerente' || perfil?.rol === 'admin'

  async function cerrarSesion() {
    'use server'
    const sb = await createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Mi Perfil</h1>

      <div className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cafe)]/10 text-[var(--cafe)]">
          <User size={24} />
        </div>
        <div>
          <p className="font-semibold">{nombre}</p>
          <p className="text-xs opacity-70">{rol}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--cafe)]/15 bg-white p-4 shadow-sm">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="opacity-60">Correo</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-60">Sucursal</dt>
            <dd className="font-medium">{sucursalNombre ?? 'Sin asignar'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--cafe)]/15 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Mi progreso</h2>
        <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--cafe)]/10">
          <div className="h-full bg-[var(--cafe)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs opacity-70">
          {aprobados} de {totalModulos} módulos aprobados · {pct}%
        </p>
      </div>

      {esStaff && (
        <Link href="/admin" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--cafe)]/30 bg-white p-3 font-medium">
          Ir al panel de administración
        </Link>
      )}

      <form action={cerrarSesion}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white p-3 font-medium text-red-600"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </form>
    </section>
  )
}
