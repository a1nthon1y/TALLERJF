"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const reportData = [
  {
    id: "1",
    unit: "ABC-123",
    type: "Preventivo",
    date: "05/03/2024",
    description: "Cambio de aceite y filtros",
    materials: ["Aceite de motor 15W-40", "Filtro de aceite"],
    cost: 125.5,
  },
  {
    id: "2",
    unit: "XYZ-789",
    type: "Correctivo",
    date: "10/03/2024",
    description: "Reparación de frenos",
    materials: ["Pastillas de freno", "Líquido de frenos"],
    cost: 350.75,
  },
  {
    id: "3",
    unit: "DEF-456",
    type: "Preventivo",
    date: "12/03/2024",
    description: "Revisión de sistema eléctrico",
    materials: ["Fusibles", "Cables"],
    cost: 85.2,
  },
  {
    id: "4",
    unit: "GHI-101",
    type: "Correctivo",
    date: "15/03/2024",
    description: "Cambio de neumáticos",
    materials: ["Neumáticos 295/80 R22.5"],
    cost: 1400.0,
  },
  {
    id: "5",
    unit: "ABC-123",
    type: "Preventivo",
    date: "20/03/2024",
    description: "Mantenimiento de aire acondicionado",
    materials: ["Gas refrigerante", "Filtro de aire"],
    cost: 210.3,
  },
]

export function ReportsTable() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unidad</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Materiales</TableHead>
            <TableHead className="text-right">Costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.unit}</TableCell>
              <TableCell>
                <Badge variant={report.type === "Preventivo" ? "outline" : "secondary"}>{report.type}</Badge>
              </TableCell>
              <TableCell>{report.date}</TableCell>
              <TableCell>{report.description}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {report.materials.map((material, index) => (
                    <Badge key={index} variant="outline" className="bg-muted">
                      {material}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">${report.cost.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

