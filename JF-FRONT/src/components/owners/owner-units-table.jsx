"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Edit, MoreHorizontal, Trash, Settings, Wrench } from "lucide-react"
import Link from "next/link"

// Datos de ejemplo para unidades con dueños
const units = [
  {
    id: "1",
    plate: "ABC-123",
    model: "Mercedes Benz O500",
    year: 2020,
    type: "Urbano",
    mileage: 45000,
    driver: "Carlos Rodríguez",
    ownerId: "1",
    status: "Activo",
  },
  {
    id: "2",
    plate: "XYZ-789",
    model: "Volvo 9700",
    year: 2019,
    type: "Interurbano",
    mileage: 78000,
    driver: "Ana Martínez",
    ownerId: "1",
    status: "Activo",
  },
  {
    id: "3",
    plate: "DEF-456",
    model: "Scania K410",
    year: 2021,
    type: "Urbano",
    mileage: 32000,
    driver: "Luis Gómez",
    ownerId: "1",
    status: "Inactivo",
  },
  {
    id: "4",
    plate: "GHI-101",
    model: "Mercedes Benz O500",
    year: 2018,
    type: "Urbano",
    mileage: 95000,
    driver: "María López",
    ownerId: "2",
    status: "Activo",
  },
  {
    id: "5",
    plate: "JKL-202",
    model: "Volvo 9700",
    year: 2022,
    type: "Interurbano",
    mileage: 15000,
    driver: "Pedro Sánchez",
    ownerId: "2",
    status: "Activo",
  },
]

export function OwnerUnitsTable({ ownerId }) {
  const [searchTerm, setSearchTerm] = useState("")

  const ownerUnits = units.filter((unit) => unit.ownerId === ownerId)

  const filteredUnits = ownerUnits.filter(
    (unit) =>
      unit.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.driver.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Buscar por placa, modelo o chofer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Kilometraje</TableHead>
              <TableHead>Chofer Asignado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.plate}</TableCell>
                  <TableCell>{unit.model}</TableCell>
                  <TableCell>{unit.year}</TableCell>
                  <TableCell>{unit.type}</TableCell>
                  <TableCell>{unit.mileage.toLocaleString()}</TableCell>
                  <TableCell>{unit.driver}</TableCell>
                  <TableCell>
                    <Badge variant={unit.status === "Activo" ? "outline" : "destructive"}>{unit.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Link href={`/unidades/${unit.id}/editar`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href={`/unidades/${unit.id}/partes`} className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Gestionar Partes</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link href={`/mantenimientos/nuevo?unidad=${unit.id}`} className="flex items-center">
                            <Wrench className="mr-2 h-4 w-4" />
                            <span>Programar Mantenimiento</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron unidades para este dueño.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

