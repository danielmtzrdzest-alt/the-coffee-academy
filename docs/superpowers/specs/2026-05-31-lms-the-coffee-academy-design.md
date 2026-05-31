# The Coffee Academy — Diseño de LMS

*Fecha: 2026-05-31 · Estado: aprobado para plan de implementación*

## 1. Resumen

LMS (Learning Management System) interno para la capacitación de baristas de The
Coffee, mobile-first, construido a la medida con Next.js + Supabase. Reusa el
contenido de capacitación ya existente (13 módulos en markdown, exámenes,
podcasts) y comparte el proyecto Supabase de `the-coffee-cash` para tener una sola
identidad de empleado y el catálogo de sucursales.

**Audiencia:** baristas (estudian en su celular), gerentes (dashboard de su
sucursal), admin (tú: contenido + todas las sucursales). Multi-sucursal, con
posibilidad de extenderse a franquicias.

## 2. Decisiones clave

- **Repo nuevo e independiente** (`the-coffee-academy`), separado de
  `the-coffee-cash`. Audiencias y ciclos de release distintos.
- **Supabase compartido** con `the-coffee-cash`: mismo `auth.users` (un solo
  login por empleado) y misma tabla `sucursales`.
- **Jerarquía Cursos → Módulos.** Los 13 módulos actuales = curso "Capacitación
  Barista". La plataforma soporta varios cursos.
- **Asignación híbrida:** cursos automáticos por rol (`roles_auto`) + asignación
  manual por gerente/admin. Ambas materializadas en `lms_inscripciones`.
- **Progreso secuencial** dentro de un curso (desbloqueo progresivo: el módulo N+1
  se abre al aprobar el N). Los módulos están numerados y construyen uno sobre otro.
- **Certificado por curso** (no global): PDF con folio + logo; firma de gerente
  opcional.
- **Idioma:** todo en español.

## 3. Arquitectura

```
Barista (móvil)  ┐
Gerente (web)    ┼─→  Next.js 15 (Vercel)  ─→  Supabase (compartido con cash)
Admin (web)      ┘       App Router              Auth · Postgres+RLS · Storage
                         Server Actions          sucursales (tabla compartida)
```

### Estructura del repo

```
the-coffee-academy/
├── app/
│   ├── (barista)/              # Layout móvil
│   │   ├── cursos/             # "Mis Cursos"
│   │   ├── curso/[slug]/       # Módulos del curso
│   │   ├── modulo/[slug]/      # Leer / Escuchar / Examen
│   │   └── perfil/             # Progreso + certificados
│   ├── (admin)/                # Layout dashboard
│   │   ├── dashboard/          # Vista por sucursal
│   │   ├── empleados/          # Baristas
│   │   ├── cursos/             # Gestión de cursos/módulos
│   │   └── contenido/          # Editor markdown (Fase 5)
│   ├── api/                    # Route handlers
│   └── auth/                   # Login Supabase
├── content/                    # Módulos .md + exámenes parseados
├── lib/
│   ├── supabase/               # Cliente + types
│   ├── content/                # Loader de módulos
│   ├── examenes/               # Parser de exámenes .md → preguntas/opciones
│   └── certificado/            # Generador PDF (reusa patrón de cash)
├── components/                 # shadcn/ui + custom
├── scripts/
│   └── importar-contenido.ts   # Carga módulos/exámenes/podcasts (idempotente)
└── supabase/
    └── migrations/             # Migraciones lms_*
```

## 4. Modelo de datos

Tablas nuevas con prefijo `lms_`. **`sucursal_id` es `bigint`** (FK a
`sucursales.id`, que es `bigserial` en `the-coffee-cash`). El LMS mantiene perfiles
y roles propios, **separados de `usuarios_app`** (la tabla de miembros de la app de
cash), compartiendo solo `auth.users` y `sucursales`.

