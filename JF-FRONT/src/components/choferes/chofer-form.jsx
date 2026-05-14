"use client"

import { useForm } from "react-hook-form"
import { useEffect } from "react"
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
import { useChoferes } from "@/hooks/useChoferes"
import { AlertTriangle, Loader2, Phone, IdCard } from "lucide-react"

// Solo licencia y usuario son operacionales del chofer.
// Datos personales (telefono, dni) viven en `usuarios` — se editan desde
// la página de Usuarios y se muestran aquí read-only del usuario seleccionado.
const formSchema = z.object({
  usuario_id: z.coerce.number().min(1, { message: "El usuario es requerido" }),
  licencia: z
    .string()
    .trim()
    .min(3, { message: "La licencia debe tener al menos 3 caracteres." })
    .max(20, { message: "Máximo 20 caracteres." }),
})

export function ChoferForm({ chofer, onSubmit, onCancel, isLoading }) {
  const { data: users, isLoading: isLoadingUsers } = useUsers()
  const { data: choferes } = useChoferes()

  // Usuarios elegibles:
  //  1. Rol CHOFER
  //  2. Activos (no apagados desde Usuarios)
  //  3. NO vinculados ya a otro chofer (excepto el actual cuando se edita)
  // Cuando se edita, agregamos al usuario actualmente vinculado al final
  // de la lista aunque esté inactivo o ya esté usado, para que el select
  // no quede vacío y muestre el nombre real.
  const usuariosOcupados = new Set(
    (choferes ?? [])
      .filter((c) => !chofer || c.chofer_id !== chofer.id)
      .map((c) => c.usuario_id)
      .filter(Boolean)
  )
  const availableUsers = (users ?? [])
    .filter((u) => u && u.rol === "CHOFER" && u.activo !== false && !usuariosOcupados.has(u.id))

  const usuarioVinculadoActual = chofer
    ? (users ?? []).find((u) => u.id === chofer.usuario_id)
    : null
  const usuarioVinculadoInactivo = usuarioVinculadoActual && usuarioVinculadoActual.activo === false

  // Si estamos editando y el usuario actual no está en la lista (porque
  // está inactivo o ya marcado como ocupado), lo añadimos al final para
  // poder mostrarlo en el select.
  const showCurrent = chofer && usuarioVinculadoActual &&
    !availableUsers.some((u) => u.id === usuarioVinculadoActual.id)
  const finalUsers = showCurrent
    ? [...availableUsers, usuarioVinculadoActual]
    : availableUsers

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: chofer
      ? { usuario_id: chofer.usuario_id || undefined, licencia: chofer.licencia || "" }
      : { usuario_id: undefined, licencia: "" },
  })

  useEffect(() => {
    form.reset(
      chofer
        ? { usuario_id: chofer.usuario_id || undefined, licencia: chofer.licencia || "" }
        : { usuario_id: undefined, licencia: "" }
    )
  }, [chofer])

  // Usuario seleccionado actualmente (para mostrar sus datos de contacto
  // como info read-only debajo del select). Reactivo: cambia con el select.
  const usuarioIdSeleccionado = form.watch("usuario_id")
  const usuarioSeleccionado = (users ?? []).find((u) => u.id === Number(usuarioIdSeleccionado))

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
                  {finalUsers.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                      No hay usuarios CHOFER disponibles. Crea uno desde Usuarios o reactiva uno existente.
                    </div>
                  ) : (
                    finalUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.nombre} ({user.correo}){user.activo === false ? " — Inactivo" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {chofer
                  ? "El usuario no puede ser cambiado una vez creado el chofer"
                  : "Solo aparecen usuarios con rol CHOFER, activos y sin perfil vinculado"}
              </FormDescription>
              <FormMessage />
              {usuarioVinculadoInactivo && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    El usuario vinculado a este chofer está <strong>desactivado</strong>. No podrá iniciar sesión hasta que lo reactives desde Usuarios.
                  </span>
                </div>
              )}
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

        {/* Datos de contacto leídos del usuario vinculado (read-only).
            Para editarlos, ir a Usuarios → Editar usuario. */}
        {usuarioSeleccionado && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Datos de contacto del usuario
            </p>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={usuarioSeleccionado.telefono ? "" : "text-muted-foreground italic"}>
                {usuarioSeleccionado.telefono || "Sin teléfono registrado"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={usuarioSeleccionado.dni ? "" : "text-muted-foreground italic"}>
                {usuarioSeleccionado.dni ? `DNI: ${usuarioSeleccionado.dni}` : "Sin DNI registrado"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Para modificar estos datos, edita el usuario desde la página Usuarios.
            </p>
          </div>
        )}

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

