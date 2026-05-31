export interface ModuloParseado {
  numero: number
  titulo: string
  slug: string
  contenidoMd: string
}

const RE_TITULO_MODULO = /^#\s+Módulo\s+\d+\s*[—-]\s*(.+)$/m
const RE_H1 = /^#\s+(.+)$/m

function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita acentos (ASCII-safe en el fuente)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function parsearModulo(md: string, numeroStr: string): ModuloParseado {
  const numero = Number(numeroStr)

  const mModulo = md.match(RE_TITULO_MODULO)
  let titulo: string
  if (mModulo) {
    titulo = mModulo[1].trim()
  } else {
    const mH1 = md.match(RE_H1)
    if (!mH1) {
      throw new Error(`No se encontró un encabezado "# ..." en el módulo ${numeroStr}`)
    }
    titulo = mH1[1].trim()
  }

  const slug = `${numeroStr}-${slugify(titulo)}`
  return { numero, titulo, slug, contenidoMd: md.trim() }
}
