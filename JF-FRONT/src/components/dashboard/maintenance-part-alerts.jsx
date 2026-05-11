"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, AlertTriangle, ChevronRight, Gauge } from "lucide-react"
import { makeGetRequest } from "@/utils/api"
import { getPartsStatus } from "@/services/unitsService"
import Link from "next/link"

export function MaintenancePartAlerts() {
  const [criticalParts, setCriticalParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const units = await makeGetRequest("/units")
        if (!Array.isArray(units) || units.length === 0) {
          setLoading(false)
          return
        }

        const results = await Promise.allSettled(
          units.map((u) =>
            getPartsStatus(u.id).then((parts) =>
              (Array.isArray(parts) ? parts : [])
                .filter((p) => Number(p.porcentaje) >= 80)
                .map((p) => ({
                  ...p,
                  unitPlate: u.placa,
                  unitId: u.id,
                }))
            )
          )
        )

        const all = results
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => r.value)
          .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))

        setCriticalParts(all)
      } catch {
        setCriticalParts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-900 bg-amber-50 dark:bg-amber-950/30">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-8 w-48" />
          {Array(2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (criticalParts.length === 0) return null

  const displayParts = expanded ? criticalParts : criticalParts.slice(0, 3)

  const formatNumber = (num) => new Intl.NumberFormat("es-PE").format(Math.round(Number(num)))

  return (
    <Card className="border-yellow-200 dark:border-yellow-900 bg-amber-50 dark:bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-200 dark:bg-amber-800 p-2 rounded-full">
              <Gauge className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="font-medium">Alertas de mantenimiento por kilometraje</h3>
              <p className="text-sm text-muted-foreground">
                {criticalParts.length} {criticalParts.length === 1 ? "parte requiere" : "partes requieren"} atención
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800" asChild>
            <Link href="/mantenimientos/alertas">
              Ver todas ({criticalParts.length}) <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {displayParts.map((part) => {
            const pct = Math.min(Number(part.porcentaje), 100)
            const vencido = Number(part.porcentaje) >= 100
            const kmRecorridos = Number(part.km_recorridos)
            const umbral = Number(part.umbral_km)
            const kmRestantes = Math.max(0, umbral - kmRecorridos)

            const barColor = vencido ? "bg-red-500" : "bg-amber-500"
            const borderClass = vencido
              ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"

            return (
              <div key={`${part.unitId}-${part.id}`} className={`p-3 rounded-md border ${borderClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {part.nombre} — {part.unitPlate}
                  </span>
                  {vencido ? (
                    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> Requerido
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Próximo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs w-8 text-right">{pct.toFixed(0)}%</span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Intervalo: {formatNumber(umbral)} km</span>
                  <span>
                    {vencido
                      ? `Excedido por ${formatNumber(kmRecorridos - umbral)} km`
                      : `Faltan ${formatNumber(kmRestantes)} km`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {criticalParts.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Mostrar menos" : `Mostrar ${criticalParts.length - 3} más`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
