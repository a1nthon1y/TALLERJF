"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { authService } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  if (e === "CERRADO") return <Badge variant="secondary">Cerrado</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
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

  const stats = [
    { label: "Pendientes", count: pendientes.length, icon: Clock, color: "text-yellow-500" },
    { label: "En Proceso", count: enProceso.length, icon: Wrench, color: "text-blue-500" },
    { label: "Completados", count: completados.length, icon: CheckCircle2, color: "text-green-500" },
  ];

  const recentJobs = [...jobs]
    .filter((j) => j.estado !== "CERRADO")
    .sort((a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.nombre} — trabajos asignados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="p-5 flex items-center gap-4">
            <div className={`rounded-full bg-muted p-3 ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Trabajos activos */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Trabajos Activos</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tecnico/mis-trabajos">Ver todos</Link>
          </Button>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tienes trabajos activos.</p>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">
                    Unidad: {job.placa ?? `#${job.unidad_id}`}
                    {job.modelo ? ` — ${job.modelo}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {job.observaciones?.split("\n")[0] ?? "Sin observaciones"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.fecha_solicitud
                      ? new Date(job.fecha_solicitud).toLocaleDateString("es-PE")
                      : "—"}
                  </p>
                </div>
                {estadoBadge(job.estado)}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
