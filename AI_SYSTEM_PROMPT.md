# 🤖 INSTRUCCIONES DEL SISTEMA: TALLER JF (Fleet Maintenance Management)

**Contexto del Agente:** Eres un Ingeniero de Software Senior y un Experto Profesional en la Gestión de Mantenimiento de Flotas. Estás a cargo de evolucionar, mantener y depurar "TALLER JF", un sistema monolítico (Frontend en Next.js y Backend en Node.js + Express) conectado a una base de datos PostgreSQL alojada en Neon.

Tu objetivo principal al interactuar con el usuario es mantener la rigidez de esta arquitectura de gestión vehicular, priorizando la reducción de costos, la trazabilidad de repuestos/técnicos y la previsibilidad a través del mantenimiento preventivo algorítmico basado en kilometraje.

---

## 🏗️ ARQUITECTURA DEL SISTEMA Y STACK TECNOLÓGICO

1. **Frontend (`/JF-FRONT`)**:
   - Framework: **Next.js 15 (App Router)**
   - UI/Estilos: **Tailwind CSS + Shadcn UI** + **React Hook Form (con Zod para validaciones estandarizadas)**.
   - Estado/Data-fetching: Servicios modulares en `/src/services`. Hooks personalizados en `/src/hooks`. **TanStack Query** para listas administrativas.
   - Autenticación cliente: `authService.js` guarda token y user en `localStorage`. El middleware de Next.js (`middleware.js`) valida cookies auxiliares (`auth_token`, `auth_role`) para proteger rutas en el servidor.
   - Proveedores globales: `Providers.jsx` gestiona auth, tema y sidebar. **Cada rama del `useEffect` de Providers debe llamar `setIsLoading(false)` antes de retornar** para evitar que el spinner quede congelado.

2. **Backend (`/JF-BACK`)**:
   - Framework: **Node.js + Express.js**
   - Base de Datos: **PostgreSQL (Neon Cloud)** usando la librería `pg` nativa (sin ORM, consultas SQL parametrizadas).
   - Autenticación y Autorización: **JWT**. Accesos protegidos por `auth.middleware.js` y `role.middleware.js`.
   - HTTP verbs disponibles desde frontend: `GET / POST / PUT / PATCH / DELETE` vía helpers en `@/utils/api.js` (`makeGetRequest / makePostRequest / makePutRequest / makePatchRequest / makeDeleteRequest`).

---

## ⚙️ REGLAS DE NEGOCIO Y WORKFLOW PRINCIPAL

### 1. Actores del Sistema (RBAC)

| Rol | Rutas frontend | Descripción |
|---|---|---|
| `CHOFER` | `/chofer/*` | Ve y opera **sus** unidades asignadas. |
| `OWNER` (Dueño) | `/dueno/*` | Visibilidad de flota: unidades, mantenimientos y costos. Sin edición directa. |
| `TECNICO` | `/tecnico/*` | Ve sus trabajos asignados, marca avances y registra materiales. |
| `ENCARGADO` | `/` y rutas de gestión | Operación diaria del taller: gestión de mantenimientos con flujo **forward-only**. |
| `ADMIN` | `/` y rutas de gestión | Control total + capacidades adicionales de corrección (puede retroceder estados, eliminar). |

> **Nota CHOFER**: Un chofer **puede tener múltiples unidades asignadas** (`unidades.chofer_id`). El endpoint `GET /api/choferes/mi-unidad` devuelve `{ unidades: [...] }` (array). El hook `useMiUnidad` (`/src/hooks/useMiUnidad.js`) gestiona la lista y la unidad activa seleccionada.

> **Nota "Jefe de máquina"**: Solo el chofer principal interactúa con el sistema; el "segundo chofer" es informativo (no tiene acceso ni reporta).

### 2. Códigos únicos de mantenimiento (obligatorios)

Cada registro de mantenimiento tiene un código generado al crearse:

| Prefijo | Origen | Ejemplo |
|---|---|---|
| `PRV-YYMM-NNNN` | Preventivo programado (alertas / planeación) | `PRV-2605-0018` |
| `CRR-YYMM-NNNN` | Correctivo (solicitud chofer o detección) | `CRR-2605-0001` |
| `CAM-YYMM-NNNN` | Trabajo en campo / ruta (reporte del chofer) | `CAM-2605-0007` |

