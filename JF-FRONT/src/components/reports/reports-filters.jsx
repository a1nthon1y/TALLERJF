"use client"

import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"

export function ReportsFilters() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Mostrando todos los mantenimientos registrados.</span>
      <Badge variant="outline" className="text-xs">Filtros avanzados — próximamente</Badge>
    </div>
  )
}
