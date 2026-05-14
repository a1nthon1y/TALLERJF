"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileBarChart, Wallet } from "lucide-react"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportFiltersBar } from "@/components/reports/report-filters-bar"
import { makeGetRequest } from "@/utils/api"

export default function OwnerReportsPage() {
  const [filters, setFilters] = useState({})
  const [unidades, setUnidades] = useState([])

  useEffect(() => {
    makeGetRequest("/units/my-units")
      .then((data) => setUnidades(Array.isArray(data) ? data : []))
      .catch(() => setUnidades([]))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Mis reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Estado de cuenta y mantenimientos de tus unidades. Descarga en PDF o Excel.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0 bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">Estado de cuenta</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mantenimientos realizados a tus unidades con costos detallados de materiales.
            </p>
          </div>
        </CardContent>
      </Card>

      <ReportViewer
        endpoint="/reports/owner-statement"
        filters={filters}
        filtersForm={
          <ReportFiltersBar value={filters} onChange={setFilters} onReset={() => setFilters({})}>
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs">Unidad</Label>
              <Select
                value={filters.unidad_id || "__all__"}
                onValueChange={(v) => setFilters({ ...filters, unidad_id: v === "__all__" ? undefined : v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas mis unidades</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ReportFiltersBar>
        }
      />
    </div>
  )
}
