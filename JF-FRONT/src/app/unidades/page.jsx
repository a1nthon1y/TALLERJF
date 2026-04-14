import { UnitsTable } from "@/components/units/units-table"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

export default function UnitsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">Gestiona las unidades de transporte</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/partes-unidades">
            <Settings className="mr-2 h-4 w-4" /> Gestionar Partes
          </Link>
        </Button>
      </div>
      <UnitsTable />
    </div>
  )
}

