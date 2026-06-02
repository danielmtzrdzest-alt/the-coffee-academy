'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { asignarCurso, quitarInscripcion } from '@/actions/admin/personas'

export function AsignarCursos({
  perfilId,
  cursos,
  asignadosInicial,
}: {
  perfilId: string
  cursos: { id: string; titulo: string }[]
  asignadosInicial: string[]
}) {
  const [asignados, setAsignados] = useState<Set<string>>(new Set(asignadosInicial))
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function alternar(cursoId: string) {
    setOcupado(cursoId)
    try {
      if (asignados.has(cursoId)) {
        await quitarInscripcion(perfilId, cursoId)
        setAsignados((s) => { const n = new Set(s); n.delete(cursoId); return n })
        toast.success('Curso quitado')
      } else {
        await asignarCurso(perfilId, cursoId)
        setAsignados((s) => new Set(s).add(cursoId))
        toast.success('Curso asignado')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {cursos.map((c) => {
        const on = asignados.has(c.id)
        return (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
            <span>{c.titulo}</span>
            <button onClick={() => alternar(c.id)} disabled={ocupado === c.id}
              className={`rounded px-3 py-1 text-sm ${on ? 'border border-red-300 text-red-600' : 'bg-[var(--cafe)] text-white'}`}>
              {on ? 'Quitar' : 'Asignar'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