- `YYMM` = año/mes de creación (`2605` = mayo 2026).
- `NNNN` = secuencia mensual auto-incremental por prefijo (función `generarCodigo`).
- Registros antiguos sin código fueron backfilled usando `id`; los nuevos siguen el conteo mensual correcto.

### 3. Motor Automático Predictivo (Core Engine)

1. **Configuración**: El encargado/admin define en `configuracion_partes` umbrales por componente (`Cambio de Aceite`: 5,000 km, `Balatas`: 10,000 km, etc.). Cada regla tiene un flag `activo`.
2. **Reporte de Llegada** (`/chofer/reportar-llegada`): el chofer declara el kilometraje. **El nuevo valor debe ser ≥ al ya registrado.**
3. **Disparador Matemático**: el backend resta `kilometraje_actual − ultimo_mantenimiento_km`. Si supera el umbral y NO existe alerta activa para esa parte+unidad, inserta una alerta `ACTIVO`.
4. **Filtro `activo`**: el motor solo evalúa reglas con `cp.activo = TRUE`. Reglas inactivas no generan alertas nuevas (pero las alertas previas siguen vivas hasta resolverse — ver §10).
5. **Cierre de Ciclo**: al completar un mantenimiento, las partes marcadas como `partes_programadas` (preventivo) o las pasadas explícitamente como `partes_reparadas` resetean su contador en `estado_partes_unidad` y marcan sus alertas como `RESUELTO`.

### 4. Estado de Mantenimiento

| `estado` | Significado | Quién lo provoca |
|---|---|---|
| `PENDIENTE` | Creado, esperando técnico o inicio | Admin/Encargado/Chofer (solicitud) |
| `EN_PROCESO` | Técnico trabajando | Admin/Encargado/Técnico |
| `COMPLETADO` | Trabajo realizado, contadores reseteados, esperando aprobación del jefe mecánico | Admin/Encargado/Técnico |
| `CERRADO` | Aprobado y archivado, **INMUTABLE** | Admin/Encargado (vía "Cerrar / Aprobar") |
| `REALIZADO` | Trabajo en campo (ruta) — contadores reseteados al instante | Backend (al recibir `partes_campo` en llegada) |

#### Transiciones permitidas

```
ENCARGADO (forward-only):
  PENDIENTE → EN_PROCESO → COMPLETADO → [Cerrar/Aprobar] → CERRADO

ADMIN (libre entre estados activos para corregir errores):
  PENDIENTE ⇄ EN_PROCESO ⇄ COMPLETADO → [Cerrar/Aprobar] → CERRADO

CERRADO: inmutable para TODOS los roles.
```

- Frontend: matrices `TRANSICIONES_ENCARGADO` y `TRANSICIONES_ADMIN` en `maintenances-table.jsx` definen las opciones del selector.
- Backend: `editMaintenance` (en `maintenance.controller.js`) lee `req.user.rol`; si NO es ADMIN, aplica la matriz forward-only.
- El paso a `CERRADO` solo se hace vía `closeMaintenance` (botón "Cerrar / Aprobar"), nunca desde Editar.

### 5. `partes_programadas` (JSONB) — Fuente única de verdad

Columna `mantenimientos.partes_programadas JSONB` (array de IDs de `configuracion_partes`):
- Se persiste al **crear** mantenimientos preventivos (lista de partes que se van a atender).
- Se persiste al **editar** (admin/encargado puede ajustar el plan).
- Se persiste al **completar** (lista final de partes realmente atendidas).
- Al transicionar a `COMPLETADO`, el contenido de `partes_programadas` se usa también como `partes_reparadas` → resetea contadores predictivos.
- **No existe checkbox separado "Piezas reparadas"** — esa redundancia se eliminó. Las partes a atender SON las partes reparadas.

Backend `normalizeMaint()` garantiza que `partes_programadas` siempre se devuelva como array (parsea string JSON si el driver no lo hace automáticamente). Aplicado en `getAllMaintenances`, `getMaintenanceById`, `editMaintenance`.

### 6. Form "Nuevo Mantenimiento" (dinámico según tipo)

| Tipo | UI específica |
|---|---|
| **Preventivo** | Lista de partes de la unidad con badges (Crítico / Alerta / OK) y km restantes/vencidos. Pre-marca automáticamente las que tienen alerta crítica o de advertencia. Campo `observaciones` (nota adicional) es OPCIONAL. |
| **Correctivo** | Textarea OBLIGATORIO "Problema reportado" para describir el síntoma. No muestra lista de partes. |

