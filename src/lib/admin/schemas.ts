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
