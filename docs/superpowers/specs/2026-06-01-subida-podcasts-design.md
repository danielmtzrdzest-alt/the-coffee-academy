# Fase 4 — Subida de podcasts desde el panel

**Fecha:** 2026-06-01
**Estado:** Diseño aprobado

## Objetivo

Permitir que un admin **suba un archivo de audio** desde el editor de módulo del panel, en lugar de pegar a mano la URL del podcast. El archivo viaja **directo del navegador a Supabase Storage** mediante una URL de subida firmada de un solo uso, emitida por un server action protegido por rol. La URL pública resultante llena el campo `podcastUrl` existente, que el server action de guardado ya persiste.

## Contexto

- La columna `lms_modulos.podcast_url` (texto, opcional) ya existe. **No requiere migración.**
- El editor de módulo (`src/app/admin/modulos/[id]/modulo-form.tsx`) hoy tiene un campo de URL manual (`type="url"`, estado `podcastUrl`).
- Los server actions `crearModulo`/`actualizarModulo` (`src/actions/admin/modulos.ts`) ya guardan `podcast_url: d.podcastUrl || null`.
- El esquema zod (`src/lib/admin/schemas.ts`) valida `podcastUrl: z.union([z.string().url(), z.literal('')]).default('')`.
- El barista reproduce con `<video controls src={modulo.podcast_url}>` en `src/app/(barista)/modulo/[slug]/modulo-tabs.tsx`. **No se toca.**
- El bucket `podcasts` ya existe y es **público**.
- Existe cliente de navegador (`src/lib/supabase/client.ts`, `createBrowserClient`) y `requireRol(roles)` (`src/lib/auth/rol.ts`) para gating en server actions.

## Decisiones (confirmadas con el usuario)

1. **Coexisten** subida y URL manual: el admin puede subir un archivo O pegar una URL. El campo de URL manual se conserva.
2. **Bucket público**: se mantiene público; se guarda la URL pública en `podcast_url`. Endurecer (privado + URLs firmadas de lectura) queda como fase futura.
3. **Mecanismo de subida (Enfoque C): URL de subida firmada.** El archivo va directo del navegador a Storage. Se descartaron: A (subida directa cliente, requeriría política RLS en `storage.objects`) y B (subida vía server action, topa el límite de 1MB de Server Actions y el ~4.5MB de Vercel).

## Arquitectura

```
Admin elige archivo
  -> cliente valida tipo (audio/*) y tamaño (<= 50MB)
  -> crearUrlSubidaPodcast(nombreArchivo)   [server action, requireRol(['admin'])]
        -> valida extensión (allowlist)
        -> createAdminClient().storage.from('podcasts').createSignedUploadUrl(path)
        -> devuelve { path, token, signedUrl }
  -> cliente: createClient().storage.from('podcasts').uploadToSignedUrl(path, token, file)
  -> cliente: getPublicUrl(path) -> onChange(url) -> setV({ ...v, podcastUrl: url })
  -> admin "Guardar" -> actualizarModulo/crearModulo (requireRol admin) persiste podcast_url
  -> barista escucha con <video src={podcast_url}> existente
```

Sin migración. Sin política RLS de storage. Sin cambios en la reproducción del barista.

## Componentes

### 1. `src/lib/admin/podcast.ts` (puro, con tests)

- `EXTENSIONES_PODCAST` — allowlist: `mp3`, `m4a`, `wav`, `ogg`.
- `TAMANO_MAX_PODCAST` — `50 * 1024 * 1024` (50 MB).
- `extensionDe(nombre: string): string | null` — devuelve la extensión en minúsculas si está en la allowlist; si no, `null`.
- `rutaPodcast(nombre: string): string` — construye una ruta única: `${slug(base-del-nombre)}-${uuidCorto}.${ext}`, donde `uuidCorto = crypto.randomUUID().slice(0, 8)`. Reutiliza el helper de slug existente (`src/lib/content/slug.ts`) para la base. El sufijo único evita colisiones y problemas de caché del CDN público.

