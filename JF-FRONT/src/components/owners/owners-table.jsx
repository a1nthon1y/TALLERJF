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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit, MoreHorizontal, Trash, Loader2, Building2, AlertTriangle, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { getAllOwners, deleteOwner, createOwner } from "@/services/ownersService"
import { getAllUnits } from "@/services/unitsService"
import { makeGetRequest } from "@/utils/api"

export function OwnersTable() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [usuarioId, setUsuarioId] = useState("")

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ["owners"],
    queryFn: getAllOwners,
  })

  const { data: allUnits = [] } = useQuery({
    queryKey: ["units"],
    queryFn: getAllUnits,
  })

  const { data: ownerUsers = [] } = useQuery({
    queryKey: ["users-owner"],
    queryFn: async () => {
      const users = await makeGetRequest("/users")
      return Array.isArray(users) ? users.filter((u) => u.rol === "OWNER" && u.activo !== false) : []
    },
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

  const handleDelete = (owner) => {
    setDeleteTarget(owner)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!usuarioId) return toast.error("Selecciona un usuario")
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
                        onClick={() => handleDelete(owner)}
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

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Eliminar Dueño
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{" "}
              <span className="font-semibold">{deleteTarget?.nombre}</span>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar nuevo dueño */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Dueño</DialogTitle>
            <DialogDescription>
              Selecciona un usuario con rol <strong>OWNER</strong> para vincularlo como dueño de unidades.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="usuario_id">Usuario con rol OWNER</Label>
              <Select value={usuarioId} onValueChange={setUsuarioId}>
                <SelectTrigger id="usuario_id">
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {ownerUsers.length === 0 ? (
                    <SelectItem value="" disabled>No hay usuarios con rol OWNER disponibles</SelectItem>
                  ) : ownerUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nombre} ({u.username || u.correo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo aparecen usuarios activos con rol OWNER que aún no tienen perfil de dueño.
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
