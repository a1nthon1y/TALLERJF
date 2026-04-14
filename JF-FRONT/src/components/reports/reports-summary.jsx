"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

export function ReportsSummary() {
  const data = {
    labels: ["Preventivo", "Correctivo"],
    datasets: [
      {
        data: [65, 35],
        backgroundColor: ["#4f46e5", "#ef4444"],
        borderColor: ["#4338ca", "#dc2626"],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Mantenimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">48</div>
          <p className="text-xs text-muted-foreground">Período: 01/03/2024 - 31/03/2024</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$12,450.00</div>
          <p className="text-xs text-muted-foreground">Promedio por mantenimiento: $259.38</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribución por Tipo</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-32 h-32">
            <Doughnut data={data} options={options} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

