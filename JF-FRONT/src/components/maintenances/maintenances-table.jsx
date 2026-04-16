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
import { Edit, MoreHorizontal, CheckCheck, Package, Trash2, Plus, Loader2, Wrench } from "lucide-react"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { useMaintenances } from "@/hooks/useMaintenances"
import { useTechnicians } from "@/hooks/useTechnicians"
import { maintenanceService } from "@/services/maintenanceService"
import { authService } from "@/services/authService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { configService } from "@/services/configService"
import { materialService } from "@/services/materialService"

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
  const [closingMaintenance, setClosingMaintenance] = useState(null)
  const [closeObs, setCloseObs] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const [partConfigs, setPartConfigs] = useState([])

  // Materiales dialog state
  const [materialsMaintenance, setMaterialsMaintenance] = useState(null)
  const [materials, setMaterials] = useState([])
  const [catalog, setCatalog] = useState([])
  const [matLoading, setMatLoading] = useState(false)
  const [addMatId, setAddMatId] = useState("")
  const [addMatQty, setAddMatQty] = useState(1)
  const [addingMat, setAddingMat] = useState(false)

  const { data: maintenances, isLoading: isLoadingMaintenances, isError: isErrorMaintenances, mutate } = useMaintenances()
  const { data: technicians, isLoading: isLoadingTechnicians, isError: isErrorTechnicians } = useTechnicians()
  const currentUser = authService.getUser()

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

  const handleCloseMaintenance = async () => {
    if (!closingMaintenance) return
    setIsClosing(true)
    try {
      await maintenanceService.closeMaintenance(closingMaintenance.id, closeObs)
      toast.success("Mantenimiento cerrado y aprobado")
      setClosingMaintenance(null)
      setCloseObs("")
      await mutate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsClosing(false)
    }
  }

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase()
    const variants = {
      pendiente: "warning",
      en_proceso: "info",
      completado: "success",
      cerrado: "secondary",
      realizado: "success",
    }
    return <Badge variant={variants[s] ?? "outline"}>{status}</Badge>
  }

  const canClose = (estado) =>
    ["ADMIN", "ENCARGADO"].includes(currentUser?.rol) && estado?.toUpperCase() === "COMPLETADO"

  const isAdminOrEncargado = ["ADMIN", "ENCARGADO"].includes(currentUser?.rol)

  const openMaterialsDialog = async (maintenance) => {
    setMaterialsMaintenance(maintenance)
    setAddMatId("")
    setAddMatQty(1)
    setMatLoading(true)
    try {
      const [mats, cat] = await Promise.all([
        maintenanceService.getMaintenanceMaterials(maintenance.id),
        materialService.getMaterials(),
      ])
      setMaterials(Array.isArray(mats) ? mats : [])
      setCatalog(Array.isArray(cat) ? cat.filter(m => m.stock > 0) : [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setMatLoading(false)
    }
  }

  const handleAddMaterial = async () => {
    if (!addMatId || addMatQty < 1) return
    setAddingMat(true)
    try {
      const added = await maintenanceService.addMaintenanceMaterial(materialsMaintenance.id, parseInt(addMatId), addMatQty)
      setMaterials(prev => [...prev, added])
      setCatalog(prev => prev.map(m => m.id === parseInt(addMatId) ? { ...m, stock: m.stock - addMatQty } : m).filter(m => m.stock > 0))
      setAddMatId("")
      setAddMatQty(1)
      toast.success("Material agregado")
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingMat(false)
    }
  }

  const handleRemoveMaterial = async (detalleId, materialId, cantidad) => {
    try {
      await maintenanceService.removeMaintenanceMaterial(materialsMaintenance.id, detalleId)
      setMaterials(prev => prev.filter(m => m.id !== detalleId))
      setCatalog(prev => {
        const existing = prev.find(m => m.id === materialId)
        if (existing) return prev.map(m => m.id === materialId ? { ...m, stock: m.stock + cantidad } : m)
        return prev
      })
      toast.success("Material eliminado")
    } catch (err) {
      toast.error(err.message)
    }
  }

  const totalCosto = materials.reduce((sum, m) => sum + Number(m.costo_total || 0), 0)

  const getTechnicianName = (id) => {
    if (!technicians || !id) return "No asignado"
    const tech = technicians.find(t => Number(t.id) === Number(id))
    return tech ? tech.nombre : "No asignado"
  }

  const filteredMaintenances = maintenances?.filter((maintenance) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      maintenance.placa?.toLowerCase().includes(searchLower) ||
      maintenance.unidad_id?.toString().includes(searchLower) ||
      maintenance.tipo?.toLowerCase().includes(searchLower) ||
      maintenance.observaciones?.toLowerCase().includes(searchLower)
    )
  })

  if (isLoadingMaintenances || isLoadingTechnicians) {
    return <PageSkeleton rowCount={5} columnCount={7} />
  }
  if (isErrorMaintenances || isErrorTechnicians) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive text-sm">
        Error al cargar los datos de mantenimientos.
      </div>
    )
  }

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
            {filteredMaintenances?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? "Sin resultados para esa búsqueda" : "No hay mantenimientos registrados"}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {filteredMaintenances?.map((maintenance) => (
              <TableRow key={maintenance.id}>
                <TableCell>{maintenance.placa ?? maintenance.unidad_id}</TableCell>
                <TableCell className="capitalize">{maintenance.tipo?.toLowerCase()}</TableCell>
                <TableCell>{getStatusBadge(maintenance.estado)}</TableCell>
                <TableCell>{getTechnicianName(maintenance.tecnico_id ?? maintenance.id_tecnico)}</TableCell>
                <TableCell>{maintenance.observaciones}</TableCell>
                <TableCell>{maintenance.kilometraje_actual}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Abrir menú de acciones">
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {maintenance.estado?.toUpperCase() !== "CERRADO" && (
                        <DropdownMenuItem onClick={() => handleEditClick(maintenance)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Actualizar Estado
                        </DropdownMenuItem>
                      )}
                      {isAdminOrEncargado && (
                        <DropdownMenuItem onClick={() => openMaterialsDialog(maintenance)}>
                          <Package className="mr-2 h-4 w-4" />
                          Materiales usados
                        </DropdownMenuItem>
                      )}
                      {canClose(maintenance.estado) && (
                        <DropdownMenuItem
                          onClick={() => { setClosingMaintenance(maintenance); setCloseObs("") }}
                          className="text-green-700 focus:text-green-700"
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Cerrar / Aprobar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Materiales usados en el mantenimiento */}
      <Dialog open={!!materialsMaintenance} onOpenChange={(v) => { if (!v) setMaterialsMaintenance(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Materiales — {materialsMaintenance?.placa ?? materialsMaintenance?.unidad_id}
            </DialogTitle>
            <DialogDescription>
              Materiales y repuestos utilizados en este mantenimiento
            </DialogDescription>
          </DialogHeader>

          {matLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lista actual */}
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                  No se han registrado materiales para este mantenimiento.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.nombre}</TableCell>
                          <TableCell className="text-right">{m.cantidad}</TableCell>
                          <TableCell className="text-right">S/. {Number(m.precio_unitario).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">S/. {Number(m.costo_total).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMaterial(m.id, m.material_id, m.cantidad)}
                              aria-label="Eliminar material"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="font-semibold text-right">Total</TableCell>
                        <TableCell className="text-right font-bold text-base">S/. {totalCosto.toFixed(2)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Agregar material */}
              <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium">Agregar material del catálogo</p>
                <div className="flex gap-2 flex-wrap">
                  <Select value={addMatId} onValueChange={setAddMatId}>
                    <SelectTrigger className="flex-1 min-w-[180px]">
                      <SelectValue placeholder="Seleccionar material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.length === 0 ? (
                        <SelectItem value="_none" disabled>Sin stock disponible</SelectItem>
                      ) : catalog.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre} — S/. {Number(c.precio).toFixed(2)} (stock: {c.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={catalog.find(c => c.id === parseInt(addMatId))?.stock ?? 999}
                    value={addMatQty}
                    onChange={(e) => setAddMatQty(Number(e.target.value))}
                    className="w-24"
                    placeholder="Cant."
                  />
                  <Button onClick={handleAddMaterial} disabled={!addMatId || addMatQty < 1 || addingMat}>
                    {addingMat ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialsMaintenance(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cerrar / Aprobar mantenimiento */}
      <Dialog open={!!closingMaintenance} onOpenChange={() => setClosingMaintenance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar / Aprobar Mantenimiento</DialogTitle>
            <DialogDescription>
              Confirma que el trabajo en la unidad <strong>{closingMaintenance?.placa ?? closingMaintenance?.unidad_id}</strong> fue revisado y está conforme. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones del encargado (opcional)</label>
            <Textarea
              placeholder="Ej: Trabajo revisado y conforme. Se verificaron frenos y aceite."
              value={closeObs}
              onChange={(e) => setCloseObs(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingMaintenance(null)}>Cancelar</Button>
            <Button onClick={handleCloseMaintenance} disabled={isClosing}>
              {isClosing && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />}
              Cerrar y Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <SelectItem value="cerrado" disabled>Cerrado (usar botón Cerrar/Aprobar)</SelectItem>
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