```sql
-- Perfil de usuario del LMS
lms_perfiles
  id              uuid PK → auth.users.id
  nombre          text
  sucursal_id     bigint FK → sucursales.id
  rol             text  -- 'barista' | 'gerente' | 'admin'
  fecha_ingreso   date
  created_at      timestamptz

-- Curso (raíz de la jerarquía)
lms_cursos
  id              uuid PK
  slug            text UNIQUE
  titulo          text
  descripcion     text
  nivel           text          -- 'introductorio' | 'intermedio' | 'avanzado'
  portada_url     text
  roles_auto      text[]        -- p.ej. ['barista'] → inscripción automática
  orden           int
  activo          boolean
  created_at      timestamptz

-- Módulo (pertenece a un curso)
lms_modulos
  id               uuid PK
  curso_id         uuid FK → lms_cursos.id
  slug             text UNIQUE   -- '01-bienvenida'
  numero           int
  titulo           text
  nivel            text
  podcast_url      text          -- Supabase Storage
  orden            int
  activo           boolean
  examen_min_aprob int           -- % mínimo para aprobar (default 80)

-- Inscripción barista↔curso (auto por rol o manual)
lms_inscripciones
  id              uuid PK
  perfil_id       uuid FK → lms_perfiles.id
  curso_id        uuid FK → lms_cursos.id
  asignado_por    uuid          -- null si fue automática por rol
  estado          text          -- 'asignado' | 'en_progreso' | 'completado'
  completado_at   timestamptz
  UNIQUE(perfil_id, curso_id)

-- Progreso por módulo
lms_progreso
  id              uuid PK
  perfil_id       uuid FK → lms_perfiles.id
  modulo_id       uuid FK → lms_modulos.id
  estado          text  -- 'no_iniciado' | 'en_progreso' | 'aprobado' | 'reprobado'
  leido           boolean
  podcast_visto   boolean
  ultima_calif    int           -- % del último intento
  intentos        int
  completado_at   timestamptz
  UNIQUE(perfil_id, modulo_id)

-- Preguntas de examen (importadas de Examenes/*.md)
lms_preguntas
  id              uuid PK
  modulo_id       uuid FK → lms_modulos.id
  numero          int
  enunciado       text
  pista           text
  orden           int

lms_opciones
  id              uuid PK
  pregunta_id     uuid FK → lms_preguntas.id
  texto           text
  es_correcta     boolean
  orden           int

-- Intentos de examen (auditoría)
lms_intentos
  id              uuid PK
  perfil_id       uuid FK → lms_perfiles.id
  modulo_id       uuid FK → lms_modulos.id
  calificacion    int           -- %
  aprobado        boolean
  respuestas      jsonb         -- {pregunta_id: opcion_id}
  created_at      timestamptz

-- Certificados (por curso)
lms_certificados
  id              uuid PK
  perfil_id       uuid FK → lms_perfiles.id
  curso_id        uuid FK → lms_cursos.id
  folio           text UNIQUE   -- 'TC-2026-0001'
  emitido_at      timestamptz
  pdf_url         text
```

### RLS (mismo patrón que `the-coffee-cash`)

- **Barista:** lee/escribe solo su `lms_perfil`, su `lms_progreso`, sus
  `lms_intentos`, sus `lms_inscripciones` y sus `lms_certificados`. Lee
  `lms_cursos`/`lms_modulos`/`lms_preguntas` de cursos donde está inscrito.
  **No puede leer `lms_opciones.es_correcta`** antes de calificar (la calificación
  se hace server-side).
- **Gerente:** lee progreso/intentos/inscripciones de baristas con su misma
  `sucursal_id`.
- **Admin:** acceso total; única que edita cursos, módulos y preguntas.

La calificación de exámenes ocurre en **server action** (el cliente nunca recibe
`es_correcta`); se registra un `lms_intento` y se actualiza `lms_progreso`.

## 5. Flujos de usuario

### Barista (móvil)
```
Login (email/teléfono)
 → Home "Mis Cursos" (cards con % de avance)
 → Curso → lista de módulos (estado: aprobado / en progreso / bloqueado)
 → Módulo (tabs):
     Leer      → contenido .md renderizado
     Escuchar  → reproductor de podcast (control de velocidad)
     Examen    → habilitado tras "marcar leído"; 1 pregunta a la vez, pista opcional
 → Calificación automática inmediata:
     ≥ examen_min_aprob → Aprobado, desbloquea siguiente módulo
     < mínimo           → Reprobado, puede reintentar (registra intento)
 → Completar todos los módulos del curso → Certificado del curso (PDF)
```

