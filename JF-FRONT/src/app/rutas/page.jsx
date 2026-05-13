"use client";

import { useEffect, useState } from "react";
import { rutasService } from "@/services/rutasService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, Plus, Pencil, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const EMPTY = { nombre: "", orden: 0, activa: true };

export default function RutasPage() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = crear, obj = editar
  const [form, setForm] = useState(EMPTY);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    rutasService.getAll()
      .then((data) => setRutas(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.message || "Error al cargar rutas"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    setEditTarget(r);
    setForm({ nombre: r.nombre, orden: r.orden ?? 0, activa: r.activa });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await rutasService.update(editTarget.id, form);
        toast.success("Ruta actualizada");
      } else {
        await rutasService.create(form);
        toast.success("Ruta creada");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r) => {
    try {
      await rutasService.update(r.id, { ...r, activa: !r.activa });
      setRutas((prev) => prev.map((x) => x.id === r.id ? { ...x, activa: !x.activa } : x));
    } catch (err) {
      toast.error(err.message || "Error al actualizar");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await rutasService.remove(deleteTarget.id);
      toast.success("Ruta eliminada");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const activas = rutas.filter((r) => r.activa);
  const inactivas = rutas.filter((r) => !r.activa);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6" /> Rutas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rutas disponibles para el registro de llegadas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva ruta
        </Button>
      </div>

      {loading ? (
        <PageSkeleton variant="list" rowCount={6} title={false} action={false} />
      ) : (
        <div className="space-y-4">
          {/* Activas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Activas
              </span>
              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">{activas.length}</Badge>
            </div>
            {activas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin rutas activas.</p>
            ) : (
              <div className="space-y-1.5">
                {activas.map((r) => (
                  <RutaRow key={r.id} ruta={r} onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} onToggle={() => handleToggle(r)} />
                ))}
              </div>
            )}
          </div>

          {/* Inactivas */}
          {inactivas.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inactivas ({inactivas.length})
              </span>
              <div className="space-y-1.5 opacity-60">
                {inactivas.map((r) => (
                  <RutaRow key={r.id} ruta={r} onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} onToggle={() => handleToggle(r)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar ruta" : "Nueva ruta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                placeholder="Ej. Lima - Arequipa"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Orden (opcional)</label>
              <Input
                type="number" min={0}
                placeholder="0"
                value={form.orden}
                onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Número menor aparece primero en el select del chofer.</p>
            </div>
            {editTarget && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.activa}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, activa: v }))}
                />
                <Badge variant={form.activa ? "outline" : "secondary"} className={form.activa ? "border-green-500 text-green-600" : ""}>
                  {form.activa ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editTarget ? "Guardar cambios" : "Crear ruta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar ruta?</DialogTitle>
            <DialogDescription>
              Se eliminará <strong>{deleteTarget?.nombre}</strong> permanentemente. Los reportes de llegada ya registrados no se verán afectados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RutaRow({ ruta, onEdit, onDelete, onToggle }) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium">{ruta.nombre}</span>
        {ruta.orden > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">#{ruta.orden}</span>
        )}
        <div className="flex items-center gap-2">
          <Switch checked={ruta.activa} onCheckedChange={onToggle} />
          <Badge
            variant={ruta.activa ? "outline" : "secondary"}
            className={ruta.activa ? "border-green-500 text-green-600 text-xs" : "text-xs"}
          >
            {ruta.activa ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Acciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
