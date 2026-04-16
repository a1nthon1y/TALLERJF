"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Edit, MoreHorizontal, Trash, User } from "lucide-react"
import { useChoferes } from "@/hooks/useChoferes"
import { deleteChofer, createChofer, updateChofer, getChoferById } from "@/services/choferesService"
import { toast } from "sonner"
import { ChoferForm } from "./chofer-form"

export function ChoferesTable({ externalCreateTrigger }) {
  const { data: choferes, isLoading, isError, mutate } = useChoferes()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedChofer, setSelectedChofer] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [choferToEdit, setChoferToEdit] = useState(null)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (externalCreateTrigger !== undefined) setIsCreating(true)
  }, [externalCreateTrigger])

  // Filtrar choferes
  const filteredChoferes = useMemo(() => {
    if (!choferes || !Array.isArray(choferes)) return []
    
    return choferes.filter((chofer) => {
      const matchesSearch =
        (chofer.usuario_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (chofer.licencia?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (chofer.usuario_correo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (chofer.telefono?.toLowerCase() || '').includes(searchTerm.toLowerCase())

      return matchesSearch
    })
  }, [choferes, searchTerm])

  // Función para manejar la eliminación
  const handleDeleteClick = (chofer) => {
    setSelectedChofer(chofer)
    setIsDeleting(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedChofer) return
    
    try {
      await deleteChofer(selectedChofer.chofer_id)
      toast.success("Chofer eliminado correctamente")
      setIsDeleting(false)
      setSelectedChofer(null)
      await mutate()
    } catch (error) {
      toast.error(error.message || "Error al eliminar el chofer")
    }
  }

  // Función para manejar la creación
  const handleCreateClick = () => {
    setChoferToEdit(null)
    setIsCreating(true)
  }

  // Función para manejar la edición
  const handleEditClick = async (chofer) => {
    try {
      // Obtener los datos completos del chofer
      const fullChofer = await getChoferById(chofer.chofer_id)
      setChoferToEdit(fullChofer)
      setIsEditing(true)
    } catch (error) {
      toast.error(error.message || "Error al cargar los datos del chofer")
    }
  }

  // Función para manejar el submit del formulario
  const handleFormSubmit = async (values) => {
    setIsSubmitting(true)
    try {
      if (choferToEdit) {
        // Actualizar chofer
        await updateChofer(choferToEdit.chofer_id, values)
        toast.success("Chofer actualizado correctamente")
        setIsEditing(false)
      } else {
        // Crear chofer
        await createChofer(values)
        toast.success("Chofer creado correctamente")
        setIsCreating(false)
      }
      setChoferToEdit(null)
      await mutate()
    } catch (error) {
      toast.error(error.message || `Error al ${choferToEdit ? 'actualizar' : 'crear'} el chofer`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelForm = () => {
    setIsCreating(false)
    setIsEditing(false)
    setChoferToEdit(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Cargando choferes...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          Error al cargar los choferes. Por favor, intente nuevamente.
        </div>
      </div>
    )
  }

  if (!choferes || choferes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreateClick}>
            <User className="mr-2 h-4 w-4" />
            Agregar Chofer
          </Button>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            No hay choferes registrados.
          </div>
        </div>

        {/* Diálogo de creación */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Chofer</DialogTitle>
              <DialogDescription>
                Complete el formulario para registrar un nuevo chofer.
              </DialogDescription>
            </DialogHeader>
            <ChoferForm
              chofer={null}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Input
          placeholder="Buscar por nombre, licencia, correo o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateClick}>
          <User className="mr-2 h-4 w-4" />
          Agregar Chofer
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Licencia</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChoferes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No se encontraron choferes con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredChoferes.map((chofer) => (
                <TableRow key={chofer.chofer_id}>
                  <TableCell className="font-medium">{chofer.usuario_nombre || 'N/A'}</TableCell>
                  <TableCell>{chofer.usuario_correo || 'N/A'}</TableCell>
                  <TableCell>{chofer.licencia || 'N/A'}</TableCell>
                  <TableCell>{chofer.telefono || 'Sin teléfono'}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(chofer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(chofer)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Chofer</DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar un nuevo chofer.
            </DialogDescription>
          </DialogHeader>
          <ChoferForm
            chofer={null}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de edición */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Chofer</DialogTitle>
            <DialogDescription>
              Modifique los datos del chofer {choferToEdit?.usuario_nombre}.
            </DialogDescription>
          </DialogHeader>
          {choferToEdit && (
            <ChoferForm
              chofer={choferToEdit}
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el chofer{" "}
              <strong>{selectedChofer?.usuario_nombre}</strong> y todos sus datos asociados.
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

