"use client";

import { useEffect, useState } from "react";
import { maintenanceService } from "@/services/maintenanceService";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wrench, Package, ChevronDown, ChevronUp,
  User, Gauge, Calendar, ClipboardList,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300">Completado</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300">En Proceso</Badge>;
  if (e === "CERRADO") return <Badge variant="secondary">Cerrado</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
};

const tipoBadge = (tipo) => {
  const t = tipo?.toUpperCase();
  if (t === "PREVENTIVO") return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">Preventivo</Badge>;
  return <Badge variant="outline" className="text-xs">Correctivo</Badge>;
};

function MantenimientoCard({ m }) {
  const [open, setOpen] = useState(false);
  const materiales = Array.isArray(m.materiales_detalle) ? m.materiales_detalle : [];
  const hasMateriales = materiales.length > 0;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Cabecera */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tipoBadge(m.tipo)}
            {estadoBadge(m.estado)}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {m.fecha_solicitud && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(m.fecha_solicitud).toLocaleDateString("es-PE")}
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

        {/* Observaciones (siempre visible, primera línea) */}
        {m.observaciones && (
          <p className={`text-sm text-muted-foreground mt-2 ${open ? "" : "line-clamp-2"}`}>
            {m.observaciones}
          </p>
        )}

        {/* Botón expandir */}
        <div className="mt-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground gap-1"
            onClick={() => setOpen((v) => !v)}
          >
            <Package className="h-3.5 w-3.5" />
            {hasMateriales
              ? `${materiales.length} material${materiales.length > 1 ? "es" : ""} reemplazado${materiales.length > 1 ? "s" : ""}`
              : "Sin materiales registrados"}
            {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>

          {open && (
            <div className="mt-2 ml-2 pl-3 border-l space-y-2">
              {/* Observaciones completa si estaba truncada */}
              {m.observaciones && m.observaciones.length > 120 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" /> Descripción completa
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{m.observaciones}</p>
                </div>
              )}

              {/* Materiales reemplazados */}
              {hasMateriales ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Piezas y materiales usados
                  </p>
                  <div className="space-y-1">
                    {materiales.map((mat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{mat.nombre}</span>
                        <span className="text-muted-foreground">× {mat.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No se registraron materiales para este mantenimiento.
                </p>
              )}

              {/* Fecha de realización */}
              {m.fecha_realizacion && (
                <p className="text-xs text-muted-foreground">
                  Realizado el: {new Date(m.fecha_realizacion).toLocaleDateString("es-PE")}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MisMantenimientosPage() {
  const { unidades, unidad, setUnidad, loading: loadingUnidad, error: unidadError } = useMiUnidad();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loadingMant, setLoadingMant] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!unidad) return;
    setLoadingMant(true);
    setMantenimientos([]);
    maintenanceService
      .getMaintenancesByUnit(unidad.id)
      .then((data) => setMantenimientos(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || "Error al cargar mantenimientos"))
      .finally(() => setLoadingMant(false));
  }, [unidad]);

  const loading = loadingUnidad || loadingMant;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Mis Mantenimientos
          </h1>
          <p className="text-muted-foreground">
            Historial de lo que se ha hecho en tu unidad
          </p>
        </div>
        {unidades.length > 1 && unidad && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Unidad:</span>
            <Select
              value={String(unidad.id)}
              onValueChange={(val) => {
                const u = unidades.find((u) => String(u.id) === val);
                if (u) setUnidad(u);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.placa} — {u.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <PageSkeleton variant="list" rowCount={4} title={false} action={false} />
      ) : unidadError || error ? (
        <Card className="p-6 text-destructive">{unidadError || error}</Card>
      ) : mantenimientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Wrench className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No hay mantenimientos registrados para tu unidad.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mantenimientos.map((m) => (
            <MantenimientoCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