### Gerente (web/tablet)
```
Login → Dashboard de SU sucursal
 → Tabla: barista | curso | avance (X/N) | días desde ingreso | semáforo
     Semáforo 30 días: 🟢 <20d · 🟡 20-30d · 🔴 >30d (regla del módulo 01)
 → Detalle de barista: módulos, calificaciones, intentos
 → Exportar reporte (CSV/PDF)
```

### Admin
```
Todo lo del gerente, en TODAS las sucursales (selector)
 + Gestión de cursos y módulos
 + Edición de preguntas de examen
 + Alta/baja de baristas y gerentes
 + Emisión/consulta de certificados
```

## 6. Importación de contenido

Script `scripts/importar-contenido.ts`, **idempotente** (upsert por slug):

1. Lee `content/*.md` → upsert `lms_modulos`.
2. Parsea `Examenes/*.md` → `lms_preguntas` + `lms_opciones`
   (detecta `- [x]` = correcta, extrae `**Pista:**`).
3. Sube `Podcasts/*.mp4` → Supabase Storage → set `podcast_url`.
4. Crea curso "Capacitación Barista" (`roles_auto = ['barista']`) y enlaza los 13
   módulos en orden.

Reusa el enfoque de parseo de los scripts existentes `_build_kahoot.py` /
`_build_quizizz.py`. Fuente del contenido:
`Desktop/GUIDEBOOK RESUMEN/MD PODCAST GUIDEBOOK/Modulos de Capacitacion`.

## 7. Integración con the-coffee-cash

- **Mismo proyecto Supabase** → mismo `auth.users`: un empleado tiene un solo
  login para ambas apps.
- `lms_perfiles.sucursal_id` → FK a `sucursales.id` (bigint) existente.
- El LMS **no** usa `usuarios_app`; mantiene perfiles/roles propios para no acoplar
  los permisos de las dos apps.
- Generación de PDF de certificados: reusa el patrón de utilidades PDF ya
  implementado en `the-coffee-cash`.

## 8. Stack técnico

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **DB/Auth/Storage:** Supabase (compartido)
- **UI:** Tailwind CSS + shadcn/ui
- **Markdown:** `react-markdown` + `remark-gfm`
- **PDF:** utilidad reusada de `the-coffee-cash`
- **Tests:** Vitest
- **Deploy:** Vercel (proyecto nuevo, URL propia)

## 9. Fases de implementación

| Fase | Alcance | Estimado |
|------|---------|----------|
| 0 | Cimientos: scaffold Next.js + Tailwind + shadcn, conexión Supabase, migraciones `lms_*`, RLS | ½ día |
| 1 | Script de importación de contenido (módulos, exámenes, podcasts, curso barista) | ½ día |
| 2 | Experiencia barista: login, Mis Cursos, módulo (Leer/Escuchar/Examen), calificación, progreso, desbloqueo | ~1 semana |
| 3 | Certificados: PDF al completar curso, descarga, folio único | 1-2 días |
| 4 | Dashboard gerente/admin: vista por sucursal, tabla, semáforo 30d, exportar, selector de sucursal | 3-4 días |
| 5 | Editor de contenido admin (markdown + preguntas) — *opcional, post-MVP* | 2-3 días |

**MVP = Fases 0-4.**

## 10. Fuera de alcance (YAGNI)

Foros/comunidad, gamificación con puntos/badges, app nativa, notificaciones push,
multi-idioma, integración con nómina, SSO corporativo.

## 11. Verificaciones pendientes antes de implementar

- Confirmar credenciales/URL del proyecto Supabase compartido y cómo se inyectan
  las env vars en el proyecto nuevo de Vercel.
- Confirmar si los baristas se autentican por **email** o por **teléfono** (define
  el proveedor de Supabase Auth a habilitar).
- Confirmar si `the-coffee-cash` tiene una tabla de empleados además de
  `usuarios_app` que convenga referenciar.
