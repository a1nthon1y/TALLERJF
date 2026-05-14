"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { BarChart3, Bus, Wrench, Package, FileBarChart, Users, LogOut, Settings, Building2, ChevronLeft, UserCircle, MapPin, Hammer, ClipboardList, Route, SlidersHorizontal, Bell } from "lucide-react"
import { useState, useEffect } from "react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import { authService } from "@/services/authService"
import { cn } from "@/lib/utils"

// ADMIN: acceso total incluido gestión de cuentas de usuario
const adminNavItems = [
  { title: "Panel",           href: "/",                      icon: BarChart3 },
  { title: "Mantenimientos",  href: "/mantenimientos",        icon: Wrench },
  { title: "Alertas",         href: "/mantenimientos/alertas",icon: Bell },
  { title: "Unidades",        href: "/unidades",              icon: Bus },
  { title: "Dueños",          href: "/duenos",                icon: Building2 },
  { title: "Choferes",        href: "/choferes",              icon: UserCircle },
  { title: "Técnicos",        href: "/tecnicos",              icon: Hammer },
  { title: "Estado de Flota", href: "/partes-unidades",       icon: Settings },
  { title: "Configuraciones", href: "/configuraciones",       icon: SlidersHorizontal },
  { title: "Materiales",      href: "/materiales",            icon: Package },
  { title: "Rutas",           href: "/rutas",                 icon: Route },
  { title: "Reportes",        href: "/reportes",              icon: FileBarChart },
  { title: "Usuarios",        href: "/usuarios",              icon: Users },
]

// ENCARGADO: gestión operativa del taller.
// NO incluye Usuarios — el backend lo bloquea con 403 (solo ADMIN).
const encargadoNavItems = [
  { title: "Panel",           href: "/",                      icon: BarChart3 },
  { title: "Mantenimientos",  href: "/mantenimientos",        icon: Wrench },
  { title: "Alertas",         href: "/mantenimientos/alertas",icon: Bell },
  { title: "Unidades",        href: "/unidades",              icon: Bus },
  { title: "Dueños",          href: "/duenos",                icon: Building2 },
  { title: "Choferes",        href: "/choferes",              icon: UserCircle },
  { title: "Técnicos",        href: "/tecnicos",              icon: Hammer },
  { title: "Estado de Flota", href: "/partes-unidades",       icon: Settings },
  { title: "Configuraciones", href: "/configuraciones",       icon: SlidersHorizontal },
  { title: "Materiales",      href: "/materiales",            icon: Package },
  { title: "Rutas",           href: "/rutas",                 icon: Route },
  { title: "Reportes",        href: "/reportes",              icon: FileBarChart },
]

const choferNavItems = [
  { title: "Inicio",            href: "/chofer/dashboard",               icon: BarChart3 },
  { title: "Registrar Llegada", href: "/chofer/reportar-llegada",        icon: MapPin },
  { title: "Reportar Falla",    href: "/chofer/solicitar-mantenimiento", icon: ClipboardList },
  { title: "Mis Solicitudes",   href: "/chofer/mis-mantenimientos",      icon: Wrench },
  { title: "Mis Reportes",      href: "/chofer/reportes",                icon: FileBarChart },
]

const tecnicoNavItems = [
  { title: "Panel", href: "/tecnico/dashboard", icon: BarChart3 },
  { title: "Mis Trabajos", href: "/tecnico/mis-trabajos", icon: Wrench },
]

