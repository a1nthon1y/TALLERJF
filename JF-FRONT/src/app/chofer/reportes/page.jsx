"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileBarChart, Bus } from "lucide-react"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportFiltersBar } from "@/components/reports/report-filters-bar"

export default function ChoferReportsPage() {
  const [filters, setFilters] = useState({})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Mis reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mantenimientos de la unidad que tienes asignada. Descarga en PDF o Excel.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <Bus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">Mantenimientos de mi unidad</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historial de los mantenimientos realizados a tu unidad asignada.
            </p>
          </div>
        </CardContent>
      </Card>

      <ReportViewer
        endpoint="/reports/my-unit"
        filters={filters}
        filtersForm={
          <ReportFiltersBar value={filters} onChange={setFilters} onReset={() => setFilters({})} />
        }
      />
    </div>
  )
}
