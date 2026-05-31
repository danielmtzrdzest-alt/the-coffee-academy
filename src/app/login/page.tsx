'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    })
    if (error) setError(error.message)
    else setEnviado(true)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">☕ The Coffee Academy</h1>
      {enviado ? (
        <p>Te enviamos un enlace de acceso a <strong>{email}</strong>. Revisa tu correo.</p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-3">
          <label className="text-sm">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-[var(--cafe)]/30 bg-white p-3"
            placeholder="tucorreo@thecoffee.mx"
          />
          <button className="rounded bg-[var(--cafe)] p-3 font-semibold text-white">
            Enviar enlace
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </main>
  )
}
