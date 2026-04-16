"use client"

import { useState, useEffect } from "react"
import { Search, Bus, Wrench, Package, Users, Settings, BarChart3, Bell, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"

const adminLinks = [
  { name: "Unidades", description: "Gestionar flota de vehículos", url: "/unidades", icon: Bus },
  { name: "Mantenimientos", description: "Ver y gestionar mantenimientos", url: "/mantenimientos", icon: Wrench },
  { name: "Alertas", description: "Alertas de mantenimiento predictivo", url: "/mantenimientos/alertas", icon: Bell },
  { name: "Materiales", description: "Inventario de materiales y stock", url: "/materiales", icon: Package },
  { name: "Usuarios", description: "Administrar cuentas de usuario", url: "/usuarios", icon: Users },
  { name: "Técnicos", description: "Gestionar técnicos del taller", url: "/tecnicos", icon: Wrench },
  { name: "Dueños", description: "Dueños de unidades registrados", url: "/duenos", icon: Users },
  { name: "Choferes", description: "Choferes asignados a unidades", url: "/choferes", icon: Users },
  { name: "Reportes", description: "Reportes de mantenimiento y costos", url: "/reportes", icon: BarChart3 },
  { name: "Configuración", description: "Umbrales de mantenimiento predictivo", url: "/configuraciones", icon: Settings },
]

const encargadoLinks = [
  { name: "Mantenimientos", description: "Ver y gestionar mantenimientos", url: "/mantenimientos", icon: Wrench },
  { name: "Alertas", description: "Alertas de mantenimiento predictivo", url: "/mantenimientos/alertas", icon: Bell },
  { name: "Materiales", description: "Inventario de materiales y stock", url: "/materiales", icon: Package },
  { name: "Unidades", description: "Ver flota de vehículos", url: "/unidades", icon: Bus },
  { name: "Técnicos", description: "Gestionar técnicos del taller", url: "/tecnicos", icon: Wrench },
  { name: "Configuración", description: "Umbrales predictivos", url: "/configuraciones", icon: Settings },
]

const choferLinks = [
  { name: "Mi Dashboard", description: "Resumen de tu unidad", url: "/chofer/dashboard", icon: BarChart3 },
  { name: "Mis Mantenimientos", description: "Historial de mantenimientos", url: "/chofer/mis-mantenimientos", icon: Wrench },
  { name: "Solicitar Mantenimiento", description: "Enviar solicitud de mantenimiento", url: "/chofer/solicitar-mantenimiento", icon: ClipboardList },
  { name: "Llegada al Taller", description: "Registrar llegada y kilometraje", url: "/chofer/reportar-llegada", icon: Bus },
]

const ownerLinks = [
  { name: "Mi Dashboard", description: "Resumen de mis unidades", url: "/dueno/dashboard", icon: BarChart3 },
  { name: "Mis Unidades", description: "Ver mis unidades asignadas", url: "/dueno/mis-unidades", icon: Bus },
  { name: "Historial de Mantenimientos", description: "Ver mantenimientos de mis unidades", url: "/dueno/mantenimientos", icon: Wrench },
]

const tecnicoLinks = [
  { name: "Mi Dashboard", description: "Resumen de trabajos asignados", url: "/tecnico/dashboard", icon: BarChart3 },
  { name: "Mis Trabajos", description: "Ver y actualizar trabajos asignados", url: "/tecnico/mis-trabajos", icon: Wrench },
]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const user = authService.getUser()

  const links = (() => {
    const rol = user?.rol
    if (rol === "ADMIN") return adminLinks
    if (rol === "ENCARGADO") return encargadoLinks
    if (rol === "CHOFER") return choferLinks
    if (rol === "OWNER") return ownerLinks
    if (rol === "TECNICO") return tecnicoLinks
    return adminLinks
  })()

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = (url) => {
    setOpen(false)
    router.push(url)
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
        aria-label="Abrir buscador de navegación"
      >
        <Search className="h-4 w-4 xl:mr-2" aria-hidden="true" />
        <span className="hidden xl:inline-flex">Ir a...</span>
        <kbd aria-hidden="true" className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Navegar a..." aria-label="Buscar sección" />
        <CommandList>
          <CommandEmpty>No se encontraron secciones.</CommandEmpty>
          <CommandGroup heading="Navegación rápida">
            {links.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => handleSelect(item.url)}
                className="flex items-center gap-2"
              >
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
