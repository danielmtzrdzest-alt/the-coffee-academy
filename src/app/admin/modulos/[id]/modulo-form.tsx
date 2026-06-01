'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { crearModulo, actualizarModulo } from '@/actions/admin/modulos'
import type { ModuloInput } from '@/lib/admin/schemas'

export function ModuloForm({ id, cursoId, inicial }: { id?: string; cursoId: string; inicial?: ModuloInput }) {
  const router = useRouter()
  const [v, setV] = useState<ModuloInput>(
    inicial ?? { cursoId, numero: 0, titulo: '', contenidoMd: '', podcastUrl: '', examenMinAprob: 80, orden: 0, activo: true }
  )
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (id) {
        await actualizarModulo(id, v)
        toast.success('Módulo actualizado')
        router.refresh()
      } else {
        const { id: nuevo } = await crearModulo(v)
        toast.success('Módulo creado')
        router.push(`/admin/modulos/${nuevo}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="numero" className="text-sm">Número</label>
          <input id="numero" type="number" value={v.numero} onChange={(e) => setV({ ...v, numero: Number(e.target.value), orden: Number(e.target.value) })}
            className="w-24 rounded border border-[var(--cafe)]/30 p-2" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="titulo" className="text-sm">Título</label>
          <input id="titulo" required value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })}
            className="rounded border border-[var(--cafe)]/30 p-2" />
        </div>
      </div>

      <label htmlFor="podcastUrl" className="text-sm">URL del podcast (opcional)</label>
      <input id="podcastUrl" type="url" value={v.podcastUrl} onChange={(e) => setV({ ...v, podcastUrl: e.target.value })}
        placeholder="https://…" className="rounded border border-[var(--cafe)]/30 p-2" />

      <label htmlFor="examenMinAprob" className="text-sm">Mínimo para aprobar (%)</label>
      <input id="examenMinAprob" type="number" min={0} max={100} value={v.examenMinAprob}
        onChange={(e) => setV({ ...v, examenMinAprob: Number(e.target.value) })}
        className="w-24 rounded border border-[var(--cafe)]/30 p-2" />

      <label htmlFor="contenidoMd" className="text-sm">Contenido (Markdown)</label>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea id="contenidoMd" value={v.contenidoMd} onChange={(e) => setV({ ...v, contenidoMd: e.target.value })}
          rows={20} className="rounded border border-[var(--cafe)]/30 p-2 font-mono text-sm" />
        <div className="prose prose-sm max-w-none overflow-auto rounded border border-[var(--cafe)]/15 bg-white p-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.contenidoMd}</ReactMarkdown>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.activo} onChange={(e) => setV({ ...v, activo: e.target.checked })} />
        Activo
      </label>

      <div className="flex items-center gap-3">
        <button disabled={guardando} className="rounded bg-[var(--cafe)] p-2 px-4 font-semibold text-white disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {id && <Link href={`/admin/modulos/${id}/examen`} className="text-sm underline">Editar examen →</Link>}
      </div>
    </form>
  )
}
