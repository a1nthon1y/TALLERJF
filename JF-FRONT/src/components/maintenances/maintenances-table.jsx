"use client"

import { useState } from "react"
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

const formSchema = z.object({
  estado: z.enum(["pendiente", "en_proceso", "completado"], { message: "El estado es requerido" }),
})

export function MaintenancesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMaintenance, setSelectedMaintenance] = useState(null)
  const { data: maintenances, isLoading: isLoadingMaintenances, isError: isErrorMaintenances, mutate } = useMaintenances()
  const { data: technicians, isLoading: isLoadingTechnicians, isError: isErrorTechnicians } = useTechnicians()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      estado: "pendiente",
    },
  })

  const handleUpdateStatus = async (values) => {
    try {
      await maintenanceService.updateMaintenanceStatus(selectedMaintenance.id, values.estado)
      toast.success("Estado actualizado correctamente")
      setSelectedMaintenance(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEditClick = (maintenance) => {
    setSelectedMaintenance(maintenance)
    form.reset({ estado: maintenance.estado })
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
    if (!technicians) return "No asignado"
    const tech = technicians.find(t => t.id === id)
    return tech ? tech.name : "No asignado"
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

