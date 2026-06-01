import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase
        .from('lms_perfiles')
        .select('rol')
        .eq('id', user?.id ?? '')
        .single()
      const destino =
        perfil && (perfil.rol === 'gerente' || perfil.rol === 'admin') ? '/admin' : '/cursos'
      return NextResponse.redirect(new URL(destino, request.url))
    }
  }
  return NextResponse.redirect(new URL('/login', request.url))
}
