"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, AlertTriangle, CheckCircle, Loader2, ArrowLeft, Settings, ChevronRight } from "lucide-react"
import { getAllUnits } from "@/services/unitsService"
import { makeGetRequest } from "@/utils/api"

async function fetchPartsStatus(unitId) {
  return makeGetRequest(`/units/${unitId}/parts-status`)
}

const getStatus = (pct) => {
  if (pct >= 100) return "critical"
  if (pct >= 75) return "warning"
  return "normal"
}

const STATUS_CONFIG = {
  critical: {
    label: "Vencido",
    badge: "destructive",
    icon: AlertCircle,
    rowClass: "bg-red-50 dark:bg-red-950/20",
    cardClass: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    iconClass: "text-red-500",
    progressClass: "[&>div]:bg-red-500",
  },
  warning: {
    label: "Por vencer",
    badge: "outline",
    icon: AlertTriangle,
    rowClass: "bg-amber-50 dark:bg-amber-950/20",
    cardClass: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    iconClass: "text-amber-500",
    progressClass: "[&>div]:bg-amber-500",
  },
  normal: {
    label: "Normal",
    badge: "outline",
    icon: CheckCircle,
    rowClass: "",
    cardClass: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    iconClass: "text-green-500",
    progressClass: "[&>div]:bg-green-500",
  },
}

function UnitPartsDetail({ unit }) {
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["parts-status", unit.id],
    queryFn: () => fetchPartsStatus(unit.id),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando estado de partes...
      </div>
    )
  }

  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
        <Settings className="h-8 w-8 opacity-30" />
        <p className="text-sm">No hay partes configuradas en el sistema.</p>
        <p className="text-xs">Agrega reglas predictivas en <strong>Configuración Predictiva</strong>.</p>
      </div>
    )
  }

  const counts = { critical: 0, warning: 0, normal: 0 }
  parts.forEach((p) => counts[getStatus(parseFloat(p.porcentaje))]++)

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        {(["critical", "warning", "normal"]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          const Icon = cfg.icon
          return (
            <div key={s} className={`p-3 rounded-lg border ${cfg.cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
                <span className="font-medium text-sm">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold">{counts[s]}</p>
              <p className="text-xs text-muted-foreground">partes</p>
            </div>
          )
        })}
      </div>

      {/* Tabla detallada */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Último Mtto.</TableHead>
              <TableHead>Km actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Desgaste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((part) => {
              const pct = parseFloat(part.porcentaje)
              const status = getStatus(pct)
              const cfg = STATUS_CONFIG[status]
              const Icon = cfg.icon
              const kmRestantes = Math.max(0, part.umbral_km - part.km_recorridos)
              const kmExcedido = Math.max(0, part.km_recorridos - part.umbral_km)
              return (
                <TableRow key={part.id} className={cfg.rowClass}>
                  <TableCell className="font-medium">{part.nombre}</TableCell>
                  <TableCell>{Number(part.umbral_km).toLocaleString()} km</TableCell>
                  <TableCell>{Number(part.ultimo_mantenimiento_km).toLocaleString()} km</TableCell>
                  <TableCell>{Number(part.km_actual).toLocaleString()} km</TableCell>
                  <TableCell>
                    <Badge
                      variant={cfg.badge}
                      className={`flex items-center gap-1 w-fit ${status === "warning" ? "border-amber-500 text-amber-600" : status === "normal" ? "border-green-500 text-green-600" : ""}`}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress
                              value={Math.min(pct, 100)}
                              className={`h-2 w-24 ${cfg.progressClass}`}
                            />
                            <span className="text-xs w-8 tabular-nums">{Math.round(pct)}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {status === "critical"
                            ? `Excedido por ${kmExcedido.toLocaleString()} km`
                            : `Faltan ${kmRestantes.toLocaleString()} km para mantenimiento`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AllUnitsSummary({ units, onSelectUnit }) {
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!units.length) return
    Promise.allSettled(
      units.map((u) => fetchPartsStatus(u.id).then((parts) => [u.id, parts]))
    ).then((results) => {
      const map = {}
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const [id, parts] = r.value
          const counts = { critical: 0, warning: 0, normal: 0 }
          parts.forEach((p) => counts[getStatus(parseFloat(p.porcentaje))]++)
          map[id] = counts
        }
      })
      setStatuses(map)
      setLoading(false)
    })
  }, [units])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Analizando flota...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {units.map((unit) => {
        const c = statuses[unit.id] || { critical: 0, warning: 0, normal: 0 }
        const hasAlerts = c.critical > 0 || c.warning > 0
        return (
          <Card
            key={unit.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${c.critical > 0 ? "border-red-300 dark:border-red-800" : c.warning > 0 ? "border-amber-300 dark:border-amber-700" : ""}`}
            onClick={() => onSelectUnit(unit.id.toString())}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{unit.placa}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">{unit.modelo} · {Number(unit.kilometraje).toLocaleString()} km</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {c.critical > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" /> {c.critical} vencida{c.critical > 1 ? "s" : ""}
                  </span>
                )}
                {c.warning > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> {c.warning} por vencer
                  </span>
                )}
                {!hasAlerts && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" /> Todo normal
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function UnitPartsManager() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [unitFilter, setUnitFilter] = useState("all")

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["units"],
    queryFn: getAllUnits,
  })

  useEffect(() => {
    const uid = searchParams.get("unidad")
    if (uid) setUnitFilter(uid)
  }, [searchParams])

  const selectedUnit = unitFilter !== "all" ? units.find((u) => u.id.toString() === unitFilter) : null

  if (loadingUnits) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando unidades...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb cuando viene de una unidad */}
      {selectedUnit && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setUnitFilter("all"); router.push("/partes-unidades") }}
            className="gap-1 text-muted-foreground hover:text-foreground px-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Unidades
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-sm">{selectedUnit.placa} — {selectedUnit.modelo}</span>
        </div>
      )}

      {/* Selector de unidad */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Seleccionar unidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las unidades</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.placa} — {u.modelo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => router.push("/configuraciones")}>
          <Settings className="mr-2 h-4 w-4" />
          Configurar reglas predictivas
        </Button>
      </div>

      {/* Contenido */}
      {unitFilter === "all" ? (
        <AllUnitsSummary units={units} onSelectUnit={setUnitFilter} />
      ) : selectedUnit ? (
        <UnitPartsDetail unit={selectedUnit} />
      ) : null}
    </div>
  )
}
