"use client"

/**
 * Biblioteca de reportes (admin / encargado).
 *
 * Estructura:
 *   - Una grilla de tarjetas, cada una representa un reporte disponible.
 *   - Al hacer clic en una tarjeta, se abre un panel con la vista previa
 *     y los botones para descargar PDF / Excel.
 *   - El componente <ReportViewer> es genérico: se le pasa el endpoint y
 *     los filtros, y él se encarga de cargar, renderizar y exportar.
 */
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Wrench, Hammer, ChevronLeft, FileBarChart, ChevronRight,
  Wallet, Package, TrendingUp, Activity, MapPin,
} from "lucide-react"
import { ReportViewer } from "@/components/reports/report-viewer"
import { ReportFiltersBar } from "@/components/reports/report-filters-bar"
import { makeGetRequest } from "@/utils/api"

// ── Catálogo de reportes ────────────────────────────────────────────────────
//   Para añadir un nuevo reporte, basta con agregar un item aquí y crear el
//   endpoint en el backend que cumpla la convención { titulo, columnas, rows... }.
const REPORTS = [
  {
    id: "maintenances",
    title: "Mantenimientos por período",
    description: "Lista completa de mantenimientos con costos, técnico, dueño y unidad.",
    icon: Wrench,
    color: "blue",
    endpoint: "/reports/maintenances",
    fields: ["dueno", "unidad", "tecnico", "tipo", "estado"],
    category: "Operativo",
  },
  {
    id: "cost-by-owner",
    title: "Costos por dueño",
    description: "Consolidado de mantenimientos y costos agrupados por dueño. Ideal para facturación.",
    icon: Wallet,
    color: "green",
    endpoint: "/reports/cost-by-owner",
    fields: [],
    category: "Financiero",
  },
  {
    id: "technician-productivity",
    title: "Productividad por técnico",
    description: "Trabajos asignados, completados, horas promedio y costo de materiales por técnico.",
    icon: Hammer,
    color: "amber",
    endpoint: "/reports/technician-productivity",
    fields: ["tecnico"],
    category: "Operativo",
  },
  {
    id: "materials-consumption",
    title: "Consumo de materiales",
    description: "Qué materiales se usaron más, en cuántos mantenimientos y cuánto costó.",
    icon: Package,
    color: "purple",
    endpoint: "/reports/materials-consumption",
    fields: ["material"],
    category: "Inventario",
  },
  {
    id: "top-units",
    title: "Top unidades problemáticas",
    description: "Qué unidades generan más mantenimientos y cuánto cuestan en el período.",
    icon: TrendingUp,
    color: "red",
    endpoint: "/reports/top-units",
    fields: [],
    category: "Operativo",
  },
  {
    id: "predictive-compliance",
    title: "Cumplimiento predictivo",
    description: "% mensual de mantenimientos preventivos vs correctivos. Mide calidad del plan.",
    icon: Activity,
    color: "indigo",
    endpoint: "/reports/predictive-compliance",
    fields: [],
    category: "Operativo",
  },
  {
    id: "arrivals-log",
    title: "Bitácora de llegadas",
    description: "Reportes de llegada que enviaron los choferes (km, ruta, comentarios).",
    icon: MapPin,
    color: "teal",
    endpoint: "/reports/arrivals-log",
    fields: [],
    category: "Operativo",
  },
]

