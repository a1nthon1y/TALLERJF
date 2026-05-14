"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, FileBarChart, Wallet, CalendarClock } from "lucide-react"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportFiltersBar } from "@/components/reports/report-filters-bar"
import { makeGetRequest } from "@/utils/api"

const REPORTS = [
  {
    id: "owner-statement",
    title: "Estado de cuenta",
    description: "Mantenimientos realizados a tus unidades con costos detallados de materiales.",
    icon: Wallet,
    color: "green",
    endpoint: "/reports/owner-statement",
    needsUnit: true,
    needsDates: true,
  },
  {
    id: "owner-upcoming",
    title: "Próximos vencimientos",
    description: "Partes que están por vencer o ya vencieron en tus unidades. Para planificar gasto.",
    icon: CalendarClock,
    color: "amber",
    endpoint: "/reports/owner-upcoming",
    needsUnit: true,
    needsDates: false,
  },
]

const colorMap = {
  green: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
}

export default function OwnerReportsPage() {
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({})
  const [unidades, setUnidades] = useState([])

  useEffect(() => {
    makeGetRequest("/units/my-units")
      .then((data) => setUnidades(Array.isArray(data) ? data : []))
      .catch(() => setUnidades([]))
  }, [])

  const selected = useMemo(() => REPORTS.find((r) => r.id === selectedId), [selectedId])

  const openReport = (id) => {
    setSelectedId(id)
    setFilters({})
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <selected.icon className="h-5 w-5" /> {selected.title}
            </h1>
            <p className="text-sm text-muted-foreground">{selected.description}</p>
          </div>
        </div>

        <ReportViewer
          endpoint={selected.endpoint}
          filters={filters}
          filtersForm={
            (selected.needsUnit || selected.needsDates) && (
              <ReportFiltersBar
                value={filters}
                onChange={setFilters}
                onReset={() => setFilters({})}
              >
                {selected.needsUnit && (
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label className="text-xs">Unidad</Label>
                    <Select
                      value={filters.unidad_id || "__all__"}
                      onValueChange={(v) =>
                        setFilters({ ...filters, unidad_id: v === "__all__" ? undefined : v })
                      }
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
                )}
              </ReportFiltersBar>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Mis reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {REPORTS.length} reportes disponibles para tus unidades. Descarga en PDF o Excel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card
            key={r.id}
            className="group hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => openReport(r.id)}
          >
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-start gap-3 mb-3">
                <div className={`rounded-lg p-2.5 shrink-0 ${colorMap[r.color]}`}>
                  <r.icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">PDF · Excel</Badge>
              </div>
              <h3 className="font-semibold text-base leading-tight mb-1">{r.title}</h3>
              <p className="text-xs text-muted-foreground flex-1">{r.description}</p>
              <div className="mt-4 flex items-center justify-end">
                <span className="text-xs font-medium text-primary inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Generar <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