const ownerNavItems = [
  { title: "Panel", href: "/dueno/dashboard", icon: BarChart3 },
  { title: "Mis Unidades", href: "/dueno/mis-unidades", icon: Bus },
  { title: "Mantenimientos", href: "/dueno/mantenimientos", icon: ClipboardList },
  { title: "Mis Reportes", href: "/dueno/reportes", icon: FileBarChart },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }, [router])

  // Si está cargando, muestra un skeleton
  if (loading) {
    return (
      <div className="h-screen w-[280px] bg-sidebar animate-pulse">
        {/* Puedes agregar un skeleton aquí */}
      </div>
    )
  }

  // Si no hay usuario, no mostrar el sidebar
  if (!user) {
    return null
  }

  const handleLogout = async () => {
    try {
      authService.logout()
      router.push('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Determinar qué items mostrar según el rol
  const navItems =
    user.rol === 'CHOFER'    ? choferNavItems    :
    user.rol === 'OWNER'     ? ownerNavItems     :
    user.rol === 'TECNICO'   ? tecnicoNavItems   :
    user.rol === 'ENCARGADO' ? encargadoNavItems :
    adminNavItems

  return (
    <div className="relative hidden md:block">
      <Sidebar
        aria-label="Navegación principal"
        className={cn(
          "h-screen bg-sidebar transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <SidebarHeader className="bg-sidebar border-none">
          <div className={cn(
            "flex items-center py-3",
            isCollapsed ? "justify-center" : "px-4"
          )}>
            <Bus className={cn(
              "text-sidebar-primary shrink-0",
              isCollapsed ? "h-6 w-6" : "h-5 w-5"
            )} />
            {!isCollapsed && (
              <div className="ml-3">
                <div className="font-semibold text-lg text-sidebar-foreground">ExpresoJF</div>
                <div className="text-xs text-sidebar-foreground/70">
                  {user.rol === 'ADMIN' ? 'Administrador' : user.rol === 'ENCARGADO' ? 'Encargado' : user.rol === 'OWNER' ? 'Dueño' : user.rol === 'TECNICO' ? 'Técnico' : 'Chofer'}
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="py-1">
          <SidebarGroup className="border-none">
            {!isCollapsed && (
              <SidebarGroupLabel className="px-4 py-2 text-xs uppercase tracking-wider text-sidebar-foreground/70">
                Navegación
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className="border-none">
              <SidebarMenu className="space-y-0.5">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link 
                      href={item.href} 
                      className={cn(
                        "flex items-center w-full rounded-lg transition-all duration-200",
                        "hover:bg-sidebar-accent/50",
                        pathname === item.href ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground",
                        isCollapsed ? "justify-center p-3" : "px-4 py-2 gap-3"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className={cn(
                        "transition-transform duration-200",
                        pathname === item.href ? "text-sidebar-primary" : "",
                        isCollapsed ? "h-6 w-6" : "h-4 w-4"
                      )} />
                      {!isCollapsed && (
                        <span className="text-sm transition-opacity duration-200">
                          {item.title}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="relative">
          <SidebarFooter className="bg-sidebar-accent/10 border-none">
            <div className={cn(
              "flex items-center py-3",
              isCollapsed ? "justify-center" : "gap-3 px-4"
            )}>
              <UserAvatar 
                user={user}
                variant="sidebar"
                className={cn(
                  "border border-sidebar-border/50 shrink-0",
                  isCollapsed ? "h-10 w-10" : "h-8 w-8"
                )}
              />
              {!isCollapsed && (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none text-sidebar-foreground">
                      {user.nombre}
                    </p>
                    <p className="text-xs text-sidebar-foreground/70 mt-1">
                      {user.rol === 'ADMIN' ? 'Administrador'
                        : user.rol === 'ENCARGADO' ? 'Encargado'
                        : user.rol === 'OWNER' ? 'Dueño'
                        : user.rol === 'TECNICO' ? 'Técnico'
                        : 'Chofer'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-sidebar-accent/50"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    onClick={handleLogout}
                  >
                    <LogOut className={cn(
                      "text-sidebar-foreground",
                      isCollapsed ? "h-5 w-5" : "h-4 w-4"
                    )} aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </SidebarFooter>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute -right-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full",
              "bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all duration-300",
              isCollapsed ? "rotate-180" : "",
              "shadow-md hover:shadow-lg"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expandir" : "Colapsar"}
          >
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          </Button>
        </div>
      </Sidebar>
    </div>
  )
}
