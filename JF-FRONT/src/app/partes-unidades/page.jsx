import { UnitPartsManager } from "@/components/units-parts/unit-parts-manager"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function PartesUnidadesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partes de Unidades</h1>
          <p className="text-muted-foreground">Gestiona las partes de cada unidad y sus intervalos de mantenimiento</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Parte
        </Button>
      </div>
      <UnitPartsManager />
    </div>
  )
}
