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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Edit, MoreHorizontal, Trash, Bus, FileBarChart, Key, LayoutDashboard } from "lucide-react"
import Link from "next/link"

// Datos de ejemplo para dueños
const owners = [
  {
    id: "1",
    name: "Transportes Rápidos S.A.",
    contactPerson: "Roberto Gómez",
    email: "roberto.gomez@transportesrapidos.com",
    phone: "+52 555 123 4567",
    address: "Av. Principal 123, Ciudad de México",
    unitsCount: 8,
    status: "Activo",
  },
  {
    id: "2",
    name: "Autobuses del Norte",
    contactPerson: "María Rodríguez",
    email: "maria.rodriguez@autobusesnorte.com",
    phone: "+52 555 987 6543",
    address: "Calle Norte 456, Monterrey",
    unitsCount: 12,
    status: "Activo",
  },
  {
    id: "3",
    name: "Transportes Urbanos S.A.",
    contactPerson: "Carlos Martínez",
    email: "carlos.martinez@transportesurbanos.com",
    phone: "+52 555 456 7890",
    address: "Blvd. Central 789, Guadalajara",
    unitsCount: 15,
    status: "Activo",
  },
  {
    id: "4",
    name: "Líneas Express",
    contactPerson: "Ana López",
    email: "ana.lopez@lineasexpress.com",
    phone: "+52 555 234 5678",
    address: "Av. Reforma 321, Puebla",
    unitsCount: 6,
    status: "Inactivo",
  },
  {
    id: "5",
    name: "Autotransportes del Sur",
    contactPerson: "Javier Sánchez",
    email: "javier.sanchez@autotransportessur.com",
    phone: "+52 555 876 5432",
    address: "Calle Sur 654, Mérida",
    unitsCount: 10,
    status: "Activo",
  },
]

export function OwnersTable() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredOwners = owners.filter(
    (owner) =>
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Buscar por nombre, contacto o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa/Dueño</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOwners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{owner.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{owner.name}</div>
                      <div className="text-xs text-muted-foreground">{owner.address}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{owner.contactPerson}</TableCell>
                <TableCell>{owner.email}</TableCell>
                <TableCell>{owner.phone}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center w-fit gap-1">
                    <Bus className="h-3 w-3" />
                    <span>{owner.unitsCount} unidades</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={owner.status === "Activo" ? "outline" : "destructive"}>{owner.status}</Badge>
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
                        <Link href={`/duenos/${owner.id}/dashboard`} className="flex items-center">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/duenos/${owner.id}/editar`} className="flex items-center">
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/duenos/${owner.id}/unidades`} className="flex items-center">
                          <Bus className="mr-2 h-4 w-4" />
                          <span>Ver Unidades</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/duenos/${owner.id}/acceso`} className="flex items-center">
                          <Key className="mr-2 h-4 w-4" />
                          <span>Configurar Acceso</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link href={`/reportes?dueno=${owner.id}`} className="flex items-center">
                          <FileBarChart className="mr-2 h-4 w-4" />
                          <span>Generar Reporte</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

