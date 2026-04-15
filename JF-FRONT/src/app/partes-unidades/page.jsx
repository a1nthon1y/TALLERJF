import { UnitPartsManager } from "@/components/units-parts/unit-parts-manager"

export default function PartesUnidadesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partes de Unidades</h1>
        <p className="text-muted-foreground">Gestiona las partes de cada unidad y sus intervalos de mantenimiento</p>
      </div>
      <UnitPartsManager />
    </div>
  )
}
