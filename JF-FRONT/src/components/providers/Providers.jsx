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
    // pathname puede ser null durante la primera hidratación en Next.js 15
    if (!pathname) return;

    try {
      const user = authService.getUser();

      if (!user && pathname !== '/login') {
        router.push('/login');
        setIsLoading(false);
        return;
      }

      if (user && pathname === '/login') {
        if (user.rol === 'CHOFER') {
          router.push('/chofer/dashboard');
        } else if (user.rol === 'OWNER') {
          router.push('/dueno/dashboard');
        } else if (user.rol === 'TECNICO') {
          router.push('/tecnico/dashboard');
        } else {
          router.push('/');
        }
        setIsLoading(false);
        return;
      }

      if (user?.rol === 'CHOFER' && !pathname.startsWith('/chofer/')) {
        router.push('/chofer/dashboard');
        setIsLoading(false);
        return;
      }

      if (user?.rol === 'OWNER' && !pathname.startsWith('/dueno/')) {
        router.push('/dueno/dashboard');
        setIsLoading(false);
        return;
      }

      if (user?.rol === 'TECNICO' && !pathname.startsWith('/tecnico/')) {
        router.push('/tecnico/dashboard');
        setIsLoading(false);
        return;
      }

      if (['ADMIN', 'ENCARGADO'].includes(user?.rol) &&
        (pathname.startsWith('/chofer/') || pathname.startsWith('/dueno/') || pathname.startsWith('/tecnico/'))) {
        router.push('/');
        setIsLoading(false);
        return;
      }
    } catch {
      // Si hay error leyendo localStorage (datos corruptos, etc.), limpiar sesión
      authService.removeToken();
      authService.removeUser();
      if (pathname !== '/login') {
        router.push('/login');
      }
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
              <main key={pathname} className="flex-grow p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                {children}
              </main>
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