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
import { Edit, MoreHorizontal, CheckCheck, Package, Trash2, Plus, Loader2, Wrench, AlertCircle, Play, ClipboardCheck } from "lucide-react"
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
import { getPartsStatus } from "@/services/unitsService"

// Transiciones permitidas por estado actual (forward-only)
const TRANSICIONES_VALIDAS = {
  PENDIENTE:  ["PENDIENTE", "EN_PROCESO", "COMPLETADO"],
  EN_PROCESO: ["EN_PROCESO", "COMPLETADO"],
  COMPLETADO: ["COMPLETADO"], // estado no cambia vía Edit; solo via Cerrar/Aprobar
}

const editSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROCESO", "COMPLETADO"]),
  tecnico_id: z.string().optional(),
  nota_adicional: z.string().optional(),
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
  const [closeMaterials, setCloseMaterials] = useState([])
  const [closeMatsLoading, setCloseMatsLoading] = useState(false)

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

  // Dialog: Completar mantenimiento (dedicado)
  const [completingMaintenance, setCompletingMaintenance] = useState(null)
  const [compMaterials, setCompMaterials] = useState([])
  const [compCatalog, setCompCatalog] = useState([])
  const [compMatLoading, setCompMatLoading] = useState(false)
  const [compAddMatId, setCompAddMatId] = useState("")
  const [compAddMatQty, setCompAddMatQty] = useState(1)
  const [compAddingMat, setCompAddingMat] = useState(false)
  const [compPartes, setCompPartes] = useState([])           // partes que SÍ se repararon
  const [compUnitParts, setCompUnitParts] = useState([])     // partes de la unidad con estado actual
  const [compNota, setCompNota] = useState("")
  const [compTecnicoId, setCompTecnicoId] = useState("")
  const [isCompleting, setIsCompleting] = useState(false)

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
    const est = maintenance.estado?.toUpperCase()
    const estadoNorm = est === "REALIZADO" ? "COMPLETADO" : (["PENDIENTE","EN_PROCESO","COMPLETADO"].includes(est) ? est : "PENDIENTE")
    editForm.reset({
      estado: estadoNorm,
      tecnico_id: maintenance.tecnico_id?.toString() || "NONE",
      nota_adicional: "",
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
        nota_adicional: values.nota_adicional || "",
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

  // Avance rápido de estado sin abrir el dialog de edición
  const quickAdvance = async (maintenance, nuevoEstado) => {
    if (!maintenance.tecnico_id && !maintenance.tecnico_nombre && nuevoEstado !== "PENDIENTE") {
      toast.error("Asigna un técnico antes de iniciar el trabajo", { description: "Usa Editar para asignarlo." })
      return
    }
    try {
      await maintenanceService.editMaintenance(maintenance.id, {
        estado: nuevoEstado,
        tecnico_id: maintenance.tecnico_id ?? null,
        observaciones: maintenance.observaciones ?? "",
        partes_reparadas: [],
      })
      toast.success(`Estado cambiado a ${nuevoEstado === "EN_PROCESO" ? "En Proceso" : nuevoEstado}`)
      await mutate()
    } catch (error) {
      toast.error(error.message)
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
      setCloseMaterials([])
      await mutate()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsClosing(false)
    }
  }

  const openCloseDialog = (maintenance) => {
    setClosingMaintenance(maintenance)
    setCloseObs("")
    setCloseMaterials([])
    setCloseMatsLoading(true)
    maintenanceService.getMaintenanceMaterials(maintenance.id)
      .then(setCloseMaterials)
      .catch(() => setCloseMaterials([]))
      .finally(() => setCloseMatsLoading(false))
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

  const openCompleteDialog = async (maintenance) => {
    setCompletingMaintenance(maintenance)
    setCompPartes([])
    setCompUnitParts([])
    setCompNota("")
    setCompAddMatId("")
    setCompAddMatQty(1)
    setCompTecnicoId(maintenance.tecnico_id?.toString() || "")
    setCompMatLoading(true)
    try {
      const fetches = [
        maintenanceService.getMaintenanceMaterials(maintenance.id),
        materialService.getMaterials(),
      ]
      // Para preventivo: cargar partes de la unidad para pre-selección contextual
      if (maintenance.tipo?.toUpperCase() === "PREVENTIVO" && maintenance.unidad_id) {
        fetches.push(getPartsStatus(maintenance.unidad_id).catch(() => []))
      }
      const [mats, cat, partsStatus] = await Promise.all(fetches)
      setCompMaterials(Array.isArray(mats) ? mats : [])
      setCompCatalog(Array.isArray(cat) ? cat.filter(m => m.stock > 0) : [])

      if (partsStatus) {
        const partes = Array.isArray(partsStatus) ? partsStatus : (partsStatus?.partes || [])
        setCompUnitParts(partes)
        // Pre-seleccionar partes críticas y de advertencia (las que motivaron el mantenimiento)
        const preSelected = partes
          .filter(p => ["CRITICO","ADVERTENCIA"].includes(p.estado?.toUpperCase()))
          .map(p => String(p.configuracion_parte_id || p.id))
        setCompPartes(preSelected)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCompMatLoading(false)
    }
  }

  const handleCompAddMaterial = async () => {
    if (!compAddMatId || compAddMatQty < 1 || !completingMaintenance) return
    setCompAddingMat(true)
    try {
      const added = await maintenanceService.addMaintenanceMaterial(completingMaintenance.id, parseInt(compAddMatId), compAddMatQty)
      setCompMaterials(prev => [...prev, added])
      setCompCatalog(prev => prev.map(c => c.id === parseInt(compAddMatId) ? { ...c, stock: c.stock - compAddMatQty } : c).filter(c => c.stock > 0))
      setCompAddMatId("")
      setCompAddMatQty(1)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCompAddingMat(false)
    }
  }

  const handleCompRemoveMaterial = async (detalleId, materialId, cantidad) => {
    if (!completingMaintenance) return
    try {
      await maintenanceService.removeMaintenanceMaterial(completingMaintenance.id, detalleId)
      setCompMaterials(prev => prev.filter(m => m.id !== detalleId))
      setCompCatalog(prev => prev.map(c => c.id === materialId ? { ...c, stock: c.stock + cantidad } : c))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCompleteSubmit = async () => {
    if (!completingMaintenance) return
    const tecId = compTecnicoId || completingMaintenance.tecnico_id?.toString()
    if (!tecId || tecId === "NONE") {
      toast.error("El técnico es obligatorio para marcar como completado")
      return
    }
    setIsCompleting(true)
    try {
      await maintenanceService.editMaintenance(completingMaintenance.id, {
        estado: "COMPLETADO",
        tecnico_id: parseInt(tecId),
        nota_adicional: compNota || "",
        partes_reparadas: compPartes.map(Number),
      })
      toast.success("Mantenimiento marcado como Completado")
      setCompletingMaintenance(null)
      await mutate()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsCompleting(false)
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
      estadoFilter === "TODOS" ||
      (estadoFilter === "SIN_TECNICO"
        ? maintenance.estado?.toUpperCase() === "PENDIENTE" && !maintenance.tecnico_id && !maintenance.tecnico_nombre
        : maintenance.estado?.toUpperCase() === estadoFilter)
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

  // Banner: solicitudes sin técnico (pendientes sin asignar — generalmente del chofer)
  const sinTecnico = (maintenances || []).filter(
    m => m.estado?.toUpperCase() === "PENDIENTE" && !m.tecnico_id && !m.tecnico_nombre
  )

  // Banner de pendientes de aprobación
  const pendientesAprobacion = (maintenances || []).filter(m => m.estado?.toUpperCase() === "COMPLETADO")

  return (
    <div className="space-y-4">
      {/* Banner: solicitudes sin técnico asignado (del chofer o sin gestionar) */}
      {isAdminOrEncargado && sinTecnico.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                {sinTecnico.length} solicitud{sinTecnico.length > 1 ? "es" : ""} sin técnico asignado
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                {sinTecnico.map(m => m.placa || m.codigo).join(", ")} — asigna un técnico e inicia el proceso
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline"
            className="shrink-0 border-blue-400 text-blue-700 hover:bg-blue-100"
            onClick={() => setEstadoFilter("SIN_TECNICO")}>
            Ver solicitudes
          </Button>
        </div>
      )}

      {/* Banner: pendientes de aprobación (solo admin/encargado) */}
      {isAdminOrEncargado && pendientesAprobacion.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {pendientesAprobacion.length} trabajo{pendientesAprobacion.length > 1 ? "s" : ""} pendiente{pendientesAprobacion.length > 1 ? "s" : ""} de aprobación
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {pendientesAprobacion.map(m => m.placa || m.codigo).join(", ")}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={() => setEstadoFilter("COMPLETADO")}>
            Ver pendientes
          </Button>
        </div>
      )}

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
            {sinTecnico.length > 0 && (
              <SelectItem value="SIN_TECNICO">
                Sin técnico ({sinTecnico.length})
              </SelectItem>
            )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEstadoFilter("TODOS"); setTipoFilter("TODOS"); setSearchTerm("") }}
          >
            Ver todos
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead className="hidden lg:table-cell">Observaciones</TableHead>
              <TableHead className="hidden md:table-cell">Kilometraje</TableHead>
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
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                    {maintenance.codigo ?? `#${maintenance.id}`}
                  </code>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{maintenance.placa ?? `U-${maintenance.unidad_id}`}</p>
                    {maintenance.modelo && <p className="text-xs text-muted-foreground">{maintenance.modelo}</p>}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{maintenance.tipo?.toLowerCase()}</TableCell>
                <TableCell>{getStatusBadge(maintenance.estado)}</TableCell>
                <TableCell>
                  {maintenance.tecnico_nombre ?? getTechnicianName(maintenance.tecnico_id) ?? (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Sin asignar
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[180px] hidden lg:table-cell">
                  <p className="text-xs text-muted-foreground line-clamp-2" title={maintenance.observaciones}>
                    {maintenance.observaciones || "—"}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{maintenance.kilometraje_actual?.toLocaleString() ?? "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Abrir menú de acciones">
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* ── Acción principal según estado actual ── */}
                      {isAdminOrEncargado && maintenance.estado?.toUpperCase() === "PENDIENTE" && (
                        <DropdownMenuItem
                          onClick={() => quickAdvance(maintenance, "EN_PROCESO")}
                          className="text-blue-700 focus:text-blue-700 font-medium"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Iniciar trabajo
                        </DropdownMenuItem>
                      )}
                      {isAdminOrEncargado && ["EN_PROCESO", "PENDIENTE"].includes(maintenance.estado?.toUpperCase()) && (
                        <DropdownMenuItem
                          onClick={() => openCompleteDialog(maintenance)}
                          className="text-emerald-700 focus:text-emerald-700 font-medium"
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Completar trabajo
                        </DropdownMenuItem>
                      )}
                      {canClose(maintenance.estado) && (
                        <DropdownMenuItem
                          onClick={() => openCloseDialog(maintenance)}
                          className="text-green-700 focus:text-green-700 font-medium"
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Cerrar / Aprobar
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {/* ── Acciones secundarias ── */}
                      {isAdminOrEncargado && maintenance.estado?.toUpperCase() !== "CERRADO" && (
                        <DropdownMenuItem onClick={() => openEditDialog(maintenance)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar detalles
                        </DropdownMenuItem>
                      )}
                      {isAdminOrEncargado && (
                        <DropdownMenuItem onClick={() => openMaterialsDialog(maintenance)}>
                          <Package className="mr-2 h-4 w-4" />
                          Materiales usados
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

          {(() => {
            const matEstado = materialsMaintenance?.estado?.toUpperCase()
            const matReadonly = ['COMPLETADO', 'CERRADO'].includes(matEstado)
            return matLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Aviso solo lectura */}
                {matReadonly && (
                  <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <CheckCheck className="h-4 w-4 shrink-0" />
                    Registro cerrado — el mantenimiento está en estado <strong className="ml-1">{matEstado}</strong>
                  </div>
                )}

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
                          {!matReadonly && <TableHead className="w-[40px]" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materials.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.nombre}</TableCell>
                            <TableCell className="text-right">{m.cantidad}</TableCell>
                            <TableCell className="text-right">S/. {Number(m.precio_unitario).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">S/. {Number(m.costo_total).toFixed(2)}</TableCell>
                            {!matReadonly && (
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
                            )}
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={matReadonly ? 3 : 3} className="font-semibold text-right">Total</TableCell>
                          <TableCell className="text-right font-bold text-base">S/. {totalCosto.toFixed(2)}</TableCell>
                          {!matReadonly && <TableCell />}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Agregar material — solo si no está cerrado */}
                {!matReadonly && (
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
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialsMaintenance(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Completar mantenimiento */}
      <Dialog open={!!completingMaintenance} onOpenChange={(v) => { if (!v) setCompletingMaintenance(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" /> Completar Mantenimiento
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              {completingMaintenance?.codigo && (
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{completingMaintenance.codigo}</code>
              )}
              <span>{completingMaintenance?.placa}</span>
              <span>·</span>
              <span className="capitalize">{completingMaintenance?.tipo?.toLowerCase()}</span>
            </DialogDescription>
          </DialogHeader>

          {compMatLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Técnico — obligatorio si no está asignado */}
              {(!completingMaintenance?.tecnico_id && !completingMaintenance?.tecnico_nombre) && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-destructive">Técnico responsable <span className="text-destructive">*</span></p>
                  <Select value={compTecnicoId} onValueChange={setCompTecnicoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el técnico que realizó el trabajo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians?.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre} — {t.especialidad || t.rol || "Técnico"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Materiales registrados */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Materiales utilizados</p>
                {compMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-md py-3 text-center">
                    No hay materiales registrados aún
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[40px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compMaterials.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.nombre}</TableCell>
                            <TableCell className="text-right">{m.cantidad}</TableCell>
                            <TableCell className="text-right">S/. {Number(m.costo_total).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={() => handleCompRemoveMaterial(m.id, m.material_id, m.cantidad)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={2} className="font-semibold text-right">Total materiales</TableCell>
                          <TableCell className="text-right font-bold">
                            S/. {compMaterials.reduce((s, m) => s + Number(m.costo_total), 0).toFixed(2)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Agregar material adicional */}
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground">Agregar material adicional</p>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={compAddMatId} onValueChange={setCompAddMatId}>
                      <SelectTrigger className="flex-1 min-w-[160px]">
                        <SelectValue placeholder="Seleccionar material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {compCatalog.length === 0
                          ? <SelectItem value="_none" disabled>Sin stock disponible</SelectItem>
                          : compCatalog.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nombre} — S/. {Number(c.precio).toFixed(2)} (stock: {c.stock})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} value={compAddMatQty}
                      onChange={(e) => setCompAddMatQty(Number(e.target.value))}
                      className="w-20" placeholder="Cant." />
                    <Button size="sm" onClick={handleCompAddMaterial}
                      disabled={!compAddMatId || compAddMatQty < 1 || compAddingMat}>
                      {compAddingMat ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Partes/Sistemas reparados */}
              {(() => {
                // Para preventivo: usar partes de la unidad con su estado actual
                // Para correctivo: usar catálogo general de configuracion_partes
                const esPreventivo = completingMaintenance?.tipo?.toUpperCase() === "PREVENTIVO"
                const listPartes = esPreventivo && compUnitParts.length > 0 ? compUnitParts : partConfigs

                if (listPartes.length === 0) return null

                return (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Piezas/Sistemas reparados</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {esPreventivo
                          ? "Marca lo que sí se atendió. Desmarca lo que quedó pendiente."
                          : "Selecciona las partes atendidas para reiniciar contadores predictivos"}
                      </p>
                    </div>
                    <div className="border rounded-md divide-y">
                      {listPartes.map((p) => {
                        const pid = String(p.configuracion_parte_id || p.id)
                        const nombre = p.nombre || p.parte_nombre
                        const estado = p.estado?.toUpperCase()
                        const checked = compPartes.includes(pid)
                        return (
                          <label key={pid} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 ${checked ? "bg-emerald-50 dark:bg-emerald-950/20" : ""}`}>
                            <input type="checkbox" className="rounded accent-emerald-600" checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...compPartes, pid]
                                  : compPartes.filter(x => x !== pid)
                                setCompPartes(next)
                                // Auto-generar nota si hay partes sin completar
                                if (esPreventivo) {
                                  const pendientes = listPartes
                                    .filter(lp => !next.includes(String(lp.configuracion_parte_id || lp.id)))
                                    .map(lp => lp.nombre || lp.parte_nombre)
                                    .filter(Boolean)
                                  if (pendientes.length > 0) {
                                    setCompNota(`Pendiente por completar: ${pendientes.join(", ")}`)
                                  } else {
                                    setCompNota("")
                                  }
                                }
                              }}
                            />
                            <span className="flex-1 text-sm font-medium">{nombre}</span>
                            {estado === "CRITICO"     && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Crítico</Badge>}
                            {estado === "ADVERTENCIA" && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Alerta</Badge>}
                            {estado === "OK"          && <Badge variant="outline" className="text-xs">OK</Badge>}
                            {p.km_restantes != null && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {p.km_restantes > 0 ? `${Number(p.km_restantes).toLocaleString()} km rest.` : `${Math.abs(p.km_restantes).toLocaleString()} km vencido`}
                              </span>
                            )}
                            {p.umbral_km && !p.km_restantes && (
                              <span className="text-xs text-muted-foreground">{Number(p.umbral_km).toLocaleString()} km</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                    {esPreventivo && compPartes.length < listPartes.length && compPartes.length > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠ {listPartes.length - compPartes.length} parte(s) sin marcar — se registrarán como pendientes en las notas
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Nota del encargado */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Nota de cierre del trabajo <span className="text-muted-foreground font-normal">(opcional)</span></p>
                <Textarea value={compNota} onChange={(e) => setCompNota(e.target.value)}
                  rows={2} placeholder="Ej: Trabajo realizado correctamente. Se reemplazaron filtros..." />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingMaintenance(null)}>Cancelar</Button>
            <Button onClick={handleCompleteSubmit} disabled={isCompleting || compMatLoading}
              className="bg-emerald-600 hover:bg-emerald-700">
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
              Marcar como Completado
            </Button>
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
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              {editingMaintenance?.codigo && (
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  {editingMaintenance.codigo}
                </code>
              )}
              <span>
                Unidad <strong>{editingMaintenance?.placa ?? `U-${editingMaintenance?.unidad_id}`}</strong>
                {" · "}{editingMaintenance?.tipo?.toLowerCase()}
                {editingMaintenance?.kilometraje_actual && (
                  <> · {editingMaintenance.kilometraje_actual.toLocaleString()} km</>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">

              {/* Estado — solo se puede avanzar, nunca retroceder */}
              {(() => {
                const estadoActual = editingMaintenance?.estado?.toUpperCase()
                // COMPLETADO no puede cambiar estado desde edición (solo via Cerrar/Aprobar)
                if (estadoActual === "COMPLETADO") return (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Estado</p>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                      {getStatusBadge("COMPLETADO")}
                      <span className="text-xs text-muted-foreground ml-1">— usa "Cerrar / Aprobar" para finalizar</span>
                    </div>
                  </div>
                )
                const opciones = TRANSICIONES_VALIDAS[estadoActual] ?? ["PENDIENTE"]
                return (
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
                            {opciones.includes("PENDIENTE") && <SelectItem value="PENDIENTE">Pendiente</SelectItem>}
                            {opciones.includes("EN_PROCESO") && <SelectItem value="EN_PROCESO">En Proceso</SelectItem>}
                            {opciones.includes("COMPLETADO") && <SelectItem value="COMPLETADO">Completado (trabajo realizado)</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )
              })()}

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

              {/* Historial de notas (solo lectura) */}
              {editingMaintenance?.observaciones && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Historial de notas</p>
                  <div className="rounded-md border bg-muted/50 px-3 py-2 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                      {editingMaintenance.observaciones}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground">Solo lectura — el historial no se puede modificar</p>
                </div>
              )}

              {/* Agregar nota adicional (se agrega al historial, no reemplaza) */}
              <FormField
                control={editForm.control}
                name="nota_adicional"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agregar nota</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="Escribe una nota adicional (opcional)..."
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Se añadirá al historial de notas</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Partes reparadas — al completar */}
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
      <Dialog open={!!closingMaintenance} onOpenChange={() => { setClosingMaintenance(null); setCloseMaterials([]) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
              Cerrar / Aprobar Mantenimiento
            </DialogTitle>
            <DialogDescription>
              Revisa el trabajo en <strong>{closingMaintenance?.placa ?? closingMaintenance?.unidad_id}</strong>{" "}
              <span className="font-mono text-xs">{closingMaintenance?.codigo}</span> y confirma que está conforme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Materiales usados por el técnico */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <Package className="h-4 w-4" /> Materiales registrados por el técnico
              </p>
              {closeMatsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                </div>
              ) : closeMaterials.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sin materiales registrados</p>
              ) : (
                <div className="space-y-1 bg-muted/30 rounded-md p-2">
                  {closeMaterials.map((m) => (
                    <div key={m.id} className="flex justify-between text-xs">
                      <span>{m.nombre} × {m.cantidad}</span>
                      <span className="font-medium">S/ {Number(m.costo_total).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                    <span>Total materiales</span>
                    <span>S/ {closeMaterials.reduce((s, m) => s + Number(m.costo_total), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notas de cierre */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Observaciones del encargado (opcional)</label>
              <Textarea
                placeholder="Ej: Trabajo revisado y conforme. Se verificaron frenos y aceite."
                value={closeObs}
                onChange={(e) => setCloseObs(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingMaintenance(null)}>Cancelar</Button>
            <Button onClick={handleCloseMaintenance} disabled={isClosing} className="bg-green-600 hover:bg-green-700">
              {isClosing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCheck className="h-4 w-4 mr-2" />
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