const colorMap = {
  blue:   "bg-blue-100   text-blue-600   dark:bg-blue-900/40   dark:text-blue-400",
  amber:  "bg-amber-100  text-amber-600  dark:bg-amber-900/40  dark:text-amber-400",
  green:  "bg-green-100  text-green-600  dark:bg-green-900/40  dark:text-green-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  red:    "bg-red-100    text-red-600    dark:bg-red-900/40    dark:text-red-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  teal:   "bg-teal-100   text-teal-600   dark:bg-teal-900/40   dark:text-teal-400",
}

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({})

  // Catálogos para los selects de filtro (cargan una sola vez)
  const [duenos, setDuenos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [materiales, setMateriales] = useState([])

  useEffect(() => {
    Promise.allSettled([
      makeGetRequest("/owners"),
      makeGetRequest("/units"),
      makeGetRequest("/technicians"),
      makeGetRequest("/materials"),
    ]).then(([dRes, uRes, tRes, mRes]) => {
      if (dRes.status === "fulfilled" && Array.isArray(dRes.value)) setDuenos(dRes.value)
      if (uRes.status === "fulfilled" && Array.isArray(uRes.value)) setUnidades(uRes.value)
      if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) setTecnicos(tRes.value)
      if (mRes.status === "fulfilled" && Array.isArray(mRes.value)) setMateriales(mRes.value)
    })
  }, [])

  const selected = useMemo(() => REPORTS.find((r) => r.id === selectedId), [selectedId])

  const openReport = (id) => {
    setSelectedId(id)
    setFilters({}) // empieza limpio cada vez
  }

  // ── Vista detalle (un reporte abierto) ─────────────────────────────────
  if (selected) {
    const fields = new Set(selected.fields)
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
            <ReportFiltersBar
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters({})}
            >
              {fields.has("dueno") && (
                <FilterSelect
                  label="Dueño"
                  value={filters.dueno_id}
                  onChange={(v) => setFilters({ ...filters, dueno_id: v })}
                  options={duenos.map((d) => ({ value: String(d.id), label: d.nombre || d.usuario_nombre || `#${d.id}` }))}
                />
              )}
              {fields.has("unidad") && (
                <FilterSelect
                  label="Unidad"
                  value={filters.unidad_id}
                  onChange={(v) => setFilters({ ...filters, unidad_id: v })}
                  options={unidades.map((u) => ({ value: String(u.id), label: u.placa }))}
                />
              )}
              {fields.has("tecnico") && (
                <FilterSelect
                  label="Técnico"
                  value={filters.tecnico_id}
                  onChange={(v) => setFilters({ ...filters, tecnico_id: v })}
                  options={tecnicos.map((t) => ({ value: String(t.id), label: t.nombre }))}
                />
              )}
              {fields.has("material") && (
                <FilterSelect
                  label="Material"
                  value={filters.material_id}
                  onChange={(v) => setFilters({ ...filters, material_id: v })}
                  options={materiales.map((m) => ({ value: String(m.id), label: m.nombre }))}
                />
              )}
              {fields.has("tipo") && (
                <FilterSelect
                  label="Tipo"
                  value={filters.tipo}
                  onChange={(v) => setFilters({ ...filters, tipo: v })}
                  options={[
                    { value: "PREVENTIVO", label: "Preventivo" },
                    { value: "CORRECTIVO", label: "Correctivo" },
                  ]}
                />
              )}
              {fields.has("estado") && (
                <FilterSelect
                  label="Estado"
                  value={filters.estado}
                  onChange={(v) => setFilters({ ...filters, estado: v })}
                  options={[
                    { value: "PENDIENTE",   label: "Pendiente" },
                    { value: "EN_PROCESO",  label: "En proceso" },
                    { value: "COMPLETADO",  label: "Completado" },
                    { value: "CERRADO",     label: "Cerrado" },
                    { value: "REALIZADO",   label: "Realizado" },
                  ]}
                />
              )}
            </ReportFiltersBar>
          }
        />
      </div>
    )
  }

  // Agrupar por categoría para mantener orden cuando haya muchos reportes
  const groups = REPORTS.reduce((acc, r) => {
    const cat = r.category || "Otros"
    ;(acc[cat] ||= []).push(r)
    return acc
  }, {})
  const categoryOrder = ["Operativo", "Financiero", "Inventario", "Otros"]
  const orderedGroups = categoryOrder.filter((c) => groups[c]).map((c) => [c, groups[c]])

  // ── Vista biblioteca (tarjetas) ────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Reportes
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {REPORTS.length} reportes disponibles. Genéralos en pantalla, PDF o Excel.
        </p>
      </div>

      {orderedGroups.map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
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
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {r.fields.length === 0 ? "Solo fechas" : `${r.fields.length} filtro(s)`}
                    </span>
                    <span className="text-xs font-medium text-primary inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Generar <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Helper: select de filtro ────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5 min-w-[160px]">
      <Label className="text-xs">{label}</Label>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? undefined : v)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
