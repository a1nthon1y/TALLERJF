"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileBarChart, Hammer } from "lucide-react"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportFiltersBar } from "@/components/reports/report-filters-bar"

export default function TecnicoReportsPage() {
  const [filters, setFilters] = useState({})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Mis reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tus trabajos asignados con materiales y costos. Descarga en PDF o Excel.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <Hammer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">Mis trabajos del período</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mantenimientos asignados a ti, con materiales utilizados y costo de cada uno.
            </p>
          </div>
        </CardContent>
      </Card>

      <ReportViewer
        endpoint="/reports/my-jobs"
        filters={filters}
        filtersForm={
          <ReportFiltersBar value={filters} onChange={setFilters} onReset={() => setFilters({})}>
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs">Estado</Label>
              <Select
                value={filters.estado || "__all__"}
                onValueChange={(v) => setFilters({ ...filters, estado: v === "__all__" ? undefined : v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                  <SelectItem value="COMPLETADO">Completado</SelectItem>
                  <SelectItem value="CERRADO">Cerrado</SelectItem>
                  <SelectItem value="REALIZADO">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ReportFiltersBar>
        }
      />
    </div>
  )
}
