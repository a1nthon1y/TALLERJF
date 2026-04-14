"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Edit, Trash, AlertCircle, AlertTriangle, CheckCircle, Wrench } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/utils/formatting"

// Datos de ejemplo para unidades
const units = [
  { id: 1, plate: "ABC-123", currentKm: 45000 },
  { id: 2, plate: "XYZ-789", currentKm: 78000 },
  { id: 3, plate: "DEF-456", currentKm: 32000 },
  { id: 4, plate: "GHI-101", currentKm: 95000 },
  { id: 5, plate: "JKL-202", currentKm: 15000 },
]

// Datos de ejemplo para partes de unidades
const initialUnitParts = [
  {
    id: 1,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Motor",
    maintenanceInterval: 5000,
    lastMaintenanceKm: 40000,
    currentKm: 45000,
  },
  {
    id: 2,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Frenos",
    maintenanceInterval: 10000,
    lastMaintenanceKm: 35000,
    currentKm: 45000,
  },
  {
    id: 3,
    unitId: 2,
    unitPlate: "XYZ-789",
    name: "Transmisión",
    maintenanceInterval: 20000,
    lastMaintenanceKm: 60000,
    currentKm: 78000,
  },
  {
    id: 4,
    unitId: 2,
    unitPlate: "XYZ-789",
    name: "Sistema de refrigeración",
    maintenanceInterval: 15000,
    lastMaintenanceKm: 70000,
    currentKm: 78000,
  },
  {
    id: 5,
    unitId: 3,
    unitPlate: "DEF-456",
    name: "Filtro de aire",
    maintenanceInterval: 8000,
    lastMaintenanceKm: 25000,
    currentKm: 32000,
  },
  {
    id: 6,
    unitId: 4,
    unitPlate: "GHI-101",
    name: "Suspensión",
    maintenanceInterval: 25000,
    lastMaintenanceKm: 70000,
    currentKm: 95000,
  },

]

// Esquema de validación para el formulario
const formSchema = z.object({
  unitId: z.string({
    required_error: "Debe seleccionar una unidad",
  }),
  name: z
    .string({
      required_error: "Debe ingresar un nombre para la parte",
    })
    .min(3, {
      message: "El nombre debe tener al menos 3 caracteres",
    }),
  maintenanceInterval: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Debe ingresar un valor numérico mayor a 0",
    }),
  lastMaintenanceKm: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Debe ingresar un valor numérico mayor o igual a 0",
    }),
})

