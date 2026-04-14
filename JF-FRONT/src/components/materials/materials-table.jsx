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
import { Edit, Trash2, MoreHorizontal, Package } from "lucide-react"
import { useMaterials } from "@/hooks/useMaterials"
import { materialService } from "@/services/materialService"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { authService } from "@/services/authService"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre es requerido" }),
  descripcion: z.string().min(1, { message: "La descripción es requerida" }),
  stock: z.number().min(0, { message: "El stock no puede ser negativo" }),
  precio: z.string().min(1, { message: "El precio es requerido" }),
})

export function MaterialsTable() {
  const router = useRouter()
  const { data: materials, isLoading, isError, mutate } = useMaterials()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      stock: 0,
      precio: "0.00",
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
        <div className="text-center">Cargando materiales...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          Error al cargar los materiales. Por favor, intente nuevamente.
        </div>
      </div>
    )
  }

  const filteredMaterials = materials?.filter((material) => {
    if (!material) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (material.nombre?.toLowerCase() || '').includes(searchLower) ||
      (material.descripcion?.toLowerCase() || '').includes(searchLower) ||
      (material.precio?.toString() || '').toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleUpdateMaterial = async (values) => {
    try {
      const dataToSubmit = {
        ...values,
        precio: values.precio // Ya viene como string
      }
      
      const response = await materialService.updateMaterial(selectedMaterial.id, dataToSubmit)
      toast.success(response.message || "Material actualizado correctamente")
      setIsEditing(false)
      setSelectedMaterial(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteMaterial = async () => {
    try {
      const response = await materialService.deleteMaterial(selectedMaterial.id)
      toast.success(response.message || "Material eliminado correctamente")
      setIsDeleting(false)
      setSelectedMaterial(null)
      await mutate()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleEditClick = (material) => {
    setSelectedMaterial(material)
    form.reset({
      nombre: material.nombre,
      descripcion: material.descripcion,
      stock: material.stock,
      precio: material.precio.toString(),
    })
    setIsEditing(true)
  }

  const handleDeleteClick = (material) => {
    setSelectedMaterial(material)
    setIsDeleting(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Buscar por nombre, descripción o precio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.map((material) => (
              <TableRow key={material.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{material.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>{material.descripcion}</TableCell>
                <TableCell>
                  <Badge variant={material.stock <= 5 ? "destructive" : "default"}>
                    {material.stock}
                  </Badge>
                </TableCell>
                <TableCell>${parseFloat(material.precio).toFixed(2)}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEditClick(material)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(material)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
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
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Modifique los datos del material.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateMaterial)} className="space-y-4">
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
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        min="0"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        type="text"
                        {...field}
                        onChange={(e) => {
                          // Validar que solo contenga números y un punto decimal
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          // Asegurar que solo haya un punto decimal
                          const parts = value.split('.');
                          if (parts.length > 2) {
                            field.onChange(parts[0] + '.' + parts.slice(1).join(''));
                          } else {
                            field.onChange(value);
                          }
                        }}
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

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Está seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el material.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleting(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteMaterial}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
