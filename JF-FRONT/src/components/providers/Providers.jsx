"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/authService";

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = authService.getUser();
    
    // Si no hay usuario y no estamos en la página de login, redirigir al login
    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }

    // Si hay usuario y estamos en la página de login, redirigir según el rol
    if (user && pathname === '/login') {
      if (user.rol === 'CHOFER') {
        router.push('/chofer/dashboard');
      } else if (user.rol === 'OWNER') {
        router.push('/dueno/dashboard');
      } else {
        router.push('/');
      }
      return;
    }

    // CHOFER solo puede acceder a rutas /chofer/*
    if (user?.rol === 'CHOFER' && !pathname.startsWith('/chofer/')) {
      router.push('/chofer/dashboard');
      return;
    }

    // OWNER solo puede acceder a rutas /dueno/*
    if (user?.rol === 'OWNER' && !pathname.startsWith('/dueno/')) {
      router.push('/dueno/dashboard');
      return;
    }

    // ADMIN/ENCARGADO no pueden acceder a rutas de chofer ni dueño
    if (['ADMIN', 'ENCARGADO'].includes(user?.rol) && pathname.startsWith('/chofer/')) {
      router.push('/');
      return;
    }
    if (['ADMIN', 'ENCARGADO'].includes(user?.rol) && pathname.startsWith('/dueno/')) {
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SidebarProvider>
          <div className="fixed inset-0 flex">
            {pathname !== '/login' && <SidebarNav />}
            <div className="flex-1 flex flex-col min-h-screen overflow-auto">
              {pathname !== '/login' && <Header className="sticky top-0 z-10 border-b bg-background" />}
              <main className="flex-grow p-6">{children}</main>
              {pathname !== '/login' && (
                <footer className="border-t py-4 text-center text-sm text-muted-foreground">
                  <p>© {new Date().getFullYear()} ExpresoJFTaller. Todos los derechos reservados.</p>
                </footer>
              )}
            </div>
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
} 