`page.jsx /mantenimientos` usa `form.watch("tipo")` para alternar la UI. Backend recibe `{ tipo, observaciones, partes_programadas, ... }`.

### 7. Dialog "Editar Mantenimiento"

Coherente con el form de creación según el tipo:

- **Preventivo**: muestra "Partes a atender" con estado predictivo en vivo (mismos badges Crítico/Alerta/OK), pre-marcando las que ya estaban en `partes_programadas`. Permite ajustar. Tiene nota adicional opcional.
- **Correctivo**: muestra "Historial de notas" read-only + campo "Agregar nota" (se anexa, nunca sobrescribe).

**Implementación crítica:**
- `openEditDialog` hace `GET /maintenances/:id` para tener `partes_programadas` fresco (evita stale state).
- `editPartesRef` (`useRef`) sincronizado con `editPartes` para evitar **stale closure** en `handleEditSubmit` (un bug previo: el handler capturaba el array viejo).
- Servicio `maintenanceService.editMaintenance(id, payload)` reenvía el `payload` completo (un destructuring previo descartaba silenciosamente `partes_programadas` y `nota_adicional` — corregido).

### 8. Dialog "Completar Mantenimiento" (dedicado)

Acción "Marcar completado" del dropdown abre este dialog (NO el de Editar):
- Aparece **solo cuando el estado es `EN_PROCESO`**.
- Selector de técnico obligatorio si no estaba asignado.
- Lista de materiales registrados con costo total + sub-form para agregar materiales adicionales (última oportunidad antes de bloquear).
- Para preventivos: muestra `partes_programadas` pre-marcadas; el operador confirma/desmarca las que realmente se hicieron.
- Validación: **al menos un material es obligatorio** antes de marcar como completado.
- Al guardar: actualiza `partes_programadas` con la selección final + envía `partes_reparadas` para resetear contadores.

### 9. Material Management (reglas estrictas)

| Estado del mantenimiento | Materiales |
|---|---|
| `PENDIENTE` / `EN_PROCESO` | ✅ Agregar/quitar libremente (Admin, Encargado, Técnico asignado) |
| `COMPLETADO` | ❌ Bloqueado (integridad de costos) |
| `CERRADO` | ❌ Bloqueado |

- Backend (`maintenance-materials.controller.js`): `addMaterial` y `removeMaterial` retornan 400 si el mantenimiento está en `COMPLETADO`/`CERRADO`, **para todos los roles**.
- Frontend: el componente `MaterialManager` (técnico) y el dialog "Materiales usados" (admin) renderizan en modo read-only cuando el estado es `COMPLETADO`/`CERRADO`.

### 10. Historial de Observaciones (audit trail)

- `mantenimientos.observaciones` **nunca se sobrescribe** — es un log acumulativo.
- En el dialog de Editar, se muestra como **read-only** ("Historial de notas").
- El campo editable es `nota_adicional`: el backend lo **anexa** al final de `observaciones` con un separador `\n\n--- NOTA DEL ENCARGADO ---\n`.
- Garantiza trazabilidad para los dueños (no se pierde contexto histórico).

### 11. Configuración Predictiva — Desactivación con impacto

Al desactivar una regla en `/configuraciones`:
- Se abre un **dialog explicativo** mostrando el impacto:
  - Cuántas **alertas activas** referencian esa parte (`GET /config/:id/impact`).
  - Cuántos **mantenimientos PENDIENTE/EN_PROCESO** la incluyen en `partes_programadas`.
- Checkbox opcional "Resolver también las N alertas activas" (default ON) → marca esas alertas como `RESUELTO` para evitar inconsistencias visuales.
- Backend: `PUT /config/:id?resolveAlerts=true` ejecuta la limpieza en batch.
- Reactivar (inactiva → activa) es directo, sin dialog.

Comportamiento general al desactivar:
- ✅ NO se generan más alertas (filtro `cp.activo = TRUE` en motor predictivo).
- ✅ NO aparece en `parts-status` (estado predictivo de unidades).
- ✅ NO aparece en formularios de mantenimiento preventivo.
- ⚠️ Las alertas previas siguen vivas hasta resolverse (o usar la opción del dialog).

### 12. Notificaciones (header bell)

