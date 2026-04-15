"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Search } from "lucide-react";
import { getMyUnitsReport } from "@/services/ownersService";

const ESTADO_COLORS = {
  COMPLETADO: "default",
  EN_PROCESO: "outline",
  PENDIENTE: "secondary",
};

export default function DuenoMantenimientosPage() {
  const [maintenances, setMaintenances] = useState([]);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyUnitsReport()
      .then((data) => setMaintenances(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = maintenances.filter((m) => {
    const matchesSearch =
      m.unidad?.toLowerCase().includes(search.toLowerCase()) ||
      m.tipo?.toLowerCase().includes(search.toLowerCase()) ||
      m.tecnico_nombre?.toLowerCase().includes(search.toLowerCase());
    const matchesEstado =
      estadoFilter === "TODOS" || m.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial de Mantenimientos</h1>
        <p className="text-muted-foreground">
          Todos los mantenimientos de tus unidades
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por unidad, tipo o técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="EN_PROCESO">En proceso</SelectItem>
            <SelectItem value="COMPLETADO">Completado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search || estadoFilter !== "TODOS"
              ? "No hay mantenimientos con ese criterio."
              : "No hay mantenimientos registrados."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.mantenimiento_id}>
              <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.unidad}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-sm capitalize text-muted-foreground">
                      {m.tipo?.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.observaciones || "Sin observaciones"}
                  </p>
                  {m.tecnico_nombre && (
                    <p className="text-xs text-muted-foreground">
                      Técnico: {m.tecnico_nombre}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <Badge variant={ESTADO_COLORS[m.estado] ?? "secondary"} className="text-xs">
                    {m.estado}
                  </Badge>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{new Date(m.fecha_solicitud).toLocaleDateString("es-PE")}</div>
                    {m.fecha_realizacion && (
                      <div>Completado: {new Date(m.fecha_realizacion).toLocaleDateString("es-PE")}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
