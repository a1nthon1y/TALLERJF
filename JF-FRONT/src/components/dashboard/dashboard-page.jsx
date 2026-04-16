"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
const Overview = dynamic(() => import("@/components/dashboard/overview").then(m => ({ default: m.Overview })), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
})
import { RecentMaintenances } from "@/components/dashboard/recent-maintenances"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { MaintenancePartAlerts } from "@/components/dashboard/maintenance-part-alerts"
const ActivityFeed = dynamic(() => import("@/components/dashboard/activity-feed").then(m => ({ default: m.ActivityFeed })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
const MaintenanceCalendar = dynamic(() => import("@/components/dashboard/maintenance-calendar").then(m => ({ default: m.MaintenanceCalendar })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})
import { CalendarDays, Clock, Wrench } from "lucide-react"
import { formatDate } from "@/utils/formatting"
import { useEffect, useState } from "react"

export function DashboardPage() {
  const [formattedDate, setFormattedDate] = useState("")

  useEffect(() => {
    // Mover la formatación de fecha al lado del cliente
    const today = new Date()
    const formatted = formatDate(today)
    setFormattedDate(formatted.charAt(0).toUpperCase() + formatted.slice(1))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground flex items-center mt-1">
            <CalendarDays className="mr-1 h-4 w-4" />
            {formattedDate}
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <DashboardFilters />
        </div>
      </div>

      {/* Alertas de mantenimiento por kilometraje */}
      <MaintenancePartAlerts />

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStats />
      </div>

      {/* Gráficos y mantenimientos recientes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-primary/10 p-1.5 rounded-md mr-2">
                <Wrench className="h-5 w-5 text-primary" />
              </span>
              Mantenimientos por Mes
            </CardTitle>
            <CardDescription>Distribución de mantenimientos preventivos y correctivos</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-primary/10 p-1.5 rounded-md mr-2">
                <Clock className="h-5 w-5 text-primary" />
              </span>
              Mantenimientos Recientes
            </CardTitle>
            <CardDescription>Últimos mantenimientos registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentMaintenances />
          </CardContent>
        </Card>
      </div>

      {/* Calendario y Actividad */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MaintenanceCalendar />
        <ActivityFeed />
      </div>
    </div>
  )
}

