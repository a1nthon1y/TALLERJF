"use client"

/**
 * Barra de filtros estándar para reportes.
 *
 * Props:
 *   - value:    objeto con los filtros actuales
 *   - onChange: (newValue) => void
 *   - onReset:  () => void
 *   - children: campos extra (selects de dueño, técnico, etc.) — opcional
 *
 * Por defecto incluye un rango de fechas (desde / hasta). Cualquier filtro
 * adicional se inyecta vía children (manteniendo el mismo control de estado).
 */
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar, X } from "lucide-react"

export function ReportFiltersBar({ value, onChange, onReset, children }) {
  const set = (k, v) => onChange({ ...value, [k]: v })

  const hasFilters = Object.values(value).some((v) => v !== undefined && v !== "" && v !== null)

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[140px]">
          <Label htmlFor="rep-desde" className="text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Desde
          </Label>
          <Input
            id="rep-desde"
            type="date"
            value={value.desde || ""}
            onChange={(e) => set("desde", e.target.value || undefined)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5 min-w-[140px]">
          <Label htmlFor="rep-hasta" className="text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Hasta
          </Label>
          <Input
            id="rep-hasta"
            type="date"
            value={value.hasta || ""}
            onChange={(e) => set("hasta", e.target.value || undefined)}
            className="h-9"
          />
        </div>

        {children}

        {hasFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
