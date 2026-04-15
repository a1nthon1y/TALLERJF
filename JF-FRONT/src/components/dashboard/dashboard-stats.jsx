"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bus, Clock, Wrench, Package } from "lucide-react"
import { makeGetRequest } from "@/utils/api"

export function DashboardStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

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
        setStats({ units: 0, pending: 0, completed: 0, stock: 0 })
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
