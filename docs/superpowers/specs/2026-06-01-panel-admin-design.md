# Panel de Administración — The Coffee Academy (Diseño)

**Fecha:** 2026-06-01
**Estado:** Aprobado el diseño; pendiente revisión del spec y plan de implementación.

## Objetivo

Dar a gerentes y administradores una interfaz web para gestionar el LMS sin tocar
código ni archivos: **autoría de contenido** (cursos, módulos, exámenes) y
**gestión de personas** (alta de baristas, asignación de cursos, seguimiento de
progreso).

## Contexto

Hoy el contenido se da de alta con archivos Markdown en `content/NN.md` +
`content/NN.examen.md` y el script idempotente `npm run importar`. No existe UI de
administración. El esquema `lms_*` y el RLS ya soportan un panel de admin:

- `lms_cursos`, `lms_modulos`, `lms_preguntas`: lectura para autenticados; **escritura solo `admin`** (`lms_es_admin()`).
- `lms_opciones`: **solo `admin`** lee/escribe (incluye `es_correcta`). El barista nunca la recibe.
- `lms_inscripciones`: **`gerente`+`admin`** escriben (`lms_es_gerente()`).
- `lms_perfiles`: `admin` administra todo; `gerente` solo lee los de su sucursal.
- Funciones security-definer existentes: `lms_mi_rol()`, `lms_mi_sucursal()`, `lms_es_admin()`, `lms_es_gerente()`.

Implicación: el CRUD de contenido y la asignación de cursos se hacen con la **sesión
del propio usuario** (el RLS hace cumplir el acceso). Solo el alta de baristas (crear
usuario en `auth.users`) necesita la **service-role**, encapsulada en el servidor.

## Decisiones tomadas (brainstorming)

1. **Alcance v1:** ambos — gestión de contenido y de personas.
2. **Alta de baristas:** el gerente/admin los crea (nombre + correo + sucursal); el
   sistema crea el usuario y genera su enlace de acceso.
3. **Podcasts:** se cargan **pegando una URL** (sin subida de archivos en el panel).

## Enfoque elegido

Panel `/admin` **dentro de la misma app Next.js** (route group nuevo), con server
components + server actions, apalancando el RLS y la autenticación existentes.

Alternativas descartadas: (B) editar tablas en Supabase Studio — peligroso, sin
validación, no resuelve onboarding; (C) framework de admin externo — suma stack y
deploy, sobredimensionado para flujos a medida.

## Arquitectura

### Route group y acceso

- Nuevo route group `src/app/(admin)/` bajo la ruta `/admin`. Layout **desktop-first**
  (tablas y formularios), distinto del barista mobile-first.
- **Gating de rol** en `(admin)/layout.tsx` (server component): obtiene el perfil del
  usuario; si `rol` no es `gerente` ni `admin`, redirige a `/cursos`.
- Visibilidad por sección dentro del panel:
  - **Contenido** (cursos/módulos/exámenes): solo `admin`.
  - **Personas** (baristas/asignaciones/progreso): `gerente` + `admin`.
- **Aterrizaje:** staff (`gerente`/`admin`) ve un enlace "Panel" en su perfil de
  barista; al iniciar sesión, si el rol es staff, se redirige a `/admin` en lugar de
  `/cursos`.

### Clientes Supabase

- CRUD de contenido y asignaciones → cliente de **sesión** (`createClient` server).
  El RLS garantiza que solo el rol correcto escribe.
- Alta de barista → **service-role** (`createAdminClient`), únicamente dentro de un
  server action que primero verifica que el llamante es `gerente`/`admin`.

## Componentes

### Sección Contenido (solo admin)

