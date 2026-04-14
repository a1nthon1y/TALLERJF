"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarIcon, Info } from "lucide-react"

// Datos de ejemplo para mantenimientos programados
const scheduledMaintenances = [
  {
    id: 1,
    unit: "ABC-123",
    type: "Preventivo",
    date: new Date(2025, 2, 15), // 15 de marzo de 2025
    description: "Cambio de aceite y filtros",
  },
  {
    id: 2,
    unit: "XYZ-789",
    type: "Correctivo",
    date: new Date(2025, 2, 18), // 18 de marzo de 2025
    description: "Reparación de frenos",
  },
  {
    id: 3,
    unit: "DEF-456",
    type: "Preventivo",
    date: new Date(2025, 2, 22), // 22 de marzo de 2025
    description: "Revisión de sistema eléctrico",
  },
  {
    id: 4,
    unit: "GHI-101",
    type: "Preventivo",
    date: new Date(2025, 2, 25), // 25 de marzo de 2025
    description: "Cambio de neumáticos",
  },
  {
    id: 5,
    unit: "JKL-202",
    type: "Correctivo",
    date: new Date(2025, 2, 28), // 28 de marzo de 2025
    description: "Reparación de aire acondicionado",
  },
]

export function MaintenanceCalendar() {
  const [date, setDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  // Función para verificar si hay mantenimientos en una fecha específica
  const hasMaintenances = (day) => {
    if (!day) return false
    return scheduledMaintenances.some((m) => m.date && m.date.toDateString() === day.toDateString())
  }

  // Función para obtener mantenimientos de un día específico
  const getDayMaintenances = (day) => {
    if (!day) return []
    return scheduledMaintenances.filter((m) => m.date && m.date.toDateString() === day.toDateString())
  }

  // Renderizar el contenido del día en el calendario
  const renderDay = (day, selected) => {
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
              {dayMaintenances.slice(0, 3).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-1 rounded-full ${dayMaintenances[i].type === "Preventivo" ? "bg-blue-500" : "bg-red-500"
                    }`}
                />
              ))}
              {dayMaintenances.length > 3 && <div className="h-1 w-1 rounded-full bg-yellow-500" />}
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
            <CalendarIcon className="h-5 w-5 text-primary" />
          </span>
          Calendario de Mantenimientos
        </CardTitle>
        <CardDescription>Programación de mantenimientos preventivos y correctivos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          <div className="md:col-span-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(day) => {
                setDate(day || new Date());
                setSelectedDay(day);
              }}
              className="rounded-md border"
              components={{
                Day: ({ day, selected, ...props }) => {
                  const { displayMonth, ...filteredProps } = props; // Eliminamos `displayMonth`
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            {...filteredProps} // Usamos los props filtrados
                            className={`${props.className || ''} relative`}
                          >
                            {renderDay(day, selected)}
                          </button>
                        </TooltipTrigger>
                        {hasMaintenances(day) && (
                          <TooltipContent>
                            <div className="text-xs">{getDayMaintenances(day).length} mantenimiento(s)</div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                },
              }}
            />

          </div>
          <div className="md:col-span-3">
            <div className="rounded-md border p-4 h-full">
              <h3 className="font-medium text-sm mb-3 flex items-center">
                {selectedDay ? (
                  <>
                    Mantenimientos para{" "}
                    {selectedDay.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </>
                ) : (
                  <>Selecciona una fecha para ver los mantenimientos</>
                )}
              </h3>

              {selectedDay && getDayMaintenances(selectedDay).length > 0 ? (
                <div className="space-y-3">
                  {getDayMaintenances(selectedDay).map((maintenance) => (
                    <div key={maintenance.id} className="p-2 rounded-md border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{maintenance.unit}</span>
                        <Badge
                          variant={maintenance.type === "Preventivo" ? "outline" : "secondary"}
                          className={
                            maintenance.type === "Preventivo"
                              ? "border-blue-500 text-blue-500"
                              : "bg-red-500 text-white"
                          }
                        >
                          {maintenance.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{maintenance.description}</p>
                    </div>
                  ))}
                </div>
              ) : selectedDay ? (
                <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-center text-muted-foreground">
                  <Info className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  <p className="text-sm">No hay mantenimientos programados para este día</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-center text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  <p className="text-sm">Selecciona una fecha para ver los mantenimientos programados</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-2 text-center">
          <a href="/mantenimientos/calendario" className="text-sm text-primary hover:underline">
            Ver calendario completo →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

