# Panel de Administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un panel web `/admin` para que admins gestionen contenido (cursos, módulos, exámenes) y gerentes/admins gestionen personas (alta de baristas, asignación de cursos, progreso), apalancando el RLS existente.

**Architecture:** Rutas bajo `src/app/admin/` con layout que gatea por rol. CRUD de contenido y asignaciones usan el cliente de sesión (RLS hace cumplir el acceso). El alta de baristas usa un server action con service-role tras verificar el rol del llamante. Server actions validan con zod y llaman `revalidatePath`.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, @supabase/ssr + supabase-js, zod, react-markdown + remark-gfm, sonner, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-panel-admin-design.md`

---

## Estructura de archivos

**Fundaciones (compartido):**
- Create `src/lib/slug.ts` — `slugify` + `generarSlugUnico` (extraído del loader).
- Modify `src/lib/content/loader.ts` — reusar `slugify` de `src/lib/slug.ts`.
- Create `src/lib/admin/schemas.ts` — esquemas zod (curso, módulo, examen, barista).
- Create `src/lib/auth/rol.ts` — `obtenerSesionRol`, `requireRol`, `esStaff`.
- Create `src/app/admin/layout.tsx` — gating gerente/admin + navegación.
- Create `src/app/admin/page.tsx` — landing con accesos por sección.

**Contenido (solo admin):**
- Create `src/actions/admin/cursos.ts` — `crearCurso`, `actualizarCurso`.
- Create `src/app/admin/cursos/page.tsx` — lista de cursos.
- Create `src/app/admin/cursos/curso-form.tsx` — formulario (cliente).
- Create `src/app/admin/cursos/nuevo/page.tsx` — alta.
- Create `src/app/admin/cursos/[id]/page.tsx` — edición + lista de módulos.
- Create `src/actions/admin/modulos.ts` — `crearModulo`, `actualizarModulo`.
- Create `src/app/admin/modulos/[id]/page.tsx` — edición de módulo.
- Create `src/app/admin/modulos/[id]/modulo-form.tsx` — formulario con preview Markdown (cliente).
- Create `src/actions/admin/examenes.ts` — `cargarExamen`, `guardarExamen`.
- Create `src/app/admin/modulos/[id]/examen/page.tsx` — editor de examen.
- Create `src/app/admin/modulos/[id]/examen/examen-editor.tsx` — editor (cliente).

**Personas (gerente + admin):**
- Create `src/actions/admin/personas.ts` — `crearBarista`, `asignarCurso`, `quitarInscripcion`.
- Create `src/app/admin/personas/page.tsx` — lista de baristas.
- Create `src/app/admin/personas/nuevo/page.tsx` — alta de barista.
- Create `src/app/admin/personas/barista-form.tsx` — formulario (cliente).
- Create `src/app/admin/personas/[id]/page.tsx` — detalle: asignar cursos + progreso.
- Create `src/app/admin/personas/[id]/asignar-cursos.tsx` — UI de asignación (cliente).

**Integración:**
- Modify `src/app/auth/confirm/route.ts` — aterrizaje de staff en `/admin`.
- Modify `src/app/(barista)/perfil/page.tsx` — enlace "Panel" para staff.

---

## PARTE A — Fundaciones

### Task 1: Helper de slug (TDD) + refactor del loader

**Files:**
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`
- Modify: `src/lib/content/loader.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slugify, generarSlugUnico } from './slug'

describe('slugify', () => {
  it('quita acentos y normaliza a kebab-case', () => {
    expect(slugify('Bienvenida a The Coffee')).toBe('bienvenida-a-the-coffee')
    expect(slugify('Inocuidad & Limpieza')).toBe('inocuidad-limpieza')
    expect(slugify('  Café con Leche  ')).toBe('cafe-con-leche')
  })
})

describe('generarSlugUnico', () => {
  it('devuelve la base si no colisiona', () => {
    expect(generarSlugUnico('barista', [])).toBe('barista')
  })
  it('agrega sufijo numérico al colisionar', () => {
    expect(generarSlugUnico('barista', ['barista'])).toBe('barista-2')
    expect(generarSlugUnico('barista', ['barista', 'barista-2'])).toBe('barista-3')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd /Users/danielmartinez/Projects/the-coffee-academy && npx vitest run src/lib/slug.test.ts`
Expected: FAIL — `Failed to resolve import './slug'`.

- [ ] **Step 3: Implementar `src/lib/slug.ts`**

```ts
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
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/slug.test.ts`
Expected: PASS (5 asserts).

- [ ] **Step 5: Refactorizar `loader.ts` para reusar `slugify`**

En `src/lib/content/loader.ts`, eliminar la función local `slugify` (líneas 11-18) y agregar al inicio del archivo, tras la línea de interfaces:
```ts
import { slugify } from '@/lib/slug'
```
Dejar intacto el resto (`parsearModulo` ya llama `slugify(titulo)`).

- [ ] **Step 6: Correr toda la suite para verificar que no se rompió nada**

Run: `npm test`
Expected: PASS — incluye `loader.test.ts`, `parser.test.ts`, `calificar.test.ts`, `desbloqueo.test.ts`, `slug.test.ts`.

- [ ] **Step 7: Commit**

```bash
cd /Users/danielmartinez/Projects/the-coffee-academy
git add src/lib/slug.ts src/lib/slug.test.ts src/lib/content/loader.ts
git commit -m "feat: helper de slug reutilizable + refactor del loader"
```

---

### Task 2: Esquemas de validación zod (TDD)

