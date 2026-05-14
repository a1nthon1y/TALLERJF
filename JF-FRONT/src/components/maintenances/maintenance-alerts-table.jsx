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
  Gauge, Bus, ChevronDown, ChevronUp, Wrench,
} from "lucide-react"
import Link from "next/link"
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
      const aV = a.parts.filter((p) => Number(p.porcentaje) >= 100).length
      const bV = b.parts.filter((p) => Number(p.porcentaje) >= 100).length
      return bV - aV
    })
}

const fmt = (n) => new Intl.NumberFormat("es-PE").format(Math.round(Number(n)))

// ─── Fila de cada parte dentro de una tarjeta de unidad ─────────────────────
function UnitAlertRow({ part }) {
  const pct      = Number(part.porcentaje)
  const vencido  = pct >= 100
  const umbral   = Number(part.umbral_km)
  const kmRec    = Number(part.km_recorridos)
  const kmPasado = Math.max(0, kmRec - umbral)   // cuántos km lleva de retraso
  const kmFaltan = Math.max(0, umbral - kmRec)   // cuántos km quedan

  const ultimaFecha = part.ultimo_mantenimiento_fecha
    ? new Date(part.ultimo_mantenimiento_fecha).toLocaleDateString("es-PE", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null

  return (
    <div className={`py-3 border-t first:border-t-0 ${vencido ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
      {/* Nombre + badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{part.nombre}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Intervalo: cada {fmt(umbral)} km
            {ultimaFecha && <span className="ml-2 opacity-80">· Último mant.: {ultimaFecha}</span>}
          </p>
        </div>
        {vencido ? (
          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 shrink-0 text-xs">
            Vencido
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 shrink-0 text-xs">
            Próximo
          </Badge>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${vencido ? "bg-red-500" : "bg-amber-400"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-bold tabular-nums w-9 text-right shrink-0 ${vencido ? "text-red-600" : "text-amber-600"}`}>
          {Math.min(pct, 100).toFixed(0)}%
        </span>
      </div>

      {/* Km desglosado — aquí está la clave de la legibilidad */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Recorridos desde último mant.:{" "}
          <span className={`font-semibold ${vencido ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>
            {fmt(kmRec)} km
          </span>
        </span>
        {vencido ? (
          <span className="text-red-600 dark:text-red-400 font-semibold">
            Venció hace {fmt(kmPasado)} km
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Faltan {fmt(kmFaltan)} km
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tarjeta por unidad ──────────────────────────────────────────────────────
function UnitAlertCard({ group, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const vencidas = group.parts.filter((p) => Number(p.porcentaje) >= 100).length
  const proximas = group.parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length
  const u = group.unit
  const accent = vencidas > 0

  return (
    <Card className={`overflow-hidden ${accent ? "border-red-200 dark:border-red-800" : "border-amber-200 dark:border-amber-800"}`}>
      {/* ── Cabecera ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Ícono de unidad */}
        <div className={`rounded-full p-2 shrink-0 ${accent ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}`}>
          <Bus className={`h-4 w-4 ${accent ? "text-red-600" : "text-amber-600"}`} />
        </div>

        {/* Info — clic para expandir */}
        <button className="flex-1 min-w-0 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{u.placa}</p>
            {u.modelo && <span className="text-xs text-muted-foreground">{u.modelo}</span>}
            {u.kilometraje ? (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Gauge className="h-3 w-3" /> {fmt(u.kilometraje)} km actuales
              </span>
            ) : null}
          </div>
          <div className="flex gap-3 mt-0.5 flex-wrap">
            {vencidas > 0 && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {vencidas} vencida{vencidas !== 1 ? "s" : ""}
              </span>
            )}
            {proximas > 0 && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {proximas} próxima{proximas !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </button>

        {/* Botón de acción + toggle — siempre visibles */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            variant={accent ? "destructive" : "outline"}
            className="h-8 text-xs gap-1.5 hidden sm:flex"
          >
            <Link href={`/mantenimientos?crear=true&unidad_id=${u.id}`}>
              <Wrench className="h-3.5 w-3.5" />
              Registrar
            </Link>
          </Button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label={open ? "Contraer" : "Expandir"}
          >
            {open
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </button>
        </div>
      </div>

      {/* ── Detalle (colapsable) ──────────────────────────────── */}
      {open && (
        <CardContent className="px-4 pb-4 pt-0 border-t">
          {group.parts.map((part) => (
            <UnitAlertRow key={part.id} part={part} />
          ))}

          {/* Botón en móvil (el de escritorio ya está en la cabecera) */}
          <div className="mt-3 flex sm:hidden">
            <Button
              asChild
              size="sm"
              variant={accent ? "destructive" : "outline"}
              className="w-full gap-1.5"
            >
              <Link href={`/mantenimientos?crear=true&unidad_id=${u.id}`}>
                <Wrench className="h-3.5 w-3.5" />
                Registrar mantenimiento
              </Link>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Componente principal exportado ─────────────────────────────────────────
export function MaintenanceAlertsTable() {
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [nivelFilter, setNivelFilter] = useState("TODOS")

  useEffect(() => {
    loadAllPartAlerts()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton variant="list" rowCount={4} title={false} action={false} />

  const allParts      = groups.flatMap((g) => g.parts)
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
      {/* Resumen */}
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
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los niveles</SelectItem>
            <SelectItem value="VENCIDO">Solo vencidas (≥ 100%)</SelectItem>
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
            <UnitAlertCard key={group.unit.id} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
