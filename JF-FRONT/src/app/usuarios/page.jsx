"use client"

import { useState, useEffect, useCallback } from "react"
import { UsersTable } from "@/components/users/users-table"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
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
import { makeGetRequest } from "@/utils/api"

const formSchema = z.object({
  nombre:   z.string().min(1, { message: "El nombre es requerido" }),
  username: z.string().min(1, { message: "El usuario es requerido" })
             .regex(/^[a-z0-9]+$/, { message: "Solo letras minúsculas y números, sin espacios" }),
  correo:   z.string().email({ message: "Ingrese un correo válido" }).optional().or(z.literal("")),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  rol:      z.string().min(1, { message: "El rol es requerido" }),
  activo:   z.boolean().default(true),
})

export default function UsersPage() {
  const [isCreating, setIsCreating]           = useState(false)
  const [suggestingUsername, setSuggesting]   = useState(false)
  const { data: users, isLoading, isError, mutate } = useUsers()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: "", username: "", correo: "", password: "", rol: "CHOFER", activo: true },
  })

  const nombre = form.watch("nombre")

  // Auto-sugerir username cuando cambia el nombre (con debounce de 600ms)
  useEffect(() => {
    if (!nombre || nombre.trim().length < 2) return
    const timer = setTimeout(async () => {
      try {
        setSuggesting(true)
        const data = await makeGetRequest(`/users/suggest-username?nombre=${encodeURIComponent(nombre.trim())}`)
        // Solo auto-completar si el campo está vacío o no fue editado manualmente
        const current = form.getValues("username")
        if (!current || current === form.formState.defaultValues?.username) {
          form.setValue("username", data.username, { shouldValidate: true })
        }
      } catch { toast.warning("No se pudo sugerir un nombre de usuario automáticamente") } finally {
        setSuggesting(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [nombre])

  const handleCreateUser = async (values) => {
    try {
      await userService.createUser({
        nombre:   values.nombre,
        username: values.username,
        correo:   values.correo || undefined,
        password: values.password,
        rol:      values.rol,
        activo:   values.activo,
      })
      toast.success("Usuario creado correctamente")
      setIsCreating(false)
      form.reset()
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <Dialog open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) form.reset() }}>
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

                {/* Username — auto-sugerido, editable */}
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Usuario (para iniciar sesión)
                      {suggestingUsername && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="aespinoza"
                        {...field}
                        onChange={e => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Se genera automáticamente desde el nombre. Solo minúsculas y números.</p>
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
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
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
