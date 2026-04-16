"use client"

import { CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function DashboardFilters() {
  const today = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1.5 text-xs font-normal">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        {today}
      </Badge>
    </div>
  )
}
