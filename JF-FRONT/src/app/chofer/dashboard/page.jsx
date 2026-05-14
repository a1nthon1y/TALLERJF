"use client";

import { useEffect, useState } from "react";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { getPartsStatus } from "@/services/unitsService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, Bus, Gauge, CheckCircle2, AlertTriangle,
  ShieldCheck, XCircle, Loader2, MapPin, ClipboardList, History,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";


function BannerEstado({ parts, loading }) {
  if (loading || parts.length === 0) return null;

  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  const esCritico = criticas.length > 0;
  const esAtencion = !esCritico && atencion.length > 0;

  const config = esCritico
    ? {
        bg: "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800",
        iconBg: "bg-red-100 dark:bg-red-900/60",
        Icon: XCircle,
        iconClass: "text-red-600 dark:text-red-400",
        title: "No apto para salir — Mantenimiento urgente",
        titleClass: "text-red-700 dark:text-red-400",
        desc: `${criticas.length} parte${criticas.length > 1 ? "s" : ""} con mantenimiento vencido: ${criticas.map((p) => p.nombre).join(", ")}`,
      }
    : esAtencion
    ? {
        bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800",
        iconBg: "bg-orange-100 dark:bg-orange-900/60",
        Icon: AlertTriangle,
        iconClass: "text-orange-500 dark:text-orange-400",
        title: "Precaución — Partes próximas a vencer",
        titleClass: "text-orange-700 dark:text-orange-400",
        desc: `${atencion.length} parte${atencion.length > 1 ? "s" : ""} por encima del 80%: ${atencion.map((p) => p.nombre).join(", ")}`,
      }
    : {
        bg: "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800",
        iconBg: "bg-green-100 dark:bg-green-900/60",
        Icon: ShieldCheck,
        iconClass: "text-green-600 dark:text-green-400",
        title: "Unidad operativa — Apta para salir",
        titleClass: "text-green-700 dark:text-green-400",
        desc: "Todos los componentes están dentro de los límites de mantenimiento.",
      };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${config.bg}`}>
      <div className={`rounded-full p-3 shrink-0 ${config.iconBg}`}>
        <config.Icon className={`h-7 w-7 ${config.iconClass}`} />
      </div>
      <div>
        <p className={`font-bold text-base leading-tight ${config.titleClass}`}>{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.desc}</p>
      </div>
    </div>
  );
}

function PartRow({ p }) {
  const pct = Math.min(Number(p.porcentaje), 100);
  const kmRecorridos = Number(p.km_recorridos);
  const umbral = Number(p.umbral_km);
  const kmRestantes = Math.max(0, umbral - kmRecorridos);
  const vencido = Number(p.porcentaje) >= 100;
  const critico = Number(p.porcentaje) >= 80;

  const barColor =
    vencido ? "bg-red-500" :
    Number(p.porcentaje) >= 80 ? "bg-orange-400" :
    Number(p.porcentaje) >= 60 ? "bg-yellow-400" :
    "bg-green-500";

  const wrapClass = vencido
    ? "rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 p-3"
    : "space-y-1.5";

  return (
    <div className={wrapClass}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {vencido
            ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            : critico
            ? <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
          <span className="font-medium">{p.nombre}</span>
          {vencido && (
            <Badge variant="destructive" className="text-xs py-0 h-5">VENCIDO</Badge>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span>
            {kmRecorridos.toLocaleString()} / {umbral.toLocaleString()} km
            <span className="ml-1 font-semibold text-foreground">({pct}%)</span>
          </span>
          <div className={`text-right font-medium mt-0.5 ${vencido ? "text-red-600" : "text-muted-foreground"}`}>
            {vencido
              ? `Superado por ${(kmRecorridos - umbral).toLocaleString()} km`
              : `Faltan ${kmRestantes.toLocaleString()} km`}
          </div>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1.5">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Chip de selección de unidad con semáforo de salud
function UnitChip({ unidad, isActive, health, onClick }) {
  const isCritica = health?.criticas > 0;
  const isAtencion = !isCritica && health?.atencion > 0;
  const isOk = !isCritica && !isAtencion;

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium
        transition-all duration-150 text-left
        ${isActive
          ? "border-primary bg-primary/10 shadow-sm"
          : isCritica
          ? "border-red-300 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:border-red-800"
          : isAtencion
          ? "border-orange-300 bg-orange-50/60 hover:bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800"
          : "border-border bg-card hover:bg-muted"
        }
      `}
    >
      {/* Dot semáforo */}
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0
          ${isCritica ? "bg-red-500 animate-pulse" : isAtencion ? "bg-orange-400 animate-pulse" : "bg-green-500"}
        `}
      />

      <div className="leading-tight">
        <p className="font-semibold">{unidad.placa}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[96px]">{unidad.modelo}</p>
      </div>

      {/* Badge de alertas en unidades no activas */}
      {!isActive && isCritica && (
        <Badge className="bg-red-500 text-white text-xs py-0 h-4.5 px-1.5 ml-auto">
          {health.criticas} crítica{health.criticas > 1 ? "s" : ""}
        </Badge>
      )}
      {!isActive && isAtencion && (
        <Badge className="bg-orange-400 text-white text-xs py-0 h-4.5 px-1.5 ml-auto">
          {health.atencion} atención
        </Badge>
      )}
    </button>
  );
}

export default function DriverDashboard() {
  const {
    unidades,
    unidadesDesactivadas,
    soloDesactivadas,
    unidad: selectedUnidad,
    setUnidad,
    loading,
    error,
  } = useMiUnidad();
  const [parts, setParts] = useState([]);
  const [partialErrors, setPartialErrors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Salud de TODAS las unidades (para semáforo en chips)
  const [unidadesHealth, setUnidadesHealth] = useState({});

  // Cargar salud de todas las unidades en paralelo (solo cuando hay más de 1)
  useEffect(() => {
    if (unidades.length <= 1) return;
    Promise.all(
      unidades.map((u) =>
        getPartsStatus(u.id)
          .then((partes) => ({
            id: u.id,
            criticas: partes.filter((p) => Number(p.porcentaje) >= 100).length,
            atencion: partes.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100).length,
          }))
          .catch(() => ({ id: u.id, criticas: 0, atencion: 0 }))
      )
    ).then((results) => {
      const map = {};
      results.forEach((r) => { map[r.id] = r; });
      setUnidadesHealth(map);
    });
  }, [unidades]);

  useEffect(() => {
    if (!selectedUnidad) return;
    async function loadUnitData() {
      setDataLoading(true);
      setParts([]);
      const partsData = await getPartsStatus(selectedUnidad.id).catch(() => null);

      if (!partsData) setPartialErrors(["No se pudo cargar el estado de componentes."]);
      else setPartialErrors([]);

      setParts(Array.isArray(partsData) ? partsData : []);
      setDataLoading(false);
    }
    loadUnitData();
  }, [selectedUnidad]);

  if (loading) {
    return <PageSkeleton variant="grid" rowCount={3} action={false} />;
  }

  // Caso especial: todas las unidades del chofer están desactivadas.
  // Mostramos una pantalla informativa (no error) que explica qué pasó y qué hacer.
  if (soloDesactivadas) {
    const lista = unidadesDesactivadas;
    const unaSola = lista.length === 1;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Panel</h1>
          <p className="text-muted-foreground text-sm">Estado de tus unidades asignadas</p>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-5 flex items-start gap-4">
          <div className="rounded-full p-3 shrink-0 bg-amber-100 dark:bg-amber-900/60">
            <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="font-bold text-base text-amber-800 dark:text-amber-300">
              {unaSola
                ? `Tu unidad ${lista[0].placa} está fuera de servicio`
                : `Tus ${lista.length} unidades están fuera de servicio`}
            </p>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
              {unaSola
                ? "El administrador desactivó esta unidad. Mientras esté así no podrás registrar llegadas ni reportar fallas. Cuando se reactive, todo volverá a estar disponible automáticamente."
                : "El administrador desactivó las unidades a las que estás asignado. Mientras estén así no podrás registrar llegadas ni reportar fallas."}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {lista.map((u) => (
                <Badge
                  key={u.id}
                  variant="outline"
                  className="bg-white dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-200"
                >
                  <Bus className="h-3 w-3 mr-1" />
                  {u.placa}
                  {u.modelo ? ` · ${u.modelo}` : ""}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 pt-2">
              ¿Necesitas operar hoy? Contacta al administrador para reactivar la unidad o reasignarte a otra.
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href="/chofer/mis-mantenimientos">
            <History className="h-4 w-4 mr-2" />
            Ver historial de mantenimientos
          </Link>
        </Button>
      </div>
    );
  }

  if (error || !selectedUnidad) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error || "No tienes una unidad asignada."}</p>
      </div>
    );
  }

  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  const ok = parts.filter((p) => Number(p.porcentaje) < 80);

  // Unidades con alertas que NO son la activa
  const otrasConAlertas = unidades.filter(
    (u) =>
      String(u.id) !== String(selectedUnidad.id) &&
      (unidadesHealth[u.id]?.criticas > 0 || unidadesHealth[u.id]?.atencion > 0)
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Panel</h1>
        <p className="text-muted-foreground text-sm">Estado de tus unidades asignadas</p>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Button asChild variant="outline" className="flex-col h-auto py-3 gap-1.5 hover:border-primary/40 hover:bg-primary/5">
          <Link href="/chofer/reportar-llegada">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Registrar Llegada</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-col h-auto py-3 gap-1.5 hover:border-orange-400/40 hover:bg-orange-50 dark:hover:bg-orange-950/20">
          <Link href="/chofer/solicitar-mantenimiento">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            <span className="text-xs font-medium">Reportar Falla</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-col h-auto py-3 gap-1.5 hover:border-muted-foreground/30 hover:bg-muted/50">
          <Link href="/chofer/mis-mantenimientos">
            <History className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium">Ver Historial</span>
          </Link>
        </Button>
      </div>

      {/* Selector de unidad — chips con semáforo (solo si tiene >1 unidad) */}
      {unidades.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {unidades.map((u) => (
            <UnitChip
              key={u.id}
              unidad={u}
              isActive={String(u.id) === String(selectedUnidad.id)}
              health={unidadesHealth[u.id]}
              onClick={() => setUnidad(u)}
            />
          ))}
        </div>
      )}

      {/* Banner de alerta urgente para OTRAS unidades con problemas */}
      {otrasConAlertas.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">
            {otrasConAlertas.length === 1
              ? <>La unidad <strong>{otrasConAlertas[0].placa}</strong> tiene alertas pendientes — revísala.</>
              : <>Hay alertas en {otrasConAlertas.length} unidades: <strong>{otrasConAlertas.map((u) => u.placa).join(", ")}</strong>.</>}
          </p>
          <button
            className="text-xs font-semibold text-red-600 underline whitespace-nowrap"
            onClick={() => setUnidad(otrasConAlertas[0])}
          >
            Ver ahora →
          </button>
        </div>
      )}

      {/* Banner de estado de viaje para la unidad activa */}
      <BannerEstado parts={parts} loading={dataLoading} />

      {partialErrors.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700 p-3 flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{partialErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* Info de la unidad activa */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bus className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Unidad activa</h2>
          {!dataLoading && parts.length > 0 && (
            <Badge
              className={`ml-auto ${
                criticas.length > 0
                  ? "bg-red-100 text-red-700 border-red-300"
                  : atencion.length > 0
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-green-100 text-green-700 border-green-300"
              }`}
            >
              {criticas.length > 0
                ? `${criticas.length} crítica${criticas.length > 1 ? "s" : ""}`
                : atencion.length > 0
                ? `${atencion.length} en atención`
                : "Todo OK"}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Placa", value: selectedUnidad.placa },
            { label: "Modelo", value: selectedUnidad.modelo },
            { label: "Año", value: selectedUnidad.año },
            { label: "Kilometraje", value: `${selectedUnidad.kilometraje?.toLocaleString() ?? "—"} km` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-semibold">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Estado de componentes */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Estado de Componentes</h2>
          {dataLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          ) : parts.length > 0 ? (
            <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
              {criticas.length > 0 && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {criticas.length} vencida{criticas.length > 1 ? "s" : ""}
                </span>
              )}
              {atencion.length > 0 && (
                <span className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {atencion.length} en atención
                </span>
              )}
              {ok.length > 0 && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {ok.length} OK
                </span>
              )}
            </div>
          ) : null}
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando componentes...
          </div>
        ) : parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reglas predictivas configuradas.</p>
        ) : (
          <div className="space-y-3">
            {parts.map((p) => <PartRow key={p.id} p={p} />)}
          </div>
        )}
      </Card>

    </div>
  );
}
