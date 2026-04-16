"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarIcon, Info } from "lucide-react"
import { makeGetRequest } from "@/utils/api"

export function MaintenanceCalendar() {
  const [date, setDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [maintenances, setMaintenances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    makeGetRequest("/maintenances")
      .then((data) => {
        const parsed = (Array.isArray(data) ? data : []).map((m) => ({
          ...m,
          _date: m.fecha_solicitud ? new Date(m.fecha_solicitud) : null,
        }))
        setMaintenances(parsed)
      })
      .catch(() => setMaintenances([]))
      .finally(() => setLoading(false))
  }, [])

  const getDayMaintenances = (day) => {
    if (!day) return []
    return maintenances.filter(
      (m) => m._date && m._date.toDateString() === day.toDateString()
    )
  }

  const hasMaintenances = (day) => {
    if (!day) return false
    return maintenances.some((m) => m._date && m._date.toDateString() === day.toDateString())
  }

  const renderDay = (day) => {
    if (!day) return null
    const dayMaintenances = getDayMaintenances(day)
    const hasEvents = dayMaintenances.length > 0
    return (
      <div className="relative">
        <div className={`w-full h-full flex items-center justify-center ${hasEvents ? "font-bold" : ""}`}>
          {day.getDate()}
        </div>
        {hasEvents && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-0.5">
              {dayMaintenances.slice(0, 3).map((m, i) => (
                <div
                  key={i}
                  className={`h-1 w-1 rounded-full ${
                    m.tipo?.toUpperCase() === "PREVENTIVO" ? "bg-blue-500" : "bg-red-500"
                  }`}
                />
              ))}
              {dayMaintenances.length > 3 && (
                <div className="h-1 w-1 rounded-full bg-yellow-500" />
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <span className="bg-primary/10 p-1.5 rounded-md mr-2">
            <CalendarIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          Calendario de Mantenimientos
        </CardTitle>
        <CardDescription>Mantenimientos registrados por fecha</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[320px] w-full rounded-md" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
            <div className="md:col-span-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(day) => {
                  setDate(day || new Date())
                  setSelectedDay(day)
                }}
                className="rounded-md border"
                components={{
                  Day: ({ day, selected, ...props }) => {
                    const { displayMonth, ...filteredProps } = props
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button {...filteredProps} className={`${props.className || ""} relative`}>
                              {renderDay(day)}
                            </button>
                          </TooltipTrigger>
                          {hasMaintenances(day) && (
                            <TooltipContent>
                              <div className="text-xs">
                                {getDayMaintenances(day).length} mantenimiento(s)
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )
                  },
                }}
              />
            </div>
            <div className="md:col-span-3">
              <div className="rounded-md border p-4 h-full">
                <h3 className="font-medium text-sm mb-3">
                  {selectedDay
                    ? `Mantenimientos para ${selectedDay.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}`
                    : "Selecciona una fecha"}
                </h3>

                {selectedDay && getDayMaintenances(selectedDay).length > 0 ? (
                  <div className="space-y-3">
                    {getDayMaintenances(selectedDay).map((m) => (
                      <div key={m.id} className="p-2 rounded-md border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{m.placa ?? `U-${m.unidad_id}`}</span>
                          <Badge
                            variant={m.tipo?.toUpperCase() === "PREVENTIVO" ? "outline" : "secondary"}
                            className={
                              m.tipo?.toUpperCase() === "PREVENTIVO"
                                ? "border-blue-500 text-blue-500"
                                : "bg-red-500 text-white"
                            }
                          >
                            {m.tipo?.charAt(0).toUpperCase() + m.tipo?.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                        {m.observaciones && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{m.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedDay ? (
                  <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-center text-muted-foreground">
                    <Info className="h-8 w-8 mb-2 opacity-40" aria-hidden="true" />
                    <p className="text-sm">No hay mantenimientos para este día</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-center text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mb-2 opacity-40" aria-hidden="true" />
                    <p className="text-sm">Selecciona una fecha para ver los mantenimientos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
