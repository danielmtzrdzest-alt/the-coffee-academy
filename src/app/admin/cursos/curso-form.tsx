'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearCurso, actualizarCurso } from '@/actions/admin/cursos'
import { NIVELES, ROLES, type CursoInput } from '@/lib/admin/schemas'

export function CursoForm({ id, inicial }: { id?: string; inicial?: CursoInput }) {
  const router = useRouter()
  const [v, setV] = useState<CursoInput>(
    inicial ?? { titulo: '', descripcion: '', nivel: 'introductorio', orden: 0, activo: true, rolesAuto: [] }
  )
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (id) {
        await actualizarCurso(id, v)
        toast.success('Curso actualizado')
      } else {
        const { id: nuevo } = await crearCurso(v)
        toast.success('Curso creado')
        router.push(`/admin/cursos/${nuevo}`)
        return
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="flex max-w-lg flex-col gap-3">
      <label className="text-sm">Título</label>
      <input required value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })}
        className="rounded border border-[var(--cafe)]/30 p-2" />

      <label className="text-sm">Descripción</label>
      <textarea value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })}
        className="rounded border border-[var(--cafe)]/30 p-2" rows={2} />

      <label className="text-sm">Nivel</label>
      <select value={v.nivel} onChange={(e) => setV({ ...v, nivel: e.target.value as CursoInput['nivel'] })}
        className="rounded border border-[var(--cafe)]/30 p-2">
        {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>

      <label className="text-sm">Orden</label>
      <input type="number" value={v.orden} onChange={(e) => setV({ ...v, orden: Number(e.target.value) })}
        className="rounded border border-[var(--cafe)]/30 p-2" />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.activo} onChange={(e) => setV({ ...v, activo: e.target.checked })} />
        Activo
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm">Asignación automática por rol</legend>
        <div className="flex gap-4">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={v.rolesAuto.includes(r)}
                onChange={(e) => setV({
                  ...v,
                  rolesAuto: e.target.checked
                    ? [...v.rolesAuto, r]
                    : v.rolesAuto.filter((x) => x !== r),
                })} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <button disabled={guardando} className="rounded bg-[var(--cafe)] p-2 font-semibold text-white disabled:opacity-40">
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
