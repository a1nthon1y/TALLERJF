import { ChoferesTable } from "@/components/choferes/choferes-table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
export default function ChoferesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choferes</h1>
        <p className="text-muted-foreground">Gestiona los choferes del sistema</p>
      </div>
      <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Chofer
        </Button>
      </div>
      <ChoferesTable />
    </div>
  )
}
