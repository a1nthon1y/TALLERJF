"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { makeGetRequest } from "@/utils/api"

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase()
  if (e === "COMPLETADO") return <Badge variant="success">Completado</Badge>
  if (e === "EN_PROCESO") return <Badge variant="info">En Proceso</Badge>
  return <Badge variant="outline">Pendiente</Badge>
}

export function RecentMaintenances() {
  const [maintenances, setMaintenances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    makeGetRequest("/maintenances")
      .then(data => setMaintenances(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setMaintenances([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (maintenances.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay mantenimientos registrados.</p>
  }

  return (
    <div className="space-y-4">
      {maintenances.map((m) => {
        const placa = m.placa ?? `U-${m.unidad_id}`
        const fecha = m.fecha_solicitud
          ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE")
          : "—"
        return (
          <div key={m.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{placa.slice(0, 3)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-0.5 flex-1">
              <p className="text-sm font-medium leading-none">{placa}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {m.tipo?.toLowerCase()} · {fecha}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              {estadoBadge(m.estado)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
