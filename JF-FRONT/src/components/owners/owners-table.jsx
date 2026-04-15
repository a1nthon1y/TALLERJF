"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit, MoreHorizontal, Trash, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { getAllOwners, deleteOwner, createOwner } from "@/services/ownersService"
import { getAllUnits } from "@/services/unitsService"

export function OwnersTable() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [usuarioId, setUsuarioId] = useState("")

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["owners"],
    queryFn: getAllOwners,
  })

  const { data: allUnits = [] } = useQuery({
    queryKey: ["units"],
    queryFn: getAllUnits,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOwner,
    onSuccess: () => {
      toast.success("Dueño eliminado")
      queryClient.invalidateQueries({ queryKey: ["owners"] })
    },
    onError: (e) => toast.error(e.message),
  })

  const createMutation = useMutation({
    mutationFn: (data) => createOwner(data),
    onSuccess: () => {
      toast.success("Dueño registrado correctamente")
      queryClient.invalidateQueries({ queryKey: ["owners"] })
      setIsCreateOpen(false)
      setUsuarioId("")
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = owners.filter((o) =>
    o.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.correo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getUnidadesCount = (ownerId) =>
    allUnits.filter((u) => u.dueno_id === ownerId).length

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar este dueño? Esta acción no se puede deshacer.")) return
    deleteMutation.mutate(id)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!usuarioId) return toast.error("Ingresa el ID de usuario")
    createMutation.mutate({ usuario_id: parseInt(usuarioId) })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando dueños...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setIsCreateOpen(true)} className="ml-auto">
          <Building2 className="mr-2 h-4 w-4" /> Registrar Dueño
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dueño</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No se encontraron dueños
                </TableCell>
              </TableRow>
            ) : filtered.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{owner.nombre?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{owner.nombre}</div>
                      <div className="text-xs text-muted-foreground">ID: {owner.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{owner.correo}</TableCell>
                <TableCell>
                  <Badge variant="outline">{owner.rol}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{getUnidadesCount(owner.id)} unidades</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={owner.activo ? "outline" : "destructive"}>
                    {owner.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(owner.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Registrar nuevo dueño */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Dueño</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="usuario_id">ID de Usuario existente</Label>
              <Input
                id="usuario_id"
                type="number"
                placeholder="Ej. 7"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El dueño debe tener un usuario registrado en el sistema con rol OWNER.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
