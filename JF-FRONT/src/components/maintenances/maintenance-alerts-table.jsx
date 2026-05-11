"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import {
  AlertCircle, AlertTriangle, CheckCircle2, BellOff,
  Gauge, Bus, ChevronDown, ChevronUp,
} from "lucide-react"
import { makeGetRequest } from "@/utils/api"
import { getPartsStatus } from "@/services/unitsService"

async function loadAllPartAlerts() {
  const units = await makeGetRequest("/units")
  if (!Array.isArray(units) || units.length === 0) return []

  const results = await Promise.allSettled(
    units.map((u) =>
      getPartsStatus(u.id).then((parts) => ({
        unit: u,
        parts: (Array.isArray(parts) ? parts : [])
          .filter((p) => Number(p.porcentaje) >= 80)
          .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje)),
      }))
    )
  )

  return results
    .filter((r) => r.status === "fulfilled" && r.value.parts.length > 0)
    .map((r) => r.value)
    .sort((a, b) => {
      // Unidades con más partes vencidas (≥100%) primero
      const aV = a.parts.filter((p) => Number(p.porcentaje) >= 100).length
      const bV = b.parts.filter((p) => Number(p.porcentaje) >= 100).length
      return bV - aV
    })
}

const fmt = (n) => new Intl.NumberFormat("es-PE").format(Math.round(Number(n)))

function UnitAlertRow({ part }) {
  const pct = Number(part.porcentaje)
  const vencido = pct >= 100
  const umbral = Number(part.umbral_km)
  const kmRecorridos = Number(part.km_recorridos)
  const kmRestantes = Math.max(0, umbral - kmRecorridos)
  const displayPct = Math.min(pct, 100)

  return (
    <div className={`flex items-center gap-3 py-2.5 border-t first:border-t-0 ${vencido ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
      {/* Nombre parte */}
      <div className="w-36 shrink-0">
        <p className="text-sm font-medium leading-tight">{part.nombre}</p>
        <p className="text-xs text-muted-foreground">{fmt(umbral)} km intervalo</p>
      </div>

      {/* Barra */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${vencido ? "bg-red-500" : "bg-amber-500"}`}
            style={{ width: `${displayPct}%` }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums w-10 text-right shrink-0 ${vencido ? "text-red-600" : "text-amber-600"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>

      {/* Km info */}
      <div className="text-xs text-right shrink-0 w-32">
        {vencido ? (
          <span className="text-red-600 font-medium">+{fmt(kmRecorridos - umbral)} km</span>
        ) : (
          <span className="text-amber-600">faltan {fmt(kmRestantes)} km</span>
        )}
      </div>

      {/* Badge */}
      <div className="shrink-0 w-20 flex justify-end">
        {vencido ? (
          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Vencido</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Próximo</Badge>
        )}
      </div>
    </div>
  )
}

function UnitAlertCard({ group, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const vencidas = group.parts.filter((p) => Number(p.porcentaje) >= 100).length
  const proximas = group.parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length
  const u = group.unit

  return (
    <Card className={`overflow-hidden ${vencidas > 0 ? "border-red-200 dark:border-red-800" : "border-amber-200 dark:border-amber-800"}`}>
      {/* Cabecera — siempre visible */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className={`rounded-full p-2 shrink-0 ${vencidas > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}`}>
          <Bus className={`h-4 w-4 ${vencidas > 0 ? "text-red-600" : "text-amber-600"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{u.placa}</p>
            {u.modelo && <span className="text-xs text-muted-foreground">{u.modelo}</span>}
          </div>
          <div className="flex gap-2 mt-0.5 flex-wrap">
            {vencidas > 0 && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {vencidas} vencida{vencidas > 1 ? "s" : ""}
              </span>
            )}
            {proximas > 0 && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {proximas} próxima{proximas > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {group.parts.length} parte{group.parts.length > 1 ? "s" : ""}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Detalle partes */}
      {open && (
        <CardContent className="px-4 pb-3 pt-0">
          {group.parts.map((part) => (
            <UnitAlertRow key={part.id} part={part} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

export function MaintenanceAlertsTable() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [nivelFilter, setNivelFilter] = useState("TODOS")

  useEffect(() => {
    loadAllPartAlerts()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton variant="list" rowCount={4} title={false} action={false} />

  // Totales globales
  const allParts = groups.flatMap((g) => g.parts)
  const totalVencidas = allParts.filter((p) => Number(p.porcentaje) >= 100).length
  const totalProximas = allParts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      parts: g.parts.filter((p) => {
        const pct = Number(p.porcentaje)
        const matchNivel =
          nivelFilter === "TODOS" ||
          (nivelFilter === "VENCIDO" && pct >= 100) ||
          (nivelFilter === "PROXIMO" && pct >= 80 && pct < 100)
        const matchSearch =
          !searchTerm ||
          g.unit.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.unit.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchNivel && matchSearch
      }),
    }))
    .filter((g) => g.parts.length > 0)

  return (
    <div className="space-y-4">
      {/* Resumen chips */}
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${totalVencidas > 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-border bg-muted/30"}`}>
          <AlertCircle className={`h-4 w-4 shrink-0 ${totalVencidas > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          <div>
            <p className="text-xs text-muted-foreground">Vencidas</p>
            <p className={`text-xl font-bold leading-tight ${totalVencidas > 0 ? "text-red-600" : "text-foreground"}`}>{totalVencidas}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${totalProximas > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : "border-border bg-muted/30"}`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${totalProximas > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          <div>
            <p className="text-xs text-muted-foreground">Próximas</p>
            <p className={`text-xl font-bold leading-tight ${totalProximas > 0 ? "text-amber-600" : "text-foreground"}`}>{totalProximas}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 border-border bg-muted/30">
          <Bus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Unidades afectadas</p>
            <p className="text-xl font-bold leading-tight">{groups.length}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Buscar unidad o parte..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los niveles</SelectItem>
            <SelectItem value="VENCIDO">Solo vencidas (≥100%)</SelectItem>
            <SelectItem value="PROXIMO">Solo próximas (80–99%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por unidad */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 gap-3">
          {groups.length === 0 ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-muted-foreground text-sm font-medium">Toda la flota está en buen estado</p>
            </>
          ) : (
            <>
              <BellOff className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Sin resultados para ese filtro</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGroups.map((group, i) => (
            <UnitAlertCard
              key={group.unit.id}
              group={group}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
