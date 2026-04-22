"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { authService } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wrench, Clock, CheckCircle2, AlertCircle, Loader2,
  AlertTriangle, ChevronRight, Zap,
} from "lucide-react";
import Link from "next/link";

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  if (e === "CERRADO") return <Badge variant="secondary">Cerrado</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

const tipoBadge = (tipo) => {
  const t = tipo?.toUpperCase();
  if (t === "PREVENTIVO")
    return (
      <Badge className="text-xs bg-red-100 text-red-700 border-red-300 flex items-center gap-1">
        <Zap className="h-3 w-3" /> Preventivo
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      Correctivo
    </Badge>
  );
};

export default function TecnicoDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = authService.getUser();

  useEffect(() => {
    maintenanceService
      .getMyJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const pendientes = jobs.filter((j) => j.estado === "PENDIENTE");
  const enProceso = jobs.filter((j) => j.estado === "EN_PROCESO");
  const completados = jobs.filter((j) => j.estado === "COMPLETADO");

  // Trabajos urgentes: preventivos pendientes o en proceso
  const urgentes = jobs.filter(
    (j) =>
      j.tipo?.toUpperCase() === "PREVENTIVO" &&
      (j.estado === "PENDIENTE" || j.estado === "EN_PROCESO")
  );

  const stats = [
    { label: "Pendientes", count: pendientes.length, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
    { label: "En Proceso", count: enProceso.length, icon: Wrench, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "Completados", count: completados.length, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
  ];

  const recentJobs = [...jobs]
    .filter((j) => j.estado !== "CERRADO")
    .sort((a, b) => {
      // Preventivos primero, luego por fecha
      if (a.tipo?.toUpperCase() === "PREVENTIVO" && b.tipo?.toUpperCase() !== "PREVENTIVO") return -1;
      if (b.tipo?.toUpperCase() === "PREVENTIVO" && a.tipo?.toUpperCase() !== "PREVENTIVO") return 1;
      return new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud);
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.nombre} — trabajos asignados
        </p>
      </div>

      {/* Banner de urgencia si hay preventivos pendientes */}
      {urgentes.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-center gap-4">
          <div className="rounded-full p-3 bg-red-100 dark:bg-red-900/60 shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-400">
              {urgentes.length} trabajo{urgentes.length > 1 ? "s" : ""} preventivo{urgentes.length > 1 ? "s" : ""} urgente{urgentes.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Los mantenimientos preventivos son generados por el sistema cuando un componente supera su límite. Prioriza estos trabajos.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, count, icon: Icon, color, bg }) => (
          <Card key={label} className={`p-5 flex items-center gap-4 ${count > 0 && label === "Pendientes" ? bg : ""}`}>
            <div className={`rounded-full bg-muted p-3 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className={`text-3xl font-bold ${label === "Pendientes" && count > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                {count}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Trabajos activos — preventivos primero */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trabajos Activos</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tecnico/mis-trabajos" className="flex items-center gap-1">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tienes trabajos activos.</p>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => {
              const esPreventivo = job.tipo?.toUpperCase() === "PREVENTIVO";
              const esPendiente = job.estado === "PENDIENTE";
              return (
                <div
                  key={job.id}
                  className={`flex items-start justify-between rounded-lg border p-3 gap-3 ${
                    esPreventivo && esPendiente
                      ? "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
                      : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {job.placa ?? `#${job.unidad_id}`}
                        {job.modelo ? ` — ${job.modelo}` : ""}
                      </p>
                      {tipoBadge(job.tipo)}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {job.observaciones?.split("\n")[0] ?? "Sin observaciones"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.fecha_solicitud
                        ? new Date(job.fecha_solicitud).toLocaleDateString("es-PE")
                        : "—"}
                    </p>
                  </div>
                  <div className="shrink-0">{estadoBadge(job.estado)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