**Cursos**
- Lista de cursos (titulo, nivel, activo, # de módulos).
- Form crear/editar: `titulo`, `descripcion`, `nivel` (introductorio/intermedio/avanzado),
  `orden`, `activo`, `roles_auto` (multi-select de roles).
- `slug` autogenerado del título (mismo `slugify` del loader actual), garantizando
  unicidad; sufijo numérico si colisiona.

**Módulos** (dentro de un curso)
- Lista ordenada de módulos del curso.
- Form crear/editar: `numero`, `titulo`, **editor Markdown con preview en vivo** para
  `contenido_md` (reusa `react-markdown` + `remark-gfm`), **`podcast_url`** (campo de
  texto/URL), `examen_min_aprob` (default 80), `orden`, `activo`.
- `slug` autogenerado como `NN-<slug-del-titulo>`.

**Exámenes** (dentro de un módulo)
- Editor estructurado: lista de preguntas; cada pregunta con `enunciado`, `pista`
  (opcional) y sus opciones; cada opción con `texto` y un **radio "correcta"** (exacta
  una correcta por pregunta).
- Guardado: estrategia de "borrar y recrear" las preguntas/opciones del módulo dentro
  de un server action, igual que el script (consistencia con `importar-contenido.ts`).
- El admin lee/escribe `es_correcta` (RLS lo permite). Esta marca **nunca** se expone
  a baristas (la página de módulo del barista sigue cargando opciones sin `es_correcta`).

### Sección Personas (gerente + admin)

**Baristas**
- Lista de perfiles: `gerente` ve los de su sucursal; `admin` ve todos. Muestra nombre,
  correo, sucursal y resumen de progreso (módulos aprobados).

**Alta de barista**
- Form: `nombre` + `correo` + `sucursal`.
- Server action (service-role, tras verificar rol del llamante):
  1. Crea el usuario en `auth.users` (`auth.admin.createUser`, `email_confirm: true`).
  2. Inserta su `lms_perfil` (`rol: 'barista'`, `sucursal_id`).
  3. Genera el enlace de acceso (`auth.admin.generateLink` tipo `magiclink`) y lo
     devuelve a la UI para copiar/compartir. Si hay SMTP configurado en Supabase, el
     correo de invitación también se envía.
- Manejo de "usuario ya existe": reutilizar el perfil/usuario en vez de fallar.

**Asignar cursos**
- Asignar/quitar `lms_inscripciones` (perfil ↔ curso, `estado='asignado'`,
  `asignado_por`). Usa el cliente de sesión (RLS deja escribir a gerentes).

**Progreso**
- Vista por barista: módulos aprobados / totales, última calificación e intentos
  (lectura de `lms_progreso` / `lms_intentos`, permitida por RLS a gerente/admin).

## Seguridad

- Todo server action verifica el rol del llamante (vía su sesión y `lms_perfiles.rol`)
  **antes** de mutar.
- La **service-role key** permanece server-only; solo el action de alta de barista la usa.
- `es_correcta` solo viaja entre admin y servidor; jamás al barista.
- Validación de inputs con **zod** en cada server action; `revalidatePath` tras mutar.
- Solo se commitean archivos no sensibles (`.env.local` permanece en gitignore).

## Datos

No se requieren nuevas tablas ni columnas: el panel opera sobre el esquema `lms_*`
existente. Si durante la implementación surge la necesidad de auditar quién creó/editó
contenido, se evaluará agregar columnas `created_by`/`updated_by` en una migración
aditiva aparte (fuera del alcance v1).

## Coexistencia con el script de importación

`npm run importar` se mantiene como **carga masiva inicial** (seed). El panel cubre la
edición continua. Ambos operan sobre las mismas tablas con la misma semántica de
`slug`/upsert, por lo que no se pisan.

## Pruebas

- Tests unitarios para helpers puros: `slugify`/unicidad de slug, esquemas zod de
  validación (curso, módulo, examen, alta de barista).
- Verificación manual en preview del flujo completo: crear curso → módulo (con preview
  Markdown) → examen → alta de barista (enlace generado) → asignación → ver progreso.

## Fuera de alcance (v1)

- Subida de archivos de podcast desde el panel (se pega URL).
- Edición de roles/jerarquía de usuarios (promover a gerente/admin) desde la UI.
- Reportes/analítica avanzada, exportaciones, certificados.
- Auditoría `created_by`/`updated_by`.

## Dependencias / supuestos

- Para que el correo de invitación se envíe automáticamente, Supabase debe tener SMTP
  configurado; si no, el gerente comparte el enlace generado manualmente.
- Debe existir al menos un usuario con `rol='admin'` para administrar contenido (se
  asigna manualmente en BD la primera vez).
