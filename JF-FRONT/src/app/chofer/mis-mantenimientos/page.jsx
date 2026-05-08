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
  ShieldCheck, History,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const ACTIVOS = ["PENDIENTE", "EN_PROCESO"];
const HISTORIAL = ["COMPLETADO", "CERRADO", "REALIZADO"];
const HISTORIAL_VISIBLE = 3; // cuántos mostrar por defecto

// ─── Helpers ────────────────────────────────────────────────────────────────

const tipoBadge = (tipo) => {
  const t = tipo?.toUpperCase();
  if (t === "PREVENTIVO") return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">Preventivo</Badge>;
  return <Badge variant="outline" className="text-xs">Correctivo</Badge>;
};

function estadoConfig(estado) {
  const e = estado?.toUpperCase();
  if (e === "EN_PROCESO") return {
    badge: <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">En Proceso</Badge>,
    bar: "border-l-blue-500",
    label: "El técnico está trabajando en esto",
    icon: <Wrench className="h-3.5 w-3.5 text-blue-500" />,
  };
  if (e === "PENDIENTE") return {
    badge: <Badge variant="outline" className="text-xs">Pendiente</Badge>,
    bar: "border-l-yellow-400",
    label: "Esperando asignación del encargado",
    icon: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  };
  if (e === "COMPLETADO") return {
    badge: <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Completado</Badge>,
    bar: "border-l-green-400",
    label: null, icon: null,
  };
  if (e === "REALIZADO") return {
    badge: <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">En Campo</Badge>,
    bar: "border-l-purple-400",
    label: null, icon: null,
  };
  return {
    badge: <Badge variant="secondary" className="text-xs">Cerrado</Badge>,
    bar: "border-l-muted",
    label: null, icon: null,
  };
}