### 2. `src/actions/admin/podcasts.ts` (server action)

```ts
'use server'
export async function crearUrlSubidaPodcast(nombreArchivo: string):
  Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }>
```

- **Primera sentencia awaited:** `await requireRol(['admin'])`.
- Valida `extensionDe(nombreArchivo)`; si `null`, devuelve `{ ok: false, error: 'Formato no permitido' }`.
- Construye `path = rutaPodcast(nombreArchivo)`.
- `const sb = createAdminClient()` y `await sb.storage.from('podcasts').createSignedUploadUrl(path)`.
- Si hay error, `{ ok: false, error }`; si no, `{ ok: true, path, token: data.token }`.

### 3. `src/app/admin/modulos/[id]/subir-podcast.tsx` (cliente)

```ts
'use client'
export function SubirPodcast({ value, onChange }:
  { value: string; onChange: (url: string) => void })
```

- `<input type="file" accept="audio/*">`.
- Al elegir archivo: valida `file.size <= TAMANO_MAX_PODCAST` y que la extensión esté permitida; si no, `toast.error(...)` y aborta.
- `estado = 'idle' | 'subiendo'` para mostrar spinner y deshabilitar el input.
- Llama `crearUrlSubidaPodcast(file.name)`; si `!ok`, `toast.error(error)`.
- `await createClient().storage.from('podcasts').uploadToSignedUrl(path, token, file)`; si error, `toast.error(...)`.
- `const { data } = createClient().storage.from('podcasts').getPublicUrl(path)` → `onChange(data.publicUrl)` → `toast.success('Audio subido')`.
- Si `value` no está vacío, muestra `<audio controls src={value}>` de previsualización.

### 4. `src/app/admin/modulos/[id]/modulo-form.tsx` (modificación)

- Importa y monta `<SubirPodcast value={v.podcastUrl} onChange={(url) => setV({ ...v, podcastUrl: url })} />` junto al input de URL manual existente (debajo del label "URL del podcast (opcional)").
- El input de URL manual permanece sin cambios.

## Restricciones

- **Formatos:** mp3, m4a, wav, ogg.
- **Tamaño máx:** 50 MB (validado en cliente; el bucket público y la subida firmada no imponen un tope server-side, aceptable para una herramienta admin interna).
- **Ruta:** `${slug}-${uuidCorto}.${ext}`, independiente del id del módulo (funciona igual en "Nuevo módulo").
- Los audios reemplazados quedan **huérfanos** en el bucket; la limpieza/borrado es fase futura (YAGNI).

## Manejo de errores

- Tipo o tamaño inválido → `toast.error`, no se sube.
- No-admin → `requireRol` redirige/corta antes de emitir la URL.
- Falla al emitir la URL firmada o al subir → `toast.error`, el formulario sigue usable, `podcastUrl` no cambia.

## Pruebas

- **Unit (TDD, Vitest):** `src/lib/admin/podcast.test.ts`
  - `extensionDe` acepta mp3/m4a/wav/ogg (incluyendo mayúsculas) y rechaza otros (`.txt`, sin extensión).
  - `rutaPodcast` produce `slug-uuid.ext`, conserva la extensión y slugifica la base.
- **E2E manual (navegador):** subir un mp3 en el editor de módulo, confirmar el toast de éxito, la previsualización `<audio>`, que `podcast_url` se persista al guardar, y que reproduzca en la pestaña **Escuchar** del barista.
- El server action y la subida no se testean unitariamente (patrón del proyecto: actions vía E2E, helpers puros vía Vitest).

## Fuera de alcance

Otras fases candidatas del roadmap (cada una con su propio ciclo spec → plan → build):

- Reportes / dashboard de progreso.
- Asignación/scoping por sucursal (gerente real).
- Certificados (la tabla `lms_certificados` ya existe).
- Notificaciones (requiere decidir canal: correo o in-app).

Excluido también de esta fase:

- Endurecer el bucket a privado + URLs de lectura firmadas.
- Borrado/limpieza de audios huérfanos.
- Barra de progreso de subida (solo spinner en v1).
