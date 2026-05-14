"use client"

import { useState, useEffect, useRef } from "react"
import { UsersTable } from "@/components/users/users-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { userService } from "@/services/userService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useUsers } from "@/hooks/useUsers"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

// Genera un username local a partir del nombre completo:
// primera letra del primer nombre + apellidos concatenados.
// Ej: "Juan Pérez Huamán" → "jperezhuaman"
//     "María de los Ángeles" → "mdelosangeles"
const slugify = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")

const generateUsername = (nombre) => {
  const words = nombre.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  const initial = slugify(words[0]).charAt(0)
  const rest    = words.slice(1).map(slugify).join("")
  return initial + rest
}

const formSchema = z.object({
  nombre:   z.string().min(1, { message: "El nombre es requerido" }),
  username: z.string().min(1, { message: "El usuario es requerido" })
             .regex(/^[a-z0-9]+$/, { message: "Solo letras minúsculas y números, sin espacios" }),
  correo:   z.string().email({ message: "Ingrese un correo válido" }).optional().or(z.literal("")),
  // Datos personales centralizados en `usuarios` (single source of truth).
  // Ambos opcionales — pero si se ingresan, se valida formato peruano.
  telefono: z.string().regex(/^9\d{8}$/, { message: "El teléfono debe tener 9 dígitos y comenzar con 9." })
             .optional().or(z.literal("")),
  dni:      z.string().regex(/^\d{8}$/, { message: "El DNI debe tener exactamente 8 dígitos." })
             .optional().or(z.literal("")),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  rol:      z.string().min(1, { message: "El rol es requerido" }),
  activo:   z.boolean().default(true),
})

export default function UsersPage() {
  const [isCreating, setIsCreating] = useState(false)
  const { data: users, isLoading, isError, mutate } = useUsers()

  // Rastrea si el admin editó el username manualmente para no sobreescribir
  // su elección cuando el nombre siga cambiando.
  const userEditedUsername = useRef(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: "", username: "", correo: "", telefono: "", dni: "", password: "", rol: "CHOFER", activo: true },
  })

  const nombre = form.watch("nombre")

  // Genera el username localmente en cada cambio del nombre, sin red.
  // Si el admin ya tocó el campo de username, se respeta su elección.
  useEffect(() => {
    if (userEditedUsername.current) return
    const suggested = generateUsername(nombre)
    form.setValue("username", suggested, { shouldValidate: suggested.length > 0 })
  }, [nombre])

  const resetCreateForm = () => {
    form.reset()
    userEditedUsername.current = false
  }

  const handleCreateUser = async (values) => {
    try {
      await userService.createUser({
        nombre:   values.nombre,
        username: values.username,
        correo:   values.correo || undefined,
        telefono: values.telefono || undefined,
        dni:      values.dni || undefined,
        password: values.password,
        rol:      values.rol,
        activo:   values.activo,
      })
      toast.success("Usuario creado correctamente")
      setIsCreating(false)
      resetCreateForm()
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <Dialog open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) resetCreateForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Agregar Usuario</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                El nombre de usuario se genera automáticamente. Puedes editarlo antes de guardar.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">

                {/* Nombre completo */}
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Juan Pérez Huamán" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Username — se genera reactivamente; si el admin lo toca, se respeta */}
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario (para iniciar sesión)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="aespinoza"
                        className="font-mono"
                        {...field}
                        onChange={e => {
                          userEditedUsername.current = true
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Se genera automáticamente desde el nombre. Solo minúsculas y números.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Correo (opcional) */}
                <FormField control={form.control} name="correo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Teléfono y DNI en una fila */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="987654321"
                          {...field}
                          onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dni" render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          maxLength={8}
                          placeholder="12345678"
                          {...field}
                          onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Contraseña */}
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Rol */}
                <FormField control={form.control} name="rol" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccione un rol" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="ENCARGADO">Encargado</SelectItem>
                        <SelectItem value="OWNER">Dueño</SelectItem>
                        <SelectItem value="CHOFER">Chofer</SelectItem>
                        <SelectItem value="TECNICO">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsCreating(false); resetCreateForm() }}>Cancelar</Button>
                  <Button type="submit">Crear Usuario</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <UsersTable users={users} isLoading={isLoading} isError={isError} mutate={mutate} />
    </div>
  )
}
