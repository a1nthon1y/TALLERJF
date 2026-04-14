"use client"

import { useState } from "react"
import { Filter, Calendar, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function DashboardFilters({ onFiltersChange }) {
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState({
    period: "month",
    unitType: "all",
    showInactive: false,
    maintenanceType: "all",
  })

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (onFiltersChange) {
      onFiltersChange(newFilters)
    }
  }

  const getPeriodText = () => {
    switch (filters.period) {
      case "week":
        return "Esta semana"
      case "month":
        return "Este mes"
      case "quarter":
        return "Este trimestre"
      case "year":
        return "Este año"
      default:
        return "Personalizado"
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 border-dashed", open && "border-solid border-primary")}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filtros
            <ChevronDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Filtros del Dashboard</h4>
              <p className="text-sm text-muted-foreground">Personaliza la información mostrada en el dashboard</p>
            </div>
            <Separator />
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="period">Período</Label>
                <Select
                  value={filters.period}
                  onValueChange={(value) => handleFilterChange("period", value)}
                  className="col-span-2"
                >
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="quarter">Este trimestre</SelectItem>
                    <SelectItem value="year">Este año</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="unitType">Tipo de unidad</Label>
                <Select
                  value={filters.unitType}
                  onValueChange={(value) => handleFilterChange("unitType", value)}
                  className="col-span-2"
                >
                  <SelectTrigger id="unitType">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="urbano">Urbano</SelectItem>
                    <SelectItem value="interurbano">Interurbano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="maintenanceType">Tipo de mantenimiento</Label>
                <Select
                  value={filters.maintenanceType}
                  onValueChange={(value) => handleFilterChange("maintenanceType", value)}
                  className="col-span-2"
                >
                  <SelectTrigger id="maintenanceType">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="correctivo">Correctivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="showInactive">Mostrar inactivos</Label>
                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="showInactive"
                    checked={filters.showInactive}
                    onCheckedChange={(checked) => handleFilterChange("showInactive", checked)}
                  />
                  <Label htmlFor="showInactive" className="text-sm font-normal">
                    {filters.showInactive ? "Sí" : "No"}
                  </Label>
                </div>
              </div>
            </div>
            <Button onClick={() => setOpen(false)}>Aplicar filtros</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" className="h-8">
        <Calendar className="mr-2 h-3.5 w-3.5" />
        {getPeriodText()}
      </Button>
    </div>
  )
}

