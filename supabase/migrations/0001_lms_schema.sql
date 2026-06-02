-- 0001_lms_schema.sql — Esquema del LMS The Coffee Academy
-- Reusa auth.users y la tabla existente `sucursales` (id bigint).

-- Perfil del LMS (separado de usuarios_app de the-coffee-cash)
create table if not exists lms_perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null,
  sucursal_id   bigint references sucursales(id),
  rol           text not null default 'barista'
                  check (rol in ('barista','gerente','admin')),
  fecha_ingreso date not null default current_date,
  created_at    timestamptz not null default now()
);

create table if not exists lms_cursos (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  titulo       text not null,
  descripcion  text,
  nivel        text not null default 'introductorio'
                 check (nivel in ('introductorio','intermedio','avanzado')),
  portada_url  text,
  roles_auto   text[] not null default '{}',
  orden        int not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists lms_modulos (
  id               uuid primary key default gen_random_uuid(),
  curso_id         uuid not null references lms_cursos(id) on delete cascade,
  slug             text not null unique,
  numero           int not null,
  titulo           text not null,
  nivel            text,
  podcast_url      text,
  contenido_md     text not null default '',
  orden            int not null default 0,
  activo           boolean not null default true,
  examen_min_aprob int not null default 80,
  created_at       timestamptz not null default now()
);

create table if not exists lms_inscripciones (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references lms_perfiles(id) on delete cascade,
  curso_id      uuid not null references lms_cursos(id) on delete cascade,
  asignado_por  uuid references lms_perfiles(id),
  estado        text not null default 'asignado'
                  check (estado in ('asignado','en_progreso','completado')),
  completado_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (perfil_id, curso_id)
);

create table if not exists lms_progreso (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references lms_perfiles(id) on delete cascade,
  modulo_id     uuid not null references lms_modulos(id) on delete cascade,
  estado        text not null default 'no_iniciado'
                  check (estado in ('no_iniciado','en_progreso','aprobado','reprobado')),
  leido         boolean not null default false,
  podcast_visto boolean not null default false,
  ultima_calif  int,
  intentos      int not null default 0,
  completado_at timestamptz,
  unique (perfil_id, modulo_id)
);

create table if not exists lms_preguntas (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  uuid not null references lms_modulos(id) on delete cascade,
  numero     int not null,
  enunciado  text not null,
  pista      text,
  orden      int not null default 0
);

create table if not exists lms_opciones (
  id           uuid primary key default gen_random_uuid(),
  pregunta_id  uuid not null references lms_preguntas(id) on delete cascade,
  texto        text not null,
  es_correcta  boolean not null default false,
  orden        int not null default 0
);

create table if not exists lms_intentos (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references lms_perfiles(id) on delete cascade,
  modulo_id    uuid not null references lms_modulos(id) on delete cascade,
  calificacion int not null,
  aprobado     boolean not null,
  respuestas   jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table if not exists lms_certificados (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null references lms_perfiles(id) on delete cascade,
  curso_id   uuid not null references lms_cursos(id) on delete cascade,
  folio      text not null unique,
  emitido_at timestamptz not null default now(),
  pdf_url    text,
  unique (perfil_id, curso_id)
);

create index if not exists idx_lms_modulos_curso on lms_modulos(curso_id, orden);
create index if not exists idx_lms_progreso_perfil on lms_progreso(perfil_id);
create index if not exists idx_lms_inscripciones_perfil on lms_inscripciones(perfil_id);
create index if not exists idx_lms_preguntas_modulo on lms_preguntas(modulo_id, orden);
