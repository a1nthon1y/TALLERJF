"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, AlertTriangle, CheckCircle, Calendar, Wrench } from "lucide-react"
import { useAlerts } from "@/hooks/useAlerts"
import { toast } from "sonner"

export function MaintenanceAlertsTable() {
  const { data: alerts, isLoading, isError, mutate, resolveAlert } = useAlerts()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [unitFilter, setUnitFilter] = useState("all")

  // Obtener unidades únicas para el filtro
  const uniqueUnits = Array.from(new Set(alerts?.map((alert) => alert.placa) || []))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Cargando alertas...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-red-500">
          Error al cargar las alertas. Por favor, intente nuevamente.
        </div>
      </div>
    )
  }

  const filteredAlerts = alerts?.filter((alert) => {
    if (!alert) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (alert.placa?.toLowerCase() || '').includes(searchLower) ||
      (alert.parte?.toLowerCase() || '').includes(searchLower) ||
      (alert.mensaje?.toLowerCase() || '').includes(searchLower)
    );
  }) || [];

  const getStatusBadge = (status) => {
    if (status === "ACTIVO") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Activo</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-500">
          <CheckCircle className="h-3 w-3" />
          <span>Resuelto</span>
        </Badge>
      )
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId)
      toast.success("Alerta resuelta correctamente")
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por placa, parte o mensaje..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="ACTIVO">Activo</SelectItem>
              <SelectItem value="RESUELTO">Resuelto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las unidades</SelectItem>
              {uniqueUnits.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead>Parte</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAlerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">{alert.placa}</TableCell>
                <TableCell>{alert.parte}</TableCell>
                <TableCell>{alert.mensaje}</TableCell>
                <TableCell>{getStatusBadge(alert.estado)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {alert.estado === "ACTIVO" && (
                      <>
                        <Button variant="outline" size="icon" title="Programar mantenimiento">
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Resolver alerta"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

