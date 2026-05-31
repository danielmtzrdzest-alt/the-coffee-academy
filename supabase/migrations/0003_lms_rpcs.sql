-- 0003_lms_rpcs.sql
create or replace function lms_incrementar_intentos(p_perfil uuid, p_modulo uuid)
returns void language sql security definer set search_path = public as $$
  update lms_progreso set intentos = intentos + 1
  where perfil_id = p_perfil and modulo_id = p_modulo
$$;
