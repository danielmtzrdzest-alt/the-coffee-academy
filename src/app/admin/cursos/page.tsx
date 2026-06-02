import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'

export default async function CursosAdminPage() {
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()
  const { data: cursos } = await supabase
    .from('lms_cursos')
    .select('id, titulo, nivel, activo, lms_modulos(id)')
    .order('orden')

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cursos</h1>
        <Link href="/admin/cursos/nuevo" className="rounded bg-[var(--cafe)] px-4 py-2 text-sm font-semibold text-white">
          Nuevo curso
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(cursos ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/admin/cursos/${c.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
              <span className="font-medium">{c.titulo}</span>
              <span className="text-xs opacity-60">
                {(c.lms_modulos as { id: string }[] ?? []).length} módulos · {c.activo ? 'activo' : 'inactivo'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
