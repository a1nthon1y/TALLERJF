"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, AlertTriangle, ChevronRight, FuelIcon as Engine, Gauge } from "lucide-react"
import { useRouter } from "next/navigation"

// Datos de ejemplo para alertas de mantenimiento por dueño
const ownerMaintenanceAlerts = {
  1: [
    {
      id: "1",
      name: "Motor",
      unitPlate: "ABC-123",
      maintenanceInterval: 5000,
      lastMaintenanceKm: 40000,
      unitCurrentKm: 44800,
      remainingPercentage: 4,
      status: "critical",
    },
    {
      id: "2",
      name: "Frenos",
      unitPlate: "XYZ-789",
      maintenanceInterval: 10000,
      lastMaintenanceKm: 35000,
      unitCurrentKm: 42500,
      remainingPercentage: 25,
      status: "warning",
    },
  ],
  2: [
    {
      id: "3",
      name: "Transmisión",
      unitPlate: "GHI-101",
      maintenanceInterval: 20000,
      lastMaintenanceKm: 60000,
      unitCurrentKm: 78000,
      remainingPercentage: 0,
      status: "critical",
    },
    {
      id: "4",
      name: "Filtro de aire",
      unitPlate: "JKL-202",
      maintenanceInterval: 15000,
      lastMaintenanceKm: 70000,
      unitCurrentKm: 78000,
      remainingPercentage: 47,
      status: "normal",
    },
  ],
  // Datos para otros dueños...
}

export function OwnerMaintenanceAlerts({ ownerId }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  // Obtener alertas para el dueño específico o usar un array vacío
  const alerts = ownerMaintenanceAlerts[ownerId] || []

  // Si no hay alertas, no mostrar el componente
  if (alerts.length === 0) {
    return null
  }

  // Ordenar por estado (crítico primero, luego advertencia)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.status === "critical" && b.status !== "critical") return -1
    if (a.status !== "critical" && b.status === "critical") return 1
    return 0
  })

  // Limitar a 2 elementos si no está expandido
  const displayAlerts = expanded ? sortedAlerts : sortedAlerts.slice(0, 2)

  return (
    <Card className="border-yellow-200 dark:border-yellow-900 bg-amber-50 dark:bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-amber-200 dark:bg-amber-800 p-2 rounded-full mr-3">
              <Gauge className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="font-medium">Alertas de mantenimiento por kilometraje</h3>
              <p className="text-sm text-muted-foreground">
                {alerts.length} {alerts.length === 1 ? "parte requiere" : "partes requieren"} atención basada en el
                kilometraje
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/mantenimientos/alertas?dueno=${ownerId}`)}
            className="bg-white dark:bg-gray-800"
          >
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {displayAlerts.map((alert) => {
            const kmRemaining = alert.lastMaintenanceKm + alert.maintenanceInterval - alert.unitCurrentKm

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-md border ${
                  alert.status === "critical"
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Engine
                      className={`h-4 w-4 mr-2 ${alert.status === "critical" ? "text-red-500" : "text-amber-500"}`}
                    />
                    <span className="font-medium">
                      {alert.name} - {alert.unitPlate}
                    </span>
                  </div>
                  {alert.status === "critical" ? (
                    <div className="flex items-center text-red-500 text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      Mantenimiento requerido
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-500 text-xs font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Mantenimiento próximo
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Progress
                    value={alert.remainingPercentage}
                    className="h-2"
                    indicatorClassName={alert.status === "critical" ? "bg-red-500" : "bg-amber-500"}
                  />
                  <span className="text-xs w-8">{alert.remainingPercentage.toFixed(0)}%</span>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Intervalo: {alert.maintenanceInterval.toLocaleString()} km</span>
                  <span>
                    {kmRemaining <= 0
                      ? `Excedido por ${Math.abs(kmRemaining).toLocaleString()} km`
                      : `Faltan ${kmRemaining.toLocaleString()} km`}
                  </span>
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => router.push(`/mantenimientos/partes/${alert.id}`)}
                  >
                    Programar mantenimiento
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {sortedAlerts.length > 2 && (
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Mostrar menos" : `Mostrar ${sortedAlerts.length - 2} más`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

