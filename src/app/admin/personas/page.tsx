import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PersonasPage() {
  const supabase = await createClient()
  const { data: perfiles } = await supabase
    .from('lms_perfiles')
    .select('id, nombre, rol, sucursal:sucursales(nombre)')
    .order('nombre')

  const ids = (perfiles ?? []).map((p) => p.id)
  const { data: aprobados } = await supabase
    .from('lms_progreso')
    .select('perfil_id')
    .eq('estado', 'aprobado')
    .in('perfil_id', ids)

  const conteo = new Map<string, number>()
  for (const a of aprobados ?? []) conteo.set(a.perfil_id, (conteo.get(a.perfil_id) ?? 0) + 1)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Personas</h1>
        <Link href="/admin/personas/nuevo" className="rounded bg-[var(--cafe)] px-4 py-2 text-sm font-semibold text-white">
          Alta de barista
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(perfiles ?? []).map((p) => {
          const suc = Array.isArray(p.sucursal) ? p.sucursal[0] : p.sucursal
          return (
            <li key={p.id}>
              <Link href={`/admin/personas/${p.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs opacity-60">
                  {p.rol} · {(suc as { nombre?: string } | null)?.nombre ?? 'sin sucursal'} · {conteo.get(p.id) ?? 0} módulos aprobados
                </span>
              </Link>
            </li>
          )
        })}
        {(perfiles ?? []).length === 0 && <p className="text-sm opacity-70">Sin personas registradas.</p>}
      </ul>
    </section>
  )
}
