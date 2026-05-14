"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { configService } from "@/services/configService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Edit, Loader2, Settings, Trash2, AlertTriangle, Info, MoreHorizontal, Wrench } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { getAllEspecialidades, createEspecialidad, updateEspecialidad, toggleEspecialidadStatus, deleteEspecialidad } from "@/services/especialidadesService";

const especialidadSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido (mín. 2 caracteres)"),
});

const ruleSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido (mín. 2 caracteres)"),
  umbral_km: z.coerce.number().int().min(1, "Debe ser mayor a 0"),
});

export default function ConfiguracionesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { setIsAdmin(authService.getUser()?.rol === "ADMIN"); }, []);

  // ── Especialidades ────────────────────────────────────────────────
  const [espOpen, setEspOpen] = useState(false);
  const [espEditing, setEspEditing] = useState(null);
  const [espDeletingId, setEspDeletingId] = useState(null);

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getAllEspecialidades,
  });

  const espForm = useForm({ resolver: zodResolver(especialidadSchema), defaultValues: { nombre: "" } });

  const espCreateMutation = useMutation({
    mutationFn: (data) => createEspecialidad(data),
    onSuccess: () => { toast.success("Especialidad creada"); queryClient.invalidateQueries({ queryKey: ["especialidades"] }); setEspOpen(false); espForm.reset(); },
    onError: (e) => toast.error(e.message),
  });

  const espUpdateMutation = useMutation({
    mutationFn: ({ id, ...data }) => updateEspecialidad(id, data),
    onSuccess: () => { toast.success("Especialidad actualizada"); queryClient.invalidateQueries({ queryKey: ["especialidades"] }); setEspOpen(false); setEspEditing(null); espForm.reset(); },
    onError: (e) => toast.error(e.message),
  });

  const espToggleMutation = useMutation({
    mutationFn: (id) => toggleEspecialidadStatus(id),
    onSuccess: (res) => {
      toast.success(res.message);
      // Backend devuelve advertencias informativas si la especialidad
      // tiene técnicos activos asignados (la opción ya no se ofrecerá
      // para nuevos técnicos hasta reactivarla).
      if (Array.isArray(res?.advertencias)) {
        res.advertencias.forEach((adv) =>
          toast.warning(adv, { duration: 9000 })
        );
      }
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const espDeleteMutation = useMutation({
    mutationFn: (id) => deleteEspecialidad(id),
    onSuccess: (res) => { toast.success(res.message); queryClient.invalidateQueries({ queryKey: ["especialidades"] }); setEspDeletingId(null); },
    onError: (e) => { toast.error(e.message); setEspDeletingId(null); },
  });

  const openEspDialog = (esp = null) => {
    setEspEditing(esp);
    espForm.reset({ nombre: esp?.nombre || "" });
    setEspOpen(true);
  };

  const onEspSubmit = (values) => {
    if (espEditing) espUpdateMutation.mutate({ id: espEditing.id, ...values });
    else espCreateMutation.mutate(values);
  };
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateImpact, setDeactivateImpact] = useState(null);
  const [resolveAlertsOnDeactivate, setResolveAlertsOnDeactivate] = useState(true);

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
    mutationFn: ({ id, resolveAlerts, ...data }) =>
      configService.updateConfig(id, data, { resolveAlerts }),
    onSuccess: (data) => {
      const resueltas = data?.alertas_resueltas;
      if (resueltas > 0) {
        toast.success(`Regla actualizada · ${resueltas} alerta${resueltas === 1 ? "" : "s"} resuelta${resueltas === 1 ? "" : "s"}`);
      } else {
        toast.success("Regla actualizada");
      }
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
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

  const toggleActivo = async (config) => {
    if (config.activo) {
      // Desactivando: pedir confirmación con impacto
      setDeactivateTarget(config);
      setDeactivateImpact(null);
      setResolveAlertsOnDeactivate(true);
      try {
        const impact = await configService.getConfigImpact(config.id);
        setDeactivateImpact(impact);
      } catch {
        setDeactivateImpact({ alertas_activas: 0, mantenimientos_en_curso: 0 });
      }
    } else {
      // Activando: aplicar directo
      updateMutation.mutate({ id: config.id, umbral_km: config.umbral_km, activo: true });
    }
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    updateMutation.mutate(
      {
        id: deactivateTarget.id,
        umbral_km: deactivateTarget.umbral_km,
        activo: false,
        resolveAlerts: resolveAlertsOnDeactivate && (deactivateImpact?.alertas_activas > 0),
      },
      { onSettled: () => setDeactivateTarget(null) }
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => configService.deleteConfig(id),
    onSuccess: () => {
      toast.success("Regla eliminada");
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      setDeletingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

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
        <PageSkeleton variant="table" rowCount={5} title={false} action={false} />
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
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingId(c.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Confirmar Desactivación */}
      <Dialog open={!!deactivateTarget} onOpenChange={(v) => { if (!v) setDeactivateTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Desactivar regla "{deactivateTarget?.nombre}"
            </DialogTitle>
            <DialogDescription>
              ¿Qué efecto tiene desactivar esta regla?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md bg-muted/40 border p-3 space-y-1.5">
              <p className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span><strong>Dejará de generar alertas nuevas</strong> al registrar llegadas</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>No aparecerá en el estado predictivo de las unidades</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>No se mostrará en formularios de mantenimiento preventivo</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Las alertas activas existentes <strong>siguen visibles</strong> hasta resolverlas</span>
              </p>
            </div>

            {deactivateImpact == null ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando impacto...
              </div>
            ) : (
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Impacto actual
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{deactivateImpact.alertas_activas}</p>
                    <p className="text-xs text-muted-foreground">alerta{deactivateImpact.alertas_activas === 1 ? "" : "s"} activa{deactivateImpact.alertas_activas === 1 ? "" : "s"}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{deactivateImpact.mantenimientos_en_curso}</p>
                    <p className="text-xs text-muted-foreground">mantenimiento{deactivateImpact.mantenimientos_en_curso === 1 ? "" : "s"} en curso</p>
                  </div>
                </div>

                {deactivateImpact.alertas_activas > 0 && (
                  <label className="flex items-start gap-2 pt-2 mt-2 border-t cursor-pointer">
                    <Checkbox
                      checked={resolveAlertsOnDeactivate}
                      onCheckedChange={(v) => setResolveAlertsOnDeactivate(!!v)}
                      className="mt-0.5"
                    />
                    <span className="text-xs">
                      <strong>Resolver también las {deactivateImpact.alertas_activas} alerta{deactivateImpact.alertas_activas === 1 ? "" : "s"} activa{deactivateImpact.alertas_activas === 1 ? "" : "s"}</strong>
                      <br />
                      <span className="text-muted-foreground">Recomendado para evitar inconsistencias en el dashboard</span>
                    </span>
                  </label>
                )}

                {deactivateImpact.mantenimientos_en_curso > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 pt-2 border-t mt-2">
                    Hay mantenimientos en curso que la incluyen — revísalos antes de desactivar.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
            <Button
              variant="default"
              onClick={confirmDeactivate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Desactivar regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Eliminación */}
      <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar regla?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción es irreversible. Si hay alertas activas vinculadas a esta parte, no podrá eliminarse.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* ── Sección: Especialidades de Técnicos ── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Especialidades de Técnicos
            </h2>
            <p className="text-sm text-muted-foreground">Catálogo de especialidades disponibles al registrar un técnico.</p>
          </div>
          <Button onClick={() => openEspDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Especialidad
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {especialidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No hay especialidades registradas.</TableCell>
                </TableRow>
              ) : especialidades.map((esp) => (
                <TableRow key={esp.id} className={!esp.activo ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell className="font-medium">{esp.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={esp.activo}
                        onCheckedChange={() => espToggleMutation.mutate(esp.id)}
                        disabled={espToggleMutation.isPending}
                      />
                      <Badge variant={esp.activo ? "outline" : "secondary"} className={esp.activo ? "border-green-500 text-green-600" : ""}>
                        {esp.activo ? "Activa" : "Inactiva"}
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
                        <DropdownMenuItem onClick={() => openEspDialog(esp)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setEspDeletingId(esp.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog: Crear / Editar especialidad */}
      <Dialog open={espOpen} onOpenChange={(v) => { if (!v) { setEspOpen(false); setEspEditing(null); espForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{espEditing ? "Editar Especialidad" : "Nueva Especialidad"}</DialogTitle>
            <DialogDescription>Ingresa el nombre de la especialidad técnica.</DialogDescription>
          </DialogHeader>
          <Form {...espForm}>
            <form onSubmit={espForm.handleSubmit(onEspSubmit)} className="space-y-4">
              <FormField control={espForm.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder="Ej: Mecánica General" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEspOpen(false); setEspEditing(null); espForm.reset(); }}>Cancelar</Button>
                <Button type="submit" disabled={espCreateMutation.isPending || espUpdateMutation.isPending}>
                  {(espCreateMutation.isPending || espUpdateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {espEditing ? "Guardar Cambios" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar eliminación especialidad */}
      <Dialog open={!!espDeletingId} onOpenChange={(v) => { if (!v) setEspDeletingId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> ¿Eliminar especialidad?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. Solo se puede eliminar si ningún técnico la tiene asignada.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEspDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => espDeleteMutation.mutate(espDeletingId)} disabled={espDeleteMutation.isPending}>
              {espDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
