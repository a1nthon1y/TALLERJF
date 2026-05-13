import { Suspense } from "react"
import { UnitPartsManager } from "@/components/units-parts/unit-parts-manager"

export default function PartesUnidadesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estado de Flota</h1>
        <p className="text-muted-foreground">Estado predictivo de componentes por unidad — km recorridos vs. intervalos de mantenimiento</p>
      </div>
      <Suspense fallback={null}>
        <UnitPartsManager />
      </Suspense>
    </div>
  )
}
