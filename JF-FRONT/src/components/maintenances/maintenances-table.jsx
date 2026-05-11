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
  DropdownMenuSeparator,
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

const editSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROCESO", "COMPLETADO"]),
  tecnico_id: z.string().optional(),
  observaciones: z.string().optional(),
  partes_reparadas: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.estado === "COMPLETADO" && (!data.tecnico_id || data.tecnico_id === "NONE")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El técnico es obligatorio al completar", path: ["tecnico_id"] })
  }
})

export function MaintenancesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("TODOS")
  const [tipoFilter, setTipoFilter] = useState("TODOS")
  // Editar unificado
  const [editingMaintenance, setEditingMaintenance] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [partConfigs, setPartConfigs] = useState([])

  // Cerrar / Aprobar
  const [closingMaintenance, setClosingMaintenance] = useState(null)
  const [closeObs, setCloseObs] = useState("")
  const [isClosing, setIsClosing] = useState(false)

  // Eliminar
  const [deletingMaintenance, setDeletingMaintenance] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      estado: "PENDIENTE",
      tecnico_id: "NONE",
      observaciones: "",
      partes_reparadas: [],
    },
  })

  const openEditDialog = (maintenance) => {
    setEditingMaintenance(maintenance)
    editForm.reset({
      estado: maintenance.estado?.toUpperCase() === "REALIZADO" ? "COMPLETADO" : (maintenance.estado?.toUpperCase() || "PENDIENTE"),
      tecnico_id: maintenance.tecnico_id?.toString() || "NONE",
      observaciones: maintenance.observaciones || "",
      partes_reparadas: [],
    })
  }

  const handleEditSubmit = async (values) => {
    if (!editingMaintenance) return
    setIsSaving(true)
    try {
      const partes = values.estado === "COMPLETADO" ? (values.partes_reparadas || []).map(Number) : []
      await maintenanceService.editMaintenance(editingMaintenance.id, {
        estado: values.estado,
        tecnico_id: (values.tecnico_id && values.tecnico_id !== "NONE") ? parseInt(values.tecnico_id) : null,
        observaciones: values.observaciones,
        partes_reparadas: partes,
      })
      toast.success("Mantenimiento actualizado correctamente")
      setEditingMaintenance(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMaintenance = async () => {
    if (!deletingMaintenance) return
    setIsDeleting(true)
    try {
      await maintenanceService.deleteMaintenance(deletingMaintenance.id)
      toast.success("Mantenimiento eliminado")
      setDeletingMaintenance(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
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
    const s = status?.toUpperCase()
    if (s === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Completado</Badge>
    if (s === "REALIZADO")  return <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">En Campo</Badge>
    if (s === "CERRADO")    return <Badge variant="secondary" className="text-xs">Cerrado</Badge>
    if (s === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">En Proceso</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Pendiente</Badge>
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
    const matchSearch =
      !searchTerm ||
      maintenance.placa?.toLowerCase().includes(searchLower) ||
      maintenance.modelo?.toLowerCase().includes(searchLower) ||
      maintenance.tipo?.toLowerCase().includes(searchLower) ||
      maintenance.observaciones?.toLowerCase().includes(searchLower) ||
      maintenance.tecnico_nombre?.toLowerCase().includes(searchLower)
    const matchEstado =
      estadoFilter === "TODOS" || maintenance.estado?.toUpperCase() === estadoFilter
    const matchTipo =
      tipoFilter === "TODOS" || maintenance.tipo?.toUpperCase() === tipoFilter
    return matchSearch && matchEstado && matchTipo
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

  // Contadores para badges de filtro
  const pendientes = maintenances?.filter((m) => m.estado === "PENDIENTE").length ?? 0
  const enProceso  = maintenances?.filter((m) => m.estado === "EN_PROCESO").length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por placa, técnico, observaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">
              Pendiente {pendientes > 0 ? `(${pendientes})` : ""}
            </SelectItem>
            <SelectItem value="EN_PROCESO">
              En Proceso {enProceso > 0 ? `(${enProceso})` : ""}
            </SelectItem>
            <SelectItem value="COMPLETADO">Completado</SelectItem>
            <SelectItem value="REALIZADO">En Campo</SelectItem>
            <SelectItem value="CERRADO">Cerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
            <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
          </SelectContent>
        </Select>
        {(estadoFilter !== "TODOS" || tipoFilter !== "TODOS" || searchTerm) && (
          <button
            onClick={() => { setEstadoFilter("TODOS"); setTipoFilter("TODOS"); setSearchTerm("") }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpiar filtros
          </button>
        )}
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
                <TableCell>
                  <div>
                    <p className="font-medium">{maintenance.placa ?? `U-${maintenance.unidad_id}`}</p>
                    {maintenance.modelo && <p className="text-xs text-muted-foreground">{maintenance.modelo}</p>}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{maintenance.tipo?.toLowerCase()}</TableCell>
                <TableCell>{getStatusBadge(maintenance.estado)}</TableCell>
                <TableCell>
                  {maintenance.tecnico_nombre ?? getTechnicianName(maintenance.tecnico_id ?? maintenance.id_tecnico)}
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <p className="text-xs text-muted-foreground line-clamp-2" title={maintenance.observaciones}>
                    {maintenance.observaciones || "—"}
                  </p>
                </TableCell>
                <TableCell>{maintenance.kilometraje_actual?.toLocaleString() ?? "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Abrir menú de acciones">
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Editar — formulario unificado (no CERRADO) */}
                      {isAdminOrEncargado && maintenance.estado?.toUpperCase() !== "CERRADO" && (
                        <DropdownMenuItem onClick={() => openEditDialog(maintenance)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
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
                      {/* Eliminar — solo ADMIN, solo PENDIENTE */}
                      {currentUser?.rol === "ADMIN" && maintenance.estado?.toUpperCase() === "PENDIENTE" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingMaintenance(maintenance)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
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

      {/* Dialog: Editar mantenimiento (formulario unificado) */}
      <Dialog open={!!editingMaintenance} onOpenChange={(v) => { if (!v) setEditingMaintenance(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" /> Editar Mantenimiento
            </DialogTitle>
            <DialogDescription>
              Unidad <strong>{editingMaintenance?.placa ?? `U-${editingMaintenance?.unidad_id}`}</strong>
              {" · "}{editingMaintenance?.tipo?.toLowerCase()}
              {editingMaintenance?.kilometraje_actual && (
                <> · {editingMaintenance.kilometraje_actual.toLocaleString()} km</>
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">

              {/* Estado — solo si no es REALIZADO (en campo no se puede cambiar estado retroactivo) */}
              {editingMaintenance?.estado?.toUpperCase() !== "REALIZADO" && (
                <FormField
                  control={editForm.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                          <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                          <SelectItem value="COMPLETADO">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Técnico */}
              <FormField
                control={editForm.control}
                name="tecnico_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Técnico asignado
                      {editForm.watch("estado") === "COMPLETADO" && (
                        <span className="text-destructive"> *</span>
                      )}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Sin asignar</SelectItem>
                        {technicians?.filter(t => t.activo).map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.nombre} {t.apellido ?? ""} — {t.especialidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observaciones */}
              <FormField
                control={editForm.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Describe el problema o las acciones a realizar..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Partes reparadas — solo al completar */}
              {editForm.watch("estado") === "COMPLETADO" && (
                <FormField
                  control={editForm.control}
                  name="partes_reparadas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Piezas/Sistemas reparados</FormLabel>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Selecciona las partes atendidas para reiniciar sus contadores predictivos
                      </p>
                      <div className="grid grid-cols-2 gap-2 border p-3 rounded-md bg-muted/30 max-h-40 overflow-y-auto">
                        {partConfigs.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={field.value?.includes(String(item.id))}
                              onChange={(e) => {
                                let updated = [...(field.value || [])]
                                if (e.target.checked) updated.push(String(item.id))
                                else updated = updated.filter(v => v !== String(item.id))
                                field.onChange(updated)
                              }}
                            />
                            {item.nombre}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingMaintenance(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
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

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={!!deletingMaintenance} onOpenChange={(v) => { if (!v) setDeletingMaintenance(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar mantenimiento?</DialogTitle>
            <DialogDescription>
              Se eliminará el mantenimiento <strong>PENDIENTE</strong> de la unidad{" "}
              <strong>{deletingMaintenance?.placa}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMaintenance(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteMaintenance} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

