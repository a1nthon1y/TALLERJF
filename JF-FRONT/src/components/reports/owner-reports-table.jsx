"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import Link from "next/link"

// Datos de ejemplo para el reporte por dueño
const ownerReportData = [
  {
    id: "1",
    owner: "Transportes Rápidos S.A.",
    totalUnits: 8,
    activeUnits: 7,
    totalMaintenances: 18,
    preventiveMaintenances: 12,
    correctiveMaintenances: 6,
    totalCost: 4250.75,
    averageCostPerUnit: 531.34,
    lastMaintenance: "15/03/2025",
  },
  {
    id: "2",
    owner: "Autobuses del Norte",
    totalUnits: 12,
    activeUnits: 10,
    totalMaintenances: 24,
    preventiveMaintenances: 16,
    correctiveMaintenances: 8,
    totalCost: 6780.5,
    averageCostPerUnit: 565.04,
    lastMaintenance: "18/03/2025",
  },
  {
    id: "3",
    owner: "Transportes Urbanos S.A.",
    totalUnits: 15,
    activeUnits: 15,
    totalMaintenances: 30,
    preventiveMaintenances: 22,
    correctiveMaintenances: 8,
    totalCost: 8120.25,
    averageCostPerUnit: 541.35,
    lastMaintenance: "20/03/2025",
  },
  {
    id: "4",
    owner: "Líneas Express",
    totalUnits: 6,
    activeUnits: 5,
    totalMaintenances: 12,
    preventiveMaintenances: 8,
    correctiveMaintenances: 4,
    totalCost: 3450.8,
    averageCostPerUnit: 575.13,
    lastMaintenance: "12/03/2025",
  },
  {
    id: "5",
    owner: "Autotransportes del Sur",
    totalUnits: 10,
    activeUnits: 9,
    totalMaintenances: 20,
    preventiveMaintenances: 14,
    correctiveMaintenances: 6,
    totalCost: 5670.3,
    averageCostPerUnit: 567.03,
    lastMaintenance: "22/03/2025",
  },
]

export function OwnerReportsTable() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData = ownerReportData.filter((report) => report.owner.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre de dueño..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dueño</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Mantenimientos</TableHead>
              <TableHead>Preventivos</TableHead>
              <TableHead>Correctivos</TableHead>
              <TableHead className="text-right">Costo Total</TableHead>
              <TableHead className="text-right">Costo Promedio</TableHead>
              <TableHead>Último Mantenimiento</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  <Link href={`/duenos/${report.id}`} className="hover:underline">
                    {report.owner}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {report.activeUnits}/{report.totalUnits}
                  </Badge>
                </TableCell>
                <TableCell>{report.totalMaintenances}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                  >
                    {report.preventiveMaintenances}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                  >
                    {report.correctiveMaintenances}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${report.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  $
                  {report.averageCostPerUnit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell>{report.lastMaintenance}</TableCell>
                <TableCell>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/reportes/duenos/${report.id}`}>
                      <FileText className="h-4 w-4" />
                      <span className="sr-only">Ver reporte detallado</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

