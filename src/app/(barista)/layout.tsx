import Link from 'next/link'
import { BookOpen, BarChart3, User } from 'lucide-react'

export default function BaristaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <main className="flex-1 p-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t border-[var(--cafe)]/15 bg-white p-2">
        <Link href="/cursos" className="flex flex-col items-center gap-1 text-xs">
          <BookOpen size={20} /> Cursos
        </Link>
        <Link href="/perfil" className="flex flex-col items-center gap-1 text-xs">
          <BarChart3 size={20} /> Progreso
        </Link>
        <Link href="/perfil" className="flex flex-col items-center gap-1 text-xs">
          <User size={20} /> Perfil
        </Link>
      </nav>
    </div>
  )
}
