import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createAdminClient } from '../src/lib/supabase/admin'
import { parsearModulo } from '../src/lib/content/loader'
import { parsearExamen } from '../src/lib/examenes/parser'

const RAIZ = join(__dirname, '..')
const DIR_CONTENT = join(RAIZ, 'content')
const DIR_PODCASTS =
  '/Users/danielmartinez/Desktop/GUIDEBOOK RESUMEN/MD PODCAST GUIDEBOOK/Modulos de Capacitacion/Podcasts'
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'podcasts'

const CURSO = {
  slug: 'capacitacion-barista',
  titulo: 'Capacitación Barista',
  descripcion: 'Formación completa para barra: producto, cliente, inocuidad y operación.',
  nivel: 'introductorio',
  roles_auto: ['barista'],
  orden: 0,
}

async function main() {
  const sb = createAdminClient()

  // 1. Upsert del curso
  const { data: curso, error: errCurso } = await sb
    .from('lms_cursos')
    .upsert(CURSO, { onConflict: 'slug' })
    .select('id')
    .single()
  if (errCurso) throw errCurso
  console.log('Curso:', curso.id)

  // 2. Recorrer módulos NN.md
  const numeros = readdirSync(DIR_CONTENT)
    .filter((f) => /^\d\d\.md$/.test(f))
    .map((f) => f.slice(0, 2))
    .sort()

  for (const num of numeros) {
    const md = readFileSync(join(DIR_CONTENT, `${num}.md`), 'utf8')
    const mod = parsearModulo(md, num)

    // 2a. Subir podcast si existe (busca "NN - *.mp4")
    let podcastUrl: string | null = null
    if (existsSync(DIR_PODCASTS)) {
      const mp4 = readdirSync(DIR_PODCASTS).find((f) => f.startsWith(`${num} -`) && f.endsWith('.mp4'))
      if (mp4) {
        const bytes = readFileSync(join(DIR_PODCASTS, mp4))
        const ruta = `${CURSO.slug}/${mod.slug}.mp4`
        const { error: errUp } = await sb.storage
          .from(BUCKET)
          .upload(ruta, bytes, { contentType: 'video/mp4', upsert: true })
        if (errUp) throw errUp
        podcastUrl = sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
      }
    }

    // 2b. Upsert del módulo
    const { data: moduloRow, error: errMod } = await sb
      .from('lms_modulos')
      .upsert(
        {
          curso_id: curso.id,
          slug: mod.slug,
          numero: mod.numero,
          titulo: mod.titulo,
          contenido_md: mod.contenidoMd,
          podcast_url: podcastUrl,
          orden: mod.numero,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single()
    if (errMod) throw errMod

    // 2c. Examen (si existe NN.examen.md): borrar preguntas previas y recrear
    const rutaExamen = join(DIR_CONTENT, `${num}.examen.md`)
    if (existsSync(rutaExamen)) {
      await sb.from('lms_preguntas').delete().eq('modulo_id', moduloRow.id)
      const preguntas = parsearExamen(readFileSync(rutaExamen, 'utf8'))
      for (const p of preguntas) {
        const { data: pregRow, error: errPreg } = await sb
          .from('lms_preguntas')
          .insert({
            modulo_id: moduloRow.id,
            numero: p.numero,
            enunciado: p.enunciado,
            pista: p.pista,
            orden: p.numero,
          })
          .select('id')
          .single()
        if (errPreg) throw errPreg
        const opciones = p.opciones.map((o, i) => ({
          pregunta_id: pregRow.id,
          texto: o.texto,
          es_correcta: o.esCorrecta,
          orden: i,
        }))
        const { error: errOpc } = await sb.from('lms_opciones').insert(opciones)
        if (errOpc) throw errOpc
      }
      console.log(`Módulo ${num}: ${preguntas.length} preguntas`)
    }
  }
  console.log('Importación completa.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
