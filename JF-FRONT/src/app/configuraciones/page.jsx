"use client";

import { useState, useEffect } from "react";
import { configService } from "@/services/configService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function ConfiguracionesPage() {
  const [configs, setConfigs] = useState([]);

  const loadData = () => {
    configService.getConfigs().then(setConfigs).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración Predictiva</h1>
          <p className="text-muted-foreground">Administra los parámetros de alertas de kilometraje para todas las unidades.</p>
        </div>
        <Button onClick={() => alert("Funcionalidad para crear Reglas Pendiente")}>+ Añadir Regla</Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parte / Componente</TableHead>
              <TableHead>Umbral Límite (Km)</TableHead>
              <TableHead>Estado de la Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell>{c.umbral_km} km</TableCell>
                <TableCell>
                   <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.activo ? "Activada" : "Desactivada"}
                   </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
