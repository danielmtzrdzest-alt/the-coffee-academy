import { createAdminClient } from '@/lib/supabase/admin'
import { BaristaForm } from '../barista-form'

export default async function NuevoBaristaPage() {
  const admin = createAdminClient()
  const { data: sucursales } = await admin.from('sucursales').select('id, nombre').order('nombre')

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Alta de barista</h1>
      <BaristaForm sucursales={(sucursales ?? []) as { id: number; nombre: string }[]} />
    </section>
  )
}
