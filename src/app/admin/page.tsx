import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'
import { obtenerSesionRol } from '@/lib/auth/rol'

export default async function AdminHome() {
  const sesion = await obtenerSesionRol()
  const admin = sesion?.rol === 'admin'
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {admin && (
          <Link href="/admin/cursos" className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
            <BookOpen /> <div><p className="font-semibold">Contenido</p><p className="text-xs opacity-70">Cursos, módulos y exámenes</p></div>
          </Link>
        )}
        <Link href="/admin/personas" className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
          <Users /> <div><p className="font-semibold">Personas</p><p className="text-xs opacity-70">Baristas, asignaciones y progreso</p></div>
        </Link>
      </div>
    </section>
  )
}
