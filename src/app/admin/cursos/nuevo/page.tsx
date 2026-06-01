import { redirect } from 'next/navigation'
import { CursoForm } from '../curso-form'
import { obtenerSesionRol } from '@/lib/auth/rol'

export default async function NuevoCursoPage() {
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nuevo curso</h1>
      <CursoForm />
    </section>
  )
}
