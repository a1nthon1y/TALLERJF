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
import Link from "next/link"
import { formatNumber } from '@/utils/formatting'
import { useUnits } from "@/hooks/useUnits"
import { deleteUnit, createUnit, updateUnit, getUnitById } from "@/services/unitsService"
import { toast } from "sonner"
import { UnitForm } from "./unit-form"

export function UnitsTable() {
  const { data: units, isLoading, isError, mutate } = useUnits()
  const [searchTerm, setSearchTerm] = useState("")
  const [ownerFilter, setOwnerFilter] = useState("all")
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
          name: unit.nombre || 'Sin nombre',
          correo: unit.correo_dueno || '',
          telefono: unit.telefono_dueno || ''
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

      return matchesSearch && matchesOwner
    })
  }, [units, searchTerm, ownerFilter])

  // Función para obtener el nombre del dueño
  const getOwnerName = (unit) => {
    return unit.nombre || "Desconocido"
  }

  // Función para manejar la eliminación
  const handleDeleteClick = (unit) => {
    setSelectedUnit(unit)
    setIsDeleting(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUnit) return
    
    try {
      await deleteUnit(selectedUnit.id)
      toast.success("Unidad eliminada correctamente")
      setIsDeleting(false)
      setSelectedUnit(null)
      await mutate()
    } catch (error) {
      toast.error(error.message || "Error al eliminar la unidad")
    }
  }

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
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No se encontraron unidades con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.placa || 'N/A'}</TableCell>
                  <TableCell>{unit.modelo || 'N/A'}</TableCell>
                  <TableCell>{unit.año || 'N/A'}</TableCell>
                  <TableCell>{unit.tipo || 'N/A'}</TableCell>
                  <TableCell>{formatNumber(unit.kilometraje || 0)}</TableCell>
                  <TableCell>{unit.chofer_nombre || 'Sin asignar'}</TableCell>
                  <TableCell>
                    <Link 
                      href={`/duenos/${unit.dueno_id}`} 
                      className="flex items-center hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {getOwnerName(unit)}
                    </Link>
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
                        <DropdownMenuItem>
                          <Link href={`/unidades/${unit.id}/partes`} className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Gestionar Partes</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(unit)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la unidad{" "}
              <strong>{selectedUnit?.placa}</strong> y todos sus datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

