"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import {
  AlertCircle, AlertTriangle, CheckCircle2, BellOff, Gauge, Bus,
} from "lucide-react"
import { makeGetRequest } from "@/utils/api"
import { getPartsStatus } from "@/services/unitsService"

// Carga todas las unidades y su estado de desgaste de partes
async function loadAllPartAlerts() {
  const units = await makeGetRequest("/units")
  if (!Array.isArray(units) || units.length === 0) return []

  const results = await Promise.allSettled(
    units.map((u) =>
      getPartsStatus(u.id).then((parts) =>
        (Array.isArray(parts) ? parts : [])
          .filter((p) => Number(p.porcentaje) >= 80)
          .map((p) => ({
            ...p,
            unitPlate: u.placa,
            unitModel: u.modelo,
            unitId: u.id,
          }))
      )
    )
  )

  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
}

const fmt = (n) => new Intl.NumberFormat("es-PE").format(Math.round(Number(n)))

export function MaintenanceAlertsTable() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [nivelFilter, setNivelFilter] = useState("TODOS")
  const [unitFilter, setUnitFilter] = useState("TODAS")

  useEffect(() => {
    loadAllPartAlerts()
      .then(setParts)
      .catch(() => setParts([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton variant="list" rowCount={5} title={false} action={false} />

  // Filtros derivados
  const uniqueUnits = [...new Set(parts.map((p) => p.unitPlate))].sort()

  const filtered = parts.filter((p) => {
    const pct = Number(p.porcentaje)
    const matchSearch =
      !searchTerm ||
      p.unitPlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchNivel =
      nivelFilter === "TODOS" ||
      (nivelFilter === "VENCIDO" && pct >= 100) ||
      (nivelFilter === "CRITICO" && pct >= 80 && pct < 100)
    const matchUnit = unitFilter === "TODAS" || p.unitPlate === unitFilter
    return matchSearch && matchNivel && matchUnit
  })

  const vencidos = parts.filter((p) => Number(p.porcentaje) >= 100).length
  const proximos = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      {parts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Mantenimiento vencido</p>
              <p className="text-xl font-bold text-red-600">{vencidos}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Próximo a vencer</p>
              <p className="text-xl font-bold text-amber-600">{proximos}</p>
            </div>
          </div>
          {vencidos === 0 && proximos === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Flota en buen estado</p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Buscar por placa o parte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los niveles</SelectItem>
            <SelectItem value="VENCIDO">Vencido (≥100%)</SelectItem>
            <SelectItem value="CRITICO">Próximo (80–99%)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las unidades</SelectItem>
            {uniqueUnits.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 gap-3">
          {parts.length === 0 ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-muted-foreground text-sm font-medium">Sin alertas — toda la flota está en buen estado</p>
            </>
          ) : (
            <>
              <BellOff className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No hay alertas con ese criterio</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((part) => {
            const pct = Math.min(Number(part.porcentaje), 100)
            const vencido = Number(part.porcentaje) >= 100
            const kmRecorridos = Number(part.km_recorridos)
            const umbral = Number(part.umbral_km)
            const kmRestantes = Math.max(0, umbral - kmRecorridos)

            return (
              <Card
                key={`${part.unitId}-${part.id}`}
                className={`overflow-hidden ${vencido
                  ? "border-red-200 dark:border-red-800"
                  : "border-amber-200 dark:border-amber-800"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Info parte + unidad */}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{part.nombre}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Bus className="h-3.5 w-3.5 shrink-0" />
                        <span>{part.unitPlate}</span>
                        {part.unitModel && <span className="text-muted-foreground/60">— {part.unitModel}</span>}
                      </div>
                    </div>
                    {/* Badge estado */}
                    {vencido ? (
                      <Badge className="bg-red-100 text-red-700 border-red-300 shrink-0 flex items-center gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" /> Vencido
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 shrink-0 flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Próximo
                      </Badge>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${vencido ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-9 text-right">
                      {Number(part.porcentaje).toFixed(0)}%
                    </span>
                  </div>

                  {/* Km info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      Intervalo: {fmt(umbral)} km
                    </span>
                    <span className={`font-medium ${vencido ? "text-red-600" : "text-amber-600"}`}>
                      {vencido
                        ? `Excedido ${fmt(kmRecorridos - umbral)} km`
                        : `Faltan ${fmt(kmRestantes)} km`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
