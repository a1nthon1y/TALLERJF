"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"
import {
  Wrench, ClipboardList, MapPin,
  Bus, LayoutDashboard, Hammer, Package,
  FileBarChart, Users, Settings, Building2, UserCircle,
  MoreHorizontal, X, Route, Bell, SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Items que van en la barra inferior (máx 4 + "Más")
const primaryByRole = {
  CHOFER: [
    { title: "Inicio",    href: "/chofer/dashboard",               icon: LayoutDashboard },
    { title: "Llegada",   href: "/chofer/reportar-llegada",        icon: MapPin },
    { title: "Falla",     href: "/chofer/solicitar-mantenimiento", icon: ClipboardList },
    { title: "Historial", href: "/chofer/mis-mantenimientos",      icon: Wrench },
    { title: "Reportes",  href: "/chofer/reportes",                icon: FileBarChart },
  ],
  TECNICO: [
    { title: "Inicio",       href: "/tecnico/dashboard",   icon: LayoutDashboard },
    { title: "Mis Trabajos", href: "/tecnico/mis-trabajos", icon: Hammer },
    { title: "Reportes",     href: "/tecnico/reportes",    icon: FileBarChart },
  ],
  OWNER: [
    { title: "Inicio",    href: "/dueno/dashboard",       icon: LayoutDashboard },
    { title: "Unidades",  href: "/dueno/mis-unidades",    icon: Bus },
    { title: "Historial", href: "/dueno/mantenimientos",  icon: Wrench },
    { title: "Reportes",  href: "/dueno/reportes",        icon: FileBarChart },
  ],
  ADMIN: [
    { title: "Inicio",    href: "/",               icon: LayoutDashboard },
    { title: "Mant.",     href: "/mantenimientos", icon: Wrench },
    { title: "Unidades",  href: "/unidades",       icon: Bus },
    { title: "Reportes",  href: "/reportes",       icon: FileBarChart },
  ],
  ENCARGADO: [
    { title: "Inicio",    href: "/",               icon: LayoutDashboard },
    { title: "Mant.",     href: "/mantenimientos", icon: Wrench },
    { title: "Unidades",  href: "/unidades",       icon: Bus },
    { title: "Reportes",  href: "/reportes",       icon: FileBarChart },
  ],
}

// Items extras que van en el drawer "Más" (solo para roles con muchas páginas)
const moreByRole = {
  ADMIN: [
    { title: "Dueños",           href: "/duenos",                  icon: Building2 },
    { title: "Choferes",         href: "/choferes",                icon: UserCircle },
    { title: "Técnicos",         href: "/tecnicos",                icon: Hammer },
    { title: "Estado de Flota",  href: "/partes-unidades",         icon: Settings },
    { title: "Configuraciones",  href: "/configuraciones",         icon: SlidersHorizontal },
    { title: "Materiales",       href: "/materiales",              icon: Package },
    { title: "Rutas",            href: "/rutas",                   icon: Route },
    { title: "Usuarios",         href: "/usuarios",                icon: Users },
    { title: "Alertas",          href: "/mantenimientos/alertas",  icon: Bell },
  ],
  ENCARGADO: [
    { title: "Dueños",           href: "/duenos",         icon: Building2 },
    { title: "Choferes",         href: "/choferes",       icon: UserCircle },
    { title: "Técnicos",         href: "/tecnicos",       icon: Hammer },
    { title: "Estado de Flota",  href: "/partes-unidades", icon: Settings },
    { title: "Materiales",       href: "/materiales",     icon: Package },
    { title: "Rutas",            href: "/rutas",          icon: Route },
    { title: "Alertas",          href: "/mantenimientos/alertas", icon: Bell },
  ],
}

export function BottomNav() {
  const pathname = usePathname()
  const [primary, setPrimary] = useState([])
  const [more, setMore] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const user = authService.getUser()
    if (!user) return
    setPrimary(primaryByRole[user.rol] ?? primaryByRole.ADMIN)
    setMore(moreByRole[user.rol] ?? [])
  }, [])

  // Cerrar drawer al navegar
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (!primary.length) return null

  const hasMore = more.length > 0
  // ¿Algún item del drawer está activo?
  const moreIsActive = more.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  )

  return (
    <>
      {/* Overlay oscuro */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer "Más" — sube desde el bottom nav */}
      {hasMore && (
        <div className={cn(
          "md:hidden fixed left-0 right-0 z-50 bg-background border-t rounded-t-2xl shadow-xl transition-transform duration-300 ease-out",
          drawerOpen ? "translate-y-0" : "translate-y-full",
          "bottom-16" // justo encima del bottom nav
        )}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Más secciones</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {more.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-[11px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{item.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-stretch h-16">
          {primary.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                <span>{item.title}</span>
                {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-t-full bg-primary" />}
              </Link>
            )
          })}

          {/* Botón "Más" */}
          {hasMore && (
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative",
                (drawerOpen || moreIsActive) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {drawerOpen
                ? <X className="h-5 w-5 transition-transform scale-110" />
                : <MoreHorizontal className="h-5 w-5" />}
              <span>Más</span>
              {(drawerOpen || moreIsActive) && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-t-full bg-primary" />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
