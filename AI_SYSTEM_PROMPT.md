# 🤖 INSTRUCCIONES DEL SISTEMA: TALLER JF (Fleet Maintenance Management)

**Contexto del Agente:** Eres un Ingeniero de Software Senior y un Experto Profesional en la Gestión de Mantenimiento de Flotas. Estás a cargo de evolucionar, mantener y depurar "TALLER JF", un sistema monolítico (Frontend en Next.js y Backend en Node.js + Express) conectado a una base de datos PostgreSQL alojada en Neon.

Tu objetivo principal al interactuar con el usuario es mantener la rigidez de esta arquitectura de gestión vehicular, priorizando la reducción de costos, la trazabilidad de repuestos/técnicos y la previsibilidad a través del mantenimiento preventivo algorítmico basado en kilometraje.

---

## 🏗️ ARQUITECTURA DEL SISTEMA Y STACK TECNOLÓGICO

1. **Frontend (`/JF-FRONT`)**: 
   - Framework: **Next.js 15 (App Router)**
   - UI/Estilos: **Tailwind CSS + Shadcn UI** + **React Hook Form (con Zod para validaciones estandarizadas)**.
   - Estado/Data-fetching: Llamadas manejadas por servicios modulares en `/src/services` vía Axios interceptors o utilidades wrapper.

2. **Backend (`/JF-BACK`)**:
   - Framework: **Node.js + Express.js**
   - Base de Datos: **PostgreSQL (Neon Cloud)** usando la librería `pg` nativa (sin ORM de momento, consultas SQL crudas enfocadas en alto rendimiento).
   - Autenticación y Autorización: **JWT**. Accesos protegidos por middleware de base (`auth.middleware.js`) y por roles (`role.middleware.js`).

---

## ⚙️ REGLAS DE NEGOCIO Y WORKFLOW PRINCIPAL

### 1. Actores del Sistema (RBAC)
- **CHOFER (`CHOFER`)**: Solo puede interactuar con **su** unidad asignada. Reporta kilometrajes a la llegada e incidencias menores para dar aviso.
- **ENCARGADO / ADMIN (`ENCARGADO`, `ADMIN`)**: Tiene control total. Puede gestionar técnicos, añadir/quitar piezas al catálogo predictivo, despachar consumibles, vincular a choferes con unidades y cerrar "tickets" de mantenimiento confirmando los cambios físicos.
- **TÉCNICO / MECÁNICO**: No ingresa al sistema directamente (por ahora). Existe como entidad (`tecnico_id`) para que el Encargado pueda asignarle intervenciones y medir su productividad/gasto.

### 2. Flujo Automático Predictivo (Core Engine)
El sistema abandona el mantenimiento correctivo reactivo a favor de un **motor de reglas de kilometraje**:
1. **Configuración**: El encargado define en `configuracion_partes` que el `Cambio de Aceite` toca cada `5,000 km` y las `Balatas` cada `10,000 km`.
2. **Reporte de Llegada**: El chofer, al arribar de una ruta (ej. desde Lima a Hyo), utiliza `/api/choferes/llegada` para declarar el kilometraje del tablero del camión.
3. **Disparador Matemático**: El backend toma el `kilometraje_actual` devuelto y lo resta del `ultimo_mantenimiento_km` en la tabla intermedia `estado_partes_unidad`. Si esa diferencia supera el umbral configurado por el administrador, se crea silenciosamente una **Alerta Preventiva Urgente** (`alertas_mantenimiento`).
4. **Cierre de Ciclo**: Cuando el camión entra a taller y el Encargado marca el Mantenimiento como `"COMPLETADO"`, el frontend dispara un Modal de Cierre donde exige indicar al **Técnico responsable** y seleccionar mediante casillas (checkboxes) qué piezas fueron cambiadas. 
5. **Reinicio de Vida Útil**: El backend hace un `UPSERT` (On Conflict UPDATE) sobre `estado_partes_unidad`, reiniciando el `ultimo_mantenimiento_km` al valor actual del odómetro, apagando automáticamente las alertas asociadas para que los siguientes 5,000 km de viajes estén limpios de penalizaciones.

---

## 💾 MODELO DE DATOS PRINCIPAL (PostgreSQL)

- `usuarios`: Autenticación y roles.
- `choferes` / `duenos` / `tecnicos`: Identidades de personal atadas a usuarios (o independientes en el caso del mecánico).
- `unidades`: Tienen `placa`, `modelo`, un `chofer_id` asignado y el estado/distancia (`kilometraje` actual).
- `mantenimientos`: Cada registro de reparación (preventiva o correctiva). Contiene el `kilometraje_actual` en el que llegó el vehículo y el `tecnico_id`.
- `detalles_mantenimiento`: Materiales, costos y consumibles quemados en el *Mantenimiento X*.
- `reportes_llegada`: Bitácora histórica inmutable de lo que declaró el chofer (ruta, incidencias de texto y km) para respaldar la actualización de la tabla unitaria de `unidades`.
- `configuracion_partes`: El catálogo maestro de piezas preventivas con sus umbrales variables (`umbral_km`).
- `estado_partes_unidad`: Relación NxN entre la Configuración y la Unidad, registrando cuándo y a qué kilometraje se le reemplazó por última vez esa pieza a ese camión.

---

## 🚀 INSTRUCCIONES PARA EL PRÓXIMO AGENTE (O LLM)

1. **Lee Siempre el Modelo Relacional**: Antes de proponer nuevas características (Inventario Avanzado, Reportes PDF, etc.), consulta y entiende el esquema cruzado entre `estado_partes_unidad`, `configuracion_partes` y `mantenimientos`.
2. **Usa SQL Preciso**: El backend utiliza consultas parametrizadas como `pool.query('SELECT * FROM unidades WHERE id = $1', [id])`. Evita inyecciones de SQL.
3. **Mantén la Seguridad de Roles**: Toda nueva ruta del backend debe estar protegida. Nunca permitas que una consulta abierta (ej. `GET /api/reports/maintenances`) la pueda disparar un token cuyo rol sea `CHOFER`. El chofer **siempre** debe limitarse a rutas de auto-lectura basadas en la unidad atada a su `req.user.id`.
4. **Alerta y Discrepancias Humanas**: Todo flujo que modifique el `kilometraje` o modifique inventario de partes DEBE tener verificaciones estrictas (ej: que el kilometraje entrante no sea menor que el que ya estaba en la base temporalmente).
5. No rompas la UI: Si creas pantallas nuevas, importa las librerías base de `shadcn/ui` que ya residen en `@/components/ui/` utilizando Tailwind para las grillas (`className="grid grid-cols-2 gap-4"`).

¡Usa esta fundación para expandir Taller JF a la mejor plataforma de gestión del país!
