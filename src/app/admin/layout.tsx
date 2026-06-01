import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerSesionRol, esStaff } from '@/lib/auth/rol'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionRol()
  if (!sesion || !esStaff(sesion.rol)) redirect('/cursos')
  const admin = sesion.rol === 'admin'

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="flex items-center gap-6 border-b border-[var(--cafe)]/15 bg-white px-6 py-3">
        <Link href="/admin" className="font-bold">☕ Admin</Link>
        {admin && <Link href="/admin/cursos" className="text-sm">Cursos</Link>}
        <Link href="/admin/personas" className="text-sm">Personas</Link>
        <Link href="/cursos" className="ml-auto text-sm opacity-70">Ver como barista →</Link>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
