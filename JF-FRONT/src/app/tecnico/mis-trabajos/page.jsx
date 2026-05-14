"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { maintenanceService } from "@/services/maintenanceService";
import { makeGetRequest } from "@/utils/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Wrench, AlertCircle, Loader2, Play, CheckCircle2, Zap,
  Gauge, Calendar, ChevronDown, ChevronUp, MapPin, Package,
  Plus, Trash2, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

// Schemas Zod (fuente única de validación)
const addMaterialSchema = z.object({
  material_id: z
    .string()
    .min(1, { message: "Selecciona un material." })
    .refine((v) => Number(v) > 0, { message: "Selecciona un material válido." }),
  cantidad: z.coerce
    .number({ invalid_type_error: "Cantidad inválida." })
    .positive({ message: "La cantidad debe ser mayor a 0." })
    .max(99999, { message: "Cantidad demasiado alta." }),
});

const completeJobSchema = z.object({
  partes_reparadas: z.array(z.number().int().positive()),
  notas: z.string().max(1000, { message: "Máximo 1000 caracteres." }).optional().or(z.literal("")),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseObservaciones(text) {
  if (!text) return { procedencia: null, requerimientos: [], observaciones: null };
  const isStructured =
    text.includes("PROCEDENCIA:") ||
    text.includes("REQUERIMIENTOS:") ||
    text.includes("OBSERVACIONES:");
  if (!isStructured) return { procedencia: null, requerimientos: [], observaciones: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let procedencia = null, requerimientos = [], observaciones = null, section = null;
  for (const line of lines) {
    if (line.startsWith("PROCEDENCIA:")) { section = "proc"; procedencia = line.replace("PROCEDENCIA:", "").trim(); }
    else if (line.startsWith("REQUERIMIENTOS:")) { section = "req"; }
    else if (line.startsWith("OBSERVACIONES:")) { section = "obs"; observaciones = line.replace("OBSERVACIONES:", "").trim(); }
    else if (section === "req" && line.startsWith("- ")) requerimientos.push(line.slice(2));
    else if (section === "obs") observaciones = (observaciones ? observaciones + " " : "") + line;
  }
  return { procedencia, requerimientos, observaciones };
}

function getResumen(observaciones) {
  const p = parseObservaciones(observaciones);
  if (p.requerimientos.length > 0) return p.requerimientos.join(" · ");
  if (p.observaciones) return p.observaciones;
  return "Sin descripción";
}

const ESTADO_CONFIG = {
  PENDIENTE:  { label: "Pendiente",   color: "border-gray-300 bg-gray-50 text-gray-600" },
  EN_PROCESO: { label: "En Proceso",  color: "border-blue-300 bg-blue-50 text-blue-700" },
  COMPLETADO: { label: "Completado",  color: "border-green-300 bg-green-50 text-green-700" },
  CERRADO:    { label: "Cerrado",     color: "border-gray-300 bg-gray-100 text-gray-500" },
  REALIZADO:  { label: "Resuelto en ruta", color: "border-purple-300 bg-purple-50 text-purple-700" },
};

const estadoBadge = (estado) => {
  const cfg = ESTADO_CONFIG[estado?.toUpperCase()] || ESTADO_CONFIG.PENDIENTE;
  return <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>;
};

// Barra de progreso del flujo
function FlowStepper({ estado }) {
  const steps = ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CERRADO"];
  const idx = steps.indexOf(estado?.toUpperCase());
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex-1 h-1 rounded-full transition-colors ${done ? "bg-primary" : "bg-muted"}`} />
            {i < steps.length - 1 && (
              <div className={`h-2 w-2 rounded-full mx-0.5 shrink-0 transition-colors ${done ? "bg-primary" : "bg-muted"} ${active ? "ring-2 ring-primary/30" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Material manager inline ──────────────────────────────────────────────────

function MaterialManager({ jobId, readonly = false }) {
  const [materials, setMaterials] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  // Compra externa: pieza fuera del stock interno (urgencia, no en catálogo)
  const [externalOpen, setExternalOpen] = useState(false);
  const [externalSaving, setExternalSaving] = useState(false);
  const [external, setExternal] = useState({
    nombre: "", precio_unit: "", cantidad_usada: 1, cantidad_comprada: 1, descripcion: "",
  });
  const resetExternal = () => setExternal({
    nombre: "", precio_unit: "", cantidad_usada: 1, cantidad_comprada: 1, descripcion: "",
  });

  const form = useForm({
    resolver: zodResolver(addMaterialSchema),
    defaultValues: { material_id: "", cantidad: 1 },
  });

  const fetchMaterials = useCallback(() => {
    maintenanceService.getMaintenanceMaterials(jobId)
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    fetchMaterials();
    if (!readonly) {
      makeGetRequest("/materials")
        .then((data) => setCatalog(Array.isArray(data) ? data : []))
        .catch(() => setCatalog([]));
    }
  }, [jobId, readonly, fetchMaterials]);

  const handleAdd = async ({ material_id, cantidad }) => {
    setSaving(true);
    try {
      await maintenanceService.addMaintenanceMaterial(jobId, Number(material_id), Number(cantidad));
      toast.success("Material registrado");
      form.reset({ material_id: "", cantidad: 1 });
      setAdding(false);
      fetchMaterials();
    } catch (e) {
      toast.error(e.message || "Error al registrar el material.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (detalleId) => {
    try {
      await maintenanceService.removeMaintenanceMaterial(jobId, detalleId);
      toast.success("Material eliminado");
      fetchMaterials();
    } catch (e) {
      toast.error(e.message || "Error al eliminar el material.");
    }
  };

  const handleAddExternal = async () => {
    const nombre = external.nombre.trim();
    const precio = Number(external.precio_unit);
    const usada = Number(external.cantidad_usada);
    const comprada = Number(external.cantidad_comprada || external.cantidad_usada);
    if (!nombre) return toast.error("Indica el nombre de la pieza.");
    if (!Number.isFinite(precio) || precio < 0) return toast.error("El costo unitario debe ser un número ≥ 0.");
    if (!Number.isFinite(usada) || usada <= 0) return toast.error("La cantidad usada debe ser mayor a 0.");
    if (!Number.isFinite(comprada) || comprada < usada) return toast.error("La cantidad comprada debe ser ≥ la usada.");
    setExternalSaving(true);
    try {
      const added = await maintenanceService.addExternalMaterial(jobId, {
        nombre,
        precio_unit: precio,
        cantidad_usada: usada,
        cantidad_comprada: comprada,
        descripcion: external.descripcion?.trim() || undefined,
      });
      const sobrante = Number(added?.sobrante_a_stock || 0);
      toast.success(
        sobrante > 0
          ? `Compra externa registrada. ${sobrante} unidad(es) sobrante(s) entraron al stock.`
          : "Compra externa registrada"
      );
      resetExternal();
      setExternalOpen(false);
      fetchMaterials();
    } catch (e) {
      toast.error(e.message || "Error al registrar la compra externa.");
    } finally {
      setExternalSaving(false);
    }
  };

  const total = materials.reduce((s, m) => s + Number(m.costo_total || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Package className="h-3.5 w-3.5" /> Materiales utilizados
        </p>
        {!readonly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => {
              setAdding((v) => !v);
              form.reset({ material_id: "", cantidad: 1 });
            }}
          >
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : materials.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin materiales registrados</p>
      ) : (
        <div className="space-y-1">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium truncate">{m.nombre}</span>
                {m.es_externo && (
                  <span
                    className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded border border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
                    title="Compra externa: pieza fuera del stock"
                  >
                    Externo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>x{m.cantidad}</span>
                <span className="font-medium text-foreground">S/ {Number(m.costo_total).toFixed(2)}</span>
                {!readonly && (
                  <button onClick={() => handleRemove(m.id)} className="text-destructive hover:text-destructive/70 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end text-xs font-semibold pt-1 border-t">
            Total: S/ {total.toFixed(2)}
          </div>
        </div>
      )}

      {adding && !readonly && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAdd)} className="pt-1 space-y-1">
            <div className="flex gap-2 items-start">
              <FormField
                control={form.control}
                name="material_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs" aria-invalid={!!form.formState.errors.material_id}>
                          <SelectValue placeholder="Seleccionar material..." />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nombre} (stock: {c.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cantidad"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        className="w-16 h-8 text-xs"
                        placeholder="Cant."
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Agregar"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Compra externa: pieza fuera del stock interno (urgencia, no en catálogo).
          Sub-form colapsable para no inflar la UI cuando no se usa. */}
      {!readonly && !externalOpen && (
        <button
          type="button"
          className="w-full text-[11px] text-orange-700 dark:text-orange-300 border border-dashed border-orange-300 dark:border-orange-900/50 rounded px-2 py-1.5 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-colors flex items-center justify-center gap-1"
          onClick={() => { resetExternal(); setExternalOpen(true) }}
        >
          <Plus className="h-3 w-3" />
          ¿La pieza no está en el stock? Registra compra externa
        </button>
      )}
      {!readonly && externalOpen && (
        <div className="border border-orange-300 dark:border-orange-900/50 rounded p-2 bg-orange-50/40 dark:bg-orange-950/10 space-y-1.5">
          <p className="text-[11px] font-semibold text-orange-800 dark:text-orange-300">
            Compra externa
          </p>
          <Input
            value={external.nombre}
            onChange={(e) => setExternal((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Nombre de la pieza"
            className="h-7 text-xs"
            maxLength={120}
          />
          <div className="flex gap-1">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={external.precio_unit}
              onChange={(e) => setExternal((s) => ({ ...s, precio_unit: e.target.value }))}
              placeholder="Costo S/."
              className="h-7 text-xs flex-1"
            />
            <Input
              type="number"
              min={1}
              step="1"
              value={external.cantidad_usada}
              onChange={(e) => {
                const v = Number(e.target.value) || 0
                setExternal((s) => ({
                  ...s,
                  cantidad_usada: v,
                  cantidad_comprada: Number(s.cantidad_comprada) < v ? v : s.cantidad_comprada,
                }))
              }}
              placeholder="Usada"
              className="h-7 text-xs w-16"
              title="Cantidad usada en este trabajo"
            />
            <Input
              type="number"
              min={Number(external.cantidad_usada) || 1}
              step="1"
              value={external.cantidad_comprada}
              onChange={(e) => setExternal((s) => ({ ...s, cantidad_comprada: Number(e.target.value) || 0 }))}
              placeholder="Comprada"
              className="h-7 text-xs w-16"
              title="Cantidad total comprada (sobrante va al stock)"
            />
          </div>
          {(() => {
            const usada = Number(external.cantidad_usada) || 0
            const comprada = Number(external.cantidad_comprada) || 0
            const sobrante = Math.max(0, comprada - usada)
            return sobrante > 0 ? (
              <p className="text-[10px] text-green-700 dark:text-green-400">
                Sobrarán {sobrante} unidad(es) → entran al stock.
              </p>
            ) : null
          })()}
          <div className="flex gap-1 pt-0.5">
            <Button size="sm" className="h-7 text-xs flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleAddExternal} disabled={externalSaving}>
              {externalSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Registrar"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setExternalOpen(false); resetExternal() }} disabled={externalSaving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dialog de completar trabajo ──────────────────────────────────────────────

function CompleteJobDialog({ job, open, onClose, onDone }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(completeJobSchema),
    defaultValues: { partes_reparadas: [], notas: "" },
  });
  const selectedParts = form.watch("partes_reparadas");

  useEffect(() => {
    if (!open) return;
    form.reset({ partes_reparadas: [], notas: "" });
    setLoading(true);
    makeGetRequest("/configs")
      .then((data) => setParts(Array.isArray(data) ? data.filter((p) => p.activo) : []))
      .catch(() => setParts([]))
      .finally(() => setLoading(false));
  }, [open, form]);

  const togglePart = (id) => {
    const current = form.getValues("partes_reparadas");
    form.setValue(
      "partes_reparadas",
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const handleConfirm = async ({ partes_reparadas, notas }) => {
    setSaving(true);
    try {
      await maintenanceService.updateMyJobStatus(job.id, "COMPLETADO", {
        partes_reparadas,
        notas_tecnico: notas?.trim() || "",
      });
      toast.success("Trabajo marcado como completado — esperando revisión del encargado");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al completar el trabajo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-green-600" />
            Completar trabajo — {job?.placa}
          </DialogTitle>
          <DialogDescription>
            Indica qué componentes fueron reparados/reemplazados y agrega notas finales para el encargado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-4">
            {/* Partes reparadas */}
            <FormField
              control={form.control}
              name="partes_reparadas"
              render={() => (
                <FormItem>
                  <FormLabel>Componentes trabajados</FormLabel>
                  {loading ? (
                    <p className="text-xs text-muted-foreground">Cargando componentes...</p>
                  ) : parts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No hay componentes configurados</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {parts.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`part-${p.id}`}
                            checked={selectedParts.includes(p.id)}
                            onCheckedChange={() => togglePart(p.id)}
                          />
                          <label htmlFor={`part-${p.id}`} className="text-sm cursor-pointer flex-1">
                            {p.nombre}
                            <span className="text-xs text-muted-foreground ml-2">
                              (intervalo: {Number(p.umbral_km).toLocaleString()} km)
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedParts.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {selectedParts.length} componente{selectedParts.length > 1 ? "s" : ""} — se resetearán sus contadores predictivos
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Materiales — solo lectura, ya se gestionaron inline */}
            <div>
              <MaterialManager jobId={job?.id} readonly />
            </div>

            {/* Notas */}
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Notas para el encargado (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Se cambió el aceite y filtros, se detectó desgaste en freno trasero derecho..."
                      className="resize-none text-sm"
                      rows={3}
                      maxLength={1000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como completado
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de trabajo ──────────────────────────────────────────────────────────

function JobCard({ job, onStart, onComplete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseObservaciones(job.observaciones);
  const esPreventivo = job.tipo?.toUpperCase() === "PREVENTIVO";
  const estado = job.estado?.toUpperCase();
  const urgent = esPreventivo && (estado === "PENDIENTE" || estado === "EN_PROCESO");
  const showMaterials = estado === "EN_PROCESO" || estado === "COMPLETADO";

  return (
    <Card className={`overflow-hidden transition-colors ${urgent ? "border-red-300 dark:border-red-800" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base">{job.placa ?? `Unidad ${job.unidad_id}`}</p>
              {job.modelo && <span className="text-xs text-muted-foreground">{job.modelo}</span>}
              {esPreventivo
                ? <Badge className="text-xs bg-red-100 text-red-700 border-red-300 flex items-center gap-1"><Zap className="h-3 w-3" /> Preventivo</Badge>
                : <Badge variant="outline" className="text-xs">Correctivo</Badge>}
              {job.codigo && (
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {job.codigo}
                </code>
              )}
            </div>
          </div>
          <div className="shrink-0">{estadoBadge(job.estado)}</div>
        </div>

        {/* Progreso visual */}
        <FlowStepper estado={estado} />

        {/* Descripción */}
        <p className="text-sm text-foreground/80 font-medium">
          {getResumen(job.observaciones)}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {job.kilometraje_actual != null && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" />
              {Number(job.kilometraje_actual).toLocaleString()} km
            </span>
          )}
          {job.fecha_solicitud && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(job.fecha_solicitud).toLocaleDateString("es-PE")}
            </span>
          )}
          {parsed.procedencia && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {parsed.procedencia}
            </span>
          )}
        </div>

        {/* Detalles expandibles */}
        {(parsed.requerimientos.length > 0 || parsed.observaciones) && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Ocultar detalles" : "Ver detalles completos"}
            </button>
            {expanded && (
              <div className="pl-2 border-l space-y-1.5 text-sm text-muted-foreground">
                {parsed.requerimientos.length > 0 && (
                  <div>
                    <p className="font-semibold text-foreground/70 text-xs uppercase tracking-wide mb-1">Qué hacer</p>
                    <ul className="space-y-0.5">
                      {parsed.requerimientos.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.observaciones && (
                  <p><span className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">Notas:</span> {parsed.observaciones}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Materiales inline (solo EN_PROCESO, COMPLETADO o CERRADO) */}
        {showMaterials && (
          <div className="pt-2 border-t">
            <MaterialManager jobId={job.id} readonly={["COMPLETADO", "CERRADO"].includes(estado)} />
          </div>
        )}

        {/* Acciones */}
        {estado === "PENDIENTE" && (
          <Button className="w-full" onClick={() => onStart(job)}>
            <Play className="h-4 w-4 mr-2" /> Iniciar trabajo
          </Button>
        )}
        {estado === "EN_PROCESO" && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => onComplete(job)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Completar y reportar al encargado
          </Button>
        )}
        {estado === "COMPLETADO" && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Trabajo completado — pendiente de revisión y cierre por el encargado
          </div>
        )}
        {estado === "CERRADO" && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Cerrado y aprobado por el encargado
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const FILTROS = [
  { value: "ACTIVOS",    label: "Activos (mis tareas)" },
  { value: "TODOS",      label: "Todos" },
  { value: "PENDIENTE",  label: "Pendiente" },
  { value: "EN_PROCESO", label: "En Proceso" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "CERRADO",    label: "Cerrado" },
];

export default function MisTrabajosPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("ACTIVOS");

  const [completingJob, setCompletingJob] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    maintenanceService
      .getMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const matchSearch =
      !searchTerm ||
      j.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
    const estado = j.estado?.toUpperCase();
    const matchFiltro =
      filtro === "TODOS" ||
      (filtro === "ACTIVOS" && (estado === "PENDIENTE" || estado === "EN_PROCESO")) ||
      estado === filtro;
    return matchSearch && matchFiltro;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order = { EN_PROCESO: 0, PENDIENTE: 1, COMPLETADO: 2, CERRADO: 3, REALIZADO: 2 };
    const ao = order[a.estado?.toUpperCase()] ?? 9;
    const bo = order[b.estado?.toUpperCase()] ?? 9;
    if (ao !== bo) return ao - bo;
    return (a.tipo?.toUpperCase() === "PREVENTIVO" ? 0 : 1) - (b.tipo?.toUpperCase() === "PREVENTIVO" ? 0 : 1);
  });

  const handleStart = async (job) => {
    setUpdating(true);
    try {
      await maintenanceService.updateMyJobStatus(job.id, "EN_PROCESO");
      toast.success("Trabajo iniciado");
      fetchJobs();
    } catch (e) {
      toast.error(e.message || "Error al iniciar el trabajo.");
    } finally {
      setUpdating(false);
    }
  };

  const activos = jobs.filter((j) => j.estado === "PENDIENTE" || j.estado === "EN_PROCESO").length;
  const completados = jobs.filter((j) => j.estado === "COMPLETADO").length;

  if (loading) return <PageSkeleton variant="list" rowCount={4} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Mis Trabajos
          </h1>
          <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
            {activos > 0 && (
              <span className="text-blue-600 font-medium">{activos} activo{activos > 1 ? "s" : ""}</span>
            )}
            {completados > 0 && (
              <span className="text-amber-600 font-medium">{completados} esperando aprobación</span>
            )}
            {activos === 0 && completados === 0 && "Sin trabajos pendientes"}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Buscar por placa, modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 gap-3">
          <Wrench className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">
            {searchTerm || filtro !== "ACTIVOS"
              ? "No hay trabajos con ese criterio."
              : "No tienes trabajos activos por ahora."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onStart={(j) => handleStart(j)}
              onComplete={(j) => setCompletingJob(j)}
              onRefresh={fetchJobs}
            />
          ))}
        </div>
      )}

      {/* Dialog: Completar */}
      {completingJob && (
        <CompleteJobDialog
          job={completingJob}
          open={!!completingJob}
          onClose={() => setCompletingJob(null)}
          onDone={fetchJobs}
        />
      )}
    </div>
  );
}
