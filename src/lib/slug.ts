export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function generarSlugUnico(base: string, existentes: string[]): string {
  const set = new Set(existentes)
  if (!set.has(base)) return base
  let n = 2
  while (set.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
