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
  User, Gauge, Calendar, MapPin, CheckCircle2, Clock,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const estadoBadge = (estado) => {
  const e = estado?.toUpperCase();
  if (e === "COMPLETADO") return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Completado</Badge>;
  if (e === "REALIZADO")  return <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">En Campo</Badge>;
  if (e === "EN_PROCESO") return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">En Proceso</Badge>;
  if (e === "CERRADO")    return <Badge variant="secondary" className="text-xs">Cerrado</Badge>;
  return <Badge variant="outline" className="text-xs">Pendiente</Badge>;
};

const tipoBadge = (tipo) => {
  const t = tipo?.toUpperCase();
  if (t === "PREVENTIVO") return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">Preventivo</Badge>;
  return <Badge variant="outline" className="text-xs">Correctivo</Badge>;
};

// Parsea el texto estructurado de observaciones en secciones legibles
function parseObservaciones(texto) {
  if (!texto) return null;

  // Mantenimiento en campo
  if (texto.startsWith("TRABAJO EN RUTA")) {
    const lines = texto.split("\n").filter(Boolean);
    return { tipo: "campo", lineas: lines };
  }

  // Solicitud correctiva del chofer (tiene PROCEDENCIA:)
  if (texto.includes("PROCEDENCIA:") && texto.includes("REQUERIMIENTOS:")) {
    // Limpiar sufijo del encargado si existe
    const limpio = texto.split("--- CIERRE DEL ENCARGADO")[0].trim();
    const secciones = {};
    const partes = limpio.split(/\n(?=PROCEDENCIA:|REQUERIMIENTOS:|OBSERVACIONES:)/);
    partes.forEach((p) => {
      const [key, ...rest] = p.split(":\n").length > 1 ? p.split(":\n") : p.split(": ");
      secciones[key.trim()] = rest.join(": ").trim();
    });
    // Extraer requerimientos como array
    const reqMatch = limpio.match(/REQUERIMIENTOS:\n([\s\S]*?)(\n\n|\nOBSERVACIONES:|$)/);
    const reqs = reqMatch
      ? reqMatch[1].split("\n").map((r) => r.replace(/^- /, "").trim()).filter(Boolean)
      : [];
    const procMatch = limpio.match(/PROCEDENCIA:\s*(.+)/);
    const obsMatch = limpio.match(/OBSERVACIONES:\n([\s\S]*?)$/);
    return {
      tipo: "solicitud",
      procedencia: procMatch?.[1]?.trim(),
      requerimientos: reqs,
      observaciones: obsMatch?.[1]?.trim(),
    };
  }

  // Texto libre (preventivo u otro)
  return { tipo: "libre", texto: texto.split("--- CIERRE DEL ENCARGADO")[0].trim() };
}

function ObservacionesView({ observaciones, estado }) {
  const parsed = parseObservaciones(observaciones);
  if (!parsed) return null;

  const esCampo = estado?.toUpperCase() === "REALIZADO";

  if (parsed.tipo === "campo") {
    return (
      <div className="mt-2 space-y-0.5">
        {parsed.lineas.map((l, i) => (
          <p key={i} className="text-xs text-muted-foreground">{l}</p>
        ))}
      </div>
    );
  }

  if (parsed.tipo === "solicitud") {
    return (
      <div className="mt-2 space-y-2 text-xs">
        {parsed.procedencia && (
          <div className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">Ruta:</span>
            <span className="font-medium">{parsed.procedencia}</span>
          </div>
        )}
        {parsed.requerimientos.length > 0 && (
          <div>
            <span className="text-muted-foreground">Requerimientos:</span>
            <ul className="ml-3 mt-0.5 space-y-0.5">
              {parsed.requerimientos.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {parsed.observaciones && parsed.observaciones !== "Ninguna" && (
          <div className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">Obs:</span>
            <span className="text-muted-foreground">{parsed.observaciones}</span>
          </div>
        )}
      </div>
    );
  }

  // Libre
  return (
    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
      {parsed.texto}
    </p>
  );
}

function MantenimientoCard({ m }) {
  const [open, setOpen] = useState(false);

  const estado = m.estado?.toUpperCase();
  const esCampo = estado === "REALIZADO";
  const esDone = estado === "COMPLETADO" || estado === "CERRADO" || esCampo;

  // Filtrar "Servicio en Ruta" — es solo un contenedor contable, no info útil para el chofer
  const materiales = (Array.isArray(m.materiales_detalle) ? m.materiales_detalle : [])
    .filter((mat) => mat.nombre !== "Servicio en Ruta");
  const hasMateriales = materiales.length > 0;

  // Solo mostrar botón de expandir si hay algo útil que mostrar
  const tieneDetalles = hasMateriales || (m.observaciones && m.observaciones.length > 0);

  return (
    <Card className={esCampo ? "border-purple-200" : ""}>
      <CardContent className="p-4">
        {/* Cabecera — badges + meta */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tipoBadge(m.tipo)}
            {estadoBadge(m.estado)}
            {esCampo && <span className="flex items-center gap-1 text-xs text-purple-600"><MapPin className="h-3 w-3" /> Ruta</span>}
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

        {/* Observaciones parseadas */}
        <ObservacionesView observaciones={m.observaciones} estado={m.estado} />

        {/* Footer expandible — solo si hay materiales o detalles extra */}
        {tieneDetalles && (
          <div className="mt-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground gap-1"
              onClick={() => setOpen((v) => !v)}
            >
              {esDone && hasMateriales ? (
                <><Package className="h-3.5 w-3.5" />{materiales.length} pieza{materiales.length > 1 ? "s" : ""} usada{materiales.length > 1 ? "s" : ""}</>
              ) : esDone ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Ver detalles</>
              ) : (
                <><Clock className="h-3.5 w-3.5" />Ver solicitud</>
              )}
              {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>

            {open && (
              <div className="mt-2 ml-2 pl-3 border-l space-y-3">
                {/* Piezas usadas — solo en mantenimientos completados */}
                {esDone && hasMateriales && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" /> Piezas / materiales usados
                    </p>
                    <div className="space-y-1">
                      {materiales.map((mat, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{mat.nombre}</span>
                          <span className="text-muted-foreground">× {mat.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fecha de realización */}
                {m.fecha_realizacion && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    Realizado el {new Date(m.fecha_realizacion).toLocaleDateString("es-PE")}
                  </p>
                )}

                {/* Sin materiales pero completado */}
                {esDone && !hasMateriales && !m.fecha_realizacion && (
                  <p className="text-xs text-muted-foreground italic">Sin piezas registradas.</p>
                )}
              </div>
            )}
          </div>
        )}
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
          <p className="text-muted-foreground text-sm">Historial de lo que se ha hecho en tu unidad</p>
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
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.placa} — {u.modelo}</SelectItem>
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
