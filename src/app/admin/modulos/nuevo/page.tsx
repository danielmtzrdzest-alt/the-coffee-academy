import { redirect } from 'next/navigation'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { ModuloForm } from '../[id]/modulo-form'

export default async function NuevoModuloPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const { curso } = await searchParams
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  if (!curso) redirect('/admin/cursos')

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nuevo módulo</h1>
      <ModuloForm cursoId={curso} />
    </section>
  )
}
