"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Edit, MoreHorizontal } from "lucide-react"
import { useMaintenances } from "@/hooks/useMaintenances"
import { useTechnicians } from "@/hooks/useTechnicians"
import { maintenanceService } from "@/services/maintenanceService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { configService } from "@/services/configService"

const formSchema = z.object({
  estado: z.enum(["pendiente", "en_proceso", "completado"], { message: "El estado es requerido" }),
  tecnico_id: z.string().optional(),
  partes_reparadas: z.array(z.string()).optional()
}).superRefine((data, ctx) => {
  if (data.estado === "completado" && !data.tecnico_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe asignar un técnico para completar", path: ["tecnico_id"] })
  }
})

export function MaintenancesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMaintenance, setSelectedMaintenance] = useState(null)
  const [partConfigs, setPartConfigs] = useState([])
  const { data: maintenances, isLoading: isLoadingMaintenances, isError: isErrorMaintenances, mutate } = useMaintenances()
  const { data: technicians, isLoading: isLoadingTechnicians, isError: isErrorTechnicians } = useTechnicians()

  useEffect(() => {
     configService.getConfigs().then(setPartConfigs).catch(() => {})
  }, [])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      estado: "pendiente",
      tecnico_id: "",
      partes_reparadas: [],
    },
  })

  const handleUpdateStatus = async (values) => {
    try {
      const partsArray = values.estado === "completado" ? (values.partes_reparadas || []).map(Number) : [];
      const tecnicoId = values.estado === "completado" ? parseInt(values.tecnico_id) : null;
      await maintenanceService.updateMaintenanceStatus(selectedMaintenance.id, values.estado, partsArray, tecnicoId)
      toast.success("Estado y reglas predictivas actualizados correctamente")
      setSelectedMaintenance(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEditClick = (maintenance) => {
    setSelectedMaintenance(maintenance)
    form.reset({ estado: maintenance.estado?.toLowerCase() || "pendiente", tecnico_id: maintenance.tecnico_id?.toString() || "", partes_reparadas: [] })
  }

  const getStatusBadge = (status) => {
    const variants = {
      pendiente: "warning",
      en_proceso: "info",
      completado: "success",
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const getTechnicianName = (id) => {
    if (!technicians || !id) return "No asignado"
    const tech = technicians.find(t => t.id === id)
    return tech ? tech.nombre : "No asignado"
  }

  const filteredMaintenances = maintenances?.filter((maintenance) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      maintenance.unidad_id?.toString().toLowerCase().includes(searchLower) ||
      maintenance.tipo?.toLowerCase().includes(searchLower) ||
      maintenance.observaciones?.toLowerCase().includes(searchLower)
    )
  })

  if (isLoadingMaintenances || isLoadingTechnicians) return <div>Cargando...</div>
  if (isErrorMaintenances || isErrorTechnicians) return <div>Error al cargar los datos</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar mantenimientos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead>Kilometraje</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaintenances?.map((maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell>{maintenance.unidad_id}</TableCell>
                <TableCell>{maintenance.tipo}</TableCell>
                <TableCell>{getStatusBadge(maintenance.estado)}</TableCell>
                <TableCell>{getTechnicianName(maintenance.id_tecnico)}</TableCell>
                <TableCell>{maintenance.observaciones}</TableCell>
                <TableCell>{maintenance.kilometraje_actual}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(maintenance)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Actualizar Estado
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedMaintenance} onOpenChange={() => setSelectedMaintenance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Estado del Mantenimiento</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo estado para el mantenimiento.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateStatus)} className="space-y-4">
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_proceso">En Proceso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("estado") === "completado" && (
                <FormField
                  control={form.control}
                  name="tecnico_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Técnico Responsable <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el técnico que realizó el trabajo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians?.filter(t => t.activo).map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.nombre} — {t.especialidad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("estado") === "completado" && (
                <FormField
                  control={form.control}
                  name="partes_reparadas"
                  render={({ field }) => (
                     <FormItem>
                       <div className="mb-4">
                         <FormLabel className="text-base">Piezas/Sistemas Reparados</FormLabel>
                         <p className="text-sm text-muted-foreground">
                           Selecciona los elementos mantenidos para reiniciar sus respectivos contadores de kilómetros predictivos:
                         </p>
                       </div>
                       <div className="grid grid-cols-2 gap-2 border p-4 rounded bg-slate-50 dark:bg-slate-900 overflow-y-auto max-h-40">
                         {partConfigs.map((item) => (
                           <label key={item.id} className="flex flex-row items-center space-x-3 space-y-0 cursor-pointer">
                             <input
                               type="checkbox"
                               className="h-4 w-4 rounded border-gray-300"
                               checked={field.value?.includes(String(item.id))}
                               onChange={(e) => {
                                 let updated = [...(field.value || [])];
                                 if (e.target.checked) updated.push(String(item.id));
                                 else updated = updated.filter(val => val !== String(item.id));
                                 field.onChange(updated);
                               }}
                             />
                             <span className="font-normal text-sm">{item.nombre}</span>
                           </label>
                         ))}
                       </div>
                       <FormMessage />
                     </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedMaintenance(null)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Actualizar Estado
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

