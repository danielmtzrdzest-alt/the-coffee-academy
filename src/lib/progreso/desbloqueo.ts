export interface ModuloEstado {
  id: string
  estado: string // 'no_iniciado' | 'en_progreso' | 'aprobado' | 'reprobado'
}

export interface ModuloDesbloqueo {
  id: string
  desbloqueado: boolean
  aprobado: boolean
}

export function calcularDesbloqueo(modulos: ModuloEstado[]): ModuloDesbloqueo[] {
  let anteriorAprobado = true
  return modulos.map((m) => {
    const aprobado = m.estado === 'aprobado'
    const desbloqueado = anteriorAprobado
    anteriorAprobado = aprobado
    return { id: m.id, desbloqueado, aprobado }
  })
}