export function UnitPartsManager() {
  const [unitParts, setUnitParts] = useState(initialUnitParts)
  const [searchTerm, setSearchTerm] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState(null)
  const [isRegisterMaintenanceOpen, setIsRegisterMaintenanceOpen] = useState(false)
  const [selectedPartForMaintenance, setSelectedPartForMaintenance] = useState(null)

  // Configuración del formulario
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unitId: "",
      name: "",
      maintenanceInterval: "",
      lastMaintenanceKm: "",
    },
  })

  // Configuración del formulario de mantenimiento
  const maintenanceForm = useForm({
    defaultValues: {
      newKm: "",
      maintenanceDate: "",
      maintenanceNotes: "",
    },
  })

  // Función para calcular el porcentaje de vida útil restante
  const calculateRemainingLife = (part) => {
    const kmSinceLastMaintenance = part.currentKm - part.lastMaintenanceKm
    const percentage = 100 - (kmSinceLastMaintenance / part.maintenanceInterval) * 100
    return Math.max(0, Math.min(100, percentage))
  }

  // Función para determinar el estado de la parte
  const getPartStatus = (part) => {
    const percentage = calculateRemainingLife(part)
    if (percentage <= 10) return "critical"
    if (percentage <= 25) return "warning"
    return "normal"
  }

  // Función para verificar si una parte necesita mantenimiento
  const needsMaintenance = (part) => {
    const kmSinceLastMaintenance = part.currentKm - part.lastMaintenanceKm
    return kmSinceLastMaintenance >= part.maintenanceInterval
  }

  // Filtrar partes según los criterios de búsqueda y filtros
  const filteredParts = unitParts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.unitPlate.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesUnit = unitFilter === "all" || part.unitId.toString() === unitFilter

    const status = getPartStatus(part)
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "critical" && status === "critical") ||
      (statusFilter === "warning" && status === "warning") ||
      (statusFilter === "normal" && status === "normal")

    return matchesSearch && matchesUnit && matchesStatus
  })

  // Ordenar por estado (crítico primero, luego advertencia, luego normal)
  const sortedParts = [...filteredParts].sort((a, b) => {
    const statusA = getPartStatus(a)
    const statusB = getPartStatus(b)

    if (statusA === "critical" && statusB !== "critical") return -1
    if (statusA !== "critical" && statusB === "critical") return 1
    if (statusA === "warning" && statusB === "normal") return -1
    if (statusA === "normal" && statusB === "warning") return 1

    return 0
  })

  // Función para abrir el diálogo de edición
  const openEditDialog = (part) => {
    setEditingPart(part)
    form.reset({
      unitId: part.unitId.toString(),
      name: part.name,
      maintenanceInterval: part.maintenanceInterval.toString(),
      lastMaintenanceKm: part.lastMaintenanceKm.toString(),
    })
    setIsDialogOpen(true)
  }

  // Función para abrir el diálogo de creación
  const openCreateDialog = () => {
    setEditingPart(null)
    form.reset({
      unitId: "",
      name: "",
      maintenanceInterval: "",
      lastMaintenanceKm: "",
    })
    setIsDialogOpen(true)
  }

  // Función para abrir el diálogo de registro de mantenimiento
  const openRegisterMaintenanceDialog = (part) => {
    setSelectedPartForMaintenance(part)
    maintenanceForm.reset({
      newKm: part.currentKm.toString(),
      maintenanceDate: new Date().toISOString().split("T")[0],
      maintenanceNotes: "",
    })
    setIsRegisterMaintenanceOpen(true)
  }

  // Función para manejar el envío del formulario
  const onSubmit = (values) => {
    const selectedUnit = units.find((unit) => unit.id.toString() === values.unitId)

    if (!selectedUnit) {
      console.error("Unidad no encontrada")
      return
    }

    if (editingPart) {
      // Actualizar parte existente
      setUnitParts(
        unitParts.map((part) =>
          part.id === editingPart.id
            ? {
                ...part,
                unitId: Number.parseInt(values.unitId),
                unitPlate: selectedUnit.plate,
                name: values.name,
                maintenanceInterval: Number.parseInt(values.maintenanceInterval),
                lastMaintenanceKm: Number.parseInt(values.lastMaintenanceKm),
                currentKm: selectedUnit.currentKm,
              }
            : part,
        ),
      )
    } else {
      // Crear nueva parte
      const newPart = {
        id: Math.max(...unitParts.map((p) => p.id)) + 1,
        unitId: Number.parseInt(values.unitId),
        unitPlate: selectedUnit.plate,
        name: values.name,
        maintenanceInterval: Number.parseInt(values.maintenanceInterval),
        lastMaintenanceKm: Number.parseInt(values.lastMaintenanceKm),
        currentKm: selectedUnit.currentKm,
      }
      setUnitParts([...unitParts, newPart])
    }

    setIsDialogOpen(false)
  }

  // Función para manejar el envío del formulario de mantenimiento
  const onSubmitMaintenance = (values) => {
    if (!selectedPartForMaintenance) return

    // Actualizar el último mantenimiento de la parte
    setUnitParts(
      unitParts.map((part) =>
        part.id === selectedPartForMaintenance.id
          ? {
              ...part,
              lastMaintenanceKm: Number.parseInt(values.newKm),
            }
          : part,
      ),
    )

    setIsRegisterMaintenanceOpen(false)
    setSelectedPartForMaintenance(null)
  }

  // Función para eliminar una parte
  const deletePart = (id) => {
    setUnitParts(unitParts.filter((part) => part.id !== id))
  }

  // Función para obtener el badge de estado
  const getStatusBadge = (part) => {
    const status = getPartStatus(part)
    const percentage = calculateRemainingLife(part)

    if (status === "critical") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Crítico ({formatNumber(percentage)}%)</span>
        </Badge>
      )
    } else if (status === "warning") {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          <span>Advertencia ({formatNumber(percentage)}%)</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-500">
          <CheckCircle className="h-3 w-3" />
          <span>Normal ({formatNumber(percentage)}%)</span>
        </Badge>
      )
    }
  }

  // Función para obtener el color de la barra de progreso
  const getProgressColor = (part) => {
    const status = getPartStatus(part)
    if (status === "critical") return "bg-red-500"
    if (status === "warning") return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nombre o placa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.plate} - {formatNumber(unit.currentKm)} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Advertencia</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>Registrar Nueva Parte</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingPart ? "Editar Parte" : "Registrar Nueva Parte"}</DialogTitle>
                <DialogDescription>
                  {editingPart
                    ? "Actualice los detalles de la parte seleccionada."
                    : "Complete el formulario para registrar una nueva parte para una unidad."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="unitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.plate} - {formatNumber(unit.currentKm)} km
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Seleccione la unidad a la que pertenece esta parte.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Parte</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Motor, Frenos, Transmisión" {...field} />
                        </FormControl>
                        <FormDescription>Ingrese un nombre descriptivo para la parte.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maintenanceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Mantenimiento (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="Ej: 5000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Cada cuántos kilómetros se debe realizar mantenimiento a esta parte.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastMaintenanceKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Último Mantenimiento (km)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="Ej: 40000" {...field} />
                        </FormControl>
                        <FormDescription>Kilometraje en el que se realizó el último mantenimiento.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">{editingPart ? "Guardar Cambios" : "Registrar Parte"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Diálogo para registrar mantenimiento */}
      <Dialog open={isRegisterMaintenanceOpen} onOpenChange={setIsRegisterMaintenanceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Mantenimiento</DialogTitle>
            <DialogDescription>
              {selectedPartForMaintenance && (
                <>
                  Registre el mantenimiento para {selectedPartForMaintenance.name} de la unidad{" "}
                  {selectedPartForMaintenance.unitPlate}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={maintenanceForm.handleSubmit(onSubmitMaintenance)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Kilometraje Actual</FormLabel>
              <Input type="number" min="0" placeholder="Kilometraje actual" {...maintenanceForm.register("newKm")} />
              <FormDescription>
                Ingrese el kilometraje actual de la unidad al realizar el mantenimiento.
              </FormDescription>
            </div>
            <div className="space-y-2">
              <FormLabel>Fecha de Mantenimiento</FormLabel>
              <Input type="date" {...maintenanceForm.register("maintenanceDate")} />
            </div>
            <div className="space-y-2">
              <FormLabel>Notas</FormLabel>
              <Input placeholder="Observaciones del mantenimiento" {...maintenanceForm.register("maintenanceNotes")} />
            </div>
            <DialogFooter>
              <Button type="submit">Registrar Mantenimiento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead>Parte</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Último Mantenimiento</TableHead>
              <TableHead>Km Actual</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vida Útil</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedParts.length > 0 ? (
              sortedParts.map((part) => (
                <TableRow key={part.id} className={needsMaintenance(part) ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell>{part.unitPlate}</TableCell>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell>{formatNumber(part.maintenanceInterval)} km</TableCell>
                  <TableCell>{formatNumber(part.lastMaintenanceKm)} km</TableCell>
                  <TableCell>{formatNumber(part.currentKm)} km</TableCell>
                  <TableCell>{getStatusBadge(part)}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={calculateRemainingLife(part)}
                              className="h-2"
                              indicatorClassName={getProgressColor(part)}
                            />
                            <span className="text-xs w-8">{formatNumber(calculateRemainingLife(part))}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {needsMaintenance(part)
                            ? `Excedido por ${formatNumber(part.currentKm - part.lastMaintenanceKm - part.maintenanceInterval)} km`
                            : `Faltan ${formatNumber(part.lastMaintenanceKm + part.maintenanceInterval - part.currentKm)} km para el próximo mantenimiento`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(part)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openRegisterMaintenanceDialog(part)}
                        title="Registrar Mantenimiento"
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deletePart(part.id)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron partes que coincidan con los criterios de búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumen de estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-medium">Crítico</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {sortedParts.filter((part) => getPartStatus(part) === "critical").length} partes requieren mantenimiento
            inmediato
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium">Advertencia</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {sortedParts.filter((part) => getPartStatus(part) === "warning").length} partes requerirán mantenimiento
            pronto
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Normal</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {sortedParts.filter((part) => getPartStatus(part) === "normal").length} partes en buen estado
          </p>
        </div>
      </div>
    </div>
  )
}

