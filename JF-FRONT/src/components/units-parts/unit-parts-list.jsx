"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, CheckCircle, Wrench, Calendar } from "lucide-react"
import { formatNumber } from "@/utils/formatting"

/**
 * @typedef {Object} UnitPart
 * @property {number} id - ID único de la parte
 * @property {number} unitId - ID de la unidad
 * @property {string} unitPlate - Placa de la unidad
 * @property {string} name - Nombre de la parte
 * @property {number} maintenanceInterval - Cada cuántos km requiere mantenimiento
 * @property {number} lastMaintenanceKm - Kilometraje en el último mantenimiento
 * @property {number} currentKm - Kilometraje actual de la unidad
 */

// Datos de ejemplo para partes de unidades
const initialUnitParts = [
  {
    id: 1,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Motor",
    maintenanceInterval: 5000,
    lastMaintenanceKm: 40000,
    currentKm: 45000,
  },
  {
    id: 2,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Frenos",
    maintenanceInterval: 10000,
    lastMaintenanceKm: 35000,
    currentKm: 45000,
  },
  {
    id: 8,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Sistema eléctrico",
    maintenanceInterval: 15000,
    lastMaintenanceKm: 32000,
    currentKm: 45000,
  },
  {
    id: 9,
    unitId: 1,
    unitPlate: "ABC-123",
    name: "Filtro de combustible",
    maintenanceInterval: 8000,
    lastMaintenanceKm: 38000,
    currentKm: 45000,
  },
  {
    id: 3,
    unitId: 2,
    unitPlate: "XYZ-789",
    name: "Transmisión",
    maintenanceInterval: 20000,
    lastMaintenanceKm: 60000,
    currentKm: 78000,
  },
  {
    id: 4,
    unitId: 2,
    unitPlate: "XYZ-789",
    name: "Sistema de refrigeración",
    maintenanceInterval: 15000,
    lastMaintenanceKm: 70000,
    currentKm: 78000,
  },
  {
    id: 5,
    unitId: 3,
    unitPlate: "DEF-456",
    name: "Filtro de aire",
    maintenanceInterval: 8000,
    lastMaintenanceKm: 25000,
    currentKm: 32000,
  },
  {
    id: 6,
    unitId: 4,
    unitPlate: "GHI-101",
    name: "Suspensión",
    maintenanceInterval: 25000,
    lastMaintenanceKm: 70000,
    currentKm: 95000,
  },
  {
    id: 7,
    unitId: 5,
    unitPlate: "JKL-202",
    name: "Sistema eléctrico",
    maintenanceInterval: 12000,
    lastMaintenanceKm: 5000,
    currentKm: 15000,
  },
]

/**
 * @typedef {Object} UnitPartsListProps
 * @property {number} unitId - ID de la unidad
 */

/**
 * @param {UnitPartsListProps} props
 */
export function UnitPartsList({ unitId }) {
  const [unitParts] = useState(initialUnitParts.filter((part) => part.unitId === unitId))

  /**
   * @param {UnitPart} part
   * @returns {number}
   */
  const calculateRemainingLife = (part) => {
    const kmSinceLastMaintenance = part.currentKm - part.lastMaintenanceKm
    const percentage = 100 - (kmSinceLastMaintenance / part.maintenanceInterval) * 100
    return Math.max(0, Math.min(100, percentage))
  }

  /**
   * @param {UnitPart} part
   * @returns {"critical" | "warning" | "normal"}
   */
  const getPartStatus = (part) => {
    const percentage = calculateRemainingLife(part)
    if (percentage <= 10) return "critical"
    if (percentage <= 25) return "warning"
    return "normal"
  }

  /**
   * @param {UnitPart} part
   * @returns {boolean}
   */
  const needsMaintenance = (part) => {
    const kmSinceLastMaintenance = part.currentKm - part.lastMaintenanceKm
    return kmSinceLastMaintenance >= part.maintenanceInterval
  }

  // Ordenar partes por estado (crítico primero, luego advertencia, luego normal)
  const sortedParts = [...unitParts].sort((a, b) => {
    const statusA = getPartStatus(a)
    const statusB = getPartStatus(b)

    if (statusA === "critical" && statusB !== "critical") return -1
    if (statusA !== "critical" && statusB === "critical") return 1
    if (statusA === "warning" && statusB === "normal") return -1
    if (statusA === "normal" && statusB === "warning") return 1

    return 0
  })

  /**
   * @param {UnitPart} part
   * @returns {string}
   */
  const getProgressColor = (part) => {
    const status = getPartStatus(part)
    if (status === "critical") return "bg-red-500"
    if (status === "warning") return "bg-yellow-500"
    return "bg-green-500"
  }

  /**
   * @param {UnitPart} part
   * @returns {JSX.Element}
   */
  const getStatusIcon = (part) => {
    const status = getPartStatus(part)
    if (status === "critical") return <AlertCircle className="h-5 w-5 text-red-500" />
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <CheckCircle className="h-5 w-5 text-green-500" />
  }

  if (unitParts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No hay partes registradas para esta unidad.</p>
          <Button className="mt-4">Agregar Primera Parte</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedParts.map((part) => {
        const percentage = calculateRemainingLife(part)
        const kmRemaining = part.lastMaintenanceKm + part.maintenanceInterval - part.currentKm
        const status = getPartStatus(part)

        return (
          <Card
            key={part.id}
            className={
              status === "critical"
                ? "border-red-200 dark:border-red-900"
                : status === "warning"
                  ? "border-yellow-200 dark:border-yellow-900"
                  : ""
            }
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{part.name}</CardTitle>
                  <CardDescription>Intervalo: {formatNumber(part.maintenanceInterval)} km</CardDescription>
                </div>
                {getStatusIcon(part)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vida útil restante:</span>
                    <span
                      className={
                        status === "critical"
                          ? "text-red-500 font-medium"
                          : status === "warning"
                            ? "text-yellow-500 font-medium"
                            : "text-green-500 font-medium"
                      }
                    >
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" indicatorClassName={getProgressColor(part)} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Último mantenimiento:</p>
                    <p className="font-medium">{formatNumber(part.lastMaintenanceKm)} km</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kilometraje actual:</p>
                    <p className="font-medium">{formatNumber(part.currentKm)} km</p>
                  </div>
                </div>

                <div className="pt-2">
                  {kmRemaining <= 0 ? (
                    <Badge variant="destructive" className="w-full justify-center py-1">
                      Mantenimiento vencido por {formatNumber(Math.abs(kmRemaining))} km
                    </Badge>
                  ) : percentage <= 25 ? (
                    <Badge variant="outline" className="w-full justify-center py-1 border-yellow-500 text-yellow-500">
                      Próximo mantenimiento en {formatNumber(kmRemaining)} km
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center py-1 border-green-500 text-green-500">
                      Próximo mantenimiento en {formatNumber(kmRemaining)} km
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="w-full text-xs" size="sm">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Programar
                  </Button>
                  <Button variant="outline" className="w-full text-xs" size="sm">
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    Registrar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

