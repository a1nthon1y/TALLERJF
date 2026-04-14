"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

// Datos de ejemplo para el resumen por dueño
const ownerSummaryData = [
  {
    name: "Transportes Rápidos S.A.",
    mantenimientos: 18,
    costo: 4250.75,
    unidades: 8,
  },
  {
    name: "Autobuses del Norte",
    mantenimientos: 24,
    costo: 6780.5,
    unidades: 12,
  },
  {
    name: "Transportes Urbanos S.A.",
    mantenimientos: 30,
    costo: 8120.25,
    unidades: 15,
  },
  {
    name: "Líneas Express",
    mantenimientos: 12,
    costo: 3450.8,
    unidades: 6,
  },
  {
    name: "Autotransportes del Sur",
    mantenimientos: 20,
    costo: 5670.3,
    unidades: 10,
  },
]

// Datos para el gráfico
const chartData = [
  { name: "T. Rápidos", preventivo: 12, correctivo: 6 },
  { name: "A. Norte", preventivo: 16, correctivo: 8 },
  { name: "T. Urbanos", preventivo: 22, correctivo: 8 },
  { name: "L. Express", preventivo: 8, correctivo: 4 },
  { name: "A. Sur", preventivo: 14, correctivo: 6 },
]

export function OwnerReportsSummary() {
  // Calcular totales
  const totalMantenimientos = ownerSummaryData.reduce((sum, owner) => sum + owner.mantenimientos, 0)
  const totalCosto = ownerSummaryData.reduce((sum, owner) => sum + owner.costo, 0)
  const totalUnidades = ownerSummaryData.reduce((sum, owner) => sum + owner.unidades, 0)
  const costoPromedio = totalCosto / totalMantenimientos

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mantenimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMantenimientos}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {(totalMantenimientos / ownerSummaryData.length).toFixed(1)} por dueño
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCosto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio: $
              {costoPromedio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por
              mantenimiento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnidades}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {(totalUnidades / ownerSummaryData.length).toFixed(1)} por dueño
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mantenimientos por Dueño</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="preventivo" name="Preventivo" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="correctivo" name="Correctivo" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

