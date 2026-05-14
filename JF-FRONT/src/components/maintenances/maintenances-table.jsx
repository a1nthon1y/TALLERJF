"use client"

import { useState, useEffect, useRef } from "react"
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
import { Edit, MoreHorizontal, CheckCheck, Package, Trash2, Plus, Loader2, Wrench, AlertCircle, Play, ClipboardCheck, FileText, LayoutGrid, List, Eye, Calendar, Gauge, User, ClipboardList } from "lucide-react"
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

// Transiciones permitidas por estado actual
// Encargado: forward-only (flujo estricto)
// Admin: libre (puede retroceder para corregir errores)
const TRANSICIONES_ENCARGADO = {
  PENDIENTE:  ["PENDIENTE", "EN_PROCESO", "COMPLETADO"],
  EN_PROCESO: ["EN_PROCESO", "COMPLETADO"],
  COMPLETADO: ["COMPLETADO"],
}
const TRANSICIONES_ADMIN = {
  PENDIENTE:  ["PENDIENTE", "EN_PROCESO", "COMPLETADO"],
  EN_PROCESO: ["PENDIENTE", "EN_PROCESO", "COMPLETADO"],
  COMPLETADO: ["PENDIENTE", "EN_PROCESO", "COMPLETADO"],
}

const editSchema = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROCESO", "COMPLETADO"]),
  tecnico_id: z.string().optional(),
  nota_adicional: z.string().max(1000, { message: "Máximo 1000 caracteres." }).optional(),
  partes_reparadas: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.estado === "COMPLETADO" && (!data.tecnico_id || data.tecnico_id === "NONE")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El técnico es obligatorio al completar", path: ["tecnico_id"] })
  }
})

// Schemas para los sub-diálogos de la tabla (single source of truth de validación)
const addMaterialSchema = z.object({
  material_id: z.string().min(1, { message: "Selecciona un material." }),
  cantidad: z.coerce
    .number({ invalid_type_error: "La cantidad debe ser un número." })
    .positive({ message: "La cantidad debe ser mayor a 0." })
    .max(99999, { message: "Cantidad demasiado alta." }),
})

const completeSchema = z.object({
  tecnico_id: z
    .string()
    .min(1, { message: "El técnico es obligatorio para marcar como completado." })
    .refine((v) => v !== "NONE", { message: "Selecciona un técnico válido." }),
  materiales_count: z
    .number()
    .int()
    .min(1, { message: "Debes registrar al menos un material antes de completar." }),
  nota_adicional: z.string().max(1000, { message: "Máximo 1000 caracteres." }).optional().or(z.literal("")),
})

const closeSchema = z.object({
  observaciones: z.string().max(1000, { message: "Máximo 1000 caracteres." }).optional().or(z.literal("")),
})

