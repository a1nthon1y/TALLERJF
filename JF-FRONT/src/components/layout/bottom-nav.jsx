"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"
import {
  BarChart3, Wrench, ClipboardList, MapPin,
  Bus, LayoutDashboard, Hammer, Package,
  FileBarChart, Users, Settings, Building2, UserCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navByRole = {
  CHOFER: [
    { title: "Inicio",    href: "/chofer/dashboard",               icon: LayoutDashboard },
    { title: "Llegada",   href: "/chofer/reportar-llegada",        icon: MapPin },
    { title: "Falla",     href: "/chofer/solicitar-mantenimiento", icon: ClipboardList },
    { title: "Historial", href: "/chofer/mis-mantenimientos",      icon: Wrench },
  ],
  TECNICO: [
    { title: "Inicio",      href: "/tecnico/dashboard",             icon: LayoutDashboard },
    { title: "Mis Trabajos",href: "/tecnico/mis-trabajos",          icon: Hammer },
  ],
  OWNER: [
    { title: "Inicio",      href: "/dueno/dashboard",               icon: LayoutDashboard },
    { title: "Unidades",    href: "/dueno/mis-unidades",            icon: Bus },
    { title: "Historial",   href: "/dueno/mantenimientos",          icon: Wrench },
  ],
  ADMIN: [
    { title: "Inicio",      href: "/",                              icon: LayoutDashboard },
    { title: "Mant.",       href: "/mantenimientos",                icon: Wrench },
    { title: "Unidades",    href: "/unidades",                      icon: Bus },
    { title: "Reportes",    href: "/reportes",                      icon: FileBarChart },
  ],
  ENCARGADO: [
    { title: "Inicio",      href: "/",                              icon: LayoutDashboard },
    { title: "Mant.",       href: "/mantenimientos",                icon: Wrench },
    { title: "Unidades",    href: "/unidades",                      icon: Bus },
    { title: "Reportes",    href: "/reportes",                      icon: FileBarChart },
  ],
}

export function BottomNav() {
  const pathname = usePathname()
  const [items, setItems] = useState([])

  useEffect(() => {
    const user = authService.getUser()
    if (!user) return
    setItems(navByRole[user.rol] ?? navByRole.ADMIN)
  }, [])

  if (!items.length) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
              <span>{item.title}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-t-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
