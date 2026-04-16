"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Edit, Power, MoreHorizontal } from "lucide-react"
// useUsers moved to parent (usuarios/page.jsx) to avoid double fetch
import { userService } from "@/services/userService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authService } from "@/services/authService"
import { useRouter } from "next/navigation"
import { PageSkeleton } from "@/components/ui/page-skeleton"

const formSchema = z.object({
  nombre:   z.string().min(1, { message: "El nombre es requerido" }),
  username: z.string().min(1, { message: "El usuario es requerido" })
             .regex(/^[a-z0-9]+$/, { message: "Solo letras minúsculas y números" }),
  correo:   z.string().email({ message: "Ingrese un correo válido" }).optional().or(z.literal("")),
  rol:      z.string().min(1, { message: "El rol es requerido" }),
  activo:   z.boolean(),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).optional().or(z.literal("")),
})

const ROL_LABEL = { ADMIN: "Administrador", ENCARGADO: "Encargado", OWNER: "Dueño", CHOFER: "Chofer" }
const ROL_BADGE = { ADMIN: "default", ENCARGADO: "outline", OWNER: "info", CHOFER: "secondary" }

export function UsersTable({ users, isLoading, isError, mutate }) {
  const router    = useRouter()
  const [authUser, setAuthUser]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isEditing, setIsEditing]   = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: "", username: "", correo: "", rol: "", activo: true, password: "" },
  })

  useEffect(() => {
    const current = authService.getUser()
    if (!current) { router.push("/login"); return }
    setAuthUser(current)
    setAuthLoading(false)
  }, [router])

  if (authLoading) return <PageSkeleton />
  if (!authUser)   return null
  if (isLoading)   return <PageSkeleton />
  if (isError)     return <p className="text-destructive p-4">Error al cargar usuarios.</p>

  const filteredUsers = Array.isArray(users) ? users.filter(u => {
    if (!u) return false
    const s = searchTerm.toLowerCase()
    return (
      (u.nombre?.toLowerCase()   ?? "").includes(s) ||
      (u.username?.toLowerCase() ?? "").includes(s) ||
      (u.correo?.toLowerCase()   ?? "").includes(s) ||
      (u.rol?.toLowerCase()      ?? "").includes(s)
    )
  }) : []

  const handleToggleStatus = async (u) => {
    try {
      await userService.toggleUserStatus(u.id, !u.activo)
      toast.success(`Usuario ${u.activo ? "desactivado" : "activado"}`)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleUpdateUser = async (values) => {
    try {
      const payload = {
        nombre:   values.nombre,
        username: values.username,
        correo:   values.correo || undefined,
        rol:      values.rol,
        activo:   values.activo,
      }
      if (values.password?.trim()) payload.password = values.password
      await userService.updateUser(selectedUser.id, payload)
      toast.success("Usuario actualizado")
      setIsEditing(false)
      setSelectedUser(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEditClick = (u) => {
    setSelectedUser(u)
    form.reset({
      nombre:   u.nombre,
      username: u.username ?? "",
      correo:   u.correo   ?? "",
      rol:      u.rol,
      activo:   u.activo,
      password: "",
    })
    setIsEditing(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre, usuario, correo o rol..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{u.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{u.username ?? "—"}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.correo ?? <span className="italic">sin correo</span>}</TableCell>
                <TableCell>
                  <Badge variant={ROL_BADGE[u.rol] ?? "secondary"}>
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.activo ? "success" : "destructive"}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => handleEditClick(u)}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                        <Power className="mr-2 h-4 w-4" />
                        {u.activo ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de edición */}
      <Dialog open={isEditing} onOpenChange={open => { setIsEditing(open); if (!open) setSelectedUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario. La contraseña es opcional.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">

              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario (login)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={e => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="correo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                  <FormControl><Input {...field} type="email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="rol" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="ENCARGADO">Encargado</SelectItem>
                      <SelectItem value="OWNER">Dueño</SelectItem>
                      <SelectItem value="CHOFER">Chofer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="activo" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-base mb-0">Cuenta activa</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Dejar en blanco para no cambiar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
