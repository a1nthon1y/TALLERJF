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
import { Button } from "@/components/ui/button";
import { ClipboardList, Search, ChevronDown, ChevronUp, Package, DollarSign } from "lucide-react";
import { getMyUnitsReport } from "@/services/ownersService";

const ESTADO_COLORS = {
  COMPLETADO: "default",
  CERRADO: "secondary",
  EN_PROCESO: "outline",
  PENDIENTE: "secondary",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-PE");
}

function MaterialesDetalle({ materiales, costoTotal }) {
  const mats = Array.isArray(materiales) ? materiales : [];
  if (mats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">Sin materiales registrados</p>
    );
  }
  return (
    <div className="space-y-1">
      {mats.map((m, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {m.nombre} × {m.cantidad}
          </span>
          <span className="font-medium tabular-nums">S/. {Number(m.costo_total).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm font-semibold border-t pt-1 mt-1">
        <span>Total gastado</span>
        <span className="text-primary">S/. {Number(costoTotal).toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function DuenoMantenimientosPage() {
  const [maintenances, setMaintenances] = useState([]);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    getMyUnitsReport()
      .then((data) => setMaintenances(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = maintenances.filter((m) => {
    const matchesSearch =
      m.unidad?.toLowerCase().includes(search.toLowerCase()) ||
      m.tipo?.toLowerCase().includes(search.toLowerCase()) ||
      m.tecnico_nombre?.toLowerCase().includes(search.toLowerCase());
    const matchesEstado =
      estadoFilter === "TODOS" || m.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const totalInvertido = maintenances.reduce(
    (sum, m) => sum + Number(m.costo_total || 0),
    0
  );

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Mantenimientos</h1>
          <p className="text-muted-foreground">
            Todos los mantenimientos de tus unidades
          </p>
        </div>
        {totalInvertido > 0 && (
          <Card className="px-4 py-2 flex items-center gap-2 bg-primary/5 border-primary/20">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total invertido</p>
              <p className="text-base font-bold text-primary">S/. {totalInvertido.toFixed(2)}</p>
            </div>
          </Card>
        )}
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
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="EN_PROCESO">En proceso</SelectItem>
            <SelectItem value="COMPLETADO">Completado</SelectItem>
            <SelectItem value="CERRADO">Cerrado</SelectItem>
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
          {filtered.map((m) => {
            const isOpen = expanded[m.mantenimiento_id];
            const hasMaterials = Array.isArray(m.materiales) && m.materiales.length > 0;
            const costo = Number(m.costo_total || 0);

            return (
              <Card key={m.mantenimiento_id}>
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{m.unidad}</span>
                        {m.modelo && (
                          <span className="text-muted-foreground text-xs">{m.modelo}</span>
                        )}
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-sm capitalize text-muted-foreground">
                          {m.tipo?.toLowerCase()}
                        </span>
                      </div>
                      {m.observaciones && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {m.observaciones}
                        </p>
                      )}
                      {m.tecnico_nombre && (
                        <p className="text-xs text-muted-foreground">
                          Técnico: {m.tecnico_nombre}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                      <Badge variant={ESTADO_COLORS[m.estado] ?? "secondary"} className="text-xs">
                        {m.estado}
                      </Badge>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{formatDate(m.fecha_solicitud)}</div>
                        {m.fecha_realizacion && (
                          <div>Realizado: {formatDate(m.fecha_realizacion)}</div>
                        )}
                      </div>
                      {costo > 0 && (
                        <span className="text-sm font-semibold text-primary">
                          S/. {costo.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandir materiales */}
                  <div className="mt-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground gap-1"
                      onClick={() => toggleExpand(m.mantenimiento_id)}
                    >
                      <Package className="h-3.5 w-3.5" />
                      {hasMaterials
                        ? `${m.materiales.length} material${m.materiales.length > 1 ? "es" : ""} usado${m.materiales.length > 1 ? "s" : ""}`
                        : "Sin materiales"}
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>

                    {isOpen && (
                      <div className="mt-2 ml-2 pl-3 border-l">
                        <MaterialesDetalle materiales={m.materiales} costoTotal={m.costo_total} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
