"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarIcon, Download, Building2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"
import Link from "next/link"

// Datos de ejemplo para dueños
const owners = [
  { id: "1", name: "Transportes Rápidos S.A." },
  { id: "2", name: "Autobuses del Norte" },
  { id: "3", name: "Transportes Urbanos S.A." },
  { id: "4", name: "Líneas Express" },
  { id: "5", name: "Autotransportes del Sur" },
]

export function ReportsFilters() {
  const [startDate, setStartDate] = useState()
  const [endDate, setEndDate] = useState()
  const [unit, setUnit] = useState("all")
  const [owner, setOwner] = useState("all")

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP", { locale: es }) : "Fecha inicial"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP", { locale: es }) : "Fecha final"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex gap-2">
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar unidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las unidades</SelectItem>
            <SelectItem value="ABC-123">ABC-123</SelectItem>
            <SelectItem value="XYZ-789">XYZ-789</SelectItem>
            <SelectItem value="DEF-456">DEF-456</SelectItem>
            <SelectItem value="GHI-101">GHI-101</SelectItem>
            <SelectItem value="JKL-202">JKL-202</SelectItem>
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por dueño" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los dueños</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button variant="outline" asChild>
          <Link href="/reportes/por-dueno">
            <Building2 className="mr-2 h-4 w-4" />
            Ver por Dueño
          </Link>
        </Button>
      </div>
    </div>
  )
}

