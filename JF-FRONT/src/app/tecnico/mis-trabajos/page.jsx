"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, AlertCircle, Loader2, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ESTADO_OPTIONS = ["Todos", "PENDIENTE", "EN_PROCESO", "COMPLETADO", "CERRADO"];

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  if (e === "CERRADO") return <Badge variant="secondary">Cerrado</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

export default function MisTrabajosPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");

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
      j.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = estadoFilter === "Todos" || j.estado === estadoFilter;
    return matchSearch && matchEstado;
  });

  const openUpdate = (job, estado) => {
    setSelectedJob(job);
    setTargetEstado(estado);
  };

  const handleUpdateStatus = async () => {
    if (!selectedJob) return;
    setUpdating(true);
    try {
      await maintenanceService.updateMyJobStatus(selectedJob.id, targetEstado);
      toast.success(`Trabajo marcado como ${targetEstado}`);
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Mis Trabajos
        </h1>
        <p className="text-muted-foreground">Trabajos de mantenimiento asignados a ti</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar por placa, modelo u observaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADO_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt === "Todos" ? "Todos los estados" : opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Requerimientos</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No se encontraron trabajos
                </TableCell>
              </TableRow>
            ) : filtered.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  {job.placa ?? `Unidad ${job.unidad_id}`}
                  {job.modelo ? <span className="block text-xs text-muted-foreground">{job.modelo}</span> : null}
                </TableCell>
                <TableCell className="capitalize">{job.tipo?.toLowerCase() ?? "—"}</TableCell>
                <TableCell className="max-w-[220px]">
                  <p className="text-xs whitespace-pre-line line-clamp-3">{job.observaciones || "—"}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {job.kilometraje_actual != null ? `${Number(job.kilometraje_actual).toLocaleString()} km` : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {job.fecha_solicitud
                    ? new Date(job.fecha_solicitud).toLocaleDateString("es-PE")
                    : "—"}
                </TableCell>
                <TableCell>{estadoBadge(job.estado)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {job.estado === "PENDIENTE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUpdate(job, "EN_PROCESO")}
                        title="Iniciar trabajo"
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                      </Button>
                    )}
                    {job.estado === "EN_PROCESO" && (
                      <Button
                        size="sm"
                        onClick={() => openUpdate(job, "COMPLETADO")}
                        title="Marcar como completado"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completar
                      </Button>
                    )}
                    {(job.estado === "COMPLETADO" || job.estado === "CERRADO") && (
                      <span className="text-xs text-muted-foreground italic">Sin acciones</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetEstado === "EN_PROCESO" ? "Iniciar trabajo" : "Completar trabajo"}
            </DialogTitle>
            <DialogDescription>
              {targetEstado === "EN_PROCESO"
                ? `¿Confirmas que estás iniciando el trabajo en la unidad ${selectedJob?.placa ?? selectedJob?.unidad_id}?`
                : `¿Confirmas que completaste el trabajo en la unidad ${selectedJob?.placa ?? selectedJob?.unidad_id}? El encargado lo revisará y cerrará.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>Cancelar</Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
