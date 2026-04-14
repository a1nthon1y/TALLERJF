"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, AlertTriangle, ChevronRight, FuelIcon as Engine, Gauge } from "lucide-react"
import { vehicleParts, getPartStatus, remainingLifePercentage, needsMaintenance } from "@/lib/maintenance-alerts"
import { useRouter } from "next/navigation"

export function MaintenancePartAlerts() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  // Filtrar partes que necesitan mantenimiento o están próximas a necesitarlo
  const criticalParts = vehicleParts.filter((part) => {
    const status = getPartStatus(part)
    return status === "critical" || status === "warning"
  })

  if (criticalParts.length === 0) {
    return null
  }

  const sortedParts = [...criticalParts].sort((a, b) => {
    const statusA = getPartStatus(a)
    const statusB = getPartStatus(b)
    return statusA === "critical" ? -1 : statusB === "critical" ? 1 : 0
  })

  const displayParts = expanded ? sortedParts : sortedParts.slice(0, 3)

  const formatNumber = (num) => new Intl.NumberFormat("es-PE").format(num)

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
                {criticalParts.length} {criticalParts.length === 1 ? "parte requiere" : "partes requieren"} atención
                basada en el kilometraje
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/mantenimientos/alertas")}
            className="bg-white dark:bg-gray-800"
          >
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {displayParts.map((part) => {
            const percentage = remainingLifePercentage(part)
            const status = getPartStatus(part)
            const kmRemaining = part.lastMaintenanceKm + part.maintenanceInterval - part.unitCurrentKm

            return (
              <div
                key={part.id}
                className={`p-3 rounded-md border ${
                  needsMaintenance(part)
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Engine className={`h-4 w-4 mr-2 ${status === "critical" ? "text-red-500" : "text-amber-500"}`} />
                    <span className="font-medium">
                      {part.name} - {part.unitPlate}
                    </span>
                  </div>
                  {status === "critical" ? (
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
                    value={percentage}
                    className="h-2"
                    indicatorClassName={status === "critical" ? "bg-red-500" : "bg-amber-500"}
                  />
                  <span className="text-xs w-8">{percentage.toFixed(0)}%</span>
                </div>

                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Intervalo: {formatNumber(part.maintenanceInterval)} km</span>
                  <span>
                    {kmRemaining <= 0
                      ? `Excedido por ${formatNumber(Math.abs(kmRemaining))} km`
                      : `Faltan ${formatNumber(kmRemaining)} km`}
                  </span>
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => router.push(`/mantenimientos/partes/${part.id}`)}
                  >
                    Programar mantenimiento
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {sortedParts.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Mostrar menos" : `Mostrar ${sortedParts.length - 3} más`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
