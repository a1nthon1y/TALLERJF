"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { configService } from "@/services/configService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Edit, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

const ruleSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido (mín. 2 caracteres)"),
  umbral_km: z.coerce.number().int().min(1, "Debe ser mayor a 0"),
});

export default function ConfiguracionesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["configs"],
    queryFn: configService.getConfigs.bind(configService),
  });

  const createMutation = useMutation({
    mutationFn: (data) => configService.createConfig(data),
    onSuccess: () => {
      toast.success("Regla creada correctamente");
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => configService.updateConfig(id, data),
    onSuccess: () => {
      toast.success("Regla actualizada");
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: { nombre: "", umbral_km: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ nombre: "", umbral_km: "" });
    setIsOpen(true);
  };

  const openEdit = (config) => {
    setEditing(config);
    form.reset({ nombre: config.nombre, umbral_km: config.umbral_km });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setEditing(null);
    form.reset();
  };

  const onSubmit = (values) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, umbral_km: values.umbral_km, activo: editing.activo });
    } else {
      createMutation.mutate(values);
    }
  };

  const toggleActivo = (config) => {
    updateMutation.mutate({ id: config.id, umbral_km: config.umbral_km, activo: !config.activo });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración Predictiva</h1>
          <p className="text-muted-foreground">
            Administra los umbrales de kilometraje que disparan alertas automáticas para cada componente.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Regla
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando configuraciones...
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parte / Componente</TableHead>
                <TableHead>Umbral Límite (Km)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px] text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No hay reglas configuradas. Añade la primera regla predictiva.
                  </TableCell>
                </TableRow>
              ) : configs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.umbral_km?.toLocaleString()} km</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.activo}
                        onCheckedChange={() => toggleActivo(c)}
                        disabled={isPending}
                      />
                      <Badge variant={c.activo ? "outline" : "secondary"} className={c.activo ? "border-green-500 text-green-600" : ""}>
                        {c.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar regla">
                      <Edit className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>{editing ? "Editar Regla de Mantenimiento" : "Nueva Regla de Mantenimiento"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Componente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Aceite de motor, Frenos"
                      {...field}
                      disabled={!!editing}
                    />
                  </FormControl>
                  {editing && <p className="text-xs text-muted-foreground">El nombre no se puede editar.</p>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="umbral_km" render={({ field }) => (
                <FormItem>
                  <FormLabel>Umbral de Alerta (km)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="Ej: 5000" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Se generará una alerta cuando el componente supere este kilometraje sin mantenimiento.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? "Guardar Cambios" : "Crear Regla"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
