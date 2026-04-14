"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { unitService } from "@/services/unitsService";
import { maintenanceService } from "@/services/maintenanceService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table } from "@/components/ui/table";
import { useRouter } from "next/navigation";

export default function DriverDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [unit, setUnit] = useState(null);
  const [parts, setParts] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    async function loadDriverData() {
      try {
        if (!user?.id) return;

        // Cargar unidad asignada
        const unitData = await unitService.getDriverUnit(user.id);
        setUnit(unitData);

        // Cargar partes de la unidad
        const partsData = await unitService.getUnitParts(unitData.id);
        setParts(partsData);

        // Cargar historial de mantenimientos
        const maintenanceData = await maintenanceService.getMaintenancesByUnit(unitData.id);
        setMaintenances(maintenanceData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) {
      loadDriverData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Información de la unidad */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Mi Unidad</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Placa</p>
            <p className="font-medium">{unit?.placa}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Modelo</p>
            <p className="font-medium">{unit?.modelo}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Año</p>
            <p className="font-medium">{unit?.año}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Kilometraje</p>
            <p className="font-medium">{unit?.kilometraje} km</p>
          </div>
        </div>
      </Card>

      {/* Estado de componentes */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Estado de Componentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part) => (
            <Card key={part.id} className="p-4">
              <h3 className="font-medium">{part.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                Último mantenimiento: {part.ultimo_mantenimiento_km} km
              </p>
              <Alert variant={part.estado === 'ALERTA' ? 'destructive' : 'success'}>
                <AlertTitle>Estado: {part.estado}</AlertTitle>
                <AlertDescription>
                  {part.estado === 'ALERTA' ? 'Requiere revisión' : 'En buen estado'}
                </AlertDescription>
              </Alert>
            </Card>
          ))}
        </div>
      </Card>

      {/* Historial de mantenimientos */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Historial de Mantenimientos</h2>
        <Table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Kilometraje</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {maintenances.map((maintenance) => (
              <tr key={maintenance.id}>
                <td>{new Date(maintenance.fecha).toLocaleDateString()}</td>
                <td>{maintenance.tipo}</td>
                <td>{maintenance.descripcion}</td>
                <td>{maintenance.kilometraje} km</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    maintenance.estado === 'COMPLETADO' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {maintenance.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Botón para nuevo mantenimiento */}
      <Button className="w-full">Registrar Nuevo Mantenimiento</Button>
    </div>
  );
} 