import { NextResponse } from "next/server";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

// Prefijos de rutas según rol
const ROLE_PREFIXES = {
  CHOFER: "/chofer/",
  OWNER: "/dueno/",
};

// Rutas exclusivas de admin/encargado (no accesibles para chofer u owner)
const ADMIN_ONLY_PREFIXES = ["/chofer/", "/dueno/"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Dejar pasar rutas públicas y recursos estáticos
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Leer token desde cookie (httpOnly ideal) o del header
  // Como la app usa localStorage, el token no llega en cookies al servidor.
  // Se usa una cookie auxiliar "auth_role" escrita en el cliente al hacer login
  // para que el middleware pueda redirigir sin exponer el JWT.
  const authRole = request.cookies.get("auth_role")?.value;
  const hasToken = request.cookies.get("auth_token")?.value;

  // Si no hay token/role en cookies, redirigir a login
  if (!hasToken && !authRole) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = authRole?.toUpperCase();

  // CHOFER solo puede acceder a /chofer/*
  if (role === "CHOFER" && !pathname.startsWith("/chofer/")) {
    return NextResponse.redirect(new URL("/chofer/dashboard", request.url));
  }

  // OWNER solo puede acceder a /dueno/*
  if (role === "OWNER" && !pathname.startsWith("/dueno/")) {
    return NextResponse.redirect(new URL("/dueno/dashboard", request.url));
  }

  // TECNICO solo puede acceder a /tecnico/*
  if (role === "TECNICO" && !pathname.startsWith("/tecnico/")) {
    return NextResponse.redirect(new URL("/tecnico/dashboard", request.url));
  }

  // ADMIN/ENCARGADO no pueden entrar a rutas de chofer, dueño ni técnico
  if (
    (role === "ADMIN" || role === "ENCARGADO") &&
    (pathname.startsWith("/chofer/") || pathname.startsWith("/dueno/") || pathname.startsWith("/tecnico/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica a todo excepto archivos estáticos y api routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