**Files:**
- Create: `src/lib/admin/schemas.ts`
- Create: `src/lib/admin/schemas.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/admin/schemas.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cursoSchema, moduloSchema, examenSchema, baristaSchema } from './schemas'

describe('cursoSchema', () => {
  it('acepta un curso válido', () => {
    const r = cursoSchema.parse({ titulo: 'Capacitación Barista', nivel: 'introductorio' })
    expect(r.activo).toBe(true)
    expect(r.rolesAuto).toEqual([])
  })
  it('rechaza título corto', () => {
    expect(() => cursoSchema.parse({ titulo: 'ab', nivel: 'introductorio' })).toThrow()
  })
})

describe('moduloSchema', () => {
  it('acepta podcastUrl vacía', () => {
    const r = moduloSchema.parse({
      cursoId: '00000000-0000-0000-0000-000000000000',
      numero: 1, titulo: 'Bienvenida', podcastUrl: '',
    })
    expect(r.examenMinAprob).toBe(80)
  })
})

describe('examenSchema', () => {
  const base = {
    moduloId: '00000000-0000-0000-0000-000000000000',
    preguntas: [{
      enunciado: '¿Pregunta?',
      opciones: [
        { texto: 'A', esCorrecta: true },
        { texto: 'B', esCorrecta: false },
      ],
    }],
  }
  it('acepta exactamente una opción correcta', () => {
    expect(() => examenSchema.parse(base)).not.toThrow()
  })
  it('rechaza si no hay exactamente una correcta', () => {
    const malo = { ...base, preguntas: [{
      enunciado: '¿Q?',
      opciones: [{ texto: 'A', esCorrecta: true }, { texto: 'B', esCorrecta: true }],
    }] }
    expect(() => examenSchema.parse(malo)).toThrow()
  })
})

describe('baristaSchema', () => {
  it('rechaza correo inválido', () => {
    expect(() => baristaSchema.parse({ nombre: 'Juan Pérez', correo: 'no-es-correo', sucursalId: null })).toThrow()
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/admin/schemas.test.ts`
Expected: FAIL — `Failed to resolve import './schemas'`.

- [ ] **Step 3: Implementar `src/lib/admin/schemas.ts`**

```ts
import { z } from 'zod'

export const ROLES = ['barista', 'gerente', 'admin'] as const
export const NIVELES = ['introductorio', 'intermedio', 'avanzado'] as const

export const cursoSchema = z.object({
  titulo: z.string().min(3, 'Título muy corto'),
  descripcion: z.string().default(''),
  nivel: z.enum(NIVELES),
  orden: z.number().int().min(0).default(0),
  activo: z.boolean().default(true),
  rolesAuto: z.array(z.enum(ROLES)).default([]),
})
export type CursoInput = z.infer<typeof cursoSchema>

export const moduloSchema = z.object({
  cursoId: z.string().uuid(),
  numero: z.number().int().min(0),
  titulo: z.string().min(3, 'Título muy corto'),
  contenidoMd: z.string().default(''),
  podcastUrl: z.union([z.string().url(), z.literal('')]).default(''),
  examenMinAprob: z.number().int().min(0).max(100).default(80),
  orden: z.number().int().min(0).default(0),
  activo: z.boolean().default(true),
})
export type ModuloInput = z.infer<typeof moduloSchema>

export const opcionSchema = z.object({
  texto: z.string().min(1, 'Opción vacía'),
  esCorrecta: z.boolean(),
})

export const preguntaSchema = z.object({
  enunciado: z.string().min(1, 'Enunciado vacío'),
  pista: z.string().nullable().default(null),
  opciones: z
    .array(opcionSchema)
    .min(2, 'Mínimo 2 opciones')
    .refine((os) => os.filter((o) => o.esCorrecta).length === 1, 'Debe haber exactamente una opción correcta'),
})

export const examenSchema = z.object({
  moduloId: z.string().uuid(),
  preguntas: z.array(preguntaSchema),
})
export type ExamenInput = z.infer<typeof examenSchema>

export const baristaSchema = z.object({
  nombre: z.string().min(3, 'Nombre muy corto'),
  correo: z.string().email('Correo inválido'),
  sucursalId: z.number().int().nullable(),
})
export type BaristaInput = z.infer<typeof baristaSchema>
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/admin/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/schemas.ts src/lib/admin/schemas.test.ts
git commit -m "feat: esquemas zod para el panel de administración"
```

---

### Task 3: Helper de rol + layout y landing del panel

**Files:**
- Create: `src/lib/auth/rol.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Implementar `src/lib/auth/rol.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export type Rol = 'barista' | 'gerente' | 'admin'

export interface SesionRol {
  userId: string
  rol: Rol
}

export async function obtenerSesionRol(): Promise<SesionRol | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('lms_perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (!data) return null
  return { userId: user.id, rol: data.rol as Rol }
}

export function esStaff(rol: Rol): boolean {
  return rol === 'gerente' || rol === 'admin'
}

export async function requireRol(roles: Rol[]): Promise<SesionRol> {
  const s = await obtenerSesionRol()
  if (!s || !roles.includes(s.rol)) throw new Error('No autorizado')
  return s
}
```

- [ ] **Step 2: Implementar `src/app/admin/layout.tsx`** (gating + nav)

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { obtenerSesionRol, esStaff } from '@/lib/auth/rol'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesionRol()
  if (!sesion || !esStaff(sesion.rol)) redirect('/cursos')
  const admin = sesion.rol === 'admin'

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="flex items-center gap-6 border-b border-[var(--cafe)]/15 bg-white px-6 py-3">
        <Link href="/admin" className="font-bold">☕ Admin</Link>
        {admin && <Link href="/admin/cursos" className="text-sm">Cursos</Link>}
        <Link href="/admin/personas" className="text-sm">Personas</Link>
        <Link href="/cursos" className="ml-auto text-sm opacity-70">Ver como barista →</Link>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Implementar `src/app/admin/page.tsx`** (landing)

```tsx
import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'
import { obtenerSesionRol } from '@/lib/auth/rol'

