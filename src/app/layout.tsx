import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Coffee Academy',
  description: 'Capacitación para barra · The Coffee',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
