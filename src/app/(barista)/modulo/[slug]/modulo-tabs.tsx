'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'
import { Examen, type PreguntaCliente } from './examen'

type Tab = 'leer' | 'escuchar' | 'examen'

export function ModuloTabs({
  modulo,
  preguntas,
  leidoInicial,
  estadoInicial,
}: {
  modulo: { id: string; numero: number; titulo: string; contenido_md: string; podcast_url: string | null; examen_min_aprob: number }
  preguntas: PreguntaCliente[]
  leidoInicial: boolean
  estadoInicial: string
}) {
  const [tab, setTab] = useState<Tab>('leer')
  const [leido, setLeido] = useState(leidoInicial)

  async function marcarLeido() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('lms_progreso').upsert(
      { perfil_id: user.id, modulo_id: modulo.id, leido: true, estado: 'en_progreso' },
      { onConflict: 'perfil_id,modulo_id' }
    )
    setLeido(true)
    setTab('examen')
  }

  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-xs opacity-60">Módulo {modulo.numero}</p>
        <h1 className="text-lg font-bold">{modulo.titulo}</h1>
      </header>

      <div className="flex gap-2 text-sm">
        {(['leer', 'escuchar', 'examen'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={t === 'examen' && !leido}
            className={`rounded-full px-4 py-1 capitalize ${
              tab === t ? 'bg-[var(--cafe)] text-white' : 'bg-[var(--cafe)]/10'
            } disabled:opacity-40`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'leer' && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{modulo.contenido_md}</ReactMarkdown>
          {!leido && (
            <button
              onClick={marcarLeido}
              className="mt-4 w-full rounded bg-[var(--cafe)] p-3 font-semibold text-white"
            >
              Marcar como leído ✓
            </button>
          )}
        </div>
      )}

      {tab === 'escuchar' && (
        modulo.podcast_url ? (
          <video controls className="w-full rounded-lg" src={modulo.podcast_url} />
        ) : (
          <p className="text-sm opacity-70">Este módulo no tiene podcast.</p>
        )
      )}

      {tab === 'examen' && (
        <Examen
          moduloId={modulo.id}
          preguntas={preguntas}
          minAprob={modulo.examen_min_aprob}
          yaAprobado={estadoInicial === 'aprobado'}
        />
      )}
    </section>
  )
}
