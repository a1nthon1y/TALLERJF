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
import { useOwners } from "@/hooks/useOwners"
import { useChoferes } from "@/hooks/useChoferes"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  placa: z.string().min(1, { message: "La placa es requerida" }),
  modelo: z.string().min(1, { message: "El modelo es requerido" }),
  año: z.coerce.number().min(1900).max(new Date().getFullYear() + 1, {
    message: `El año debe estar entre 1900 y ${new Date().getFullYear() + 1}`,
  }),
  tipo: z.enum(["BUS", "VAN", "CAMION", "OTRO"], {
    errorMap: () => ({ message: "Seleccione un tipo válido" }),
  }),
  kilometraje: z.coerce.number().min(0, { message: "El kilometraje no puede ser negativo" }).optional(),
  chofer_id: z.string().nullable().optional(),
  dueno_id: z.coerce.number().min(1, { message: "El dueño es requerido" }),
})

export function UnitForm({ unit, onSubmit, onCancel, isLoading }) {
  const { data: owners, isLoading: isLoadingOwners } = useOwners()
  const { data: choferes, isLoading: isLoadingChoferes } = useChoferes()

  // Usar choferes directamente de la tabla choferes
  const drivers = choferes || []

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: unit
      ? {
          placa: unit.placa || "",
          modelo: unit.modelo || "",
          año: unit.año || new Date().getFullYear(),
          tipo: unit.tipo || "",
          kilometraje: unit.kilometraje || 0,
          // getUnitById devuelve chofer_id directamente
          chofer_id: unit.chofer_id?.toString() || null,
          dueno_id: unit.dueno_id || undefined,
        }
      : {
          placa: "",
          modelo: "",
          año: new Date().getFullYear(),
          tipo: "",
          kilometraje: 0,
          chofer_id: null,
          dueno_id: undefined,
        },
  })

  const handleSubmit = (values) => {
    // Convertir chofer_id a número o null
    const dataToSubmit = {
      ...values,
      chofer_id: values.chofer_id && values.chofer_id !== "none" ? parseInt(values.chofer_id) : null,
      kilometraje: values.kilometraje || 0,
    }
    onSubmit(dataToSubmit)
  }

  if (isLoadingOwners || isLoadingChoferes) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="placa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa</FormLabel>
              <FormControl>
                <Input placeholder="ABC-123" {...field} />
              </FormControl>
              <FormDescription>Ingrese la placa de la unidad</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="modelo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl>
                <Input placeholder="Mercedes Benz" {...field} />
              </FormControl>
              <FormDescription>Ingrese el modelo de la unidad</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="año"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BUS">Bus</SelectItem>
                    <SelectItem value="VAN">Van</SelectItem>
                    <SelectItem value="CAMION">Camión</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="kilometraje"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kilometraje</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                />
              </FormControl>
              <FormDescription>Kilometraje actual de la unidad</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueno_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dueño *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un dueño" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {owners?.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.nombre || `Dueño ${owner.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Seleccione el dueño de la unidad</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chofer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chofer Asignado</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {drivers.map((chofer) => (
                    <SelectItem key={chofer.chofer_id} value={chofer.chofer_id.toString()}>
                      {chofer.usuario_nombre || `Chofer ${chofer.chofer_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Seleccione un chofer (opcional)</FormDescription>
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
            {unit ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

