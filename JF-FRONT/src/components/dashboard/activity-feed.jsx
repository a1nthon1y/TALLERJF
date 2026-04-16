"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Wrench } from "lucide-react"
import { makeGetRequest } from "@/utils/api"
import Link from "next/link"

const ESTADO_BADGE = {
  PENDIENTE:  { label: "Pendiente",  variant: "outline" },
  EN_PROCESO: { label: "En proceso", variant: "info" },
  COMPLETADO: { label: "Completado", variant: "success" },
  CERRADO:    { label: "Cerrado",    variant: "secondary" },
  REALIZADO:  { label: "Realizado",  variant: "secondary" },
}

export function ActivityFeed() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    makeGetRequest("/maintenances")
      .then((data) => {
        const list = Array.isArray(data) ? data.slice(0, 6) : []
        setItems(list)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <span className="bg-primary/10 p-1.5 rounded-md mr-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          Actividad Reciente
        </CardTitle>
        <CardDescription>Últimos mantenimientos registrados en el sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">No se pudo cargar la actividad reciente.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay mantenimientos registrados.</p>
        ) : (
          <div className="space-y-4">
            {items.map((m) => {
              const placa = m.placa ?? `U-${m.unidad_id}`
              const fecha = m.fecha_solicitud
                ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE")
                : "—"
              const estadoInfo = ESTADO_BADGE[m.estado?.toUpperCase()] ?? { label: m.estado, variant: "outline" }
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                    <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{placa}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.tipo?.toLowerCase()} · {fecha}
                    </p>
                  </div>
                  <Badge variant={estadoInfo.variant} className="shrink-0 text-xs">
                    {estadoInfo.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
        {!loading && !error && (
          <div className="mt-4 pt-4 border-t text-center">
            <Link href="/mantenimientos" className="text-sm text-primary hover:underline">
              Ver todos los mantenimientos →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
