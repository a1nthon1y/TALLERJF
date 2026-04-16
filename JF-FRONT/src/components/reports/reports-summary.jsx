"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"

export function ReportsSummary() {
  const [maintenances, setMaintenances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    makeGetRequest("/reports/maintenances")
      .then((data) => setMaintenances(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card><CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-40" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-40" /></CardContent></Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-4">
        No se pudo cargar el resumen de reportes.
      </div>
    )
  }

  const total = maintenances.length
  const preventivo = maintenances.filter((m) => m.tipo?.toUpperCase() === "PREVENTIVO").length
  const correctivo = maintenances.filter((m) => m.tipo?.toUpperCase() === "CORRECTIVO").length

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Mantenimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">
            {preventivo} preventivos · {correctivo} correctivos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribución por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <div className="text-xl font-bold text-indigo-600">{total > 0 ? Math.round((preventivo / total) * 100) : 0}%</div>
              <p className="text-xs text-muted-foreground">Preventivo</p>
            </div>
            <div className="text-muted-foreground/40">·</div>
            <div>
              <div className="text-xl font-bold text-red-500">{total > 0 ? Math.round((correctivo / total) * 100) : 0}%</div>
              <p className="text-xs text-muted-foreground">Correctivo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
