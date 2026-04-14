import { MaintenanceAlertsTable } from "@/components/maintenances/maintenance-alerts-table"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

export default function MaintenanceAlertsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas de Mantenimiento</h1>
          <p className="text-muted-foreground">Gestión de alertas de mantenimiento basadas en kilometraje</p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" /> Configurar Intervalos
        </Button>
      </div>
      <MaintenanceAlertsTable />
    </div>
  )
}

