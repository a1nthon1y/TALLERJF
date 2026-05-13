"use client"

import React, { useState, useEffect } from "react"
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
import { Edit, Trash2, MoreHorizontal, Package, PackageX, History, ChevronUp, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
// useMaterials moved to parent (materiales/page.jsx) to avoid double fetch
import { materialService } from "@/services/materialService"
import { makeGetRequest, makePatchRequest } from "@/utils/api"
import { useMutation } from "@tanstack/react-query"
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

export function MaterialsTable({ materials, isLoading, isError, mutate }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const toggleMutation = useMutation({
    mutationFn: (id) => makePatchRequest(`/materials/${id}/status`, {}),
    onSuccess: (res) => { toast.success(res.message || "Estado actualizado"); mutate() },
    onError: (err) => toast.error(err.message || "Error al cambiar estado del material", { duration: 6000 }),
  })

  const [expandedId, setExpandedId] = useState(null)
  const [usageData, setUsageData] = useState({})
  const [usageLoading, setUsageLoading] = useState(false)

  const handleToggleUsage = async (material) => {
    if (expandedId === material.id) { setExpandedId(null); return }
    setExpandedId(material.id)
    if (usageData[material.id]) return
    setUsageLoading(true)
    try {
      const data = await makeGetRequest(`/materials/${material.id}/usage`)
      setUsageData((prev) => ({ ...prev, [material.id]: data }))
    } catch {
      toast.error("Error al cargar usos del material")
    } finally {
      setUsageLoading(false)
    }
  }

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
      nombre: material.nombre || "",
      descripcion: material.descripcion || "",
      stock: material.stock ?? 0,
      precio: material.precio != null ? material.precio.toString() : "0.00",
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
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <PackageX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-muted-foreground text-sm">
                    {searchTerm ? "Sin resultados para esa búsqueda" : "No hay materiales registrados"}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {filteredMaterials.map((material) => (
              <React.Fragment key={material.id}>
                <TableRow className={material.activo === false ? "opacity-60 bg-muted/30" : ""}>
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
                  <TableCell>S/. {parseFloat(material.precio).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={material.activo !== false}
                        onCheckedChange={() => toggleMutation.mutate(material.id)}
                        disabled={toggleMutation.isPending}
                      />
                      <Badge variant={material.activo !== false ? "outline" : "secondary"} className={material.activo !== false ? "border-green-500 text-green-600" : ""}>
                        {material.activo !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
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
                        <DropdownMenuItem onClick={() => handleToggleUsage(material)}>
                          {expandedId === material.id
                            ? <><ChevronUp className="mr-2 h-4 w-4" />Ocultar usos</>
                            : <><History className="mr-2 h-4 w-4" />Ver usos</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(material)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(material)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {expandedId === material.id && (
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={6} className="py-3 px-6">
                      <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <History className="h-3.5 w-3.5" />
                        Usos de <span className="text-foreground font-semibold">{material.nombre}</span> en mantenimientos
                      </div>
                      {usageLoading && !usageData[material.id] ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                        </div>
                      ) : !usageData[material.id] || usageData[material.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground">Este material no se ha usado en ningún mantenimiento aún.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground border-b">
                              <th className="text-left pb-1 font-medium">Unidad</th>
                              <th className="text-left pb-1 font-medium">Tipo</th>
                              <th className="text-left pb-1 font-medium">Estado</th>
                              <th className="text-left pb-1 font-medium">Fecha</th>
                              <th className="text-left pb-1 font-medium">Cant.</th>
                              <th className="text-left pb-1 font-medium">Costo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usageData[material.id].map((uso) => (
                              <tr key={uso.detalle_id} className="border-b last:border-0">
                                <td className="py-1 pr-4 font-medium">{uso.placa} <span className="text-muted-foreground font-normal">({uso.modelo})</span></td>
                                <td className="py-1 pr-4 capitalize">{uso.tipo}</td>
                                <td className="py-1 pr-4">
                                  <Badge variant="outline" className="text-xs">{uso.estado}</Badge>
                                </td>
                                <td className="py-1 pr-4 text-muted-foreground">{uso.fecha_programada ? new Date(uso.fecha_programada).toLocaleDateString("es-PE") : "—"}</td>
                                <td className="py-1 pr-4">{uso.cantidad}</td>
                                <td className="py-1">S/. {parseFloat(uso.costo_total).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
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
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
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
                    <FormLabel>Precio (S/.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
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
