"use client"

import { useState, useMemo, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Edit, MoreHorizontal, Trash, Settings, Building2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { formatNumber } from '@/utils/formatting'
import { useUnits } from "@/hooks/useUnits"
import { useMutation } from "@tanstack/react-query"
import { deleteUnit, createUnit, updateUnit, getUnitById, toggleUnitStatus } from "@/services/unitsService"
import { toast } from "sonner"
import { UnitForm } from "./unit-form"

export function UnitsTable() {
  const { data: units, isLoading, isError, mutate } = useUnits()
  const [searchTerm, setSearchTerm] = useState("")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unitToEdit, setUnitToEdit] = useState(null)

  // Obtener dueños únicos de los datos
  const owners = useMemo(() => {
    if (!units || !Array.isArray(units)) return []
    
    const uniqueOwners = new Map()
    units.forEach((unit) => {
      if (unit.dueno_id && !uniqueOwners.has(unit.dueno_id)) {
        uniqueOwners.set(unit.dueno_id, {
          id: unit.dueno_id,
          name: unit.dueno_nombre || 'Sin nombre',
          correo: unit.dueno_correo || '',
          telefono: unit.dueno_telefono || ''
        })
      }
    })
    return Array.from(uniqueOwners.values())
  }, [units])

  // Filtrar unidades
  const filteredUnits = useMemo(() => {
    if (!units || !Array.isArray(units)) return []
    
    return units.filter((unit) => {
      const matchesSearch =
        (unit.placa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (unit.modelo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (unit.chofer_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())

      const matchesOwner = ownerFilter === "all" || unit.dueno_id?.toString() === ownerFilter

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && unit.activo !== false) ||
        (statusFilter === "inactive" && unit.activo === false)

      return matchesSearch && matchesOwner && matchesStatus
    })
  }, [units, searchTerm, ownerFilter])

  // Función para obtener el nombre del dueño
  const getOwnerName = (unit) => {
    return unit.dueno_nombre || "Desconocido"
  }

  // Función para manejar la eliminación
  const handleDeleteClick = (unit) => {
    setSelectedUnit(unit)
    setIsDeleting(true)
  }

  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!selectedUnit) return
    setIsDeletingConfirm(true)
    try {
      await deleteUnit(selectedUnit.id)
      toast.success("Unidad eliminada correctamente")
      setIsDeleting(false)
      setSelectedUnit(null)
      await mutate()
    } catch (error) {
      // El backend devuelve el motivo exacto del bloqueo
      toast.error(error.message || "Error al eliminar la unidad", { duration: 6000 })
      setIsDeleting(false)
    } finally {
      setIsDeletingConfirm(false)
    }
  }

  // Toggle activo con useMutation (patrón estándar del proyecto)
  const toggleMutation = useMutation({
    mutationFn: (unit) => toggleUnitStatus(unit.id),
    onSuccess: (res) => {
      toast.success(res.message || "Estado actualizado")
      mutate()
    },
    onError: (err) => {
      toast.error(err.message || "Error al cambiar estado de la unidad", { duration: 6000 })
    },
  })

  // Función para manejar la creación
  const handleCreateClick = () => {
    setUnitToEdit(null)
    setIsCreating(true)
  }

  // Función para manejar la edición
  const handleEditClick = async (unit) => {
    try {
      // Obtener los datos completos de la unidad
      const fullUnit = await getUnitById(unit.id)
      setUnitToEdit(fullUnit)
      setIsEditing(true)
    } catch (error) {
      toast.error(error.message || "Error al cargar los datos de la unidad")
    }
  }

  // Función para manejar el submit del formulario
  const handleFormSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      if (unitToEdit) {
        // Actualizar unidad
        await updateUnit(unitToEdit.id, values)
        toast.success("Unidad actualizada correctamente")
        setIsEditing(false)
      } else {
        // Crear unidad
        await createUnit(values)
        toast.success("Unidad creada correctamente")
        setIsCreating(false)
      }
      setUnitToEdit(null)
      await mutate()
    } catch (error) {
      toast.error(error.message || `Error al ${unitToEdit ? 'actualizar' : 'crear'} la unidad`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelForm = () => {
    setIsCreating(false)
    setIsEditing(false)
    setUnitToEdit(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Cargando unidades...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          Error al cargar las unidades. Por favor, intente nuevamente.
        </div>
      </div>
    )
  }

  if (!units || units.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          No hay unidades registradas.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Input
            placeholder="Buscar por placa, modelo o chofer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por dueño" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los dueños</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id.toString()}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Desactivadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Unidad
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Kilometraje</TableHead>
              <TableHead>Chofer Asignado</TableHead>
              <TableHead>Dueño</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No se encontraron unidades con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id} className={unit.activo === false ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell className="font-medium">{unit.placa || 'N/A'}</TableCell>
                  <TableCell>{unit.modelo || 'N/A'}</TableCell>
                  <TableCell>{unit.año || 'N/A'}</TableCell>
                  <TableCell>{unit.tipo || 'N/A'}</TableCell>
                  <TableCell>{formatNumber(unit.kilometraje || 0)}</TableCell>
                  <TableCell>{unit.chofer_nombre || 'Sin asignar'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {getOwnerName(unit)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={unit.activo !== false}
                        onCheckedChange={() => toggleMutation.mutate(unit)}
                        disabled={toggleMutation.isPending}
                      />
                      <Badge variant={unit.activo !== false ? "outline" : "secondary"} className={unit.activo !== false ? "border-green-500 text-green-600" : ""}>
                        {unit.activo !== false ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(unit)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/partes-unidades?unidad=${unit.id}`} className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Ver Estado Predictivo</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de creación */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Unidad</DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar una nueva unidad de transporte.
            </DialogDescription>
          </DialogHeader>
          <UnitForm
            unit={null}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Unidad</DialogTitle>
            <DialogDescription>
              Modifique los datos de la unidad {unitToEdit?.placa}.
            </DialogDescription>
          </DialogHeader>
          {unitToEdit && (
            <UnitForm
              unit={unitToEdit}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar unidad?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
              <span className="block">
                Vas a eliminar la unidad <strong>{selectedUnit?.placa}</strong>
                {selectedUnit?.modelo ? ` — ${selectedUnit.modelo}` : ""}.
              </span>
              <span className="block text-amber-600 dark:text-amber-400 text-xs">
                Solo se puede eliminar si la unidad <strong>no tiene mantenimientos</strong> registrados.
                Si tiene historial, primero elimina esos registros desde la sección Mantenimientos.
              </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeletingConfirm}>
              {isDeletingConfirm && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

