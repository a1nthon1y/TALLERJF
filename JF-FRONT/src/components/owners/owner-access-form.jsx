"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Key, Eye, EyeOff } from "lucide-react"

const accessFormSchema = z
  .object({
    email: z.string().email({
      message: "Debe ingresar un email válido",
    }),
    password: z.string().min(8, {
      message: "La contraseña debe tener al menos 8 caracteres",
    }),
    confirmPassword: z.string(),
    viewUnits: z.boolean().default(true),
    manageUnits: z.boolean().default(false),
    viewMaintenance: z.boolean().default(true),
    scheduleMaintenance: z.boolean().default(false),
    viewReports: z.boolean().default(true),
    viewCosts: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export function OwnerAccessForm({ owner, onSubmit, isLoading }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm({
    resolver: zodResolver(accessFormSchema),
    defaultValues: {
      email: owner?.email || "",
      password: "",
      confirmPassword: "",
      viewUnits: true,
      manageUnits: false,
      viewMaintenance: true,
      scheduleMaintenance: false,
      viewReports: true,
      viewCosts: false,
    },
  })

  const handleSubmit = (values) => {
    onSubmit(values)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configurar Acceso para {owner?.name}</CardTitle>
        <CardDescription>Configure las credenciales y permisos de acceso para este dueño</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="credentials">
          <TabsList className="mb-4">
            <TabsTrigger value="credentials">Credenciales</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <TabsContent value="credentials" className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Acceso</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="acceso@empresa.com" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>Email que utilizará el dueño para iniciar sesión</FormDescription>
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
                        <div className="flex items-center">
                          <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="relative w-full">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">
                                {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Contraseña para acceder al sistema</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="relative w-full">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">
                                {showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Repita la contraseña para confirmar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Unidades</FormLabel>
                    </div>
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="viewUnits"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Ver unidades</FormLabel>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="manageUnits"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Gestionar unidades</FormLabel>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mantenimientos</FormLabel>
                    </div>
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="viewMaintenance"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Ver mantenimientos</FormLabel>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduleMaintenance"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Programar mantenimientos</FormLabel>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Reportes</FormLabel>
                    </div>
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="viewReports"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Ver reportes</FormLabel>
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="viewCosts"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Ver costos</FormLabel>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => window.history.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  )
}

