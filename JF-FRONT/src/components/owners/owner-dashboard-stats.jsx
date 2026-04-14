import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bus, Clock, PenToolIcon as Tool, Wrench } from "lucide-react"

// Datos de ejemplo para estadísticas por dueño
const ownerStats = {
  1: {
    totalUnits: 8,
    pendingMaintenances: 5,
    completedMaintenances: 18,
    materialsInStock: 42,
  },
  2: {
    totalUnits: 12,
    pendingMaintenances: 7,
    completedMaintenances: 24,
    materialsInStock: 65,
  },
  3: {
    totalUnits: 15,
    pendingMaintenances: 9,
    completedMaintenances: 30,
    materialsInStock: 78,
  },
  4: {
    totalUnits: 6,
    pendingMaintenances: 3,
    completedMaintenances: 12,
    materialsInStock: 28,
  },
  5: {
    totalUnits: 10,
    pendingMaintenances: 6,
    completedMaintenances: 20,
    materialsInStock: 53,
  },
}

export function OwnerDashboardStats({ ownerId }) {
  // Obtener estadísticas para el dueño específico o usar valores predeterminados
  const stats = ownerStats[ownerId] || {
    totalUnits: 0,
    pendingMaintenances: 0,
    completedMaintenances: 0,
    materialsInStock: 0,
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
          <Bus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUnits}</div>
          <p className="text-xs text-muted-foreground">Flota activa del dueño</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mantenimientos Pendientes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingMaintenances}</div>
          <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mantenimientos Realizados</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completedMaintenances}</div>
          <p className="text-xs text-muted-foreground">Total histórico</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Materiales Asignados</CardTitle>
          <Tool className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.materialsInStock}</div>
          <p className="text-xs text-muted-foreground">En inventario para esta flota</p>
        </CardContent>
      </Card>
    </>
  )
}

