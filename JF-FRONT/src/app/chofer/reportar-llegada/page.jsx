"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bus, AlertTriangle, Gauge, Plus, Trash2, ClipboardCheck,
  CheckCircle2, Wrench, MapPin, DollarSign, Loader2,
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
import { registrarLlegada } from "@/services/choferesService";
import { maintenanceService } from "@/services/maintenanceService";
import { getPartsStatus } from "@/services/unitsService";

const STEP_FORM = "form";
const STEP_CONFIRM = "confirm";
const STEP_DONE = "done";

export default function ReportarLlegadaPage() {
  const { unidades, unidad, setUnidad, loading: loadingUnidad, error: unidadError } = useMiUnidad();
  const [partsStatus, setPartsStatus] = useState([]);

  // Formulario principal
  const [kilometraje, setKilometraje] = useState("");
  const [origen, setOrigen] = useState("");
  const [comentarios, setComentarios] = useState("");

  // Solicitud de mantenimiento pendiente
  const [solicitarMant, setSolicitarMant] = useState(false);
  const [reqs, setReqs] = useState([""]);
  const [procedencia, setProcedencia] = useState("");
  const [obsMant, setObsMant] = useState("");

  // Trabajos realizados en ruta (campo)
  // [{id, nombre, checked, costo_estimado, descripcion}]
  const [mostrarCampo, setMostrarCampo] = useState(false);
  const [partesCampo, setPartesCampo] = useState([]);

  // Flujo
  const [step, setStep] = useState(STEP_FORM);
  const [alertasPreview, setAlertasPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!unidad) return;
    setKilometraje(String(unidad.kilometraje || 0));
    setStep(STEP_FORM);
    setResultado(null);
    setPartesCampo([]);
    getPartsStatus(unidad.id)
      .then((parts) => {
        const lista = Array.isArray(parts) ? parts : [];
        setPartsStatus(lista);
        // Pre-cargar lista de partes para "campo" (ordenadas: vencidas primero)
        setPartesCampo(
          [...lista]
            .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
            .map((p) => ({
              id: p.id,
              nombre: p.nombre,
              checked: false,
              costo_estimado: "",
              descripcion: "",
            }))
        );
      })
      .catch(() => setPartsStatus([]));
  }, [unidad]);

  function calcAlertasPreview(kmNuevo) {
    const km = Number(kmNuevo);
    if (!km || !unidad) return [];
    // Excluir partes que el chofer ya reportó como trabajadas en campo
    const campoIds = new Set(partesCampo.filter((p) => p.checked).map((p) => p.id));
    return partsStatus.filter((p) => {
      if (campoIds.has(p.id)) return false;
      const recorridos = km - Number(p.ultimo_mantenimiento_km || 0);
      return recorridos >= Number(p.umbral_km);
    });
  }

  const toggleCampo = (id) =>
    setPartesCampo((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p))
    );
  const updateCampoField = (id, field, value) =>
    setPartesCampo((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

  const addReq = () => setReqs((r) => [...r, ""]);
  const removeReq = (i) => setReqs((r) => r.filter((_, idx) => idx !== i));
  const updateReq = (i, val) => setReqs((r) => r.map((v, idx) => (idx === i ? val : v)));

  const handleContinue = () => {
    if (!kilometraje || isNaN(Number(kilometraje)) || Number(kilometraje) < 0) {
      toast.error("Ingresa un kilometraje válido");
      return;
    }
    if (!origen.trim()) {
      toast.error("Ingresa la ruta de origen");
      return;
    }
    if (Number(kilometraje) < (unidad?.kilometraje || 0)) {
      toast.error(`El km ingresado (${Number(kilometraje).toLocaleString()}) no puede ser menor al actual (${(unidad?.kilometraje || 0).toLocaleString()} km)`);
      return;
    }
    setAlertasPreview(calcAlertasPreview(kilometraje));
    setStep(STEP_CONFIRM);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Construir partes_campo para el backend
      const partesCampoPayload = partesCampo
        .filter((p) => p.checked)
        .map((p) => ({
          configuracion_parte_id: p.id,
          km_realizado: Number(kilometraje),
          costo_estimado: p.costo_estimado ? Number(p.costo_estimado) : 0,
          descripcion: p.descripcion || p.nombre,
        }));

      const res = await registrarLlegada({
        kilometraje: Number(kilometraje),
        origen: origen.trim(),
        comentarios: comentarios.trim() || undefined,
        unidad_id: unidad.id,
        partes_campo: partesCampoPayload.length > 0 ? partesCampoPayload : undefined,
      });

      // Mantenimiento pendiente adicional si lo solicitó
      let mantCreado = false;
      if (solicitarMant) {
        const filledReqs = reqs.filter((r) => r.trim());
        const obs = [
          `PROCEDENCIA: ${(procedencia || origen).trim()}`,
          "",
          "REQUERIMIENTOS:",
          ...filledReqs.map((r) => `- ${r}`),
          "",
          "OBSERVACIONES:",
          obsMant.trim() || "Ninguna",
        ].join("\n");
        await maintenanceService.createMaintenance({
          unidad_id: String(unidad.id),
          tipo: "correctivo",
          observaciones: obs,
          kilometraje_actual: Number(kilometraje),
        });
        mantCreado = true;
      }

      setResultado({
        alertasNuevas: res.alertasNuevas || 0,
        trabajosCampo: res.trabajosCampo || partesCampoPayload.length,
        mantCreado,
        partesCampoNombres: partesCampoPayload.map((p) => p.descripcion),
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
    setOrigen("");
    setComentarios("");
    setSolicitarMant(false);
    setMostrarCampo(false);
    setReqs([""]);
    setProcedencia("");
    setObsMant("");
    setStep(STEP_FORM);
    setResultado(null);
    setAlertasPreview([]);
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
              <p className="text-sm font-semibold text-purple-700 flex items-center gap-1">
                <Wrench className="inline h-4 w-4" />
                {resultado.trabajosCampo} trabajo{resultado.trabajosCampo > 1 ? "s" : ""} en ruta registrado{resultado.trabajosCampo > 1 ? "s" : ""} — contadores reseteados
              </p>
              <ul className="mt-1 ml-4 text-xs text-purple-600 list-disc">
                {resultado.partesCampoNombres.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {resultado.mantCreado && (
            <p className="text-sm text-green-600">Solicitud de mantenimiento correctivo enviada al encargado.</p>
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
        <Button variant="outline" onClick={handleReset} className="w-full">
          Registrar otra llegada
        </Button>
      </div>
    );
  }

  // ─── CONFIRMACIÓN ────────────────────────────────────────────────────────────
  const campoSeleccionadas = partesCampo.filter((p) => p.checked);
  const costoCampoTotal = campoSeleccionadas.reduce((s, p) => s + Number(p.costo_estimado || 0), 0);

  if (step === STEP_CONFIRM) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Confirmar llegada al taller</h1>
          <p className="text-muted-foreground text-sm mt-1">Revisa los datos antes de enviar.</p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Unidad</span><span className="font-semibold">{unidad.placa}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Kilometraje registrado</span><span className="font-semibold">{Number(kilometraje).toLocaleString()} km</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ruta / Origen</span><span className="font-semibold">{origen}</span></div>
          {comentarios && <div className="flex justify-between"><span className="text-muted-foreground">Comentarios</span><span className="font-semibold max-w-[60%] text-right">{comentarios}</span></div>}

          {campoSeleccionadas.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold text-purple-700 flex items-center gap-1 mb-1">
                <Wrench className="h-4 w-4" /> Trabajos realizados en ruta
              </p>
              <ul className="space-y-1 ml-4 text-xs text-muted-foreground list-disc">
                {campoSeleccionadas.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium text-foreground">{p.nombre}</span>
                    {p.descripcion && p.descripcion !== p.nombre && ` — ${p.descripcion}`}
                    {Number(p.costo_estimado) > 0 && (
                      <span className="ml-1 text-purple-600 font-semibold">S/. {Number(p.costo_estimado).toFixed(2)}</span>
                    )}
                  </li>
                ))}
              </ul>
              {costoCampoTotal > 0 && (
                <p className="mt-2 text-xs font-bold text-purple-700">
                  Total en campo: S/. {costoCampoTotal.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {solicitarMant && (
            <div className="border-t pt-3">
              <p className="font-semibold text-primary flex items-center gap-1"><ClipboardCheck className="h-4 w-4" /> Solicitud de mantenimiento correctivo</p>
              <ul className="mt-1 ml-4 text-muted-foreground list-disc space-y-0.5 text-xs">
                {reqs.filter((r) => r.trim()).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
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
              {alertasPreview.map((a) => (
                <li key={a.id}>{a.nombre} — umbral {Number(a.umbral_km).toLocaleString()} km superado</li>
              ))}
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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Llegada al Taller</h1>
        <p className="text-muted-foreground">
          Registra el kilometraje al llegar, reporta trabajos hechos en ruta o solicita mantenimiento.
        </p>
      </div>

      {/* Unidad */}
      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tu Unidad</p>
        {unidades.length > 1 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Bus className="h-5 w-5 text-primary shrink-0" />
            <Select
              value={String(unidad.id)}
              onValueChange={(val) => {
                const u = unidades.find((u) => String(u.id) === val);
                if (u) setUnidad(u);
              }}
            >
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.placa} — {u.modelo} {u.año}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm font-semibold text-muted-foreground ml-auto">
              {(unidad.kilometraje || 0).toLocaleString()} km en sistema
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-primary" />
            <div>
              <span className="font-bold text-lg">{unidad.placa}</span>
              <span className="text-muted-foreground ml-2 text-sm">{unidad.modelo} {unidad.año}</span>
            </div>
            <span className="ml-auto text-sm font-semibold text-muted-foreground">
              {(unidad.kilometraje || 0).toLocaleString()} km en sistema
            </span>
          </div>
        )}
      </div>

      {/* Partes críticas */}
      {partsStatus.filter((p) => Number(p.porcentaje) >= 80).length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-2">
          <p className="text-sm font-semibold text-orange-700 flex items-center gap-1">
            <Gauge className="h-4 w-4" /> Partes próximas a mantenimiento
          </p>
          <div className="space-y-1.5">
            {partsStatus.filter((p) => Number(p.porcentaje) >= 80).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs text-orange-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{p.nombre}: {Number(p.km_recorridos).toLocaleString()} / {Number(p.umbral_km).toLocaleString()} km ({Math.min(Number(p.porcentaje), 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Datos del viaje */}
      <div className="bg-card p-6 rounded-xl border shadow-sm space-y-5">
        <h2 className="font-semibold text-base">Datos del viaje</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Kilometraje del tacómetro *</label>
            <Input
              type="number"
              min={unidad?.kilometraje || 0}
              placeholder={String((unidad?.kilometraje || 0) + 50)}
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Número exacto del tacómetro</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ruta / Origen *</label>
            <Input
              placeholder="Ej. Lima - Arequipa"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Comentarios / Incidencias (opcional)</label>
          <Textarea
            placeholder="Indica si notaste ruidos, fallas u otras novedades durante el viaje."
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* ── TRABAJOS REALIZADOS EN RUTA ─────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarCampo((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-semibold text-sm">¿Se realizó algún trabajo en ruta?</p>
              <p className="text-xs text-muted-foreground">
                Cambio de llanta, aceite de emergencia, reparación por terceros, etc. — resetea los contadores automáticamente
              </p>
            </div>
          </div>
          <Badge
            variant={mostrarCampo && campoSeleccionadas.length > 0 ? "default" : "secondary"}
            className={`ml-2 shrink-0 ${mostrarCampo && campoSeleccionadas.length > 0 ? "bg-purple-600" : ""}`}
          >
            {campoSeleccionadas.length > 0 ? `${campoSeleccionadas.length} parte${campoSeleccionadas.length > 1 ? "s" : ""}` : mostrarCampo ? "Selecciona" : "No por ahora"}
          </Badge>
        </button>

        {mostrarCampo && (
          <div className="px-6 pb-6 border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Marca cada parte que fue atendida en ruta. El sistema reseteará su contador y no generará alerta falsa al llegar.
            </p>
            {partesCampo.map((p) => {
              const partStatus = partsStatus.find((ps) => ps.id === p.id);
              const pct = partStatus ? Math.min(Number(partStatus.porcentaje), 100) : 0;
              const esCritica = pct >= 80;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 space-y-3 transition-colors ${
                    p.checked
                      ? "border-purple-300 bg-purple-50 dark:bg-purple-950/20"
                      : esCritica
                      ? "border-orange-200 bg-orange-50/40 dark:bg-orange-950/10"
                      : "border-border"
                  }`}
                >
                  {/* Checkbox header */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.checked}
                      onChange={() => toggleCampo(p.id)}
                      className="h-4 w-4 rounded accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{p.nombre}</span>
                      {esCritica && (
                        <Badge className="ml-2 text-xs bg-orange-100 text-orange-700 border-orange-300">
                          {pct}% desgaste
                        </Badge>
                      )}
                    </div>
                  </label>

                  {/* Campos extra cuando está marcada */}
                  {p.checked && (
                    <div className="grid grid-cols-2 gap-3 ml-7">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
                        <Input
                          placeholder={`Ej. Cambio de ${p.nombre.toLowerCase()}`}
                          value={p.descripcion}
                          onChange={(e) => updateCampoField(p.id, "descripcion", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Costo estimado (S/.)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={p.costo_estimado}
                          onChange={(e) => updateCampoField(p.id, "costo_estimado", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {costoCampoTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 px-4 py-2">
                <span className="text-sm font-medium text-purple-700">Total gasto en ruta</span>
                <span className="text-base font-bold text-purple-700">S/. {costoCampoTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Solicitar mantenimiento pendiente */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setSolicitarMant((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">¿Necesitas solicitar un mantenimiento al encargado?</p>
              <p className="text-xs text-muted-foreground">Opcional — crea una solicitud correctiva pendiente</p>
            </div>
          </div>
          <Badge variant={solicitarMant ? "default" : "secondary"} className="ml-2">
            {solicitarMant ? "Sí, agregar" : "No por ahora"}
          </Badge>
        </button>

        {solicitarMant && (
          <div className="px-6 pb-5 space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Procedencia (opcional)</label>
              <Input
                placeholder="Ej. Lima - Arequipa (se usa origen si vacío)"
                value={procedencia}
                onChange={(e) => setProcedencia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Requerimientos *</label>
              {reqs.map((req, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Ej. Cambio de aceite, revisión de frenos..."
                    value={req}
                    onChange={(e) => updateReq(i, e.target.value)}
                  />
                  {reqs.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeReq(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addReq} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Agregar requerimiento
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observaciones (opcional)</label>
              <Textarea
                placeholder="Detalles adicionales para el técnico..."
                value={obsMant}
                onChange={(e) => setObsMant(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleContinue} className="w-full" disabled={loadingUnidad}>
        Continuar y revisar
      </Button>
    </div>
  );
}