export function MaintenancesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("TODOS")
  const [tipoFilter, setTipoFilter] = useState("TODOS")
  const [viewMode, setViewMode] = useState("kanban") // "tabla" | "kanban"
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

  // Ver detalles (solo lectura — disponible para cualquier estado)
  const [detailMaintenance, setDetailMaintenance] = useState(null)
  const [detailMaterials, setDetailMaterials] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Materiales dialog state
  const [materialsMaintenance, setMaterialsMaintenance] = useState(null)
  const [materials, setMaterials] = useState([])
  const [catalog, setCatalog] = useState([])
  const [matLoading, setMatLoading] = useState(false)
  const [addMatId, setAddMatId] = useState("")
  const [addMatQty, setAddMatQty] = useState(1)
  const [addingMat, setAddingMat] = useState(false)
  const [addMatErrors, setAddMatErrors] = useState({})

  // Errores del cierre/aprobación
  const [closeErrors, setCloseErrors] = useState({})

  // Errores del completar
  const [compErrors, setCompErrors] = useState({})

  // Partes en el dialog de Editar
  const [editPartes, setEditPartesState] = useState([])
  const editPartesRef = useRef([])
  const setEditPartes = (val) => {
    const next = typeof val === "function" ? val(editPartesRef.current) : val
    editPartesRef.current = next
    setEditPartesState(next)
  }
  const [editUnitParts, setEditUnitParts] = useState([])
  const [editUnitPartsLoading, setEditUnitPartsLoading] = useState(false)

  // Dialog: Completar mantenimiento (dedicado)
  const [completingMaintenance, setCompletingMaintenance] = useState(null)
  const [compMaterials, setCompMaterials] = useState([])
  const [compCatalog, setCompCatalog] = useState([])
  const [compMatLoading, setCompMatLoading] = useState(false)
  const [compAddMatId, setCompAddMatId] = useState("")
  const [compAddMatQty, setCompAddMatQty] = useState(1)
  const [compAddingMat, setCompAddingMat] = useState(false)
  // Compra externa: pieza adquirida fuera del catalogo interno (urgencia, no en stock).
  // El sub-dialog opera sobre `externalTarget` { mantenimientoId, onAdded } para
  // poder abrirse desde varios contextos (Completar / Materiales usados).
  const [externalTarget, setExternalTarget] = useState(null)
  const [compExternalSubmitting, setCompExternalSubmitting] = useState(false)
  const [compExternal, setCompExternal] = useState({
    nombre: "", precio_unit: "", cantidad_usada: 1, cantidad_comprada: 1, descripcion: "",
  })
  const resetCompExternal = () => setCompExternal({
    nombre: "", precio_unit: "", cantidad_usada: 1, cantidad_comprada: 1, descripcion: "",
  })
  const openExternalDialog = (mantenimientoId, onAdded) => {
    resetCompExternal()
    setExternalTarget({ mantenimientoId, onAdded })
  }
  const closeExternalDialog = () => {
    setExternalTarget(null)
    resetCompExternal()
  }
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
      nota_adicional: "",
      partes_reparadas: [],
    },
  })

  const openEditDialog = async (maintenance) => {
    setEditingMaintenance(maintenance)
    setEditUnitParts([])
    setEditPartes([])

    const est = maintenance.estado?.toUpperCase()
    const estadoNorm = est === "REALIZADO" ? "COMPLETADO" : (["PENDIENTE","EN_PROCESO","COMPLETADO"].includes(est) ? est : "PENDIENTE")
    editForm.reset({
      estado: estadoNorm,
      tecnico_id: maintenance.tecnico_id?.toString() || "NONE",
      nota_adicional: "",
      partes_reparadas: [],
    })

    // Traer el mantenimiento fresco desde el servidor para tener partes_programadas actualizadas
    let prog = maintenance.partes_programadas
    try {
      const fresh = await maintenanceService.getMaintenanceById(maintenance.id)
      if (fresh) prog = fresh.partes_programadas
    } catch (_) { /* usa los datos en memoria si falla */ }

    // Parsing defensivo: puede venir como string JSON si el driver no parsea JSONB automáticamente
    if (typeof prog === "string") { try { prog = JSON.parse(prog) } catch (_) { prog = [] } }
    setEditPartes(Array.isArray(prog) && prog.length > 0 ? prog.map(String) : [])

    // Cargar estado real de partes si es preventivo
    if (maintenance.tipo?.toUpperCase() === "PREVENTIVO" && maintenance.unidad_id) {
      setEditUnitPartsLoading(true)
      getPartsStatus(maintenance.unidad_id)
        .then(data => {
          const partes = Array.isArray(data) ? data : (data?.partes || [])
          setEditUnitParts(partes)
          // Si no había partes programadas, pre-seleccionar críticas/advertencia
          if (!Array.isArray(prog) || prog.length === 0) {
            const alertas = partes.filter(p => ["CRITICO","ADVERTENCIA"].includes(p.estado?.toUpperCase()))
            setEditPartes(alertas.map(p => String(p.id || p.configuracion_parte_id)))
          }
        })
        .catch(() => setEditUnitParts([]))
        .finally(() => setEditUnitPartsLoading(false))
    }
  }

  const handleEditSubmit = async (values) => {
    if (!editingMaintenance) return
    setIsSaving(true)
    try {
      const isPreventivo = editingMaintenance.tipo?.toUpperCase() === "PREVENTIVO"
      const estadoOriginal = editingMaintenance.estado?.toUpperCase()
      // Si el mantenimiento ya estaba COMPLETADO, las partes están congeladas
      // (los contadores ya fueron reseteados; cambiarlas acá los desincroniza).
      // El admin puede rebobinar el estado, pero en esa misma transición no
      // permitimos editar la lista de partes — debe rehacer el flujo via Completar.
      const partesCongeladas = estadoOriginal === "COMPLETADO"

      // Partes a enviar:
      // - Si están congeladas: NO mandar partes_programadas (el backend usará el COALESCE
      //   y las dejará intactas). Tampoco partes_reparadas (no re-reseteamos contadores).
      // - Si están editables: mandar el array actual del editor.
      const partesAtender = isPreventivo && !partesCongeladas
        ? editPartesRef.current.map(Number)
        : null
      const partesReparadas = values.estado === "COMPLETADO" && !partesCongeladas
        ? (partesAtender ?? [])
        : []

      await maintenanceService.editMaintenance(editingMaintenance.id, {
        estado: values.estado,
        tecnico_id: (values.tecnico_id && values.tecnico_id !== "NONE") ? parseInt(values.tecnico_id) : null,
        nota_adicional: values.nota_adicional || "",
        partes_reparadas: partesReparadas,
        partes_programadas: partesAtender ?? undefined,
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

  // Avance rápido de estado sin abrir el dialog de edición.
  // Chequea solo `tecnico_id` (la fuente de verdad). `tecnico_nombre` viene del JOIN
  // y puede ser null si el técnico fue desasignado/eliminado, lo que generaría un
  // falso bloqueo aunque el `tecnico_id` siga seteado.
  const quickAdvance = async (maintenance, nuevoEstado) => {
    if (!maintenance.tecnico_id && nuevoEstado !== "PENDIENTE") {
      toast.error("Asigna un técnico antes de iniciar el trabajo", { description: "Usa Editar para asignarlo." })
      return
    }
    try {
      await maintenanceService.editMaintenance(maintenance.id, {
        estado: nuevoEstado,
        tecnico_id: maintenance.tecnico_id ?? null,
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
    const parsed = closeSchema.safeParse({ observaciones: closeObs })
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      setCloseErrors({ observaciones: flat.fieldErrors.observaciones?.[0] })
      toast.error(flat.fieldErrors.observaciones?.[0] || "Hay errores en el formulario.")
      return
    }
    setCloseErrors({})
    setIsClosing(true)
    try {
      await maintenanceService.closeMaintenance(closingMaintenance.id, closeObs)
      toast.success("Mantenimiento cerrado y aprobado")
      setClosingMaintenance(null)
      setCloseObs("")
      setCloseMaterials([])
      await mutate()
    } catch (error) {
      toast.error(error.message || "Error al cerrar el mantenimiento.")
    } finally {
      setIsClosing(false)
    }
  }

  const openCloseDialog = (maintenance) => {
    setClosingMaintenance(maintenance)
    setCloseObs("")
    setCloseErrors({})
    setCloseMaterials([])
    setCloseMatsLoading(true)
    maintenanceService.getMaintenanceMaterials(maintenance.id)
      .then(setCloseMaterials)
      .catch(() => setCloseMaterials([]))
      .finally(() => setCloseMatsLoading(false))
  }

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase()
    if (s === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs font-semibold">Completado</Badge>
    if (s === "REALIZADO")  return <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-xs font-semibold" title="Trabajo correctivo resuelto por el chofer durante la ruta">Resuelto en ruta</Badge>
    if (s === "CERRADO")    return <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold">Cerrado</Badge>
    if (s === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-semibold">En Proceso</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-semibold">Pendiente</Badge>
  }

  // Tinte sutil de fila según estado — facilita el escaneo visual sin distraer
  const getRowClass = (status) => {
    const s = status?.toUpperCase()
    if (s === "COMPLETADO") return "bg-green-50/40 dark:bg-green-950/10"
    if (s === "REALIZADO")  return "bg-purple-50/40 dark:bg-purple-950/10"
    if (s === "CERRADO")    return "bg-slate-50/60 dark:bg-slate-900/20 opacity-75"
    if (s === "EN_PROCESO") return "bg-blue-50/40 dark:bg-blue-950/10"
    return "" // PENDIENTE: fondo neutral
  }

  // Color del tipo (preventivo = ámbar/programado, correctivo = rojo/urgente)
  const getTipoBadge = (tipo) => {
    if (tipo?.toUpperCase() === "PREVENTIVO")
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-300 text-xs">Preventivo</Badge>
    return <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">Correctivo</Badge>
  }

  const canClose = (estado) =>
    ["ADMIN", "ENCARGADO"].includes(currentUser?.rol) && estado?.toUpperCase() === "COMPLETADO"

  const isAdminOrEncargado = ["ADMIN", "ENCARGADO"].includes(currentUser?.rol)

  const openDetailDialog = async (maintenance) => {
    setDetailMaintenance(maintenance)
    setDetailMaterials([])
    setDetailLoading(true)
    try {
      const mats = await maintenanceService.getMaintenanceMaterials(maintenance.id)
      setDetailMaterials(Array.isArray(mats) ? mats : [])
    } catch { /* no bloquea */ } finally {
      setDetailLoading(false)
    }
  }

  const openMaterialsDialog = async (maintenance) => {
    setMaterialsMaintenance(maintenance)
    setAddMatId("")
    setAddMatQty(1)
    setAddMatErrors({})
    setMatLoading(true)
    try {
      const [mats, cat] = await Promise.all([
        maintenanceService.getMaintenanceMaterials(maintenance.id),
        materialService.getMaterials(),
      ])
      setMaterials(Array.isArray(mats) ? mats : [])
      // Solo materiales activos y con stock disponible — desactivados quedan
      // congelados aunque les quede stock (regla de negocio: si está inactivo
      // no se puede agregar a más mantenimientos hasta reactivarlo).
      setCatalog(Array.isArray(cat) ? cat.filter(m => m.activo !== false && m.stock > 0 && !m.es_externo) : [])
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
    setCompErrors({})
    setCompTecnicoId(maintenance.tecnico_id?.toString() || "")
    setCompMatLoading(true)
    try {
      const fetches = [
        maintenanceService.getMaintenanceMaterials(maintenance.id),
        materialService.getMaterials(),
        // Traer el mantenimiento fresco desde el servidor para tener partes_programadas actualizadas
        maintenanceService.getMaintenanceById(maintenance.id).catch(() => null),
      ]
      // Para preventivo: cargar partes de la unidad para pre-selección contextual
      if (maintenance.tipo?.toUpperCase() === "PREVENTIVO" && maintenance.unidad_id) {
        fetches.push(getPartsStatus(maintenance.unidad_id).catch(() => []))
      }
      const [mats, cat, freshMaint, partsStatus] = await Promise.all(fetches)
      setCompMaterials(Array.isArray(mats) ? mats : [])
      setCompCatalog(Array.isArray(cat) ? cat.filter(m => m.activo !== false && m.stock > 0 && !m.es_externo) : [])

      if (partsStatus) {
        const partes = Array.isArray(partsStatus) ? partsStatus : (partsStatus?.partes || [])
        setCompUnitParts(partes)
      }

      // Usar partes_programadas del registro fresco (no del objeto en memoria)
      let programadas = freshMaint?.partes_programadas ?? maintenance.partes_programadas
      if (typeof programadas === "string") { try { programadas = JSON.parse(programadas) } catch (_) { programadas = [] } }
      if (Array.isArray(programadas) && programadas.length > 0) {
        setCompPartes(programadas.map(String))
      } else if (partsStatus) {
        const partes = Array.isArray(partsStatus) ? partsStatus : (partsStatus?.partes || [])
        const alertIds = partes
          .filter(p => ["CRITICO","ADVERTENCIA"].includes(p.estado?.toUpperCase()))
          .map(p => String(p.configuracion_parte_id)).filter(Boolean)
        setCompPartes(alertIds)
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

  // Registra una compra externa para el `externalTarget` actual.
  // Si sobra (comprada > usada), el sobrante entra al stock del material
  // (creado o reusado por el backend) — la respuesta lo confirma con
  // `sobrante_a_stock` para mostrar feedback al usuario.
  // El callback `onAdded` se ejecuta para que el caller actualice su lista local.
  const handleCompAddExternal = async () => {
    if (!externalTarget) return
    const nombre = compExternal.nombre.trim()
    const precio = Number(compExternal.precio_unit)
    const usada = Number(compExternal.cantidad_usada)
    const comprada = Number(compExternal.cantidad_comprada || compExternal.cantidad_usada)

    if (!nombre) return toast.error("Indica el nombre de la pieza.")
    if (!Number.isFinite(precio) || precio < 0) return toast.error("El costo unitario debe ser un número ≥ 0.")
    if (!Number.isFinite(usada) || usada <= 0) return toast.error("La cantidad usada debe ser mayor a 0.")
    if (!Number.isFinite(comprada) || comprada < usada) return toast.error("La cantidad comprada debe ser ≥ la usada.")

    setCompExternalSubmitting(true)
    try {
      const added = await maintenanceService.addExternalMaterial(externalTarget.mantenimientoId, {
        nombre,
        precio_unit: precio,
        cantidad_usada: usada,
        cantidad_comprada: comprada,
        descripcion: compExternal.descripcion?.trim() || undefined,
      })
      const sobrante = Number(added?.sobrante_a_stock || 0)
      // El caller decide cómo refrescar su lista local
      externalTarget.onAdded?.(added)
      toast.success(
        sobrante > 0
          ? `Compra externa registrada. ${sobrante} unidad(es) sobrante(s) entraron al stock.`
          : "Compra externa registrada"
      )
      // Refrescar catálogo regular por si el material externo creado/actualizado
      // ahora aparece con stock disponible para futuros usos.
      try {
        const cat = await materialService.getMaterials()
        setCompCatalog((cat || []).filter((m) => m.activo !== false && Number(m.stock) > 0 && !m.es_externo))
      } catch { /* no bloqueante */ }
      closeExternalDialog()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCompExternalSubmitting(false)
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
    const tecId = compTecnicoId || completingMaintenance.tecnico_id?.toString() || ""
    const parsed = completeSchema.safeParse({
      tecnico_id: tecId,
      materiales_count: compMaterials.length,
      nota_adicional: compNota,
    })
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const fieldErrors = {
        tecnico_id: flat.fieldErrors.tecnico_id?.[0],
        materiales_count: flat.fieldErrors.materiales_count?.[0],
        nota_adicional: flat.fieldErrors.nota_adicional?.[0],
      }
      setCompErrors(fieldErrors)
      toast.error(Object.values(fieldErrors).find(Boolean) || "Hay errores en el formulario.")
      return
    }
    setCompErrors({})
    const esPreventivo = completingMaintenance.tipo?.toUpperCase() === "PREVENTIVO"
    setIsCompleting(true)
    try {
      const payload = {
        estado: "COMPLETADO",
        tecnico_id: parseInt(tecId),
        nota_adicional: compNota || "",
      }
      // Solo el preventivo trabaja con partes predictivas (consistente con el form de creación).
      if (esPreventivo) {
        payload.partes_reparadas = compPartes.map(Number)
        payload.partes_programadas = compPartes.map(Number)
      }
      await maintenanceService.editMaintenance(completingMaintenance.id, payload)
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
    const parsed = addMaterialSchema.safeParse({ material_id: addMatId, cantidad: addMatQty })
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const fieldErrors = {
        material_id: flat.fieldErrors.material_id?.[0],
        cantidad: flat.fieldErrors.cantidad?.[0],
      }
      setAddMatErrors(fieldErrors)
      toast.error(Object.values(fieldErrors).find(Boolean) || "Hay errores en el formulario.")
      return
    }
    // Validación adicional contra el stock disponible (regla de negocio dinámica)
    const stockDisponible = catalog.find(c => c.id === parseInt(addMatId))?.stock ?? 0
    if (addMatQty > stockDisponible) {
      const msg = `Solo hay ${stockDisponible} unidades disponibles en stock.`
      setAddMatErrors({ cantidad: msg })
      toast.error(msg)
      return
    }
    setAddMatErrors({})
    setAddingMat(true)
    try {
      const added = await maintenanceService.addMaintenanceMaterial(materialsMaintenance.id, parseInt(addMatId), addMatQty)
      setMaterials(prev => [...prev, added])
      setCatalog(prev => prev.map(m => m.id === parseInt(addMatId) ? { ...m, stock: m.stock - addMatQty } : m).filter(m => m.stock > 0))
      setAddMatId("")
      setAddMatQty(1)
      toast.success("Material agregado")
    } catch (err) {
      toast.error(err.message || "Error al agregar el material.")
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

  // ── Kanban: variables calculadas aquí para no usar IIFE en JSX ──
  // REALIZADO es un estado terminal acumulativo (como CERRADO). Se muestra
  // aparte como columna colapsable con máximo REALIZADO_VISIBLE items para
  // que no domine el tablero a medida que crece el historial.
  const REALIZADO_VISIBLE = 5
  const KANBAN_COLS = [
    { key: "PENDIENTE",  label: "Pendiente",  headerCls: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20",  dotCls: "bg-yellow-400", countCls: "bg-yellow-100 text-yellow-800" },
    { key: "EN_PROCESO", label: "En Proceso",  headerCls: "bg-blue-50 border-blue-300 dark:bg-blue-950/20",       dotCls: "bg-blue-500",   countCls: "bg-blue-100 text-blue-800" },
    { key: "COMPLETADO", label: "Completado",  headerCls: "bg-green-50 border-green-300 dark:bg-green-950/20",    dotCls: "bg-green-500",  countCls: "bg-green-100 text-green-800" },
  ]
  const cerradosCount = (maintenances ?? []).filter(m => m.estado?.toUpperCase() === "CERRADO").length
  const kanbanBase = (maintenances ?? []).filter((m) => {
    const sl = searchTerm.toLowerCase()
    const matchSearch = !searchTerm ||
      m.placa?.toLowerCase().includes(sl) ||
      m.modelo?.toLowerCase().includes(sl) ||
      m.tipo?.toLowerCase().includes(sl) ||
      m.observaciones?.toLowerCase().includes(sl) ||
      m.tecnico_nombre?.toLowerCase().includes(sl)
    const matchTipo = tipoFilter === "TODOS" || m.tipo?.toUpperCase() === tipoFilter
    return matchSearch && matchTipo
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
      {/* Banner: solicitudes sin técnico — color amarillo = PENDIENTE (coherente con badge) */}
      {isAdminOrEncargado && sinTecnico.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                {sinTecnico.length} solicitud{sinTecnico.length > 1 ? "es" : ""} sin técnico asignado
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {sinTecnico.map(m => m.placa || m.codigo).join(", ")} — asigna un técnico e inicia el proceso
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline"
            className="shrink-0 border-yellow-400 text-yellow-700 hover:bg-yellow-100"
            onClick={() => setEstadoFilter("SIN_TECNICO")}>
            Ver solicitudes
          </Button>
        </div>
      )}

      {/* Banner: pendientes de aprobación — color verde = COMPLETADO (coherente con badge) */}
      {isAdminOrEncargado && pendientesAprobacion.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                {pendientesAprobacion.length} trabajo{pendientesAprobacion.length > 1 ? "s" : ""} pendiente{pendientesAprobacion.length > 1 ? "s" : ""} de aprobación
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {pendientesAprobacion.map(m => m.placa || m.codigo).join(", ")}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 border-green-400 text-green-700 hover:bg-green-100"
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
        {viewMode === "tabla" && (
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
              <SelectItem value="REALIZADO">Resuelto en ruta</SelectItem>
              <SelectItem value="CERRADO">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        )}
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
        {/* Toggle vista */}
        <div className="ml-auto flex items-center rounded-md border bg-muted p-0.5 gap-0.5">
          <Button
            variant={viewMode === "tabla" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 gap-1.5"
            onClick={() => setViewMode("tabla")}
            title="Vista tabla"
          >
            <List className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Tabla</span>
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 gap-1.5"
            onClick={() => setViewMode("kanban")}
            title="Vista kanban"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Kanban</span>
          </Button>
        </div>
      </div>
      {/* ─── Vista Kanban ─── */}
      {viewMode === "kanban" && (
        <div className="flex flex-col gap-3">
          {/* Columnas de flujo activo: Pendiente / En Proceso / Completado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
            {KANBAN_COLS.map(({ key, label, headerCls, dotCls, countCls }) => {
              const colItems = kanbanBase.filter(m => m.estado?.toUpperCase() === key)
              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${headerCls}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotCls}`} />
                      <span className="text-xs font-semibold truncate">{label}</span>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${countCls}`}>
                      {colItems.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[80px]">
                    {colItems.length === 0 && (
                      <div className="flex items-center justify-center h-16 rounded-lg border border-dashed text-xs text-muted-foreground">
                        Sin registros
                      </div>
                    )}
                    {colItems.map((maintenance) => (
                      <div
                        key={maintenance.id}
                        className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{maintenance.placa ?? `U-${maintenance.unidad_id}`}</p>
                            {maintenance.modelo && (
                              <p className="text-xs text-muted-foreground truncate">{maintenance.modelo}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0 shrink-0" aria-label="Acciones">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Ver detalles — primera opción en estados finales */}
                              {["CERRADO", "REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
                                <DropdownMenuItem onClick={() => openDetailDialog(maintenance)} className="font-medium">
                                  <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalles
                                </DropdownMenuItem>
                              )}
                              {isAdminOrEncargado && maintenance.estado?.toUpperCase() === "PENDIENTE" && (
                                <DropdownMenuItem onClick={() => quickAdvance(maintenance, "EN_PROCESO")} className="text-blue-700 focus:text-blue-700 font-medium">
                                  <Play className="mr-2 h-3.5 w-3.5" /> Iniciar trabajo
                                </DropdownMenuItem>
                              )}
                              {isAdminOrEncargado && maintenance.estado?.toUpperCase() === "EN_PROCESO" && (
                                <DropdownMenuItem onClick={() => openCompleteDialog(maintenance)} className="text-emerald-700 focus:text-emerald-700 font-medium">
                                  <ClipboardCheck className="mr-2 h-3.5 w-3.5" /> Completar trabajo
                                </DropdownMenuItem>
                              )}
                              {canClose(maintenance.estado) && (
                                <DropdownMenuItem onClick={() => openCloseDialog(maintenance)} className="text-green-700 focus:text-green-700 font-medium">
                                  <CheckCheck className="mr-2 h-3.5 w-3.5" /> Cerrar / Aprobar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {isAdminOrEncargado && !["CERRADO","REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
                                <DropdownMenuItem onClick={() => openEditDialog(maintenance)}>
                                  <Edit className="mr-2 h-3.5 w-3.5" /> Editar detalles
                                </DropdownMenuItem>
                              )}
                              {isAdminOrEncargado && (
                                <DropdownMenuItem onClick={() => openMaterialsDialog(maintenance)}>
                                  <Package className="mr-2 h-3.5 w-3.5" /> Materiales usados
                                </DropdownMenuItem>
                              )}
                              {!["CERRADO", "REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
                                <DropdownMenuItem onClick={() => openDetailDialog(maintenance)}>
                                  <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalles
                                </DropdownMenuItem>
                              )}
                              {currentUser?.rol === "ADMIN" && maintenance.estado?.toUpperCase() === "PENDIENTE" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeletingMaintenance(maintenance)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getTipoBadge(maintenance.tipo)}
                          {maintenance.tecnico_nombre
                            ? <span className="text-xs text-muted-foreground truncate">{maintenance.tecnico_nombre}</span>
                            : <span className="text-xs text-yellow-600 font-medium flex items-center gap-0.5"><AlertCircle className="h-3 w-3" />Sin asignar</span>
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground">
                            {maintenance.codigo ?? `#${maintenance.id}`}
                          </code>
                          {maintenance.fecha_solicitud && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(maintenance.fecha_solicitud).toLocaleDateString("es-PE")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {/* ── Resuelto en ruta: historial acumulativo, colapsable ── */}
          {(() => {
            const realizadoAll = kanbanBase
              .filter(m => m.estado?.toUpperCase() === "REALIZADO")
              .sort((a, b) => new Date(b.fecha_solicitud ?? 0) - new Date(a.fecha_solicitud ?? 0))
            const realizadoVisible = realizadoAll.slice(0, REALIZADO_VISIBLE)
            const realizadoExtra  = realizadoAll.length - realizadoVisible.length
            if (realizadoAll.length === 0) return null
            return (
              <div className="rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/10 p-3 space-y-2">
                {/* Cabecera de la sección */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                      Resuelto en ruta
                    </span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {realizadoAll.length}
                    </span>
                    <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 hidden sm:inline">
                      · fallas cerradas por el chofer en campo
                    </span>
                  </div>
                  <button
                    className="text-xs text-purple-700 dark:text-purple-300 underline underline-offset-2 hover:no-underline"
                    onClick={() => { setViewMode("tabla"); setEstadoFilter("REALIZADO") }}
                  >
                    Ver todos en tabla
                  </button>
                </div>

                {/* Grilla horizontal de tarjetas (máx REALIZADO_VISIBLE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                  {realizadoVisible.map((maintenance) => (
                    <div
                      key={maintenance.id}
                      className="rounded-lg border border-purple-200 dark:border-purple-800/50 bg-card p-3 shadow-sm flex flex-col gap-2 opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{maintenance.placa ?? `U-${maintenance.unidad_id}`}</p>
                        {maintenance.modelo && (
                          <p className="text-xs text-muted-foreground truncate">{maintenance.modelo}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTipoBadge(maintenance.tipo)}
                        {maintenance.tecnico_nombre && (
                          <span className="text-xs text-muted-foreground truncate">{maintenance.tecnico_nombre}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground">
                          {maintenance.codigo ?? `#${maintenance.id}`}
                        </code>
                        {maintenance.fecha_solicitud && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(maintenance.fecha_solicitud).toLocaleDateString("es-PE")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enlace a "X más" si hay más del límite */}
                {realizadoExtra > 0 && (
                  <button
                    className="text-xs text-purple-700 dark:text-purple-300 underline underline-offset-2 hover:no-underline"
                    onClick={() => { setViewMode("tabla"); setEstadoFilter("REALIZADO") }}
                  >
                    + {realizadoExtra} más — ver todos en tabla
                  </button>
                )}
              </div>
            )
          })()}

          {/* Nota de cerrados */}
          {cerradosCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
              <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
              <span>
                {cerradosCount} mantenimiento{cerradosCount !== 1 ? "s" : ""} cerrado{cerradosCount !== 1 ? "s" : ""} no se muestran aquí —
              </span>
              <button
                className="text-primary underline underline-offset-2 hover:no-underline"
                onClick={() => { setViewMode("tabla"); setEstadoFilter("CERRADO") }}
              >
                ver en tabla
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Vista Tabla ─── */}
      {viewMode === "tabla" && <div className="rounded-md border">
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
                <TableCell colSpan={8} className="py-12 text-center">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? "Sin resultados para esa búsqueda" : "No hay mantenimientos registrados"}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {filteredMaintenances?.map((maintenance) => (
              <TableRow key={maintenance.id} className={getRowClass(maintenance.estado)}>
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
                <TableCell>{getTipoBadge(maintenance.tipo)}</TableCell>
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
                      {/* ── Ver detalles — siempre visible, primera opción en estados finales ── */}
                      {["CERRADO", "REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
                        <DropdownMenuItem onClick={() => openDetailDialog(maintenance)} className="font-medium">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                      )}

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
                      {isAdminOrEncargado && maintenance.estado?.toUpperCase() === "EN_PROCESO" && (
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
                      {/* REALIZADO y CERRADO son estados finales: no se editan */}
                      {isAdminOrEncargado &&
                        !["CERRADO", "REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
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
                      {/* En estados no finales, detalles disponible también */}
                      {!["CERRADO", "REALIZADO"].includes(maintenance.estado?.toUpperCase()) && (
                        <DropdownMenuItem onClick={() => openDetailDialog(maintenance)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
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
      </div>}

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
            // REALIZADO también es read-only: el trabajo se cerró al registrarse desde llegada.
            const matReadonly = ['COMPLETADO', 'CERRADO', 'REALIZADO'].includes(matEstado)
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{m.nombre}</span>
                                {m.es_externo && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" title="Pieza comprada fuera del stock interno">
                                    Externo
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
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
                          <TableCell colSpan={3} className="font-semibold text-right">Total</TableCell>
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
                    <div className="flex gap-2 flex-wrap items-start">
                      <div className="flex-1 min-w-[180px] space-y-1">
                        <Select
                          value={addMatId}
                          onValueChange={(v) => { setAddMatId(v); setAddMatErrors((e) => ({ ...e, material_id: undefined })) }}
                        >
                          <SelectTrigger className="w-full" aria-invalid={!!addMatErrors.material_id}>
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
                        {addMatErrors.material_id && (
                          <p className="text-xs text-destructive">{addMatErrors.material_id}</p>
                        )}
                      </div>
                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          min={1}
                          max={catalog.find(c => c.id === parseInt(addMatId))?.stock ?? 999}
                          value={addMatQty}
                          onChange={(e) => {
                            setAddMatQty(e.target.value === "" ? "" : Number(e.target.value))
                            setAddMatErrors((er) => ({ ...er, cantidad: undefined }))
                          }}
                          placeholder="Cant."
                          aria-invalid={!!addMatErrors.cantidad}
                        />
                        {addMatErrors.cantidad && (
                          <p className="text-xs text-destructive">{addMatErrors.cantidad}</p>
                        )}
                      </div>
                      <Button onClick={handleAddMaterial} disabled={addingMat}>
                        {addingMat ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Compra externa (paralelo al de catálogo) — disponible solo
                    cuando el mantenimiento permite editar materiales. */}
                {!matReadonly && (
                  <div className="border rounded-md p-3 bg-orange-50/40 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/50">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
                          ¿La pieza no está en el stock?
                        </p>
                        <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80 mt-0.5">
                          Registra una compra externa: indica nombre, costo y cantidad. El sobrante entra al stock.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 shrink-0"
                        onClick={() => openExternalDialog(
                          materialsMaintenance.id,
                          (added) => setMaterials((prev) => [...prev, added])
                        )}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Compra externa
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
                  <Select
                    value={compTecnicoId}
                    onValueChange={(v) => { setCompTecnicoId(v); setCompErrors((e) => ({ ...e, tecnico_id: undefined })) }}
                  >
                    <SelectTrigger aria-invalid={!!compErrors.tecnico_id}>
                      <SelectValue placeholder="Selecciona el técnico que realizó el trabajo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(technicians ?? [])
                        .filter((t) => t.activo !== false || String(t.id) === String(compTecnicoId))
                        .map((t) => {
                          const inactivo = t.activo === false
                          return (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.nombre} — {t.especialidad || t.rol || "Técnico"}
                              {inactivo ? " (inactivo)" : ""}
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                  {compErrors.tecnico_id && (
                    <p className="text-xs text-destructive">{compErrors.tecnico_id}</p>
                  )}
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{m.nombre}</span>
                                {m.es_externo && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" title="Pieza comprada fuera del stock interno">
                                    Externo
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
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

                {/* Agregar material adicional (catálogo) */}
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <p className="text-xs font-medium text-muted-foreground">Del catálogo (stock interno)</p>
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

                {/* Compra externa: pieza adquirida fuera del stock */}
                <div className="border rounded-md p-3 bg-orange-50/40 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/50">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
                        ¿La pieza no está en el stock?
                      </p>
                      <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80 mt-0.5">
                        Registra una compra externa: indica nombre, costo y cantidad.
                        El sobrante se suma automáticamente al stock para futuros trabajos.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 shrink-0"
                      onClick={() => openExternalDialog(
                        completingMaintenance.id,
                        (added) => setCompMaterials((prev) => [...prev, added])
                      )}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Compra externa
                    </Button>
                  </div>
                </div>
              </div>

              {/* CORRECTIVO: mostrar el problema reportado en read-only para contexto.
                  Coherente con el form de creación, donde correctivo solo recoge la descripción
                  del problema (sin partes predictivas). */}
              {completingMaintenance?.tipo?.toUpperCase() === "CORRECTIVO" && completingMaintenance?.observaciones && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-600" /> Problema reportado
                  </p>
                  <div className="rounded-md border bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {completingMaintenance.observaciones.split(/\n\n--- /)[0]}
                  </div>
                </div>
              )}

              {/* PREVENTIVO: Partes/Sistemas reparados (solo aplica a preventivo,
                  el correctivo no usa partes predictivas — ver page.jsx, partes_programadas: []).

                  Filtro `activo` (Bug #19): solo se muestran reglas activas para esta unidad
                  + las que estaban en partes_programadas pero ahora están inactivas
                  (para no romper trabajos ya planificados). Las inactivas se marcan
                  visualmente con badge "Inactiva". */}
              {completingMaintenance?.tipo?.toUpperCase() === "PREVENTIVO" && (() => {
                const activasMap = {}
                compUnitParts.forEach(p => {
                  const k = String(p.configuracion_parte_id || p.id)
                  activasMap[k] = p
                })

                const partesInactivasEnPlan = compPartes
                  .filter(pid => !activasMap[String(pid)])
                  .map(pid => {
                    const cfg = partConfigs.find(c => String(c.id) === String(pid))
                    return cfg ? { ...cfg, configuracion_parte_id: cfg.id, _inactiva: true } : null
                  })
                  .filter(Boolean)

                const partesAMostrar = [
                  ...compUnitParts.map(p => ({ ...p, _inactiva: false })),
                  ...partesInactivasEnPlan,
                ]

                if (partesAMostrar.length === 0) return null

                return (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Piezas/Sistemas reparados</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Las marcadas son las que tenían alerta. Desmarca lo que quedó pendiente o agrega extras.
                      </p>
                    </div>
                    <div className="border rounded-md divide-y">
                      {partesAMostrar.map((p) => {
                        const pid = String(p.configuracion_parte_id || p.id)
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
                                const pendientes = partesAMostrar
                                  .filter(pc => !next.includes(String(pc.configuracion_parte_id || pc.id)))
                                  .map(pc => pc.nombre).filter(Boolean)
                                setCompNota(pendientes.length > 0 ? `Pendiente por completar: ${pendientes.join(", ")}` : "")
                              }}
                            />
                            <span className="flex-1 text-sm font-medium">{p.nombre}</span>
                            {p._inactiva && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed" title="Esta regla fue desactivada después de programar el mantenimiento">
                                Regla inactiva
                              </Badge>
                            )}
                            {!p._inactiva && estado === "CRITICO"     && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Crítico</Badge>}
                            {!p._inactiva && estado === "ADVERTENCIA" && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Alerta</Badge>}
                            {!p._inactiva && estado === "OK"          && <Badge variant="outline" className="text-xs text-green-600">OK</Badge>}
                            {!p._inactiva && p.km_restantes != null && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {p.km_restantes > 0
                                  ? `${Number(p.km_restantes).toLocaleString()} km rest.`
                                  : `${Math.abs(p.km_restantes).toLocaleString()} km vencido`}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                    {compPartes.length < partesAMostrar.length && compPartes.length > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠ Hay partes sin marcar — se anotarán como pendientes
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Nota del encargado */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Nota de cierre del trabajo <span className="text-muted-foreground font-normal">(opcional)</span></p>
                <Textarea
                  value={compNota}
                  onChange={(e) => { setCompNota(e.target.value); setCompErrors((er) => ({ ...er, nota_adicional: undefined })) }}
                  rows={2}
                  maxLength={1000}
                  placeholder="Ej: Trabajo realizado correctamente. Se reemplazaron filtros..."
                  aria-invalid={!!compErrors.nota_adicional}
                />
                {compErrors.nota_adicional && (
                  <p className="text-xs text-destructive">{compErrors.nota_adicional}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {(compErrors.materiales_count || (compMaterials.length === 0 && !compMatLoading)) && (
              <p className="text-xs text-destructive flex items-center gap-1 mr-auto">
                <AlertCircle className="h-3.5 w-3.5" />
                {compErrors.materiales_count || "Registra al menos un material para continuar"}
              </p>
            )}
            <Button variant="outline" onClick={() => setCompletingMaintenance(null)}>Cancelar</Button>
            <Button onClick={handleCompleteSubmit}
              disabled={isCompleting || compMatLoading || compMaterials.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
              Marcar como Completado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Compra externa (pieza adquirida fuera del stock interno) */}
      <Dialog open={!!externalTarget} onOpenChange={(v) => { if (!v) closeExternalDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              Registrar compra externa
            </DialogTitle>
            <DialogDescription>
              Pieza adquirida fuera del stock del taller. El sobrante (si lo hay) se sumará al inventario para futuros trabajos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre de la pieza *</label>
              <Input
                placeholder="Ej: Faro delantero LED, Sensor MAP, Manguera radiador..."
                value={compExternal.nombre}
                onChange={(e) => setCompExternal((s) => ({ ...s, nombre: e.target.value }))}
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">
                Si ya registraste esta misma pieza antes como externa, se reutilizará el catálogo (no se duplica).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Costo unitario (S/.) *</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ej: 45.50"
                value={compExternal.precio_unit}
                onChange={(e) => setCompExternal((s) => ({ ...s, precio_unit: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cantidad usada *</label>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={compExternal.cantidad_usada}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0
                    setCompExternal((s) => ({
                      ...s,
                      cantidad_usada: v,
                      // Si la "comprada" estaba sincronizada con la usada, sigue acompañando
                      cantidad_comprada: Number(s.cantidad_comprada) < v ? v : s.cantidad_comprada,
                    }))
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cantidad comprada</label>
                <Input
                  type="number"
                  min={Number(compExternal.cantidad_usada) || 1}
                  step="1"
                  value={compExternal.cantidad_comprada}
                  onChange={(e) => setCompExternal((s) => ({ ...s, cantidad_comprada: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Resumen de impacto */}
            {(() => {
              const usada = Number(compExternal.cantidad_usada) || 0
              const comprada = Number(compExternal.cantidad_comprada) || 0
              const precio = Number(compExternal.precio_unit) || 0
              const sobrante = Math.max(0, comprada - usada)
              const costoMant = precio * usada
              if (usada <= 0 || precio < 0) return null
              return (
                <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo cargado al mantenimiento:</span>
                    <span className="font-mono font-semibold">S/. {costoMant.toFixed(2)}</span>
                  </div>
                  {sobrante > 0 && (
                    <div className="flex justify-between text-green-700 dark:text-green-400">
                      <span>Sobrante al stock:</span>
                      <span className="font-mono font-semibold">+{sobrante} unidad(es)</span>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Notas <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Textarea
                placeholder="Marca, proveedor, motivo de la compra externa..."
                rows={2}
                maxLength={400}
                value={compExternal.descripcion}
                onChange={(e) => setCompExternal((s) => ({ ...s, descripcion: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeExternalDialog} disabled={compExternalSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCompAddExternal} disabled={compExternalSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {compExternalSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar mantenimiento (formulario unificado) */}
      <Dialog open={!!editingMaintenance} onOpenChange={(v) => { if (!v) setEditingMaintenance(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Estado — Encargado: forward-only · Admin: libre (puede corregir) */}
              {(() => {
                const estadoActual = editingMaintenance?.estado?.toUpperCase()
                const isAdmin = currentUser?.rol === "ADMIN"
                const matriz = isAdmin ? TRANSICIONES_ADMIN : TRANSICIONES_ENCARGADO
                // Encargado en COMPLETADO solo puede usar Cerrar/Aprobar; admin sí puede corregir
                if (estadoActual === "COMPLETADO" && !isAdmin) return (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Estado</p>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                      {getStatusBadge("COMPLETADO")}
                      <span className="text-xs text-muted-foreground ml-1">— usa "Cerrar / Aprobar" para finalizar</span>
                    </div>
                  </div>
                )
                // Garantía de robustez: el estado actual SIEMPRE debe ser una opción
                // visible (aunque la matriz no lo cubra), para que el Select nunca quede
                // en blanco ante datos inesperados. estadoNorm normaliza REALIZADO/desconocido.
                const baseOpciones = matriz[estadoActual] ?? []
                const estadoNormCurrent = ["PENDIENTE","EN_PROCESO","COMPLETADO"].includes(estadoActual) ? estadoActual : "PENDIENTE"
                const opciones = Array.from(new Set([estadoNormCurrent, ...baseOpciones]))
                return (
                  <FormField
                    control={editForm.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado {isAdmin && <span className="text-xs text-muted-foreground font-normal">(admin: puede corregir hacia atrás)</span>}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || estadoNormCurrent}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona estado" />
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

              {/* PREVENTIVO: partes a atender con estado actual.
                  REGLA DE FLUJO:
                  - PENDIENTE / EN_PROCESO: editable libremente.
                  - COMPLETADO: read-only. Los contadores predictivos ya fueron reseteados
                    al momento del COMPLETADO; quitar/agregar partes acá no rebobina los
                    contadores y dejaría el motor predictivo desincronizado. Si se necesita
                    corregir, el ADMIN debe primero retroceder a EN_PROCESO y volver a
                    completar vía el dialog dedicado de "Completar trabajo". */}
              {editingMaintenance?.tipo?.toUpperCase() === "PREVENTIVO" && (() => {
                const partesReadonly = editingMaintenance?.estado?.toUpperCase() === "COMPLETADO"

                // Bug #19: incluir partes inactivas que ya estaban programadas
                // para no perderlas silenciosamente del checklist.
                const activasIds = new Set(editUnitParts.map(p => String(p.id || p.configuracion_parte_id)))
                const programadasInactivas = editPartes
                  .filter(pid => !activasIds.has(String(pid)))
                  .map(pid => {
                    const cfg = partConfigs.find(c => String(c.id) === String(pid))
                    return cfg ? { ...cfg, _inactiva: true } : null
                  })
                  .filter(Boolean)
                const partesAMostrar = [
                  ...editUnitParts.map(p => ({ ...p, _inactiva: false })),
                  ...programadasInactivas,
                ]

                return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium">Partes a atender</p>
                  </div>
                  {partesReadonly && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        Las partes ya quedaron registradas al completar el trabajo. Para
                        corregirlas, retrocede el estado a <strong>En Proceso</strong> y vuelve a
                        completar usando <strong>Completar trabajo</strong>.
                      </span>
                    </div>
                  )}
                  {editUnitPartsLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando estado de partes...</p>
                  ) : partesAMostrar.length === 0 ? (
                    <p className="text-xs text-muted-foreground border rounded-md px-3 py-2">
                      No hay partes configuradas para esta unidad
                    </p>
                  ) : (
                    <div className={`border rounded-md divide-y ${partesReadonly ? "opacity-70" : ""}`}>
                      {partesAMostrar.map((p) => {
                        const pid = String(p.id || p.configuracion_parte_id)
                        const estado = p.estado?.toUpperCase()
                        const checked = editPartes.includes(pid)
                        return (
                          <label key={pid} className={`flex items-center gap-3 px-3 py-2 ${partesReadonly ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted/40"}`}>
                            <input type="checkbox" className="rounded" checked={checked}
                              disabled={partesReadonly}
                              onChange={(e) => setEditPartes(prev =>
                                e.target.checked ? [...prev, pid] : prev.filter(x => x !== pid)
                              )}
                            />
                            <span className="flex-1 text-sm">{p.nombre || p.parte_nombre}</span>
                            {p._inactiva && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed" title="Esta regla fue desactivada después de programar el mantenimiento">
                                Regla inactiva
                              </Badge>
                            )}
                            {!p._inactiva && estado === "CRITICO" && <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Crítico</Badge>}
                            {!p._inactiva && estado === "ADVERTENCIA" && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Alerta</Badge>}
                            {!p._inactiva && estado === "OK" && <Badge variant="outline" className="text-xs text-green-600">OK</Badge>}
                            {!p._inactiva && p.km_restantes != null && (
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
                  <FormField
                    control={editForm.control}
                    name="nota_adicional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-sm text-muted-foreground font-normal">
                          <FileText className="h-3.5 w-3.5" /> Nota adicional <span className="text-xs">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Ej: Incluir revisión adicional..." />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Se añadirá al historial de notas</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                )
              })()}

              {/* CORRECTIVO: historial de notas + agregar nota */}
              {editingMaintenance?.tipo?.toUpperCase() !== "PREVENTIVO" && (
                <>
                  {editingMaintenance?.observaciones && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Problema reportado / Historial
                      </p>
                      <div className="rounded-md border bg-muted/50 px-3 py-2 max-h-32 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                          {editingMaintenance.observaciones}
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground">Solo lectura — el historial no se puede modificar</p>
                    </div>
                  )}
                  <FormField
                    control={editForm.control}
                    name="nota_adicional"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Agregar nota
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Escribe una nota adicional (opcional)..." />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Se añadirá al historial de notas</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
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
                onChange={(e) => { setCloseObs(e.target.value); setCloseErrors((er) => ({ ...er, observaciones: undefined })) }}
                rows={3}
                maxLength={1000}
                aria-invalid={!!closeErrors.observaciones}
              />
              {closeErrors.observaciones && (
                <p className="text-xs text-destructive">{closeErrors.observaciones}</p>
              )}
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

      {/* ── Dialog: Ver detalles completos del mantenimiento ── */}
      <Dialog open={!!detailMaintenance} onOpenChange={(v) => { if (!v) setDetailMaintenance(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span>Detalles — {detailMaintenance?.codigo}</span>
              {detailMaintenance && (() => {
                const tipo = detailMaintenance.tipo?.toUpperCase()
                const estado = detailMaintenance.estado?.toUpperCase()
                return (
                  <>
                    <Badge variant="outline" className={tipo === "PREVENTIVO" ? "border-blue-400 text-blue-600" : "border-orange-400 text-orange-600"}>
                      {tipo}
                    </Badge>
                    <Badge variant={estado === "CERRADO" ? "default" : estado === "REALIZADO" ? "secondary" : "outline"}>
                      {estado}
                    </Badge>
                  </>
                )
              })()}
            </DialogTitle>
          </DialogHeader>

          {detailMaintenance && (
            <div className="space-y-5 pt-1">

              {/* ── Info general ── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Unidad</p>
                    <p className="font-medium">{detailMaintenance.placa ?? `U-${detailMaintenance.unidad_id}`}</p>
                    {detailMaintenance.modelo && <p className="text-xs text-muted-foreground">{detailMaintenance.modelo}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Técnico</p>
                    <p className="font-medium">{detailMaintenance.tecnico_nombre ?? "Sin asignar"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha solicitud</p>
                    <p className="font-medium">{detailMaintenance.fecha_solicitud ? new Date(detailMaintenance.fecha_solicitud).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha realización</p>
                    <p className="font-medium">{detailMaintenance.fecha_realizacion ? new Date(detailMaintenance.fecha_realizacion).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <Gauge className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kilometraje al solicitar</p>
                    <p className="font-medium">{detailMaintenance.kilometraje_actual != null ? `${Number(detailMaintenance.kilometraje_actual).toLocaleString()} km` : "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Historial de observaciones ── */}
              {detailMaintenance.observaciones && (() => {
                const raw = detailMaintenance.observaciones
                const SEPS = [
                  { pattern: /\n\n--- NOTA DEL TÉCNICO ---\n/, label: "Nota del técnico", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
                  { pattern: /\n\n--- NOTA DEL ENCARGADO ---\n/, label: "Nota del encargado", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50/60 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800" },
                  { pattern: /\n\n--- CIERRE DEL ENCARGADO ---\n/, label: "Nota de cierre", color: "text-green-700 dark:text-green-400", bg: "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
                ]
                const sections = []
                let remaining = raw
                SEPS.forEach(({ pattern, label, color, bg }) => {
                  const match = remaining.search(pattern)
                  if (match !== -1) {
                    const before = remaining.slice(0, match)
                    const after = remaining.slice(match).replace(pattern, "")
                    if (sections.length === 0 && before.trim()) {
                      sections.push({ label: "Problema / Descripción inicial", text: before.trim(), color: "text-foreground", bg: "bg-muted/40 border-muted" })
                    }
                    const nextSep = SEPS.find(s => after.search(s.pattern) !== -1)
                    let text = after
                    if (nextSep) text = after.slice(0, after.search(nextSep.pattern))
                    sections.push({ label, text: text.trim(), color, bg })
                    remaining = after
                  }
                })
                if (sections.length === 0) {
                  sections.push({ label: "Descripción", text: raw.trim(), color: "text-foreground", bg: "bg-muted/40 border-muted" })
                }
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Historial
                    </p>
                    {sections.map((s, i) => (
                      <div key={i} className={`rounded-md border px-3 py-2.5 ${s.bg}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${s.color}`}>{s.label}</p>
                        <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">{s.text}</pre>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* ── Materiales usados ── */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-muted-foreground" /> Materiales utilizados
                </p>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando materiales...
                  </div>
                ) : detailMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No se registraron materiales en este mantenimiento.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Material</th>
                          <th className="text-center px-3 py-2 font-medium">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium">Precio unit.</th>
                          <th className="text-right px-3 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailMaterials.map((m, i) => (
                          <tr key={m.id ?? i} className="border-t">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{m.nombre}</span>
                                {m.es_externo && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-300 bg-orange-50 text-orange-700">Externo</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">{m.cantidad}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">S/. {Number(m.precio_unitario ?? m.precio ?? 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-medium">S/. {Number(m.costo_total ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold">Total materiales</td>
                          <td className="px-3 py-2 text-right font-bold text-sm">
                            S/. {detailMaterials.reduce((s, m) => s + Number(m.costo_total ?? 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailMaintenance(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