function parseObservaciones(texto) {
  if (!texto) return null;
  if (texto.startsWith("TRABAJO EN RUTA")) {
    const lines = texto.split("\n").filter(Boolean);
    return { tipo: "campo", lineas: lines };
  }
  if (texto.includes("PROCEDENCIA:") && texto.includes("REQUERIMIENTOS:")) {
    const limpio = texto.split("--- CIERRE DEL ENCARGADO")[0].trim();
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
  return { tipo: "libre", texto: texto.split("--- CIERRE DEL ENCARGADO")[0].trim() };
}

function ObservacionesView({ observaciones }) {
  const parsed = parseObservaciones(observaciones);
  if (!parsed) return null;

  if (parsed.tipo === "campo") {
    return (
      <div className="mt-1.5 space-y-0.5">
        {parsed.lineas.map((l, i) => (
          <p key={i} className="text-xs text-muted-foreground">{l}</p>
        ))}
      </div>
    );
  }

  if (parsed.tipo === "solicitud") {
    return (
      <div className="mt-1.5 space-y-1 text-xs">
        {parsed.procedencia && (
          <div className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">Ruta:</span>
            <span className="font-medium">{parsed.procedencia}</span>
          </div>
        )}
        {parsed.requerimientos.length > 0 && (
          <ul className="ml-2 space-y-0.5">
            {parsed.requerimientos.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
        {parsed.observaciones && parsed.observaciones !== "Ninguna" && (
          <p className="text-muted-foreground italic">{parsed.observaciones}</p>
        )}
      </div>
    );
  }

  return (
    <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-line line-clamp-2">
      {parsed.texto}
    </p>
  );
}

// ─── Card activo (PENDIENTE / EN_PROCESO) — prominente ──────────────────────
function CardActivo({ m }) {
  const cfg = estadoConfig(m.estado);

  return (
    <Card className={`border-l-4 ${cfg.bar}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tipoBadge(m.tipo)}
            {cfg.badge}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          </div>
        </div>

        {/* Estado descriptivo */}
        {cfg.label && (
          <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
            {cfg.icon}{cfg.label}
          </p>
        )}

        <ObservacionesView observaciones={m.observaciones} />

        {m.tecnico_nombre && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <User className="h-3.5 w-3.5" /> Asignado a: <span className="font-medium text-foreground ml-0.5">{m.tecnico_nombre}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Card historial (COMPLETADO / CERRADO / REALIZADO) — compacto ────────────
function CardHistorial({ m }) {
  const [open, setOpen] = useState(false);
  const cfg = estadoConfig(m.estado);
  const esCampo = m.estado?.toUpperCase() === "REALIZADO";

  const materiales = (Array.isArray(m.materiales_detalle) ? m.materiales_detalle : [])
    .filter((mat) => mat.nombre !== "Servicio en Ruta");

  return (
    <div className={`rounded-lg border border-l-4 ${cfg.bar} bg-card`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* fecha */}
        <span className="text-xs text-muted-foreground whitespace-nowrap w-20 shrink-0">
          {m.fecha_solicitud
            ? new Date(m.fecha_solicitud).toLocaleDateString("es-PE")
            : "—"}
        </span>

        {/* descripción corta */}
        <span className="flex-1 text-sm truncate text-muted-foreground">
          {esCampo
            ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-purple-500 shrink-0" />Trabajo en ruta</span>
            : m.observaciones
              ? m.observaciones.replace(/PROCEDENCIA:.*?\n|REQUERIMIENTOS:\n|OBSERVACIONES:\n|- /g, "").split("\n")[0]
              : m.tipo?.toLowerCase()}
        </span>

        {/* badges */}
        <div className="flex items-center gap-2 shrink-0">
          {tipoBadge(m.tipo)}
          {cfg.badge}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-2 text-xs bg-muted/10">
          <ObservacionesView observaciones={m.observaciones} />

          {m.tecnico_nombre && (
            <p className="text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {m.tecnico_nombre}
            </p>
          )}

          {materiales.length > 0 && (
            <div className="pt-1 space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Piezas usadas
              </p>
              {materiales.map((mat, i) => (
                <div key={i} className="flex justify-between ml-4">
                  <span>{mat.nombre}</span>
                  <span className="text-muted-foreground">× {mat.cantidad}</span>
                </div>
              ))}
            </div>
          )}

          {m.fecha_realizacion && (
            <p className="text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Realizado el {new Date(m.fecha_realizacion).toLocaleDateString("es-PE")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MisMantenimientosPage() {
  const { unidades, unidad, setUnidad, loading: loadingUnidad, error: unidadError } = useMiUnidad();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loadingMant, setLoadingMant] = useState(false);
  const [error, setError] = useState(null);
  const [verTodo, setVerTodo] = useState(false);

  useEffect(() => {
    if (!unidad) return;
    setLoadingMant(true);
    setMantenimientos([]);
    setVerTodo(false);
    maintenanceService
      .getMaintenancesByUnit(unidad.id)
      .then((data) => setMantenimientos(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || "Error al cargar mantenimientos"))
      .finally(() => setLoadingMant(false));
  }, [unidad]);

  const loading = loadingUnidad || loadingMant;

  const activos = mantenimientos.filter((m) => ACTIVOS.includes(m.estado?.toUpperCase()));
  const historial = mantenimientos.filter((m) => HISTORIAL.includes(m.estado?.toUpperCase()));
  const historialVisible = verTodo ? historial : historial.slice(0, HISTORIAL_VISIBLE);
  const ocultos = historial.length - HISTORIAL_VISIBLE;

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado + selector */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Mis Solicitudes
          </h1>
          <p className="text-muted-foreground text-sm">Estado de solicitudes y trabajos de tu unidad</p>
        </div>
        {unidades.length > 1 && unidad && (
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
        <>
          {/* ── ACTIVOS ── */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                En curso
              </h2>
              {activos.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">{activos.length}</Badge>
              )}
            </div>

            {activos.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">Sin solicitudes activas — todo en orden.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activos.map((m) => <CardActivo key={m.id} m={m} />)}
              </div>
            )}
          </section>

          {/* ── HISTORIAL ── */}
          {historial.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial
                </h2>
                <span className="text-xs text-muted-foreground">({historial.length})</span>
              </div>

              <div className="space-y-1.5">
                {historialVisible.map((m) => <CardHistorial key={m.id} m={m} />)}
              </div>

              {ocultos > 0 && !verTodo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground border border-dashed"
                  onClick={() => setVerTodo(true)}
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Ver {ocultos} registro{ocultos > 1 ? "s" : ""} más
                </Button>
              )}

              {verTodo && ocultos > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground border border-dashed"
                  onClick={() => setVerTodo(false)}
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" /> Mostrar menos
                </Button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
