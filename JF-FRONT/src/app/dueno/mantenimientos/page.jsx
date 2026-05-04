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
import { ClipboardList, Search, ChevronDown, ChevronUp, Package, DollarSign, Gauge, User, Calendar } from "lucide-react";
import { getMyUnitsReport } from "@/services/ownersService";

function estadoBadge(estado) {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Completado</Badge>;
  if (e === "CERRADO") return <Badge variant="secondary" className="text-xs">Cerrado</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">En Proceso</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Pendiente</Badge>;
}

function tipoBadge(tipo) {
  const t = tipo?.toUpperCase();
  if (t === "PREVENTIVO") return <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">Preventivo</Badge>;
  return <Badge variant="outline" className="text-xs">Correctivo</Badge>;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-PE");
}

function MaterialesDetalle({ materiales, costoTotal }) {
  const mats = Array.isArray(materiales) ? materiales : [];
  if (mats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">Sin materiales registrados para este mantenimiento.</p>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
        <span>Material</span>
        <span className="text-right">Cant.</span>
        <span className="text-right">Subtotal</span>
      </div>
      {mats.map((m, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs items-center">
          <span className="font-medium">{m.nombre}</span>
          <span className="text-right text-muted-foreground">× {m.cantidad}</span>
          <span className="text-right font-semibold tabular-nums">S/. {Number(m.costo_total).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between text-sm font-bold border-t pt-1.5 mt-1">
        <span className="text-muted-foreground">Total gastado</span>
        <span className="text-primary tabular-nums">S/. {Number(costoTotal).toFixed(2)}</span>
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{m.unidad}</span>
                        {m.modelo && (
                          <span className="text-muted-foreground text-xs">{m.modelo}</span>
                        )}
                        {tipoBadge(m.tipo)}
                        {estadoBadge(m.estado)}
                      </div>
                      {m.observaciones && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {m.observaciones}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {m.fecha_solicitud && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(m.fecha_solicitud)}
                          </span>
                        )}
                        {m.kilometraje_actual != null && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3.5 w-3.5" />
                            {Number(m.kilometraje_actual).toLocaleString()} km
                          </span>
                        )}
                        {m.tecnico_nombre && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {m.tecnico_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                      <div className={`text-lg font-bold tabular-nums ${costo > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        S/. {costo.toFixed(2)}
                      </div>
                      {m.fecha_realizacion && (
                        <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                          Realizado: {formatDate(m.fecha_realizacion)}
                        </div>
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
