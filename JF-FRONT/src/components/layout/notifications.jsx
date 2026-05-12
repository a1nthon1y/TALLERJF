"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, AlertTriangle, AlertCircle, Loader2, ChevronRight, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { makeGetRequest } from "@/utils/api"

const STORAGE_KEY = "tallerjf:notif:seenIds"
const POLL_INTERVAL_MS = 60_000 // 1 minuto

const loadSeen = () => {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

const saveSeen = (set) => {
  if (typeof window === "undefined") return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {}
}

export function Notifications() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [seenIds, setSeenIds] = useState(() => loadSeen())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(() => {
    return makeGetRequest("/alerts")
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => { /* silent */ })
  }, [])

  // Polling: una vez al montar y cada N segundos
  useEffect(() => {
    fetchAlerts().finally(() => setLoading(false))
    const id = setInterval(fetchAlerts, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchAlerts])

  // Refresca al abrir el popover (datos frescos al consultar)
  useEffect(() => {
    if (open) fetchAlerts()
  }, [open, fetchAlerts])

  // Marcar todas como vistas al abrir (UX: si las miraste, ya no son "nuevas")
  useEffect(() => {
    if (!open || alerts.length === 0) return
    const next = new Set(seenIds)
    let changed = false
    alerts.forEach((a) => { if (!next.has(a.id)) { next.add(a.id); changed = true } })
    if (changed) {
      setSeenIds(next)
      saveSeen(next)
    }
  }, [open, alerts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Limpia seenIds de alertas que ya no existen (para no acumular en localStorage)
  useEffect(() => {
    if (alerts.length === 0) return
    const validIds = new Set(alerts.map(a => a.id))
    const filtered = new Set([...seenIds].filter(id => validIds.has(id)))
    if (filtered.size !== seenIds.size) {
      setSeenIds(filtered)
      saveSeen(filtered)
    }
  }, [alerts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Agrupar por unidad
  const groupedByUnit = useMemo(() => {
    const groups = new Map()
    alerts.forEach((a) => {
      const key = a.unidad_id
      if (!groups.has(key)) {
        groups.set(key, { unidad_id: a.unidad_id, placa: a.placa, alertas: [] })
      }
      groups.get(key).alertas.push(a)
    })
    return [...groups.values()].sort((a, b) => b.alertas.length - a.alertas.length)
  }, [alerts])

  const newCount = alerts.filter((a) => !seenIds.has(a.id)).length

  const handleGoToUnit = (unidadId) => {
    setOpen(false)
    router.push(`/mantenimientos?unidad=${unidadId}`)
  }

  const handleGoToAlert = (alert) => {
    setOpen(false)
    // Lleva a crear/gestionar mantenimiento para esa unidad
    router.push(`/mantenimientos?unidad=${alert.unidad_id}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${newCount > 0 ? `, ${newCount} sin leer` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {newCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
            >
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <div>
            <h4 className="font-medium text-sm">Alertas activas</h4>
            <p className="text-xs text-muted-foreground">
              {alerts.length === 0
                ? "Todo en orden"
                : `${alerts.length} alertas en ${groupedByUnit.length} unidad${groupedByUnit.length === 1 ? "" : "es"}`}
            </p>
          </div>
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto text-xs px-2 py-1"
              onClick={() => router.push("/mantenimientos/alertas")}>
              Ver todas
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando alertas...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No hay alertas activas</p>
              <p className="text-xs mt-1">Las alertas aparecerán cuando una unidad supere su umbral</p>
            </div>
          ) : (
            groupedByUnit.map((group) => {
              const newInGroup = group.alertas.filter(a => !seenIds.has(a.id)).length
              return (
                <div key={group.unidad_id} className="border-b last:border-0">
                  <button
                    type="button"
                    onClick={() => handleGoToUnit(group.unidad_id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                        <Truck className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{group.placa}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.alertas.length} parte{group.alertas.length === 1 ? "" : "s"} con alerta
                          {newInGroup > 0 && ` · ${newInGroup} nueva${newInGroup === 1 ? "" : "s"}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>

                  <div className="px-3 pb-2 space-y-1">
                    {group.alertas.map((a) => {
                      const isNew = !seenIds.has(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleGoToAlert(a)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors",
                            "hover:bg-muted",
                            isNew ? "bg-blue-50/60 dark:bg-blue-950/20" : "bg-transparent"
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="flex-1 min-w-0 truncate font-medium">{a.parte}</span>
                          {isNew && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {alerts.length > 0 && (
          <div className="border-t p-2 bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Click en una unidad o parte para gestionar el mantenimiento
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
