"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bus, Clock, Wrench, Package, AlertCircle } from "lucide-react"
import { makeGetRequest } from "@/utils/api"

export function DashboardStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [units, maintenances, materials] = await Promise.allSettled([
          makeGetRequest("/units"),
          makeGetRequest("/maintenances"),
          makeGetRequest("/materials"),
        ])

        const unitsData   = units.status        === "fulfilled" && Array.isArray(units.value)        ? units.value        : []
        const maintsData  = maintenances.status === "fulfilled" && Array.isArray(maintenances.value) ? maintenances.value : []
        const matsData    = materials.status    === "fulfilled" && Array.isArray(materials.value)    ? materials.value    : []

        const allFailed = [units, maintenances, materials].every(r => r.status === "rejected")
        if (allFailed) { setError(true); return }

        const pending   = maintsData.filter(m => m.estado?.toUpperCase() === "PENDIENTE" || m.estado?.toUpperCase() === "EN_PROCESO").length
        const completed = maintsData.filter(m => m.estado?.toUpperCase() === "COMPLETADO").length
        const stock     = matsData.reduce((acc, m) => acc + (m.stock ?? 0), 0)

        setStats({
          units:     unitsData.length,
          pending,
          completed,
          stock,
        })
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    { title: "Total Unidades",             icon: Bus,     value: stats?.units,     sub: "unidades registradas" },
    { title: "Mantenimientos Pendientes",  icon: Clock,   value: stats?.pending,   sub: "pendiente o en proceso" },
    { title: "Mantenimientos Realizados",  icon: Wrench,  value: stats?.completed, sub: "completados en total" },
    { title: "Materiales en Stock",        icon: Package, value: stats?.stock,     sub: "unidades totales en inventario" },
  ]

  if (error) {
    return (
      <div className="col-span-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-center gap-2 text-destructive text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        No se pudieron cargar las estadísticas del dashboard. Recarga la página o intenta más tarde.
      </div>
    )
  }

  if (loading) {
    return (
      <>
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {cards.map(({ title, icon: Icon, value, sub }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value ?? 0}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
