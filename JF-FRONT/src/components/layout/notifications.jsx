"use client"

import { useState, useEffect } from "react"
import { Bell, AlertTriangle, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getMaintenanceAlerts, getUpcomingMaintenanceAlerts } from "@/lib/maintenance-alerts"
import { formatNumber } from "@/utils/formatting"

// Datos de ejemplo para notificaciones
const notificationsData = [
  {
    id: 1,
    title: "Mantenimiento pendiente",
    message: "Unidad ABC-123 tiene mantenimiento programado para mañana",
    time: "Hace 10 minutos",
    read: false,
    type: "warning",
  },
  {
    id: 2,
    title: "Stock bajo",
    message: "El nivel de stock de 'Filtro de aceite' está por debajo del mínimo",
    time: "Hace 2 horas",
    read: false,
    type: "danger",
  },
  {
    id: 3,
    title: "Mantenimiento completado",
    message: "Mantenimiento de la unidad XYZ-789 ha sido completado",
    time: "Hace 5 horas",
    read: true,
    type: "success",
  },
  {
    id: 4,
    title: "Nueva unidad registrada",
    message: "Se ha registrado la unidad JKL-202 en el sistema",
    time: "Ayer",
    read: true,
    type: "info",
  },
]

export function Notifications() {
  const [notifications, setNotifications] = useState(notificationsData)
  const [open, setOpen] = useState(false)

  // Obtener alertas de mantenimiento basadas en kilometraje
  const maintenanceAlerts = getMaintenanceAlerts()
  const upcomingMaintenanceAlerts = getUpcomingMaintenanceAlerts()

  // Combinar notificaciones regulares con alertas de mantenimiento
  useEffect(() => {
    const combinedNotifications = [...notificationsData]

    // Agregar alertas críticas (partes que ya necesitan mantenimiento)
    maintenanceAlerts.forEach((alert, index) => {
      combinedNotifications.push({
        id: 1000 + index,
        title: `Mantenimiento requerido: ${alert.name}`,
        message: `La unidad ${alert.unitPlate} requiere mantenimiento de ${alert.name.toLowerCase()} a los ${formatNumber(alert.maintenanceInterval)} km. Kilometraje actual: ${formatNumber(alert.unitCurrentKm)} km.`,
        time: "Ahora",
        read: false,
        type: "danger",
        partId: alert.id,
      })
    })

    // Agregar alertas de advertencia (partes que pronto necesitarán mantenimiento)
    upcomingMaintenanceAlerts.forEach((alert, index) => {
      combinedNotifications.push({
        id: 2000 + index,
        title: `Mantenimiento próximo: ${alert.name}`,
        message: `La unidad ${alert.unitPlate} requerirá mantenimiento de ${alert.name.toLowerCase()} pronto. Faltan ${(alert.lastMaintenanceKm + alert.maintenanceInterval - alert.unitCurrentKm).toLocaleString()} km.`,
        time: "Ahora",
        read: false,
        type: "warning",
        partId: alert.id,
      })
    })

    setNotifications(combinedNotifications)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case "warning":
        return "border-l-4 border-yellow-500 bg-amber-50 dark:bg-amber-950/30"
      case "danger":
        return "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30"
      case "success":
        return "border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30"
      case "info":
        return "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30"
      default:
        return "border-l-4 border-gray-300"
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
      case "danger":
        return <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount}
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
          {notifications.length > 0 ? (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.read && "bg-muted/30",
                    getTypeStyles(notification.type),
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm flex items-center">
                      {getTypeIcon(notification.type)}
                      {notification.title}
                    </h5>
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-blue-500"></span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <span className="text-xs text-muted-foreground mt-2">{notification.time}</span>

                  {/* Botón para alertas de mantenimiento */}
                  {"partId" in notification && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = `/mantenimientos/partes/${notification.partId}`
                      }}
                    >
                      Programar mantenimiento
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">No hay notificaciones</div>
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

