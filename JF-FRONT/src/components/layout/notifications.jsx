"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { makeGetRequest } from "@/utils/api"
import { Loader2 } from "lucide-react"

export function Notifications() {
  const [alerts, setAlerts] = useState([])
  const [read, setRead] = useState(new Set())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    makeGetRequest("/alerts")
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = alerts.filter((a) => !read.has(a.id)).length

  const markAllAsRead = () => setRead(new Set(alerts.map((a) => a.id)))

  const markAsRead = (id) => setRead((prev) => new Set([...prev, id]))

  const getTypeStyles = (estado) => {
    if (estado === "ACTIVO") return "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30"
    return "border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30"
  }

  const getTypeIcon = (estado) => {
    if (estado === "ACTIVO")
      return <AlertCircle className="h-4 w-4 text-red-500 mr-2 shrink-0" />
    return <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-medium">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto text-xs px-2 py-1" onClick={markAllAsRead}>
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando alertas...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No hay alertas activas
            </div>
          ) : (
            alerts.map((alert) => {
              const isUnread = !read.has(alert.id)
              return (
                <button
                  key={alert.id}
                  type="button"
                  className={cn(
                    "w-full text-left flex flex-col p-3 border-b last:border-0 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isUnread && "bg-muted/30",
                    getTypeStyles(alert.estado),
                  )}
                  onClick={() => markAsRead(alert.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center">
                      {getTypeIcon(alert.estado)}
                      {alert.parte || "Alerta de mantenimiento"}
                    </span>
                    {isUnread && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{alert.mensaje}</p>
                  {alert.placa && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">Unidad: {alert.placa}</p>
                  )}
                </button>
              )
            })
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <a href="/mantenimientos/alertas">Ver todas las alertas</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