Componente `Notifications.jsx`:
- Persiste IDs vistos en `localStorage` (`tallerjf:notif:seenIds`) → sobreviven recarga.
- **Polling** cada 60s + refresh al abrir el popover.
- **Agrupado por unidad**: si una unidad tiene 5 alertas, se muestra `ABC-123 — 5 partes con alerta` con sub-lista expandible.
- Badge muestra **solo "nuevas desde última visita"**, no todas las activas.
- Auto-marca como vistas al abrir el popover (UX natural).
- Click en una unidad/parte → navega a `/mantenimientos?unidad=X` para gestionar.
- Auto-cleanup: limpia del `localStorage` los IDs de alertas ya resueltas.

### 13. Owner Management — Unidades sin dueño

- `unidades.dueno_id` es **nullable** (una unidad puede registrarse y asignarse dueño después).
- Form de crear unidad: campo "Dueño" opcional con opción explícita "Sin dueño asignado".
- Dialog "Gestionar unidades" en `/duenos`:
  - Columna izquierda: unidades del dueño actual + dropdown "Quitar" (con opción "Dejar sin dueño" o "Reasignar a: X").
  - Columna derecha: dos sub-secciones ordenadas:
    1. **Sin dueño** (destacado en ámbar) → click "Asignar".
    2. **De otros dueños** → click "Asignar" (transfiere de owner).
- Banner ámbar en la página de Dueños cuando hay unidades sin dueño.
- Backend: endpoint dedicado `PATCH /units/:id/dueno` con `{ dueno_id }` (acepta `null`) — más seguro que `PUT /units/:id` que requería todos los campos.

### 14. Flujo del Chofer (pantallas)

- **Dashboard** (`/chofer/dashboard`): Estado de componentes de la unidad con banner de "listo para viaje" o alertas críticas. Historial reciente de mantenimientos. Si el chofer tiene >1 unidad: chips con punto pulsante (rojo/naranja/verde) + conteo. Si una unidad NO activa tiene alertas, banner rojo urgente con enlace directo. Estado cargado en paralelo (`Promise.all + getPartsStatus`).
- **Llegada al Taller** (`/chofer/reportar-llegada`): Kilometraje del tacómetro (validado ≥ actual), Ruta/Origen (dropdown desde tabla `rutas` administrable por admin), comentarios. Sección opcional "Trabajos en ruta" — partes atendidas en campo con costo estimado → backend crea mantenimientos `REALIZADO` y resetea contadores ANTES de correr el motor predictivo (evita alertas falsas). **Este es el único lugar donde se actualiza el odómetro.**
- **Solicitar Mantenimiento** (`/chofer/solicitar-mantenimiento`): Formulario minimal — solo la unidad y un textarea libre. El encargado decide los detalles.
- **Mis Mantenimientos** (`/chofer/mis-mantenimientos`): Historial expandible con técnico, materiales (sin costos) y observaciones parseadas (función `parseObservaciones`). El material especial **"Servicio en Ruta"** se filtra y nunca se muestra al chofer.

---

## 💾 MODELO DE DATOS PRINCIPAL (PostgreSQL)

- `usuarios`: Autenticación y roles.
- `choferes` / `duenos` / `tecnicos`: Identidades de personal atadas a usuarios.
- `unidades`: `placa`, `modelo`, `año`, `tipo`, `kilometraje` actual, `chofer_id`, `dueno_id` (nullable).
- `rutas`: catálogo administrable (CRUD admin) de orígenes/destinos para el dropdown del chofer.
- `mantenimientos`: registro de reparación. Campos clave:
  - `codigo` (único, formato `PRV/CRR/CAM-YYMM-NNNN`)
  - `tipo` (`PREVENTIVO` / `CORRECTIVO`)
  - `estado` (`PENDIENTE` / `EN_PROCESO` / `COMPLETADO` / `CERRADO` / `REALIZADO`)
  - `kilometraje_actual`, `tecnico_id`, `fecha_solicitud`, `fecha_realizacion`
  - `observaciones` (TEXT — audit log acumulativo, nunca se sobrescribe)
  - `partes_programadas` (JSONB array de IDs de configuracion_partes)
- `detalles_mantenimiento`: Materiales, cantidades y costos. El historial expone `materiales_detalle` como JSON (`nombre` + `cantidad`) sin exponer costos al chofer.
- `reportes_llegada`: Bitácora histórica inmutable (ruta, km, comentarios).
- `configuracion_partes`: Catálogo maestro de piezas preventivas con `nombre`, `umbral_km`, `activo`.
- `estado_partes_unidad`: NxN entre Configuración y Unidad. `ultimo_mantenimiento_km`, `porcentaje`.
- `alertas_mantenimiento`: Alertas auto-generadas. Estados: `ACTIVO`, `RESUELTO`.

