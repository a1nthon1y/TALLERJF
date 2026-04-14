"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()

  // No mostrar breadcrumbs en la página principal
  if (pathname === "/") {
    return null
  }

  // Convertir la ruta en segmentos
  const segments = pathname.split("/").filter(Boolean)

  // Mapeo de rutas a nombres legibles
  const pathMap = {
    unidades: "Unidades",
    mantenimientos: "Mantenimientos",
    materiales: "Materiales",
    reportes: "Reportes",
    usuarios: "Usuarios",
    login: "Iniciar Sesión",
  }

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/" className="flex items-center hover:text-primary">
            <Home className="h-4 w-4" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          // Construir la URL para este segmento
          const url = `/${segments.slice(0, index + 1).join("/")}`
          const isLast = index === segments.length - 1

          // Verificar si es un ID (si es numérico)
          const isId = !isNaN(Number(segment))

          // Nombre a mostrar
          let name = pathMap[segment] || segment

          // Si es un ID, mostrar "Detalle" o similar
          if (isId && index > 0) {
            const parentSegment = segments[index - 1]
            name = `Detalle de ${pathMap[parentSegment] || parentSegment}`
          }

          return (
            <li key={segment} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1" />
              {isLast ? (
                <span className="font-medium text-foreground">{name}</span>
              ) : (
                <Link href={url} className="hover:text-primary">
                  {name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

