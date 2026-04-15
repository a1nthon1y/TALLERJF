"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PlusCircle, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getAllUnits } from "@/services/unitsService"
import { makeGetRequest, makePostRequest } from "@/utils/api"

async function getAllParts() {
  try {
    return await makeGetRequest("/parts");
  } catch {
    return [];
  }
}

async function createPart(data) {
  return await makePostRequest("/parts", data);
}

const formSchema = z.object({
  unidad_id: z.string().min(1, "Seleccione una unidad"),
  nombre: z.string().min(2, "Nombre requerido"),
  kilometraje_mantenimiento: z.coerce.number().int().min(1, "Debe ser mayor a 0"),
})

const calculateRemainingLife = (part, unidades) => {
  const unit = unidades.find((u) => u.id === part.unidad_id)
  const currentKm = unit?.kilometraje || 0
  const kmSince = currentKm - (part.ultimo_mantenimiento_km || 0)
  const pct = 100 - (kmSince / part.kilometraje_mantenimiento) * 100
  return Math.max(0, Math.min(100, pct))
}

const getStatus = (pct) => {
  if (pct <= 10) return "critical"
  if (pct <= 25) return "warning"
  return "normal"
}

export function UnitPartsManager() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [isOpen, setIsOpen] = useState(false)

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["units"],
    queryFn: getAllUnits,
  })

  const { data: parts = [], isLoading: loadingParts } = useQuery({
    queryKey: ["parts"],
    queryFn: getAllParts,
  })

  const createMutation = useMutation({
    mutationFn: createPart,
    onSuccess: () => {
      toast.success("Parte registrada correctamente")
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      setIsOpen(false)
      form.reset()
    },
    onError: (e) => toast.error(e.message || "Error al registrar parte"),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { unidad_id: "", nombre: "", kilometraje_mantenimiento: "" },
  })

  const onSubmit = (values) => {
    createMutation.mutate({
      unidad_id: parseInt(values.unidad_id),
      nombre: values.nombre,
      kilometraje_mantenimiento: values.kilometraje_mantenimiento,
    })
  }

  const filtered = parts.filter((p) => {
    const unit = units.find((u) => u.id === p.unidad_id)
    const matchSearch =
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit?.placa?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchUnit = unitFilter === "all" || p.unidad_id?.toString() === unitFilter
    return matchSearch && matchUnit
  })

  const isLoading = loadingUnits || loadingParts

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nombre o placa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por unidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las unidades</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.placa} - {u.kilometraje?.toLocaleString()} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsOpen(true)} className="ml-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nueva Parte
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando partes...
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidad</TableHead>
                <TableHead>Parte</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Último Mantenimiento</TableHead>
                <TableHead>Km Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vida Útil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron partes registradas.
                  </TableCell>
                </TableRow>
              ) : filtered.map((part) => {
                const unit = units.find((u) => u.id === part.unidad_id)
                const pct = calculateRemainingLife(part, units)
                const status = getStatus(pct)
                const currentKm = unit?.kilometraje || 0
                const kmSince = currentKm - (part.ultimo_mantenimiento_km || 0)
                return (
                  <TableRow key={part.id} className={status === "critical" ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-medium">{unit?.placa || `#${part.unidad_id}`}</TableCell>
                    <TableCell>{part.nombre}</TableCell>
                    <TableCell>{part.kilometraje_mantenimiento?.toLocaleString()} km</TableCell>
                    <TableCell>{(part.ultimo_mantenimiento_km || 0).toLocaleString()} km</TableCell>
                    <TableCell>{currentKm.toLocaleString()} km</TableCell>
                    <TableCell>
                      {status === "critical" ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" /> Crítico
                        </Badge>
                      ) : status === "warning" ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit border-yellow-500 text-yellow-600">
                          <AlertTriangle className="h-3 w-3" /> Advertencia
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit border-green-500 text-green-600">
                          <CheckCircle className="h-3 w-3" /> Normal
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-2 w-24" />
                              <span className="text-xs w-8">{Math.round(pct)}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {kmSince >= part.kilometraje_mantenimiento
                              ? `Excedido por ${(kmSince - part.kilometraje_mantenimiento).toLocaleString()} km`
                              : `Faltan ${(part.kilometraje_mantenimiento - kmSince).toLocaleString()} km`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Crítico",
            icon: AlertCircle,
            filter: "critical",
            cardClass: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
            iconClass: "h-5 w-5 text-red-500",
          },
          {
            label: "Advertencia",
            icon: AlertTriangle,
            filter: "warning",
            cardClass: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
            iconClass: "h-5 w-5 text-amber-500",
          },
          {
            label: "Normal",
            icon: CheckCircle,
            filter: "normal",
            cardClass: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
            iconClass: "h-5 w-5 text-green-500",
          },
        ].map(({ label, icon: Icon, filter: f, cardClass, iconClass }) => {
          const count = filtered.filter((p) => getStatus(calculateRemainingLife(p, units)) === f).length
          return (
            <div key={f} className={`p-4 rounded-lg border ${cardClass}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={iconClass} />
                <h3 className="font-medium">{label}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{count} partes</p>
            </div>
          )
        })}
      </div>

      {/* Dialog: Crear parte */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Parte</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="unidad_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.placa} — {u.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Parte</FormLabel>
                  <FormControl><Input placeholder="Ej: Motor, Frenos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kilometraje_mantenimiento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo de Mantenimiento (km)</FormLabel>
                  <FormControl><Input type="number" min="1" placeholder="Ej: 5000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Registrar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
