import { CursoForm } from '../curso-form'

export default function NuevoCursoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Nuevo curso</h1>
      <CursoForm />
    </section>
  )
}
