"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bus, AlertTriangle, Plus, Trash2,
  CheckCircle2, Wrench, MapPin, DollarSign, Loader2, X,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { registrarLlegada, getRutas } from "@/services/choferesService";
import { getPartsStatus } from "@/services/unitsService";

const STEP_FORM = "form";
const STEP_CONFIRM = "confirm";
const STEP_DONE = "done";

// Parte crítica — fila compacta con checkbox
function FilaCritica({ parte, partStatus, onChange }) {
  const pct = Math.min(Number(partStatus?.porcentaje || 0), 100);
  const color = pct >= 100 ? "text-red-600" : "text-orange-600";
  const badgeCls = pct >= 100
    ? "bg-red-100 text-red-700 border-red-300"
    : "bg-orange-100 text-orange-700 border-orange-300";

  return (
    <div className={`rounded-lg border p-3 transition-colors ${parte.checked ? "border-purple-300 bg-purple-50 dark:bg-purple-950/20" : "border-border bg-card"}`}>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={parte.checked}
          onChange={(e) => onChange("checked", e.target.checked)}
          className="h-4 w-4 rounded accent-purple-600 shrink-0"
        />
        <span className="font-medium text-sm flex-1">{parte.nombre}</span>
        <Badge className={`text-xs ${badgeCls}`}>{pct}%</Badge>
      </label>
      {parte.checked && (
        <div className="mt-2 ml-7 flex gap-2">
          <Input
            placeholder="Descripción (opcional)"
            value={parte.descripcion}
            onChange={(e) => onChange("descripcion", e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S/.</span>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={parte.costo_estimado}
              onChange={(e) => onChange("costo_estimado", e.target.value)}
              className="h-8 text-sm pl-8"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Parte personalizada (no listada) — fila con select + descripción + costo
function FilaCustom({ row, partsStatus, onUpdate, onRemove }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={row.configuracion_parte_id ? String(row.configuracion_parte_id) : ""}
          onValueChange={(v) => onUpdate("configuracion_parte_id", Number(v))}
        >
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Seleccionar parte..." />
          </SelectTrigger>
          <SelectContent>
            {partsStatus.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Descripción del trabajo realizado"
          value={row.descripcion}
          onChange={(e) => onUpdate("descripcion", e.target.value)}
          className="h-8 text-sm flex-1"
        />
        <div className="relative w-28 shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S/.</span>
          <Input
            type="number" min={0} step="0.01" placeholder="0.00"
            value={row.costo_estimado}
            onChange={(e) => onUpdate("costo_estimado", e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      </div>
    </div>
  );
}

export default function ReportarLlegadaPage() {
  const { unidades, unidad, setUnidad, loading: loadingUnidad, error: unidadError } = useMiUnidad();
  const [partsStatus, setPartsStatus] = useState([]);

  // Form principal
  const [kilometraje, setKilometraje] = useState("");
  const [origen, setOrigen] = useState("");
  const [origenCustom, setOrigenCustom] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [rutas, setRutas] = useState([]);
  const [kmError, setKmError] = useState("");

  // Campo: partes críticas (≥60%) como checkboxes + filas custom
  const [mostrarCampo, setMostrarCampo] = useState(false);
  const [partesCriticas, setPartesCriticas] = useState([]); // {id, nombre, checked, descripcion, costo_estimado}
  const [partesCustom, setPartesCustom] = useState([]);    // {uid, configuracion_parte_id, descripcion, costo_estimado}


  // Flujo
  const [step, setStep] = useState(STEP_FORM);
  const [alertasPreview, setAlertasPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Cargar rutas disponibles una sola vez
  useEffect(() => {
    getRutas().then(setRutas);
  }, []);

  useEffect(() => {
    if (!unidad) return;
    setKilometraje(String(unidad.kilometraje || 0));
    setKmError("");
    setStep(STEP_FORM);
    setResultado(null);
    setPartesCriticas([]);
    setPartesCustom([]);
    setMostrarCampo(false);
    getPartsStatus(unidad.id)
      .then((parts) => {
        const lista = Array.isArray(parts) ? parts : [];
        setPartsStatus(lista);
        // Solo partes en estado crítico/atención (≥60%) se muestran como checkboxes rápidos
        setPartesCriticas(
          lista
            .filter((p) => Number(p.porcentaje) >= 60)
            .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
            .map((p) => ({ id: p.id, nombre: p.nombre, checked: false, descripcion: "", costo_estimado: "" }))
        );
      })
      .catch(() => setPartsStatus([]));
  }, [unidad]);

  // Partes campo seleccionadas (críticas checkeadas + custom con parte seleccionada)
  const campoSeleccionadas = [
    ...partesCriticas.filter((p) => p.checked),
    ...partesCustom.filter((p) => p.configuracion_parte_id),
  ];
  const costoCampoTotal = campoSeleccionadas.reduce((s, p) => s + Number(p.costo_estimado || 0), 0);

  function calcAlertasPreview(kmNuevo) {
    const km = Number(kmNuevo);
    if (!km || !unidad) return [];
    const campoIds = new Set([
      ...partesCriticas.filter((p) => p.checked).map((p) => p.id),
      ...partesCustom.filter((p) => p.configuracion_parte_id).map((p) => p.configuracion_parte_id),
    ]);
    return partsStatus.filter((p) => {
      if (campoIds.has(p.id)) return false;
      return km - Number(p.ultimo_mantenimiento_km || 0) >= Number(p.umbral_km);
    });
  }

  const updateCritica = (id, field, value) =>
    setPartesCriticas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addCustom = () =>
    setPartesCustom((prev) => [...prev, { uid: Date.now(), configuracion_parte_id: null, descripcion: "", costo_estimado: "" }]);
  const updateCustom = (uid, field, value) =>
    setPartesCustom((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  const removeCustom = (uid) =>
    setPartesCustom((prev) => prev.filter((r) => r.uid !== uid));

  const origenFinal = origen === "__custom__" ? origenCustom.trim() : origen;

  const handleKmChange = (val) => {
    setKilometraje(val);
    const km = Number(val);
    const actual = unidad?.kilometraje || 0;
    if (!val || isNaN(km) || km < 0) {
      setKmError("Ingresa un número válido.");
    } else if (km < actual) {
      setKmError(`No puede ser menor al actual (${actual.toLocaleString()} km).`);
    } else if (km === actual) {
      setKmError("El km es igual al registrado. ¿El bus no salió?");
    } else if (km > actual + 10000) {
      setKmError(`Diferencia de ${(km - actual).toLocaleString()} km — verifica el tacómetro.`);
    } else {
      setKmError("");
    }
  };

  const handleContinue = () => {
    const km = Number(kilometraje);
    const actual = unidad?.kilometraje || 0;

    if (!kilometraje || isNaN(km) || km < 0) {
      toast.error("Ingresa un kilometraje válido");
      return;
    }
    if (km < actual) {
      toast.error(`El km no puede ser menor al registrado (${actual.toLocaleString()} km)`);
      return;
    }
    if (!origenFinal) {
      toast.error("Selecciona la ruta de este viaje");
      return;
    }
    if (origen === "__custom__" && !origenCustom.trim()) {
      toast.error("Escribe el nombre de la ruta personalizada");
      return;
    }
    setAlertasPreview(calcAlertasPreview(kilometraje));
    setStep(STEP_CONFIRM);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const partesCampoPayload = [
        ...partesCriticas.filter((p) => p.checked).map((p) => ({
          configuracion_parte_id: p.id,
          km_realizado: Number(kilometraje),
          costo_estimado: Number(p.costo_estimado) || 0,
          descripcion: p.descripcion || p.nombre,
        })),
        ...partesCustom.filter((p) => p.configuracion_parte_id).map((p) => ({
          configuracion_parte_id: p.configuracion_parte_id,
          km_realizado: Number(kilometraje),
          costo_estimado: Number(p.costo_estimado) || 0,
          descripcion: p.descripcion || "",
        })),
      ];

      const res = await registrarLlegada({
        kilometraje: Number(kilometraje),
        origen: origenFinal,
        comentarios: comentarios.trim() || undefined,
        unidad_id: unidad.id,
        partes_campo: partesCampoPayload.length > 0 ? partesCampoPayload : undefined,
      });

      const nombresResultado = partesCampoPayload.map((p) => {
        const found = partsStatus.find((ps) => ps.id === p.configuracion_parte_id);
        return p.descripcion || found?.nombre || "Parte";
      });

      setResultado({
        alertasNuevas: res.alertasNuevas || 0,
        trabajosCampo: res.trabajosCampo || partesCampoPayload.length,
        partesCampoNombres: nombresResultado,
      });
      setStep(STEP_DONE);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setKilometraje(String(unidad?.kilometraje || 0));
    setOrigen(""); setOrigenCustom(""); setComentarios(""); setKmError("");
    setMostrarCampo(false);
    setStep(STEP_FORM); setResultado(null); setAlertasPreview([]);
    setPartesCustom([]);
    setPartesCriticas((prev) => prev.map((p) => ({ ...p, checked: false, descripcion: "", costo_estimado: "" })));
  };

  // ─── LOADING ────────────────────────────────────────────────────────────────
  if (loadingUnidad) return <PageSkeleton variant="list" rowCount={4} action={false} />;

  if (unidadError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-destructive">{unidadError}</p>
        </div>
      </div>
    );
  }

  // ─── DONE ───────────────────────────────────────────────────────────────────
  if (step === STEP_DONE && resultado) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 p-8 gap-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <h2 className="text-xl font-bold text-green-700">¡Llegada registrada!</h2>
          {resultado.trabajosCampo > 0 && (
            <div className="rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-950/20 p-3 w-full text-left">
              <p className="text-sm font-semibold text-purple-700 flex items-center gap-1 mb-1">
                <Wrench className="h-4 w-4" /> {resultado.trabajosCampo} trabajo{resultado.trabajosCampo > 1 ? "s" : ""} en ruta registrado{resultado.trabajosCampo > 1 ? "s" : ""}
              </p>
              <ul className="ml-4 text-xs text-purple-600 list-disc space-y-0.5">
                {resultado.partesCampoNombres.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {resultado.alertasNuevas > 0 && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-3 w-full">
              <p className="text-sm text-orange-700 font-semibold">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                {resultado.alertasNuevas} alerta{resultado.alertasNuevas > 1 ? "s" : ""} predictiva{resultado.alertasNuevas > 1 ? "s" : ""} generada{resultado.alertasNuevas > 1 ? "s" : ""}.
              </p>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handleReset} className="w-full">Registrar otra llegada</Button>
      </div>
    );
  }

  // ─── CONFIRMACIÓN ────────────────────────────────────────────────────────────
  if (step === STEP_CONFIRM) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Confirmar llegada al taller</h1>
          <p className="text-muted-foreground text-sm mt-1">Revisa los datos antes de enviar.</p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Unidad</span><span className="font-semibold">{unidad.placa}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Kilometraje</span><span className="font-semibold">{Number(kilometraje).toLocaleString()} km</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ruta / Origen</span><span className="font-semibold">{origenFinal}</span></div>
          {comentarios && <div className="flex justify-between"><span className="text-muted-foreground">Comentarios</span><span className="font-semibold max-w-[60%] text-right">{comentarios}</span></div>}

          {campoSeleccionadas.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold text-purple-700 flex items-center gap-1 mb-2">
                <MapPin className="h-4 w-4" /> Trabajos en ruta
              </p>
              <ul className="space-y-1 ml-4 text-xs text-muted-foreground list-disc">
                {campoSeleccionadas.map((p, i) => {
                  const nombre = partsStatus.find((ps) => ps.id === (p.id ?? p.configuracion_parte_id))?.nombre ?? p.nombre ?? "—";
                  return (
                    <li key={i}>
                      <span className="font-medium text-foreground">{nombre}</span>
                      {p.descripcion && p.descripcion !== nombre && ` — ${p.descripcion}`}
                      {Number(p.costo_estimado) > 0 && <span className="ml-1 text-purple-600 font-semibold"> S/. {Number(p.costo_estimado).toFixed(2)}</span>}
                    </li>
                  );
                })}
              </ul>
              {costoCampoTotal > 0 && (
                <p className="mt-2 text-xs font-bold text-purple-700">Total en campo: S/. {costoCampoTotal.toFixed(2)}</p>
              )}
            </div>
          )}

        </div>

        {alertasPreview.length > 0 && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-2">
            <p className="text-sm font-semibold text-orange-700 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Se generarán {alertasPreview.length} alerta{alertasPreview.length > 1 ? "s" : ""} predictiva{alertasPreview.length > 1 ? "s" : ""}:
            </p>
            <ul className="text-xs text-orange-600 space-y-0.5 ml-4 list-disc">
              {alertasPreview.map((a) => <li key={a.id}>{a.nombre} — umbral {Number(a.umbral_km).toLocaleString()} km superado</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(STEP_FORM)} className="flex-1">Volver</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : "Confirmar y enviar"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── FORMULARIO ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Llegada al Taller</h1>
        <p className="text-sm text-muted-foreground">Registra el km y la ruta de este viaje.</p>
      </div>

      {/* Unidad */}
      <div className="bg-card p-4 rounded-xl border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tu Unidad</p>
        {unidades.length > 1 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Bus className="h-5 w-5 text-primary shrink-0" />
            <Select value={String(unidad.id)} onValueChange={(val) => { const u = unidades.find((u) => String(u.id) === val); if (u) setUnidad(u); }}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.placa} — {u.modelo} {u.año}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{(unidad.kilometraje || 0).toLocaleString()} km</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-primary" />
            <div><span className="font-bold">{unidad.placa}</span><span className="text-muted-foreground ml-2 text-sm">{unidad.modelo} {unidad.año}</span></div>
            <span className="ml-auto text-sm text-muted-foreground">{(unidad.kilometraje || 0).toLocaleString()} km</span>
          </div>
        )}
      </div>

      {/* Datos del viaje */}
      <div className="space-y-4">
        {/* Km */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Km del tacómetro *</label>
          <Input
            type="number"
            min={unidad?.kilometraje || 0}
            placeholder={String((unidad?.kilometraje || 0) + 50)}
            value={kilometraje}
            onChange={(e) => handleKmChange(e.target.value)}
            className={kmError && Number(kilometraje) < (unidad?.kilometraje || 0) ? "border-destructive" : ""}
          />
          {kmError && (
            <p className={`text-xs flex items-center gap-1 ${
              Number(kilometraje) < (unidad?.kilometraje || 0)
                ? "text-destructive"
                : "text-orange-500"
            }`}>
              <AlertTriangle className="h-3 w-3 shrink-0" />{kmError}
            </p>
          )}
          {!kmError && kilometraje && Number(kilometraje) > (unidad?.kilometraje || 0) && (
            <p className="text-xs text-muted-foreground">
              +{(Number(kilometraje) - (unidad?.kilometraje || 0)).toLocaleString()} km en este viaje
            </p>
          )}
        </div>

        {/* Ruta (select desde backend) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ruta *</label>
          <Select value={origen} onValueChange={setOrigen}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la ruta de este viaje..." />
            </SelectTrigger>
            <SelectContent>
              {rutas.map((r) => (
                <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>
              ))}
              <SelectItem value="__custom__">✏️ Otra ruta...</SelectItem>
            </SelectContent>
          </Select>
          {origen === "__custom__" && (
            <Input
              placeholder="Ej. Lima - Huaraz, Arequipa - Moquegua..."
              value={origenCustom}
              onChange={(e) => setOrigenCustom(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}
        </div>

        {/* Comentarios */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Comentarios / Incidencias (opcional)</label>
          <Textarea
            placeholder="Ruidos, fallas u otras novedades del viaje."
            value={comentarios} onChange={(e) => setComentarios(e.target.value)} rows={2}
          />
        </div>
      </div>

      {/* ── SECCIÓN CAMPO ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarCampo((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-purple-500 shrink-0" />
            <span className="text-sm font-medium">¿Hubo algún trabajo en ruta?</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">— cambio de llanta, reparación de emergencia, etc.</span>
          </div>
          <Badge
            className={`ml-3 shrink-0 text-xs ${campoSeleccionadas.length > 0 ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}
          >
            {campoSeleccionadas.length > 0 ? `${campoSeleccionadas.length} registrado${campoSeleccionadas.length > 1 ? "s" : ""}` : mostrarCampo ? "Ninguno aún" : "No"}
          </Badge>
        </button>

        {mostrarCampo && (
          <div className="border-t px-5 py-4 space-y-2 bg-muted/10">
            {/* Partes críticas como checkboxes rápidos */}
            {partesCriticas.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Partes con desgaste ≥ 60% — marca las que fueron atendidas:</p>
                {partesCriticas.map((p) => (
                  <FilaCritica
                    key={p.id}
                    parte={p}
                    partStatus={partsStatus.find((ps) => ps.id === p.id)}
                    onChange={(field, value) => updateCritica(p.id, field, value)}
                  />
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                No hay partes en estado crítico. Usa el botón de abajo si se atendió alguna parte.
              </p>
            )}

            {/* Filas custom */}
            {partesCustom.map((row) => (
              <FilaCustom
                key={row.uid}
                row={row}
                partsStatus={partsStatus}
                onUpdate={(field, value) => updateCustom(row.uid, field, value)}
                onRemove={() => removeCustom(row.uid)}
              />
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addCustom} className="w-full text-xs h-8 border-dashed">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {partesCriticas.length > 0 ? "Agregar otra parte" : "Agregar parte atendida"}
            </Button>

            {costoCampoTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 px-4 py-2 mt-1">
                <span className="text-xs font-medium text-purple-700 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Total gasto en ruta</span>
                <span className="text-sm font-bold text-purple-700">S/. {costoCampoTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Button onClick={handleContinue} className="w-full" size="lg">
        Continuar
      </Button>
    </div>
  );
}
