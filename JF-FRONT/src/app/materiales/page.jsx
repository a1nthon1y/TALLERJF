"use client"

import { useState, useMemo } from "react"
import { MaterialsTable } from "@/components/materials/materials-table"
import { Button } from "@/components/ui/button"
import { Plus, ShoppingCart, Package } from "lucide-react"
import { materialService } from "@/services/materialService"
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
import { useMaterials } from "@/hooks/useMaterials"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(120, { message: "Máximo 120 caracteres" }),
  descripcion: z
    .string()
    .trim()
    .min(1, { message: "La descripción es requerida" })
    .max(500, { message: "Máximo 500 caracteres" }),
  stock: z
    .number({ invalid_type_error: "Stock inválido" })
    .int({ message: "El stock debe ser entero" })
    .min(0, { message: "El stock no puede ser negativo" })
    .max(999999, { message: "Stock demasiado alto" }),
  precio: z
    .number({ invalid_type_error: "Precio inválido" })
    .positive({ message: "El precio debe ser mayor a 0" })
    .max(999999.99, { message: "Precio demasiado alto" }),
})

export default function MaterialsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const { data: materials, isLoading, isError, mutate } = useMaterials()

  const internalMaterials = useMemo(
    () => (materials || []).filter((m) => !m.es_externo),
    [materials]
  )
  const externalMaterials = useMemo(
    () => (materials || []).filter((m) => m.es_externo),
    [materials]
  )

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      stock: 0,
      precio: 0,
    },
  });

  const handleCreateMaterial = async (values) => {
    try {
      const newMaterial = await materialService.createMaterial(values);
      toast.success("Material creado correctamente");
      setIsCreating(false);
      form.reset();
      // Actualizar la lista de materiales inmediatamente
      await mutate()
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Materiales</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Agregar Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Material</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo material.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateMaterial)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Input placeholder="Descripción del material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Cantidad en stock" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Precio del material" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Material
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="internal">
        <TabsList>
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock interno
            {!isLoading && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {internalMaterials.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Compras externas
            {!isLoading && externalMaterials.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs border-orange-300 text-orange-600">
                {externalMaterials.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4">
          <MaterialsTable
            materials={internalMaterials}
            isLoading={isLoading}
            isError={isError}
            mutate={mutate}
          />
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <div className="rounded-md border border-orange-200 bg-orange-50/40 dark:bg-orange-950/10 dark:border-orange-900/40 p-3 mb-3 text-sm text-orange-700 dark:text-orange-300">
            Estos materiales fueron registrados desde un mantenimiento como compras externas (no pertenecen al stock habitual).
            Si quedó sobrante y se agregó al stock, aparecerán con cantidad disponible y podrán usarse como stock interno en futuros mantenimientos.
          </div>
          <MaterialsTable
            materials={externalMaterials}
            isLoading={isLoading}
            isError={isError}
            mutate={mutate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

