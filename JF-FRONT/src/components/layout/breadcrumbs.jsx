"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()

  if (pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  const pathMap = {
    // Admin/Encargado
    unidades: "Unidades",
    mantenimientos: "Mantenimientos",
    alertas: "Alertas",
    materiales: "Materiales",
    reportes: "Reportes",
    usuarios: "Usuarios",
    tecnicos: "Técnicos",
    duenos: "Dueños",
    choferes: "Choferes",
    configuraciones: "Configuraciones",
    "partes-unidades": "Partes de Unidades",
    // Role-based roots
    dueno: "Mi Panel",
    chofer: "Mi Panel",
    tecnico: "Mi Panel",
    // Chofer sub-pages
    dashboard: "Dashboard",
    "mis-mantenimientos": "Mis Mantenimientos",
    "solicitar-mantenimiento": "Solicitar Mantenimiento",
    "reportar-llegada": "Llegada al Taller",
    // Dueño sub-pages
    "mis-unidades": "Mis Unidades",
    // Técnico sub-pages
    "mis-trabajos": "Mis Trabajos",
    // Reports
    "por-dueno": "Por Dueño",
    // Others
    login: "Iniciar Sesión",
    "partes-unidades": "Partes de Unidades",
  }

  return (
    <nav aria-label="Ruta de navegación" className="flex items-center text-sm text-muted-foreground mb-4">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/" className="flex items-center hover:text-primary">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          const url = `/${segments.slice(0, index + 1).join("/")}`
          const isLast = index === segments.length - 1
          const isId = !isNaN(Number(segment)) && segment !== ""

          let name = pathMap[segment] ?? segment
          if (isId && index > 0) {
            const parentSegment = segments[index - 1]
            name = `Detalle de ${pathMap[parentSegment] ?? parentSegment}`
          }

          return (
            <li key={`${segment}-${index}`} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">{name}</span>
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