export default async function AdminHome() {
  const sesion = await obtenerSesionRol()
  const admin = sesion?.rol === 'admin'
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {admin && (
          <Link href="/admin/cursos" className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
            <BookOpen /> <div><p className="font-semibold">Contenido</p><p className="text-xs opacity-70">Cursos, módulos y exámenes</p></div>
          </Link>
        )}
        <Link href="/admin/personas" className="flex items-center gap-3 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
          <Users /> <div><p className="font-semibold">Personas</p><p className="text-xs opacity-70">Baristas, asignaciones y progreso</p></div>
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Verificar gating en preview**

Run: `npm run build` (debe compilar sin errores de tipos).
Luego, con el dev server (`academy` en `.claude/launch.json`), entrar como el usuario barista demo y navegar a `/admin`: debe redirigir a `/cursos` (el demo es `rol='barista'`). Para verificar el acceso staff se prueba al final (Task 14) tras promover un usuario a admin.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/rol.ts "src/app/admin/layout.tsx" "src/app/admin/page.tsx"
git commit -m "feat: layout, gating por rol y landing del panel admin"
```

---

## PARTE B — Gestión de contenido (solo admin)

### Task 4: Server actions de cursos

**Files:**
- Create: `src/actions/admin/cursos.ts`

- [ ] **Step 1: Implementar `src/actions/admin/cursos.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { slugify, generarSlugUnico } from '@/lib/slug'
import { cursoSchema, type CursoInput } from '@/lib/admin/schemas'

export async function crearCurso(input: CursoInput): Promise<{ id: string }> {
  await requireRol(['admin'])
  const datos = cursoSchema.parse(input)
  const supabase = await createClient()

  const { data: existentes } = await supabase.from('lms_cursos').select('slug')
  const slug = generarSlugUnico(slugify(datos.titulo), (existentes ?? []).map((c) => c.slug))

  const { data, error } = await supabase
    .from('lms_cursos')
    .insert({
      slug,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      nivel: datos.nivel,
      orden: datos.orden,
      activo: datos.activo,
      roles_auto: datos.rolesAuto,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/admin/cursos')
  return { id: data.id }
}

export async function actualizarCurso(id: string, input: CursoInput): Promise<void> {
  await requireRol(['admin'])
  const datos = cursoSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('lms_cursos')
    .update({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      nivel: datos.nivel,
      orden: datos.orden,
      activo: datos.activo,
      roles_auto: datos.rolesAuto,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/cursos')
  revalidatePath(`/admin/cursos/${id}`)
}
```

- [ ] **Step 2: Verificar compilación de tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/actions/admin/cursos.ts
git commit -m "feat: server actions crear/actualizar curso"
```

---

### Task 5: Lista y formulario de cursos

**Files:**
- Create: `src/app/admin/cursos/page.tsx`
- Create: `src/app/admin/cursos/curso-form.tsx`
- Create: `src/app/admin/cursos/nuevo/page.tsx`

- [ ] **Step 1: Implementar la lista `src/app/admin/cursos/page.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'

export default async function CursosAdminPage() {
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()
  const { data: cursos } = await supabase
    .from('lms_cursos')
    .select('id, titulo, nivel, activo, lms_modulos(id)')
    .order('orden')

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cursos</h1>
        <Link href="/admin/cursos/nuevo" className="rounded bg-[var(--cafe)] px-4 py-2 text-sm font-semibold text-white">
          Nuevo curso
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(cursos ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/admin/cursos/${c.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
              <span className="font-medium">{c.titulo}</span>
              <span className="text-xs opacity-60">
                {(c.lms_modulos as { id: string }[] ?? []).length} módulos · {c.activo ? 'activo' : 'inactivo'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Implementar el formulario `src/app/admin/cursos/curso-form.tsx`** (cliente)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearCurso, actualizarCurso } from '@/actions/admin/cursos'
import { NIVELES, ROLES, type CursoInput } from '@/lib/admin/schemas'

export function CursoForm({ id, inicial }: { id?: string; inicial?: CursoInput }) {
  const router = useRouter()
  const [v, setV] = useState<CursoInput>(
    inicial ?? { titulo: '', descripcion: '', nivel: 'introductorio', orden: 0, activo: true, rolesAuto: [] }
  )
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (id) {
        await actualizarCurso(id, v)
        toast.success('Curso actualizado')
      } else {
        const { id: nuevo } = await crearCurso(v)
        toast.success('Curso creado')
        router.push(`/admin/cursos/${nuevo}`)
        return
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="flex max-w-lg flex-col gap-3">
      <label className="text-sm">Título</label>
      <input required value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })}
        className="rounded border border-[var(--cafe)]/30 p-2" />

      <label className="text-sm">Descripción</label>
      <textarea value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })}
        className="rounded border border-[var(--cafe)]/30 p-2" rows={2} />

      <label className="text-sm">Nivel</label>
      <select value={v.nivel} onChange={(e) => setV({ ...v, nivel: e.target.value as CursoInput['nivel'] })}
        className="rounded border border-[var(--cafe)]/30 p-2">
        {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>

      <label className="text-sm">Orden</label>
      <input type="number" value={v.orden} onChange={(e) => setV({ ...v, orden: Number(e.target.value) })}
        className="rounded border border-[var(--cafe)]/30 p-2" />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.activo} onChange={(e) => setV({ ...v, activo: e.target.checked })} />
        Activo
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm">Asignación automática por rol</legend>
        <div className="flex gap-4">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={v.rolesAuto.includes(r)}
                onChange={(e) => setV({
                  ...v,
                  rolesAuto: e.target.checked
                    ? [...v.rolesAuto, r]
                    : v.rolesAuto.filter((x) => x !== r),
                })} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <button disabled={guardando} className="rounded bg-[var(--cafe)] p-2 font-semibold text-white disabled:opacity-40">
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Implementar el alta `src/app/admin/cursos/nuevo/page.tsx`**

```tsx
import { CursoForm } from '../curso-form'

export default function NuevoCursoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nuevo curso</h1>
      <CursoForm />
    </section>
  )
}
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/cursos/page.tsx" "src/app/admin/cursos/curso-form.tsx" "src/app/admin/cursos/nuevo/page.tsx"
git commit -m "feat: lista, formulario y alta de cursos en el panel"
```

---

### Task 6: Edición de curso + lista de módulos

**Files:**
- Create: `src/app/admin/cursos/[id]/page.tsx`

- [ ] **Step 1: Implementar `src/app/admin/cursos/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { CursoForm } from '../curso-form'
import type { CursoInput } from '@/lib/admin/schemas'

export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()

  const { data: curso } = await supabase
    .from('lms_cursos')
    .select('id, titulo, descripcion, nivel, orden, activo, roles_auto')
    .eq('id', id)
    .single()
  if (!curso) notFound()

  const { data: modulos } = await supabase
    .from('lms_modulos')
    .select('id, numero, titulo, activo')
    .eq('curso_id', id)
    .order('orden')

  const inicial: CursoInput = {
    titulo: curso.titulo,
    descripcion: curso.descripcion ?? '',
    nivel: curso.nivel as CursoInput['nivel'],
    orden: curso.orden,
    activo: curso.activo,
    rolesAuto: (curso.roles_auto ?? []) as CursoInput['rolesAuto'],
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Editar curso</h1>
      <CursoForm id={id} inicial={inicial} />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Módulos</h2>
        <Link href={`/admin/modulos/nuevo?curso=${id}`} className="rounded bg-[var(--cafe)] px-3 py-1.5 text-sm font-semibold text-white">
          Nuevo módulo
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(modulos ?? []).map((m) => (
          <li key={m.id}>
            <Link href={`/admin/modulos/${m.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
              <span>{m.numero}. {m.titulo}</span>
              <span className="text-xs opacity-60">{m.activo ? 'activo' : 'inactivo'}</span>
            </Link>
          </li>
        ))}
        {(modulos ?? []).length === 0 && <p className="text-sm opacity-70">Sin módulos aún.</p>}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/cursos/[id]/page.tsx"
git commit -m "feat: edición de curso y lista de módulos"
```

---

### Task 7: Server actions de módulos

**Files:**
- Create: `src/actions/admin/modulos.ts`

- [ ] **Step 1: Implementar `src/actions/admin/modulos.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { slugify, generarSlugUnico } from '@/lib/slug'
import { moduloSchema, type ModuloInput } from '@/lib/admin/schemas'

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

export async function crearModulo(input: ModuloInput): Promise<{ id: string }> {
  await requireRol(['admin'])
  const d = moduloSchema.parse(input)
  const supabase = await createClient()

  const { data: existentes } = await supabase.from('lms_modulos').select('slug')
  const base = `${dosDigitos(d.numero)}-${slugify(d.titulo)}`
  const slug = generarSlugUnico(base, (existentes ?? []).map((m) => m.slug))

  const { data, error } = await supabase
    .from('lms_modulos')
    .insert({
      curso_id: d.cursoId,
      slug,
      numero: d.numero,
      titulo: d.titulo,
      contenido_md: d.contenidoMd,
      podcast_url: d.podcastUrl || null,
      examen_min_aprob: d.examenMinAprob,
      orden: d.orden,
      activo: d.activo,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/cursos/${d.cursoId}`)
  return { id: data.id }
}

export async function actualizarModulo(id: string, input: ModuloInput): Promise<void> {
  await requireRol(['admin'])
  const d = moduloSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('lms_modulos')
    .update({
      numero: d.numero,
      titulo: d.titulo,
      contenido_md: d.contenidoMd,
      podcast_url: d.podcastUrl || null,
      examen_min_aprob: d.examenMinAprob,
      orden: d.orden,
      activo: d.activo,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/modulos/${id}`)
  revalidatePath(`/admin/cursos/${d.cursoId}`)
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/actions/admin/modulos.ts
git commit -m "feat: server actions crear/actualizar módulo"
```

---

### Task 8: Edición de módulo con preview Markdown

**Files:**
- Create: `src/app/admin/modulos/[id]/page.tsx`
- Create: `src/app/admin/modulos/[id]/modulo-form.tsx`
- Create: `src/app/admin/modulos/nuevo/page.tsx`

- [ ] **Step 1: Implementar el formulario `src/app/admin/modulos/[id]/modulo-form.tsx`** (cliente, con preview)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { crearModulo, actualizarModulo } from '@/actions/admin/modulos'
import type { ModuloInput } from '@/lib/admin/schemas'

export function ModuloForm({ id, cursoId, inicial }: { id?: string; cursoId: string; inicial?: ModuloInput }) {
  const router = useRouter()
  const [v, setV] = useState<ModuloInput>(
    inicial ?? { cursoId, numero: 0, titulo: '', contenidoMd: '', podcastUrl: '', examenMinAprob: 80, orden: 0, activo: true }
  )
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (id) {
        await actualizarModulo(id, v)
        toast.success('Módulo actualizado')
        router.refresh()
      } else {
        const { id: nuevo } = await crearModulo(v)
        toast.success('Módulo creado')
        router.push(`/admin/modulos/${nuevo}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Número</label>
          <input type="number" value={v.numero} onChange={(e) => setV({ ...v, numero: Number(e.target.value), orden: Number(e.target.value) })}
            className="w-24 rounded border border-[var(--cafe)]/30 p-2" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm">Título</label>
          <input required value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })}
            className="rounded border border-[var(--cafe)]/30 p-2" />
        </div>
      </div>

      <label className="text-sm">URL del podcast (opcional)</label>
      <input type="url" value={v.podcastUrl} onChange={(e) => setV({ ...v, podcastUrl: e.target.value })}
        placeholder="https://…" className="rounded border border-[var(--cafe)]/30 p-2" />

      <label className="text-sm">Mínimo para aprobar (%)</label>
      <input type="number" min={0} max={100} value={v.examenMinAprob}
        onChange={(e) => setV({ ...v, examenMinAprob: Number(e.target.value) })}
        className="w-24 rounded border border-[var(--cafe)]/30 p-2" />

      <label className="text-sm">Contenido (Markdown)</label>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea value={v.contenidoMd} onChange={(e) => setV({ ...v, contenidoMd: e.target.value })}
          rows={20} className="rounded border border-[var(--cafe)]/30 p-2 font-mono text-sm" />
        <div className="prose prose-sm max-w-none overflow-auto rounded border border-[var(--cafe)]/15 bg-white p-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.contenidoMd}</ReactMarkdown>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.activo} onChange={(e) => setV({ ...v, activo: e.target.checked })} />
        Activo
      </label>

      <div className="flex items-center gap-3">
        <button disabled={guardando} className="rounded bg-[var(--cafe)] p-2 px-4 font-semibold text-white disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {id && <Link href={`/admin/modulos/${id}/examen`} className="text-sm underline">Editar examen →</Link>}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Implementar edición `src/app/admin/modulos/[id]/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { ModuloForm } from './modulo-form'
import type { ModuloInput } from '@/lib/admin/schemas'

export default async function EditarModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const supabase = await createClient()

  const { data: m } = await supabase
    .from('lms_modulos')
    .select('id, curso_id, numero, titulo, contenido_md, podcast_url, examen_min_aprob, orden, activo')
    .eq('id', id)
    .single()
  if (!m) notFound()

  const inicial: ModuloInput = {
    cursoId: m.curso_id,
    numero: m.numero,
    titulo: m.titulo,
    contenidoMd: m.contenido_md ?? '',
    podcastUrl: m.podcast_url ?? '',
    examenMinAprob: m.examen_min_aprob,
    orden: m.orden,
    activo: m.activo,
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Editar módulo</h1>
      <ModuloForm id={id} cursoId={m.curso_id} inicial={inicial} />
    </section>
  )
}
```

- [ ] **Step 3: Implementar alta `src/app/admin/modulos/nuevo/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { ModuloForm } from '../[id]/modulo-form'

export default async function NuevoModuloPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const { curso } = await searchParams
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  if (!curso) redirect('/admin/cursos')

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nuevo módulo</h1>
      <ModuloForm cursoId={curso} />
    </section>
  )
}
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/modulos/[id]/page.tsx" "src/app/admin/modulos/[id]/modulo-form.tsx" "src/app/admin/modulos/nuevo/page.tsx"
git commit -m "feat: edición/alta de módulo con preview Markdown"
```

---

### Task 9: Editor de exámenes

**Files:**
- Create: `src/actions/admin/examenes.ts`
- Create: `src/app/admin/modulos/[id]/examen/page.tsx`
- Create: `src/app/admin/modulos/[id]/examen/examen-editor.tsx`

- [ ] **Step 1: Implementar `src/actions/admin/examenes.ts`**

El admin lee/escribe `lms_opciones` (incluida `es_correcta`) con su sesión: el RLS `"opciones admin"` lo permite. `guardarExamen` borra y recrea preguntas/opciones del módulo (consistente con el script).

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRol } from '@/lib/auth/rol'
import { examenSchema, type ExamenInput } from '@/lib/admin/schemas'

export interface PreguntaEditor {
  enunciado: string
  pista: string | null
  opciones: { texto: string; esCorrecta: boolean }[]
}

export async function cargarExamen(moduloId: string): Promise<PreguntaEditor[]> {
  await requireRol(['admin'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('lms_preguntas')
    .select('enunciado, pista, orden, lms_opciones(texto, es_correcta, orden)')
    .eq('modulo_id', moduloId)
    .order('orden')

  return (data ?? []).map((p) => ({
    enunciado: p.enunciado,
    pista: p.pista,
    opciones: [...((p.lms_opciones as { texto: string; es_correcta: boolean; orden: number }[]) ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((o) => ({ texto: o.texto, esCorrecta: o.es_correcta })),
  }))
}

export async function guardarExamen(input: ExamenInput): Promise<void> {
  await requireRol(['admin'])
  const d = examenSchema.parse(input)
  const supabase = await createClient()

  // Borrar y recrear (las opciones caen por ON DELETE CASCADE de pregunta_id).
  await supabase.from('lms_preguntas').delete().eq('modulo_id', d.moduloId)

  for (let i = 0; i < d.preguntas.length; i++) {
    const p = d.preguntas[i]
    const { data: pregRow, error: errPreg } = await supabase
      .from('lms_preguntas')
      .insert({ modulo_id: d.moduloId, numero: i + 1, enunciado: p.enunciado, pista: p.pista, orden: i + 1 })
      .select('id')
      .single()
    if (errPreg) throw new Error(errPreg.message)

    const opciones = p.opciones.map((o, j) => ({
      pregunta_id: pregRow.id,
      texto: o.texto,
      es_correcta: o.esCorrecta,
      orden: j,
    }))
    const { error: errOpc } = await supabase.from('lms_opciones').insert(opciones)
    if (errOpc) throw new Error(errOpc.message)
  }

  revalidatePath(`/admin/modulos/${d.moduloId}/examen`)
}
```

- [ ] **Step 2: Implementar el editor `src/app/admin/modulos/[id]/examen/examen-editor.tsx`** (cliente)

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { guardarExamen, type PreguntaEditor } from '@/actions/admin/examenes'

const PREGUNTA_VACIA: PreguntaEditor = {
  enunciado: '',
  pista: null,
  opciones: [{ texto: '', esCorrecta: true }, { texto: '', esCorrecta: false }],
}

export function ExamenEditor({ moduloId, inicial }: { moduloId: string; inicial: PreguntaEditor[] }) {
  const [preguntas, setPreguntas] = useState<PreguntaEditor[]>(
    inicial.length ? inicial : [structuredClone(PREGUNTA_VACIA)]
  )
  const [guardando, setGuardando] = useState(false)

  function actualizar(i: number, patch: Partial<PreguntaEditor>) {
    setPreguntas((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  }
  function setCorrecta(pi: number, oi: number) {
    setPreguntas((ps) => ps.map((p, k) =>
      k === pi ? { ...p, opciones: p.opciones.map((o, j) => ({ ...o, esCorrecta: j === oi })) } : p))
  }
  function setTextoOpcion(pi: number, oi: number, texto: string) {
    setPreguntas((ps) => ps.map((p, k) =>
      k === pi ? { ...p, opciones: p.opciones.map((o, j) => (j === oi ? { ...o, texto } : o)) } : p))
  }

  async function guardar() {
    setGuardando(true)
    try {
      await guardarExamen({
        moduloId,
        preguntas: preguntas.map((p) => ({ ...p, pista: p.pista || null })),
      })
      toast.success('Examen guardado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {preguntas.map((p, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--cafe)]/15 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Pregunta {i + 1}</span>
            <button type="button" onClick={() => setPreguntas((ps) => ps.filter((_, k) => k !== i))}
              className="text-xs text-red-600">Eliminar</button>
          </div>
          <input value={p.enunciado} onChange={(e) => actualizar(i, { enunciado: e.target.value })}
            placeholder="Enunciado" className="rounded border border-[var(--cafe)]/30 p-2" />
          {p.opciones.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`correcta-${i}`} checked={o.esCorrecta} onChange={() => setCorrecta(i, oi)} />
              <input value={o.texto} onChange={(e) => setTextoOpcion(i, oi, e.target.value)}
                placeholder={`Opción ${oi + 1}`} className="flex-1 rounded border border-[var(--cafe)]/30 p-2" />
              <button type="button" onClick={() => actualizar(i, { opciones: p.opciones.filter((_, j) => j !== oi) })}
                className="text-xs opacity-60">✕</button>
            </div>
          ))}
          <button type="button"
            onClick={() => actualizar(i, { opciones: [...p.opciones, { texto: '', esCorrecta: false }] })}
            className="self-start text-xs underline">+ opción</button>
          <input value={p.pista ?? ''} onChange={(e) => actualizar(i, { pista: e.target.value })}
            placeholder="Pista (opcional)" className="rounded border border-[var(--cafe)]/30 p-2 text-sm" />
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={() => setPreguntas((ps) => [...ps, structuredClone(PREGUNTA_VACIA)])}
          className="rounded border border-[var(--cafe)]/30 px-3 py-2 text-sm">+ Pregunta</button>
        <button type="button" onClick={guardar} disabled={guardando}
          className="rounded bg-[var(--cafe)] px-4 py-2 font-semibold text-white disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar examen'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implementar la página `src/app/admin/modulos/[id]/examen/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { obtenerSesionRol } from '@/lib/auth/rol'
import { cargarExamen } from '@/actions/admin/examenes'
import { ExamenEditor } from './examen-editor'

export default async function ExamenAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sesion = await obtenerSesionRol()
  if (sesion?.rol !== 'admin') redirect('/admin')
  const inicial = await cargarExamen(id)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Editor de examen</h1>
      <ExamenEditor moduloId={id} inicial={inicial} />
    </section>
  )
}
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/actions/admin/examenes.ts "src/app/admin/modulos/[id]/examen/page.tsx" "src/app/admin/modulos/[id]/examen/examen-editor.tsx"
git commit -m "feat: editor de exámenes (cargar/guardar) en el panel"
```

---

## PARTE C — Gestión de personas (gerente + admin)

### Task 10: Server actions de personas

**Files:**
- Create: `src/actions/admin/personas.ts`

`crearBarista` usa service-role (crear usuario auth) tras verificar el rol del llamante. `asignarCurso`/`quitarInscripcion` usan la sesión (RLS deja escribir a gerentes).

- [ ] **Step 1: Implementar `src/actions/admin/personas.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRol } from '@/lib/auth/rol'
import { baristaSchema, type BaristaInput } from '@/lib/admin/schemas'

const REDIRECT = '/auth/confirm'

export async function crearBarista(input: BaristaInput): Promise<{ perfilId: string; enlace: string }> {
  await requireRol(['gerente', 'admin'])
  const d = baristaSchema.parse(input)
  const admin = createAdminClient()

  // 1. Crear o reutilizar el usuario auth (confirmado).
  let userId: string | undefined
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email: d.correo,
    email_confirm: true,
    user_metadata: { nombre: d.nombre },
  })
  if (errCrear) {
    const { data: lista, error: errLista } = await admin.auth.admin.listUsers()
    if (errLista) throw new Error(errLista.message)
    userId = lista.users.find((u) => u.email === d.correo)?.id
    if (!userId) throw new Error(errCrear.message)
  } else {
    userId = creado.user.id
  }

  // 2. Perfil LMS (barista).
  const { error: errPerfil } = await admin.from('lms_perfiles').upsert(
    { id: userId, nombre: d.nombre, rol: 'barista', sucursal_id: d.sucursalId },
    { onConflict: 'id' }
  )
  if (errPerfil) throw new Error(errPerfil.message)

  // 3. Enlace de acceso (magic link). Si hay SMTP, Supabase también envía correo.
  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data: link, error: errLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: d.correo,
    options: { redirectTo: `${origen}${REDIRECT}` },
  })
  if (errLink) throw new Error(errLink.message)
  const enlace = `${origen}${REDIRECT}?token_hash=${link.properties?.hashed_token}&type=magiclink`

  revalidatePath('/admin/personas')
  return { perfilId: userId, enlace }
}

export async function asignarCurso(perfilId: string, cursoId: string): Promise<void> {
  const sesion = await requireRol(['gerente', 'admin'])
  const supabase = await createClient()
  const { error } = await supabase.from('lms_inscripciones').upsert(
    { perfil_id: perfilId, curso_id: cursoId, estado: 'asignado', asignado_por: sesion.userId },
    { onConflict: 'perfil_id,curso_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/personas/${perfilId}`)
}

export async function quitarInscripcion(perfilId: string, cursoId: string): Promise<void> {
  await requireRol(['gerente', 'admin'])
  const supabase = await createClient()
  const { error } = await supabase
    .from('lms_inscripciones')
    .delete()
    .eq('perfil_id', perfilId)
    .eq('curso_id', cursoId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/personas/${perfilId}`)
}
```

- [ ] **Step 2: Agregar `NEXT_PUBLIC_SITE_URL` a `.env.example`**

Modify `.env.example`, agregar al final:
```
# URL pública del sitio (para enlaces de acceso generados en el panel)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/actions/admin/personas.ts .env.example
git commit -m "feat: server actions de personas (alta barista, asignar/quitar curso)"
```

---

### Task 11: Lista de baristas

**Files:**
- Create: `src/app/admin/personas/page.tsx`

- [ ] **Step 1: Implementar `src/app/admin/personas/page.tsx`**

`gerente` ve los perfiles de su sucursal y `admin` todos: el RLS de `lms_perfiles` lo resuelve, así que basta consultar con la sesión. El resumen de progreso (módulos aprobados) se lee de `lms_progreso` con la misma sesión (RLS deja a gerente/admin leerlo).

**Nota de diseño (desviación consciente del spec):** el spec menciona mostrar el **correo** en la lista, pero `lms_perfiles` no tiene esa columna (el correo vive en `auth.users`). Obtenerlo exigiría `auth.admin.listUsers()` con service-role, que devuelve **todos** los usuarios sin filtrar por sucursal y rompería el alcance del gerente (fuga entre sucursales). Por eso el correo se omite de la lista; queda disponible en el alta (lo captura el gerente) y puede agregarse luego con una columna `correo` en `lms_perfiles` si se requiere.

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PersonasPage() {
  const supabase = await createClient()
  const { data: perfiles } = await supabase
    .from('lms_perfiles')
    .select('id, nombre, rol, sucursal:sucursales(nombre)')
    .order('nombre')

  const ids = (perfiles ?? []).map((p) => p.id)
  const { data: aprobados } = await supabase
    .from('lms_progreso')
    .select('perfil_id')
    .eq('estado', 'aprobado')
    .in('perfil_id', ids)

  const conteo = new Map<string, number>()
  for (const a of aprobados ?? []) conteo.set(a.perfil_id, (conteo.get(a.perfil_id) ?? 0) + 1)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Personas</h1>
        <Link href="/admin/personas/nuevo" className="rounded bg-[var(--cafe)] px-4 py-2 text-sm font-semibold text-white">
          Alta de barista
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {(perfiles ?? []).map((p) => {
          const suc = Array.isArray(p.sucursal) ? p.sucursal[0] : p.sucursal
          return (
            <li key={p.id}>
              <Link href={`/admin/personas/${p.id}`} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs opacity-60">
                  {p.rol} · {(suc as { nombre?: string } | null)?.nombre ?? 'sin sucursal'} · {conteo.get(p.id) ?? 0} módulos aprobados
                </span>
              </Link>
            </li>
          )
        })}
        {(perfiles ?? []).length === 0 && <p className="text-sm opacity-70">Sin personas registradas.</p>}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/personas/page.tsx"
git commit -m "feat: lista de personas en el panel"
```

---

### Task 12: Alta de barista (formulario + enlace)

**Files:**
- Create: `src/app/admin/personas/nuevo/page.tsx`
- Create: `src/app/admin/personas/barista-form.tsx`

- [ ] **Step 1: Implementar el formulario `src/app/admin/personas/barista-form.tsx`** (cliente)

```tsx
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
        <label className="text-sm">Nombre</label>
        <input required value={nombre} onChange={(e) => setNombre(e.target.value)}
          className="rounded border border-[var(--cafe)]/30 p-2" />
        <label className="text-sm">Correo</label>
        <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
          className="rounded border border-[var(--cafe)]/30 p-2" />
        <label className="text-sm">Sucursal</label>
        <select value={sucursalId ?? ''} onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)}
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
```

- [ ] **Step 2: Implementar la página `src/app/admin/personas/nuevo/page.tsx`**

Las sucursales se listan con service-role (la tabla `sucursales` es de the-coffee-cash y puede tener su propio RLS).

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { BaristaForm } from '../barista-form'

export default async function NuevoBaristaPage() {
  const admin = createAdminClient()
  const { data: sucursales } = await admin.from('sucursales').select('id, nombre').order('nombre')

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Alta de barista</h1>
      <BaristaForm sucursales={(sucursales ?? []) as { id: number; nombre: string }[]} />
    </section>
  )
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/personas/nuevo/page.tsx" "src/app/admin/personas/barista-form.tsx"
git commit -m "feat: alta de barista con enlace de acceso"
```

---

### Task 13: Detalle de barista — asignar cursos + progreso

**Files:**
- Create: `src/app/admin/personas/[id]/page.tsx`
- Create: `src/app/admin/personas/[id]/asignar-cursos.tsx`

- [ ] **Step 1: Implementar el cliente `src/app/admin/personas/[id]/asignar-cursos.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { asignarCurso, quitarInscripcion } from '@/actions/admin/personas'

export function AsignarCursos({
  perfilId,
  cursos,
  asignadosInicial,
}: {
  perfilId: string
  cursos: { id: string; titulo: string }[]
  asignadosInicial: string[]
}) {
  const [asignados, setAsignados] = useState<Set<string>>(new Set(asignadosInicial))
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function alternar(cursoId: string) {
    setOcupado(cursoId)
    try {
      if (asignados.has(cursoId)) {
        await quitarInscripcion(perfilId, cursoId)
        setAsignados((s) => { const n = new Set(s); n.delete(cursoId); return n })
        toast.success('Curso quitado')
      } else {
        await asignarCurso(perfilId, cursoId)
        setAsignados((s) => new Set(s).add(cursoId))
        toast.success('Curso asignado')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {cursos.map((c) => {
        const on = asignados.has(c.id)
        return (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-[var(--cafe)]/15 bg-white p-3">
            <span>{c.titulo}</span>
            <button onClick={() => alternar(c.id)} disabled={ocupado === c.id}
              className={`rounded px-3 py-1 text-sm ${on ? 'border border-red-300 text-red-600' : 'bg-[var(--cafe)] text-white'}`}>
              {on ? 'Quitar' : 'Asignar'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Implementar la página `src/app/admin/personas/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AsignarCursos } from './asignar-cursos'

export default async function DetalleBaristaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from('lms_perfiles')
    .select('id, nombre, rol')
    .eq('id', id)
    .single()
  if (!perfil) notFound()

  const { data: cursos } = await supabase
    .from('lms_cursos')
    .select('id, titulo')
    .eq('activo', true)
    .order('orden')

  const { data: inscripciones } = await supabase
    .from('lms_inscripciones')
    .select('curso_id')
    .eq('perfil_id', id)

  const { data: progreso } = await supabase
    .from('lms_progreso')
    .select('modulo_id, estado, ultima_calif')
    .eq('perfil_id', id)
    .eq('estado', 'aprobado')

  const asignados = (inscripciones ?? []).map((i) => i.curso_id)

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{perfil.nombre}</h1>

      <div>
        <h2 className="mb-2 font-semibold">Cursos asignados</h2>
        <AsignarCursos perfilId={id} cursos={(cursos ?? []) as { id: string; titulo: string }[]} asignadosInicial={asignados} />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Progreso</h2>
        <p className="text-sm opacity-70">{(progreso ?? []).length} módulos aprobados.</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/personas/[id]/page.tsx" "src/app/admin/personas/[id]/asignar-cursos.tsx"
git commit -m "feat: detalle de barista con asignación de cursos y progreso"
```

---

## PARTE D — Integración y verificación

### Task 14: Aterrizaje de staff + enlace en perfil + verificación E2E

**Files:**
- Modify: `src/app/auth/confirm/route.ts`
- Modify: `src/app/(barista)/perfil/page.tsx`

- [ ] **Step 1: Aterrizaje de staff en `/admin` tras login**

El archivo actual `src/app/auth/confirm/route.ts` redirige siempre a `/cursos` tras `verifyOtp`. Reemplazar su contenido completo por la versión que consulta el rol y manda al staff a `/admin`:

```ts
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
```

- [ ] **Step 2: Enlace "Panel" en el perfil del barista para staff**

En `src/app/(barista)/perfil/page.tsx`, tras obtener `perfil`, calcular si es staff y renderizar un enlace antes del botón de cerrar sesión:

```tsx
// imports
import Link from 'next/link'
// ...tras leer `perfil`:
const esStaff = perfil?.rol === 'gerente' || perfil?.rol === 'admin'
// ...en el JSX, antes del <form action={cerrarSesion}>:
{esStaff && (
  <Link href="/admin" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--cafe)]/30 bg-white p-3 font-medium">
    Ir al panel de administración
  </Link>
)}
```

- [ ] **Step 3: Verificar compilación y suite completa**

Run: `npx tsc --noEmit && npm test`
Expected: tipos OK; todos los tests verdes.

- [ ] **Step 4: Promover el usuario demo a admin (solo para probar)**

En el SQL Editor de Supabase (o vía service-role), ejecutar:
```sql
update lms_perfiles set rol = 'admin' where id = (select id from auth.users where email = 'barista.demo@thecoffee.mx');
```
(Al terminar las pruebas se puede revertir a `'barista'`.)

- [ ] **Step 5: Verificación E2E en preview**

Con el dev server `academy` corriendo, autenticarse con el enlace mágico del demo (ya admin) y verificar el flujo completo:
1. Login → aterriza en `/admin`.
2. Contenido: crear un curso de prueba → crear un módulo (con preview Markdown) → crear/guardar su examen.
3. Personas: alta de un barista de prueba (se muestra el enlace) → entrar a su detalle → asignar el curso → ver "0 módulos aprobados".
4. Gating: revertir el demo a `'barista'` y confirmar que `/admin` redirige a `/cursos`.

Documentar cualquier hallazgo; corregir antes de cerrar.

- [ ] **Step 6: Commit**

```bash
git add "src/app/auth/confirm/route.ts" "src/app/(barista)/perfil/page.tsx"
git commit -m "feat: aterrizaje de staff en /admin y acceso desde el perfil"
```

---

## Notas de seguridad (recordatorio para el implementador)

- La `SUPABASE_SERVICE_ROLE_KEY` es server-only y nunca debe imprimirse ni commitearse. Solo `crearBarista` y la lista de sucursales la usan.
- `es_correcta` solo viaja entre admin y servidor (RLS `"opciones admin"`); jamás al barista.
- Todo server action llama `requireRol(...)` antes de mutar. No quitar esa guarda.
- No commitear `.env.local` (sigue en `.gitignore`).
```
