"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { technicianService } from "@/services/technicianService"
import { makePutRequest } from "@/utils/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { PlusCircle, MoreHorizontal, Edit, Loader2, Hammer } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  dni: z.string().min(8, "DNI debe tener al menos 8 caracteres").max(20),
  especialidad: z.string().min(2, "Especialidad requerida"),
  activo: z.boolean().default(true),
})

export default function TecnicosPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: tecnicos = [], isLoading } = useQuery({
    queryKey: ["tecnicos"],
    queryFn: technicianService.getTechnicians.bind(technicianService),
  })

  const createMutation = useMutation({
    mutationFn: (data) => technicianService.createTechnician(data),
    onSuccess: () => {
      toast.success("Técnico creado correctamente")
      queryClient.invalidateQueries({ queryKey: ["tecnicos"] })
      closeDialog()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => technicianService.updateTechnician(id, data),
    onSuccess: () => {
      toast.success("Técnico actualizado")
      queryClient.invalidateQueries({ queryKey: ["tecnicos"] })
      closeDialog()
    },
    onError: (e) => toast.error(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }) => makePutRequest(`/technicians/${id}/status`, { activo }),
    onSuccess: () => {
      toast.success("Estado actualizado")
      queryClient.invalidateQueries({ queryKey: ["tecnicos"] })
    },
    onError: (e) => toast.error(e.message),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: "", dni: "", especialidad: "", activo: true },
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({ nombre: "", dni: "", especialidad: "", activo: true })
    setIsOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    form.reset({ nombre: t.nombre, dni: t.dni, especialidad: t.especialidad, activo: t.activo })
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setEditing(null)
    form.reset()
  }

  const onSubmit = (values) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, nombre: values.nombre, dni: values.dni, especialidad: values.especialidad })
    } else {
      createMutation.mutate(values)
    }
  }

  const filtered = tecnicos.filter((t) =>
    t.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.especialidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.dni?.includes(searchTerm)
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Hammer className="h-6 w-6" /> Técnicos
          </h1>
          <p className="text-muted-foreground">Gestiona el personal técnico de mantenimiento</p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Agregar Técnico
        </Button>
      </div>

      <div className="flex items-center">
        <Input
          placeholder="Buscar por nombre, DNI o especialidad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando técnicos...
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No se encontraron técnicos
                  </TableCell>
                </TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">{t.dni}</TableCell>
                  <TableCell>{t.especialidad}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.activo}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: t.id, activo: checked })}
                        disabled={toggleMutation.isPending}
                      />
                      <Badge variant={t.activo ? "outline" : "secondary"} className={t.activo ? "border-green-500 text-green-600" : ""}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEdit(t)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Crear / Editar */}
      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Técnico" : "Agregar Técnico"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl><Input placeholder="Ej. Juan Pérez" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dni" render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI</FormLabel>
                  <FormControl><Input placeholder="Ej. 12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="especialidad" render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl><Input placeholder="Ej. Motor y transmisión" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? "Guardar Cambios" : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
