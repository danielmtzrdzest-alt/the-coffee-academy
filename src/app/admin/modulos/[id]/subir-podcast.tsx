'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { crearUrlSubidaPodcast } from '@/actions/admin/podcasts'
import { extensionDe, TAMANO_MAX_PODCAST } from '@/lib/admin/podcast'

export function SubirPodcast({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [estado, setEstado] = useState<'idle' | 'subiendo'>('idle')

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo tras un error
    if (!file) return

    if (!extensionDe(file.name)) {
      toast.error('Formato no permitido (mp3, m4a, wav, ogg)')
      return
    }
    if (file.size > TAMANO_MAX_PODCAST) {
      toast.error('El archivo supera 50 MB')
      return
    }

    setEstado('subiendo')
    try {
      const res = await crearUrlSubidaPodcast(file.name)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const sb = createClient()
      const { error } = await sb.storage
        .from('podcasts')
        .uploadToSignedUrl(res.path, res.token, file)
      if (error) {
        toast.error('No se pudo subir el audio')
        return
      }
      const { data } = sb.storage.from('podcasts').getPublicUrl(res.path)
      onChange(data.publicUrl)
      toast.success('Audio subido')
    } catch {
      toast.error('No se pudo subir el audio')
    } finally {
      setEstado('idle')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="audio/*"
        disabled={estado === 'subiendo'}
        onChange={alElegir}
        className="text-sm"
      />
      {estado === 'subiendo' && (
        <p className="text-sm text-[var(--cafe)]">Subiendo…</p>
      )}
      {value && <audio controls src={value} className="w-full" />}
    </div>
  )
}
