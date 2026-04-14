import { OwnersTable } from "@/components/owners/owners-table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function OwnersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dueños de Unidades</h1>
          <p className="text-muted-foreground">Gestiona los dueños de las unidades de transporte</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Dueño
        </Button>
      </div>
      <OwnersTable />
    </div>
  )
}
