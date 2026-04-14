"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User, Mail, Phone, MapPin } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre debe tener al menos 3 caracteres",
  }),
  contactPerson: z.string().min(3, {
    message: "El nombre del contacto debe tener al menos 3 caracteres",
  }),
  email: z.string().email({
    message: "Debe ingresar un email válido",
  }),
  phone: z.string().min(8, {
    message: "El teléfono debe tener al menos 8 caracteres",
  }),
  address: z.string().min(5, {
    message: "La dirección debe tener al menos 5 caracteres",
  }),
  isActive: z.boolean().default(true),
})

export function OwnerForm({ owner, onSubmit, isLoading }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: owner?.name || "",
      contactPerson: owner?.contactPerson || "",
      email: owner?.email || "",
      phone: owner?.phone || "",
      address: owner?.address || "",
      isActive: owner?.status === "Activo",
    },
  })

  const handleSubmit = (values) => {
    onSubmit({
      ...values,
      status: values.isActive ? "Activo" : "Inactivo",
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{owner ? "Editar Dueño" : "Registrar Nuevo Dueño"}</CardTitle>
        <CardDescription>
          {owner
            ? "Actualice la información del dueño de unidades"
            : "Complete el formulario para registrar un nuevo dueño de unidades"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Empresa/Dueño</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Transportes Ejemplo S.A." {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>Nombre de la empresa o persona propietaria de las unidades</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona de Contacto</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Juan Pérez" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>Nombre de la persona de contacto principal</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="contacto@ejemplo.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="+52 555 123 4567" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <div className="flex items-start">
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-2.5" />
                        <Textarea placeholder="Av. Principal 123, Ciudad" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado Activo</FormLabel>
                      <FormDescription>
                        Determina si el dueño está activo y puede tener unidades operativas
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => window.history.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : owner ? "Actualizar Dueño" : "Registrar Dueño"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

