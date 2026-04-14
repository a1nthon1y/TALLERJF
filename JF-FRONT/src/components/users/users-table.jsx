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
import { useUsers } from "@/hooks/useUsers"
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

const formSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre es requerido" }),
  correo: z.string().email({ message: "Ingrese un correo válido" }),
  rol: z.string().min(1, { message: "El rol es requerido" }),
  activo: z.boolean(),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).optional().or(z.literal("")),
})

export function UsersTable() {
  const router = useRouter()
  const { data: users, isLoading, isError, mutate } = useUsers()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      correo: "",
      rol: "",
      activo: true,
      password: "",
    },
  })

  useEffect(() => {
    const currentUser = authService.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Verificando sesión...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Por favor, inicie sesión para ver esta información</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Cargando usuarios...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          Error al cargar los usuarios. Por favor, intente nuevamente.
        </div>
      </div>
    )
  }

  const filteredUsers = Array.isArray(users) ? users.filter((user) => {
    if (!user) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.nombre?.toLowerCase() || '').includes(searchLower) ||
      (user.correo?.toLowerCase() || '').includes(searchLower) ||
      (user.rol?.toLowerCase() || '').includes(searchLower)
    );
  }) : [];

  const handleToggleStatus = async (user) => {
    try {
      await userService.toggleUserStatus(user.id, !user.activo)
      await mutate()
    } catch (error) {
      console.error('Error toggling user status:', error)
    }
  }

  const handleUpdateUser = async (values) => {
    try {
      const dataToSubmit = {
        nombre: values.nombre,
        correo: values.correo,
        rol: values.rol,
        activo: values.activo,
      }

      if (values.password && values.password.trim() !== "") {
        dataToSubmit.password = values.password
      }
      
      await userService.updateUser(selectedUser.id, dataToSubmit)
      setIsEditing(false)
      setSelectedUser(null)
      await mutate()
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    form.reset({
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
      password: "",
    })
    setIsEditing(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre, email o rol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {isLoading && (
          <div className="text-sm text-muted-foreground">
            Actualizando datos...
          </div>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{user.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>{user.correo}</TableCell>
                <TableCell>
                  <Badge variant={user.rol === "ADMIN" ? "default" : "secondary"}>
                    {user.rol}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.activo ? "outline" : "destructive"}>
                    {user.activo ? "Activo" : "Inactivo"}
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
                      <DropdownMenuItem onClick={() => handleEditClick(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                        <Power className="mr-2 h-4 w-4" />
                        {user.activo ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifique los datos del usuario. La contraseña es opcional, déjela en blanco si no desea cambiarla.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="correo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="CHOFER">Chofer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        placeholder="Dejar en blanco para mantener la contraseña actual" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
