"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Bus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/authService";

const formSchema = z.object({
  username: z.string().min(1, { message: "El usuario es requerido" }),
  password: z
    .string()
    .min(1, { message: "La contraseña es requerida" })
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await authService.login(values);

      if (result.token && result.user) {
        toast.success("Inicio de sesión exitoso");
        if (result.user.rol === "CHOFER") {
          router.push("/chofer/dashboard");
        } else if (result.user.rol === "OWNER") {
          router.push("/dueno/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error en login:", error);
      setErrorMessage(error.message || "Error al iniciar sesión");
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Bus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">ExpresoJFTaller</h1>
          <p className="text-sm text-muted-foreground">
            Ingrese sus credenciales para acceder al sistema
          </p>
        </div>

        {errorMessage && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="grid gap-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ej: aespinoza"
                        {...field}
                        disabled={isLoading}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`transition-all duration-200 focus:ring-2 focus:ring-primary
                          ${form.formState.errors.username ? "border-destructive" : ""}`}
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
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        disabled={isLoading}
                        autoComplete="current-password"
                        className={`transition-all duration-200 focus:ring-2 focus:ring-primary
                          ${form.formState.errors.password ? "border-destructive" : ""}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando credenciales...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
