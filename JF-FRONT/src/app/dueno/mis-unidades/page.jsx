"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bus, Search, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, XCircle, Loader2, Gauge,
} from "lucide-react";
import { getMyUnits, getPartsStatus } from "@/services/unitsService";

function healthConfig(parts) {
  const criticas = parts.filter((p) => Number(p.porcentaje) >= 100);
  const atencion = parts.filter((p) => Number(p.porcentaje) >= 80 && Number(p.porcentaje) < 100);
  if (criticas.length > 0)
    return { label: `${criticas.length} vencida${criticas.length > 1 ? "s" : ""}`, variant: "destructive", Icon: XCircle, iconClass: "text-red-500" };
  if (atencion.length > 0)
    return { label: `${atencion.length} en atención`, variant: "warning", Icon: AlertTriangle, iconClass: "text-orange-500" };
  return { label: "Todo OK", variant: "outline", Icon: CheckCircle2, iconClass: "text-green-500" };
}

function UnitCard({ u }) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsLoaded, setPartsLoaded] = useState(false);

  const handleToggle = async () => {
    setOpen((v) => !v);
    if (!partsLoaded) {
      setPartsLoading(true);
      try {
        const data = await getPartsStatus(u.id);
        setParts(Array.isArray(data) ? data : []);
      } catch {
        setParts([]);
      } finally {
        setPartsLoading(false);
        setPartsLoaded(true);
      }
    }
  };

  const health = partsLoaded ? healthConfig(parts) : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{u.placa}</CardTitle>
            <p className="text-sm text-muted-foreground">{u.modelo} — {u.año}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline">{u.tipo}</Badge>
            {health && (
              <Badge
                variant={health.variant}
                className={`flex items-center gap-1 text-xs ${
                  health.variant === "outline" ? "border-green-400 text-green-600" : ""
                }`}
              >
                <health.Icon className="h-3 w-3" />
                {health.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Kilometraje</span>
          <span className="font-medium">{u.kilometraje?.toLocaleString()} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Chofer asignado</span>
          <span className="font-medium">
            {u.chofer_nombre ?? <span className="text-yellow-600">Sin asignar</span>}
          </span>
        </div>
        {u.chofer_correo && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Correo</span>
            <span className="font-medium text-xs truncate max-w-[160px]">{u.chofer_correo}</span>
          </div>
        )}

        {/* Botón expandir componentes */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleToggle}
        >
          <Gauge className="h-3.5 w-3.5" />
          {open ? "Ocultar componentes" : "Ver estado de componentes"}
          {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
        </Button>

        {open && (
          <div className="border-t pt-3 space-y-2.5">
            {partsLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : parts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Sin reglas predictivas configuradas.</p>
            ) : (
              parts.map((p) => {
                const pct = Math.min(Number(p.porcentaje), 100);
                const vencido = Number(p.porcentaje) >= 100;
                const kmRestantes = Math.max(0, Number(p.umbral_km) - Number(p.km_recorridos));
                const barColor =
                  vencido ? "bg-red-500" :
                  Number(p.porcentaje) >= 80 ? "bg-orange-400" :
                  Number(p.porcentaje) >= 60 ? "bg-yellow-400" :
                  "bg-green-500";

                return (
                  <div
                    key={p.id}
                    className={`rounded-md p-2 space-y-1.5 ${
                      vencido ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {vencido
                          ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          : pct >= 80
                          ? <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {pct}%{" "}
                        <span className={vencido ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          {vencido
                            ? `+${(Number(p.km_recorridos) - Number(p.umbral_km)).toLocaleString()} km`
                            : `${kmRestantes.toLocaleString()} km restantes`}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DuenoMisUnidadesPage() {
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyUnits()
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = units.filter(
    (u) =>
      u.placa?.toLowerCase().includes(search.toLowerCase()) ||
      u.modelo?.toLowerCase().includes(search.toLowerCase())
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
      <div className="rounded-lg border border-destructive p-4 text-destructive">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Unidades</h1>
        <p className="text-muted-foreground">
          {units.length} unidad{units.length !== 1 ? "es" : ""} registrada{units.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa o modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Bus className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search ? "No se encontraron unidades con ese criterio." : "No tienes unidades asignadas."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => <UnitCard key={u.id} u={u} />)}
        </div>
      )}
    </div>
  );
}
