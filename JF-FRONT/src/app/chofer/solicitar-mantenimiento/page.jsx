"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMiUnidad } from "@/hooks/useMiUnidad";
import { maintenanceService } from "@/services/maintenanceService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Bus, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";

const solicitarSchema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(10, { message: "Describe la falla con al menos 10 caracteres para que el encargado entienda." })
    .max(1000, { message: "Máximo 1000 caracteres." }),
});

export default function SolicitarMantenimientoPage() {
  const router = useRouter();
  const { unidades, unidad: unit, setUnidad, loading, error } = useMiUnidad();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    resolver: zodResolver(solicitarSchema),
    defaultValues: { descripcion: "" },
  });

  const handleSubmit = async ({ descripcion }) => {
    setSubmitting(true);
    try {
      await maintenanceService.createMaintenance({
        unidad_id: unit.id,
        tipo: "CORRECTIVO",
        kilometraje_actual: unit.kilometraje ?? 0,
        observaciones: descripcion.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton variant="list" rowCount={3} action={false} />;

  if (error || !unit) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive p-8 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-semibold text-destructive">{error || "No tienes una unidad asignada."}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <div>
          <h2 className="text-2xl font-bold">Solicitud enviada</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            El encargado recibirá el aviso y coordinará la revisión.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/chofer/mis-mantenimientos")}>
            Ver mis solicitudes
          </Button>
          <Button onClick={() => { setSubmitted(false); form.reset({ descripcion: "" }); }}>
            Nueva solicitud
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Reportar Falla
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Avisa al encargado si tu unidad necesita revisión.
        </p>
      </div>

      {/* Unidad */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <Bus className="h-5 w-5 text-primary shrink-0" />
        {unidades.length > 1 ? (
          <Select
            value={String(unit.id)}
            onValueChange={(val) => {
              const u = unidades.find((u) => String(u.id) === val);
              if (u) setUnidad(u);
            }}
          >
            <SelectTrigger className="h-8 border-none bg-transparent shadow-none p-0 font-semibold">
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
        ) : (
          <span className="font-semibold">{unit.placa} — {unit.modelo}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {(unit.kilometraje ?? 0).toLocaleString()} km
        </span>
      </div>

      {/* Formulario mínimo */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ¿Qué necesita atención? <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ej: Ruido en el motor al acelerar, fuga de aceite, frenos duros..."
                    rows={4}
                    className="resize-none"
                    autoFocus
                    maxLength={1000}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</>
                : "Enviar al encargado"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
