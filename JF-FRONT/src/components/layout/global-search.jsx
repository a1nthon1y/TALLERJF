"use client"

import { useState, useEffect } from "react"
import { Search, Bus, Wrench, Package, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"

// Datos de ejemplo para la búsqueda
const searchData = {
  unidades: [
    { id: "1", name: "ABC-123", type: "Mercedes Benz O500", url: "/unidades/1" },
    { id: "2", name: "XYZ-789", type: "Volvo 9700", url: "/unidades/2" },
    { id: "3", name: "DEF-456", type: "Scania K410", url: "/unidades/3" },
  ],
  mantenimientos: [
    { id: "1", name: "Cambio de aceite ABC-123", type: "Preventivo", url: "/mantenimientos/1" },
    { id: "2", name: "Reparación de frenos XYZ-789", type: "Correctivo", url: "/mantenimientos/2" },
    { id: "3", name: "Revisión eléctrica DEF-456", type: "Preventivo", url: "/mantenimientos/3" },
  ],
  materiales: [
    { id: "1", name: "Aceite de motor 15W-40", type: "Lubricantes", url: "/materiales/1" },
    { id: "2", name: "Filtro de aceite", type: "Filtros", url: "/materiales/2" },
    { id: "3", name: "Pastillas de freno", type: "Frenos", url: "/materiales/3" },
  ],
  usuarios: [
    { id: "1", name: "Juan Pérez", type: "Administrador", url: "/usuarios/1" },
    { id: "2", name: "Ana Martínez", type: "Chofer", url: "/usuarios/2" },
    { id: "3", name: "Carlos Rodríguez", type: "Chofer", url: "/usuarios/3" },
  ],
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Manejar atajos de teclado para abrir la búsqueda
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = (url) => {
    setOpen(false)
    router.push(url)
  }

  const getIcon = (category) => {
    switch (category) {
      case "unidades":
        return <Bus className="mr-2 h-4 w-4" />
      case "mantenimientos":
        return <Wrench className="mr-2 h-4 w-4" />
      case "materiales":
        return <Package className="mr-2 h-4 w-4" />
      case "usuarios":
        return <User className="mr-2 h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar unidades, mantenimientos, materiales..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {Object.entries(searchData).map(([category, items]) => (
            <CommandGroup key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
              {items.map((item) => (
                <CommandItem
                  key={`${category}-${item.id}`}
                  onSelect={() => handleSelect(item.url)}
                  className="flex items-center"
                >
                  {getIcon(category)}
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.type}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

