"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MaintenancesTable } from "@/components/maintenances/maintenances-table"
import { FleetPartsStatus } from "@/components/maintenances/fleet-parts-status"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, Bell, Wrench, FileText } from "lucide-react"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { maintenanceService } from "@/services/maintenanceService"
import { getPartsStatus } from "@/services/unitsService"
import { toast } from "sonner"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useMaintenances } from "@/hooks/useMaintenances"
import { useTechnicians } from "@/hooks/useTechnicians"
import { useUnits } from "@/hooks/useUnits"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

const formSchema = z.object({
  unidad_id: z.string().min(1, { message: "La unidad es requerida" }),
  tipo: z.enum(["preventivo", "correctivo"], { message: "El tipo es requerido" }),
  observaciones: z.string().optional(),
  kilometraje_actual: z.number().min(0, { message: "El kilometraje no puede ser negativo" }),
  tecnico_id: z.string().min(1, { message: "El técnico es requerido" }),
}).superRefine((data, ctx) => {
  if (data.tipo === "correctivo" && !data.observaciones?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Describe el problema reportado", path: ["observaciones"] })
  }
})

function MaintenancesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  // Partes preventivas de la unidad seleccionada
  const [unitParts, setUnitParts] = useState([])
  const [unitPartsLoading, setUnitPartsLoading] = useState(false)
  const [selectedPartes, setSelectedPartes] = useState([])
  const { data: maintenances, isLoading: isLoadingMaintenances, isError: isErrorMaintenances, mutate } = useMaintenances()
  const { data: technicians, isLoading: isLoadingTechnicians, isError: isErrorTechnicians } = useTechnicians()
  const { data: units, isLoading: isLoadingUnits, isError: isErrorUnits } = useUnits()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidad_id: "",
      tipo: "preventivo",
      observaciones: "",
      kilometraje_actual: 0,
      tecnico_id: "",
    },
  })

  // Leer query params: ?crear=true&unidad_id=X
  useEffect(() => {
    if (!units || units.length === 0) return
    const crear = searchParams.get("crear")
    const unidadId = searchParams.get("unidad_id")
    if (crear === "true") {
      const targetUnit = unidadId ? units.find((u) => String(u.id) === unidadId) : units[0]
      if (targetUnit) {
        form.setValue("unidad_id", String(targetUnit.id))
        form.setValue("kilometraje_actual", targetUnit.kilometraje)
      }
      setIsCreating(true)
      // Limpiar query params de la URL sin recargar
      router.replace("/mantenimientos", { scroll: false })
    }
  }, [units, searchParams])

  useEffect(() => {
    if (technicians && technicians.length > 0) {
      form.setValue("tecnico_id", String(technicians[0].id))
    }
  }, [technicians])
  
  useEffect(() => {
    if (units && units.length > 0 && !form.getValues("unidad_id")) {
      form.setValue("unidad_id", String(units[0].id))
      form.setValue("kilometraje_actual", units[0].kilometraje)
    }
  }, [units])

  // Cargar partes predictivas cuando unidad o tipo cambian
  const watchedUnidad = form.watch("unidad_id")
  const watchedTipo   = form.watch("tipo")
  useEffect(() => {
    if (!watchedUnidad || watchedTipo !== "preventivo") { setUnitParts([]); setSelectedPartes([]); return }
    setUnitPartsLoading(true)
    getPartsStatus(watchedUnidad)
      .then(data => {
        // solo mostrar partes que tienen alerta (CRITICO o ADVERTENCIA) o todas si no hay alertas
        const partes = Array.isArray(data) ? data : (data?.partes || [])
        setUnitParts(partes)
        // pre-seleccionar las críticas y de advertencia
        const alertas = partes.filter(p => ["CRITICO","ADVERTENCIA"].includes(p.estado?.toUpperCase()))
        setSelectedPartes(alertas.map(p => String(p.id || p.configuracion_parte_id)))
      })
      .catch(() => setUnitParts([]))
      .finally(() => setUnitPartsLoading(false))
  }, [watchedUnidad, watchedTipo])

  const selectedUnit = units?.find((unit) => String(unit.id) === form.watch("unidad_id"))
  const kilometrajeUnidad = selectedUnit?.kilometraje ?? 0
  const unidadOperativa = selectedUnit?.estado === "operativo"

  const handleCreateMaintenance = async (values) => {
    if (!selectedUnit) { toast.error("Unidad no encontrada"); return }
    if (unidadOperativa && values.kilometraje_actual <= kilometrajeUnidad) {
      toast.error(`El kilometraje ingresado debe ser mayor al actual (${kilometrajeUnidad} km)`)
      return
    }

    // Para preventivo: si no hay observación manual, generar desde partes seleccionadas
    let observaciones = values.observaciones?.trim() || ""
    if (values.tipo === "preventivo") {
      if (selectedPartes.length > 0) {
        const nombresPartes = unitParts
          .filter(p => selectedPartes.includes(String(p.id || p.configuracion_parte_id)))
          .map(p => p.nombre || p.parte_nombre)
          .filter(Boolean)
        const autoObs = `Mantenimiento preventivo programado: ${nombresPartes.join(", ")}`
        observaciones = observaciones ? `${autoObs}\n${observaciones}` : autoObs
      } else if (!observaciones) {
        observaciones = "Mantenimiento preventivo programado"
      }
    }

    try {
      await maintenanceService.createMaintenance({ ...values, observaciones })
      toast.success("Mantenimiento creado correctamente")
      setIsCreating(false)
      setSelectedPartes([])
      setUnitParts([])
      form.reset()
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoadingMaintenances || isLoadingTechnicians || isLoadingUnits) {
    return <PageSkeleton rowCount={5} columnCount={7} />
  }
  if (isErrorMaintenances || isErrorTechnicians || isErrorUnits) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive text-sm">
        Error al cargar los datos de mantenimientos.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Mantenimientos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/mantenimientos/alertas">
              <Bell className="mr-2 h-4 w-4 text-amber-500" />
              Ver alertas
            </Link>
          </Button>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Mantenimiento
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Mantenimiento</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo mantenimiento.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateMaintenance)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="unidad_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units?.map((unit) => (
                            <SelectItem key={unit.id} value={String(unit.id)}>
                              {unit.placa} - {unit.estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedUnit && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>Kilometraje actual: {kilometrajeUnidad} km</p>
                        <p>Estado: {unidadOperativa ? "Operativa" : "En taller"}</p>
                        {unidadOperativa && (
                          <p className="text-yellow-600">
                            * Debe ingresar un kilometraje mayor al actual
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="preventivo">Preventivo</SelectItem>
                          <SelectItem value="correctivo">Correctivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tecnico_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Técnico</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un técnico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={String(tech.id)}>
                              {tech.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kilometraje_actual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometraje Actual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ingresa el kilometraje actual"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PREVENTIVO: selección de partes con alertas */}
                {form.watch("tipo") === "preventivo" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium">Partes a atender</p>
                    </div>
                    {unitPartsLoading ? (
                      <p className="text-xs text-muted-foreground">Cargando estado de partes...</p>
                    ) : unitParts.length === 0 ? (
                      <p className="text-xs text-muted-foreground border rounded-md px-3 py-2">
                        No hay partes configuradas para esta unidad — <a href="/configuraciones" className="underline text-primary">configurar umbrales</a>
                      </p>
                    ) : (
                      <div className="border rounded-md divide-y">
                        {unitParts.map((p) => {
                          const id = String(p.id || p.configuracion_parte_id)
                          const estado = p.estado?.toUpperCase()
                          const checked = selectedPartes.includes(id)
                          return (
                            <label key={id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                              <input type="checkbox" className="rounded" checked={checked}
                                onChange={(e) => setSelectedPartes(prev =>
                                  e.target.checked ? [...prev, id] : prev.filter(x => x !== id)
                                )}
                              />
                              <span className="flex-1 text-sm">{p.nombre || p.parte_nombre}</span>
                              {estado === "CRITICO" && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Crítico</Badge>}
                              {estado === "ADVERTENCIA" && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Alerta</Badge>}
                              {estado === "OK" && <Badge variant="outline" className="text-xs text-green-600">OK</Badge>}
                              {p.km_restantes != null && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {p.km_restantes > 0 ? `${p.km_restantes.toLocaleString()} km restantes` : `${Math.abs(p.km_restantes).toLocaleString()} km vencido`}
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {/* Nota adicional opcional para preventivo */}
                    <FormField control={form.control} name="observaciones"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-sm text-muted-foreground font-normal">
                            <FileText className="h-3.5 w-3.5" /> Nota adicional <span className="text-xs">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Ej: Incluir revisión de frenos adicional..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* CORRECTIVO: descripción del problema (obligatorio) */}
                {form.watch("tipo") === "correctivo" && (
                  <FormField control={form.control} name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Problema reportado <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3}
                            placeholder="Describe el problema: ruido en motor, fuga de aceite, frenos duros..." />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Basado en el reporte del chofer o inspección directa</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Mantenimiento
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      <FleetPartsStatus />
      <MaintenancesTable />
    </div>
  )
}

export default function MaintenancesPage() {
  return (
    <Suspense fallback={null}>
      <MaintenancesContent />
    </Suspense>
  )
}

