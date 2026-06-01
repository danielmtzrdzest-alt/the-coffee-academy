import { redirect } from 'next/navigation'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { cargarExamen } from '@/actions/admin/examenes'
import { ExamenEditor } from './examen-editor'

export default async function ExamenAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const inicial = await cargarExamen(id)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Editor de examen</h1>
      <ExamenEditor moduloId={id} inicial={inicial} />
    </section>
  )
}