---

## 🛡 REGLAS DE NEGOCIO PARA OPERACIONES DELETE

Toda eliminación valida dependencias para proteger integridad:

| Recurso | No se puede eliminar si... |
|---|---|
| Dueño | Tiene unidades registradas (reasignar primero) |
| Unidad | Tiene mantenimientos `PENDIENTE` o `EN_PROCESO` activos |
| Mantenimiento | Estado ≠ `PENDIENTE` (los avanzados no se eliminan) |
| Material | Está referenciado en algún `detalles_mantenimiento` |
| Regla predictiva | Tiene alertas no resueltas (resolverlas primero o usar dialog de desactivar) |

---

## 🚀 INSTRUCCIONES PARA EL PRÓXIMO AGENTE (O LLM)

1. **Lee siempre este archivo antes de tocar código.** Si algo cambia en la lógica de negocio, actualiza este archivo al final.
2. **Lee el modelo relacional**: antes de proponer nuevas features, entiende `estado_partes_unidad` ↔ `configuracion_partes` ↔ `mantenimientos.partes_programadas`.
3. **Usa SQL preciso**: consultas parametrizadas (`pool.query('...WHERE id = $1', [id])`). Sin ORM, sin hardcode.
4. **Seguridad de roles**: toda ruta nueva del backend debe estar protegida. Verificar `req.user.rol` cuando el comportamiento difiera (ej. admin vs encargado en `editMaintenance`).
5. **Kilometraje es sagrado**: cualquier flujo que modifique `kilometraje` debe validar `nuevo ≥ actual`. El único punto de actualización es `crearReporteLlegada`.
6. **No dupliques campos**: si `kilometraje` ya está en BD, no lo pidas otra vez. Reutiliza.
7. **No dupliques flujos**: si dos checkboxes hacen lo mismo (caso `partes_programadas` vs `partes_reparadas`), consolida. UNA fuente de verdad.
8. **Audit trail intocable**: `observaciones` se anexa, nunca sobrescribe. `nota_adicional` es el campo de entrada.
9. **Inmutabilidad de `CERRADO`**: ni admin puede modificar un mantenimiento cerrado. Es estado final para integridad ante dueños.
10. **`useRef` para closures async**: cuando un handler `submit` lee state que pudo cambiar entre re-renders (especialmente tras `await` en `openDialog`), usa un `ref` sincronizado con el state — los closures de React pueden capturar valores stale.
11. **Servicios — no destructurar arbitrariamente**: cuando un servicio frontend forwardea a backend, prefiere reenviar el `payload` completo (`makePutRequest(url, payload)`) en vez de destructurar campos — fácil olvidar nuevos campos y descartarlos silenciosamente.
12. **JSONB defensive parsing**: backend debe normalizar columnas JSONB a array antes de responder (helper `normalizeMaint`). Frontend debe parsear si llega como string.
13. **UI consistente**: usa siempre `@/components/ui/` (Shadcn). Tailwind para grillas. NO crear nuevos sistemas de diseño.
14. **Hook `useMiUnidad`**: hook canónico para unidades del chofer. No hacer fetch directo en páginas del chofer.
15. **`Providers.jsx`**: toda rama de `useEffect` que retorne debe llamar `setIsLoading(false)` antes. El `if (!pathname) return` inicial es obligatorio para hidratación Next.js 15.
16. **SIEMPRE verifica antes de crear**: antes de añadir componentes/spinners/animaciones/utilidades, revisa `@/components/ui/` y `@/hooks/`. Ya existen:
    - `Skeleton` — bloque de carga genérico
    - `PageSkeleton` — variantes `table`, `grid`, `list` con props `rowCount`, `columnCount`, `title`, `action`
    - `tailwindcss-animate` ya configurado: usa `animate-in fade-in-0 slide-in-from-bottom-2 duration-200`
    - Para loading de página usa `PageSkeleton`, **no** spinners aislados
17. **Confirmación de impacto antes de operaciones destructivas/silenciosas**: cuando una acción "apaga" algo (desactivar regla, eliminar dueño, quitar técnico), muestra al usuario qué entidades quedan colgando y ofrece la limpieza (como el dialog de desactivar configuración).

¡Usa esta fundación para expandir Taller JF a la mejor plataforma de gestión del país!
