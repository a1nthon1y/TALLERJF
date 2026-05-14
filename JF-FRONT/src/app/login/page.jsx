"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Eye, EyeOff, Shield, Gauge, Wrench } from "lucide-react";
import Image from "next/image";
import { authService } from "@/services/authService";

const formSchema = z.object({
  username: z.string().min(1, { message: "El usuario es requerido" }),
  password: z
    .string()
    .min(1, { message: "La contraseña es requerida" })
    .min(6, { message: "Mínimo 6 caracteres" }),
});

const features = [
  { icon: Gauge, text: "Control de flota en tiempo real" },
  { icon: Wrench, text: "Gestión de mantenimiento predictivo" },
  { icon: Shield, text: "Acceso seguro por roles" },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await authService.login(values);
      if (result.token && result.user) {
        if (result.user.rol === "CHOFER") router.push("/chofer/dashboard");
        else if (result.user.rol === "OWNER") router.push("/dueno/dashboard");
        else if (result.user.rol === "TECNICO") router.push("/tecnico/dashboard");
        else router.push("/");
      }
    } catch (error) {
      setErrorMessage(error.message || "Usuario o contraseña incorrectos");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Panel izquierdo: marca ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0f172a 0%, #1e3a5f 60%, #1a4480 100%)" }}
      >
        {/* Patrón de cuadrícula sutil */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Círculos decorativos */}
        <div
          className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }}
        />

        {/* Logo + nombre */}
        <div className="relative z-10 flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="ExpresoJF Logo"
            width={44}
            height={44}
            className="rounded-lg object-contain"
            priority
          />
          <div>
            <p className="text-white font-bold text-lg leading-tight">ExpresoJF</p>
            <p className="text-blue-300 text-xs font-medium tracking-widest uppercase">Sistema de Taller</p>
          </div>
        </div>

        {/* Contenido central */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">
              Gestión de flota<br />
              <span className="text-amber-400">inteligente</span>
            </h1>
            <p className="text-blue-200 text-base leading-relaxed max-w-sm">
              Monitorea, programa y controla el mantenimiento de tu flota de buses desde un solo lugar.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/20 shrink-0">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-blue-100 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pie del panel */}
        <div className="relative z-10">
          <p className="text-blue-400/60 text-xs">
            © {new Date().getFullYear()} ExpresoJF · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ──────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Logo solo visible en móvil */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <Image src="/icon.png" alt="ExpresoJF Logo" width={40} height={40} className="rounded-lg object-contain" priority />
          <div>
            <p className="font-bold text-base">ExpresoJF</p>
            <p className="text-muted-foreground text-xs">Sistema de Taller</p>
          </div>
        </div>

        <div className="w-full max-w-[380px] space-y-8">
          {/* Encabezado del form */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Error inline */}
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Usuario</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ej: aespinoza"
                        {...field}
                        disabled={isLoading}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          disabled={isLoading}
                          autoComplete="current-password"
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </Form>

          {/* Nota de soporte */}
          <p className="text-center text-xs text-muted-foreground">
            ¿Problemas para ingresar? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
