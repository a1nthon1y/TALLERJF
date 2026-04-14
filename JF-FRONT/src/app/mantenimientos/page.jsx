"use client"

import { useState, useEffect } from "react"
import { MaintenancesTable } from "@/components/maintenances/maintenances-table"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import { maintenanceService } from "@/services/maintenanceService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  observaciones: z.string().min(1, { message: "Las observaciones son requeridas" }),
  kilometraje_actual: z.number().min(0, { message: "El kilometraje no puede ser negativo" }),
  id_tecnico: z.string().min(1, { message: "El técnico es requerido" }),
})

export default function MaintenancesPage() {
  const [isCreating, setIsCreating] = useState(false)
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
      id_tecnico: "",
    },
  })

  useEffect(() => {
    if (technicians && technicians.length > 0) {
      form.setValue("id_tecnico", String(technicians[0].id))
    }
  }, [technicians])
  
  useEffect(() => {
    if (units && units.length > 0) {
      form.setValue("unidad_id", String(units[0].id))
      form.setValue("kilometraje_actual", units[0].kilometraje)
    }
  }, [units])

  const selectedUnit = units?.find((unit) => String(unit.id) === form.watch("unidad_id"))
  const kilometrajeUnidad = selectedUnit?.kilometraje ?? 0
  const unidadOperativa = selectedUnit?.estado === "operativo"

  const handleCreateMaintenance = async (values) => {
    if (!selectedUnit) {
      toast.error("Unidad no encontrada")
      return
    }

    if (unidadOperativa && values.kilometraje_actual <= kilometrajeUnidad) {
      toast.error(`El kilometraje ingresado debe ser mayor al actual (${kilometrajeUnidad} km)`)
      return
    }

    try {
      await maintenanceService.createMaintenance(values)
      toast.success("Mantenimiento creado correctamente")
      setIsCreating(false)
      form.reset()
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoadingMaintenances || isLoadingTechnicians || isLoadingUnits) return <div>Cargando...</div>
  if (isErrorMaintenances || isErrorTechnicians || isErrorUnits) return <div>Error al cargar los datos</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mantenimientos</h1>
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
                  name="id_tecnico"
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

                <FormField
                  control={form.control}
                  name="observaciones"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observaciones</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa las observaciones" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
      <MaintenancesTable />
    </div>
  )
}

