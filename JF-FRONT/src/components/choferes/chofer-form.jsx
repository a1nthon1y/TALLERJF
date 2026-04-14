"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsers } from "@/hooks/useUsers"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  usuario_id: z.coerce.number().min(1, { message: "El usuario es requerido" }),
  licencia: z.string().min(1, { message: "La licencia es requerida" }),
  telefono: z.string().optional(),
})

export function ChoferForm({ chofer, onSubmit, onCancel, isLoading }) {
  const { data: users, isLoading: isLoadingUsers } = useUsers()

  // Filtrar usuarios que no sean choferes o que no tengan chofer asignado
  // Por ahora, mostrar todos los usuarios con rol CHOFER que no tengan chofer asignado
  const availableUsers = users?.filter((user) => user.rol === "CHOFER") || []

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: chofer
      ? {
          usuario_id: chofer.usuario_id || undefined,
          licencia: chofer.licencia || "",
          telefono: chofer.telefono || "",
        }
      : {
          usuario_id: undefined,
          licencia: "",
          telefono: "",
        },
  })

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="usuario_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
                disabled={!!chofer} // Deshabilitar si está editando
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un usuario" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.nombre} ({user.correo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {chofer 
                  ? "El usuario no puede ser cambiado una vez creado el chofer"
                  : "Seleccione un usuario con rol CHOFER"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="licencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Licencia *</FormLabel>
              <FormControl>
                <Input placeholder="B2C-765432" {...field} />
              </FormControl>
              <FormDescription>Ingrese el número de licencia del chofer</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="999999999" {...field} />
              </FormControl>
              <FormDescription>Teléfono de contacto del chofer (opcional)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {chofer ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

