-- 0002_lms_rls.sql — RLS del LMS
-- Funciones security definer con search_path fijo para evitar recursión de RLS
-- al leer lms_perfiles desde una policy.

create or replace function lms_mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from lms_perfiles where id = auth.uid()
$$;

create or replace function lms_mi_sucursal()
returns bigint language sql stable security definer set search_path = public as $$
  select sucursal_id from lms_perfiles where id = auth.uid()
$$;

create or replace function lms_es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from lms_perfiles where id = auth.uid() and rol = 'admin')
$$;

create or replace function lms_es_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from lms_perfiles where id = auth.uid() and rol in ('gerente','admin'))
$$;

-- Habilitar RLS
alter table lms_perfiles      enable row level security;
alter table lms_cursos        enable row level security;
alter table lms_modulos       enable row level security;
alter table lms_inscripciones enable row level security;
alter table lms_progreso      enable row level security;
alter table lms_preguntas     enable row level security;
alter table lms_opciones      enable row level security;
alter table lms_intentos      enable row level security;
alter table lms_certificados  enable row level security;

-- lms_perfiles: cada quien lee el suyo; gerente lee los de su sucursal; admin todo.
create policy "perfil propio o gerencia" on lms_perfiles for select using (
  id = auth.uid()
  or lms_es_admin()
  or (lms_es_gerente() and sucursal_id = lms_mi_sucursal())
);
create policy "admin administra perfiles" on lms_perfiles for all
  using (lms_es_admin()) with check (lms_es_admin());

-- lms_cursos / lms_modulos / lms_preguntas: lectura para autenticados; escritura admin.
create policy "cursos lectura" on lms_cursos for select using (auth.uid() is not null);
create policy "cursos admin"   on lms_cursos for all using (lms_es_admin()) with check (lms_es_admin());

create policy "modulos lectura" on lms_modulos for select using (auth.uid() is not null);
create policy "modulos admin"   on lms_modulos for all using (lms_es_admin()) with check (lms_es_admin());

create policy "preguntas lectura" on lms_preguntas for select using (auth.uid() is not null);
create policy "preguntas admin"   on lms_preguntas for all using (lms_es_admin()) with check (lms_es_admin());

-- lms_opciones: NADIE lee es_correcta vía cliente. La calificación usa service role.
-- Solo admin puede leer/escribir opciones directamente.
create policy "opciones admin" on lms_opciones for all using (lms_es_admin()) with check (lms_es_admin());

-- lms_inscripciones: barista ve las suyas; gerente las de su sucursal; admin todo.
create policy "inscripciones propias o gerencia" on lms_inscripciones for select using (
  perfil_id = auth.uid()
  or lms_es_admin()
  or (lms_es_gerente() and perfil_id in (
        select id from lms_perfiles where sucursal_id = lms_mi_sucursal()))
);
create policy "inscripciones gerencia escribe" on lms_inscripciones for all
  using (lms_es_gerente()) with check (lms_es_gerente());

-- lms_progreso: barista escribe el suyo; gerente lee el de su sucursal; admin todo.
create policy "progreso propio" on lms_progreso for all using (
  perfil_id = auth.uid()
) with check (perfil_id = auth.uid());
create policy "progreso gerencia lee" on lms_progreso for select using (
  lms_es_admin()
  or (lms_es_gerente() and perfil_id in (
        select id from lms_perfiles where sucursal_id = lms_mi_sucursal()))
);

-- lms_intentos: barista inserta/lee los suyos; gerente lee los de su sucursal; admin todo.
create policy "intentos propios" on lms_intentos for select using (
  perfil_id = auth.uid()
  or lms_es_admin()
  or (lms_es_gerente() and perfil_id in (
        select id from lms_perfiles where sucursal_id = lms_mi_sucursal()))
);
create policy "intentos inserta propio" on lms_intentos for insert
  with check (perfil_id = auth.uid());

-- lms_certificados: barista ve los suyos; gerente los de su sucursal; admin todo.
create policy "certificados propios o gerencia" on lms_certificados for select using (
  perfil_id = auth.uid()
  or lms_es_admin()
  or (lms_es_gerente() and perfil_id in (
        select id from lms_perfiles where sucursal_id = lms_mi_sucursal()))
);
create policy "certificados admin escribe" on lms_certificados for all
  using (lms_es_admin()) with check (lms_es_admin());
