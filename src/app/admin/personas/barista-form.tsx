'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { crearBarista } from '@/actions/admin/personas'

export function BaristaForm({ sucursales }: { sucursales: { id: number; nombre: string }[] }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enlace, setEnlace] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await crearBarista({ nombre, correo, sucursalId })
      setEnlace(r.enlace)
      toast.success('Barista creado')
      setNombre(''); setCorreo(''); setSucursalId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <label htmlFor="nombre" className="text-sm">Nombre</label>
        <input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)}
          className="rounded border border-[var(--cafe)]/30 p-2" />
        <label htmlFor="correo" className="text-sm">Correo</label>
        <input id="correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
          className="rounded border border-[var(--cafe)]/30 p-2" />
        <label htmlFor="sucursalId" className="text-sm">Sucursal</label>
        <select id="sucursalId" value={sucursalId ?? ''} onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-[var(--cafe)]/30 p-2">
          <option value="">Sin asignar</option>
          {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button disabled={enviando} className="rounded bg-[var(--cafe)] p-2 font-semibold text-white disabled:opacity-40">
          {enviando ? 'Creando…' : 'Crear barista'}
        </button>
      </form>

      {enlace && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
          <p className="text-sm font-medium">Enlace de acceso (compártelo con el barista):</p>
          <code className="break-all rounded bg-[var(--cafe)]/5 p-2 text-xs">{enlace}</code>
          <button onClick={() => { navigator.clipboard.writeText(enlace); toast.success('Copiado') }}
            className="self-start rounded border border-[var(--cafe)]/30 px-3 py-1 text-xs">Copiar</button>
        </div>
      )}
    </div>
  )
}
