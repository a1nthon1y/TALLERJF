"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Wrench, AlertCircle, Loader2, Play, CheckCircle2, Zap,
  Gauge, Calendar, ChevronDown, ChevronUp, MapPin,
} from "lucide-react";
import { toast } from "sonner";

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

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Completado</Badge>;
  if (e === "REALIZADO")  return <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">En Campo</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">En Proceso</Badge>;
  if (e === "CERRADO")    return <Badge variant="secondary" className="text-xs">Cerrado</Badge>;
  return <Badge variant="outline" className="text-xs">Pendiente</Badge>;
};

const FILTROS = [
  { value: "ACTIVOS",    label: "Activos (mis tareas)" },
  { value: "TODOS",      label: "Todos" },
  { value: "PENDIENTE",  label: "Pendiente" },
  { value: "EN_PROCESO", label: "En Proceso" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "CERRADO",    label: "Cerrado" },
];

// ─── Card de trabajo ──────────────────────────────────────────────────────────

function JobCard({ job, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseObservaciones(job.observaciones);
  const esPreventivo = job.tipo?.toUpperCase() === "PREVENTIVO";
  const estado = job.estado?.toUpperCase();
  const urgent = esPreventivo && (estado === "PENDIENTE" || estado === "EN_PROCESO");

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
            </div>
          </div>
          <div className="shrink-0">{estadoBadge(job.estado)}</div>
        </div>

        {/* Descripción principal */}
        <p className="text-sm text-foreground/80 font-medium">
          {getResumen(job.observaciones)}
        </p>

        {/* Meta: km + fecha */}
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

        {/* Expandir detalles */}
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

        {/* Acción */}
        {estado === "PENDIENTE" && (
          <Button className="w-full" onClick={() => onAction(job, "EN_PROCESO")}>
            <Play className="h-4 w-4 mr-2" /> Iniciar trabajo
          </Button>
        )}
        {estado === "EN_PROCESO" && (
          <Button className="w-full" onClick={() => onAction(job, "COMPLETADO")}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como completado
          </Button>
        )}
        {(estado === "COMPLETADO" || estado === "CERRADO") && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {estado === "COMPLETADO" ? "Completado — esperando revisión del encargado" : "Cerrado y aprobado"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MisTrabajosPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("ACTIVOS");

  const [selectedJob, setSelectedJob] = useState(null);
  const [targetEstado, setTargetEstado] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchJobs = () => {
    setLoading(true);
    maintenanceService
      .getMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

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

  // Ordenar: EN_PROCESO → PENDIENTE → COMPLETADO → CERRADO; preventivos primero
  const sorted = [...filtered].sort((a, b) => {
    const order = { EN_PROCESO: 0, PENDIENTE: 1, COMPLETADO: 2, CERRADO: 3, REALIZADO: 2 };
    const ao = order[a.estado?.toUpperCase()] ?? 9;
    const bo = order[b.estado?.toUpperCase()] ?? 9;
    if (ao !== bo) return ao - bo;
    const aP = a.tipo?.toUpperCase() === "PREVENTIVO" ? 0 : 1;
    const bP = b.tipo?.toUpperCase() === "PREVENTIVO" ? 0 : 1;
    return aP - bP;
  });

  const openAction = (job, estado) => {
    setSelectedJob(job);
    setTargetEstado(estado);
  };

  const handleConfirm = async () => {
    if (!selectedJob) return;
    setUpdating(true);
    try {
      await maintenanceService.updateMyJobStatus(selectedJob.id, targetEstado);
      const label = targetEstado === "EN_PROCESO" ? "iniciado" : "completado";
      toast.success(`Trabajo marcado como ${label}`);
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Mis Trabajos
        </h1>
        <p className="text-muted-foreground text-sm">
          {jobs.filter((j) => j.estado === "PENDIENTE" || j.estado === "EN_PROCESO").length} trabajo{jobs.filter((j) => j.estado === "PENDIENTE" || j.estado === "EN_PROCESO").length !== 1 ? "s" : ""} activo{jobs.filter((j) => j.estado === "PENDIENTE" || j.estado === "EN_PROCESO").length !== 1 ? "s" : ""}
        </p>
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
            <JobCard key={job.id} job={job} onAction={openAction} />
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetEstado === "EN_PROCESO" ? "¿Iniciar este trabajo?" : "¿Marcar como completado?"}
            </DialogTitle>
            <DialogDescription>
              {targetEstado === "EN_PROCESO"
                ? `Confirmas que comenzaste a trabajar en la unidad ${selectedJob?.placa ?? selectedJob?.unidad_id}.`
                : `Confirmas que terminaste el trabajo en ${selectedJob?.placa ?? selectedJob?.unidad_id}. El encargado lo revisará y lo aprobará.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
