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
| `CHOFER` | `/chofer/*` | Ve y opera **sus** unidades asignadas (solo activas). |
| `OWNER` (Dueño) | `/dueno/*` | Visibilidad de flota: unidades, mantenimientos y costos. Sin edición directa. |
| `TECNICO` | `/tecnico/*` | Ve sus trabajos asignados, marca avances y registra materiales. |
| `ENCARGADO` | `/` y rutas de gestión | Operación diaria del taller: gestión de mantenimientos con flujo **forward-only**. **Puede desactivar pero NO eliminar.** |
| `ADMIN` | `/` y rutas de gestión | Control total: corrección de estados hacia atrás, edición de kilometraje a cualquier valor, **única autorización para `DELETE` real en cualquier entidad**. |

> **Regla universal de DELETE**: cualquier endpoint `DELETE` (usuarios, choferes, técnicos, dueños, unidades, materiales, mantenimientos, especialidades, rutas, configuraciones) está protegido con `restrictTo("ADMIN")`. Encargado solo puede **desactivar** (`PATCH /:id/status`). Si una entidad necesita borrarse permanentemente, debe escalarse a un admin.

> **Nota CHOFER**: Un chofer **puede tener múltiples unidades asignadas** (`unidades.chofer_id`). El endpoint `GET /api/choferes/mi-unidad` devuelve `{ unidades: [...] }` (array, **solo unidades con `activo = TRUE`**). Si todas las unidades del chofer están desactivadas, devuelve `409 { code: "UNIDADES_DESACTIVADAS", unidades_desactivadas: [...] }` para que el dashboard muestre un banner explicativo (ver §15.3). El hook `useMiUnidad` (`/src/hooks/useMiUnidad.js`) gestiona la lista, la unidad activa y la rama "solo desactivadas".

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

#### 3.1 Invariante crítico: baseline de `estado_partes_unidad`

**Toda combinación `(unidad_id, configuracion_parte_id)` con `cp.activo = TRUE` DEBE tener una fila en `estado_partes_unidad`.** Sin esta garantía, el endpoint `/units/:id/parts-status` (que usa `COALESCE(epu.ultimo_mantenimiento_km, 0)`) interpretaba el vacío como "mantenida en km 0" y mostraba "Vencido +X km" falsos en la UI, mientras el motor predictivo (que sí inserta defensivamente con `kilometrajeActual`) NO emitía alertas reales — una inconsistencia visible en `/partes-unidades` y dashboard.

El baseline se garantiza en **3 puntos de inserción** (todos con `ON CONFLICT DO NOTHING` para idempotencia):

| Disparador | Acción | Archivo |
|---|---|---|
| `createUnit` | Insert por cada `configuracion_partes.activo = TRUE` con `ultimo_mantenimiento_km = unidad.kilometraje` | `unit.controller.js` |
| `createPartConfig` | Insert por cada `unidad` con `ultimo_mantenimiento_km = u.kilometraje` | `config.controller.js` |
| Migración one-time | `CROSS JOIN unidades × configuracion_partes WHERE activo = TRUE` para BDs ya pobladas | `run-migrations.js` |

**Lectura semántica**: una fila recién creada significa "esta parte arrancó su ciclo predictivo desde el km actual de la unidad". Si necesitas modelar historia previa (parte ya gastada al alta), crea un mantenimiento preventivo COMPLETADO con `kilometraje_actual` ajustado — eso reposiciona el baseline.

> ⚠️ **No reactivar este bug**: si agregas un nuevo flujo que inserte unidades o reglas predictivas (importación masiva, seeders, etc.), repite el `INSERT … ON CONFLICT DO NOTHING` a `estado_partes_unidad`. El cálculo `km_actual − ultimo_mantenimiento_km` no tolera filas faltantes.

#### 3.2 Motor predictivo compartido (`services/predictive-engine.js`)

El cálculo de alertas vive en una **sola función** reutilizable, no inline en cada controlador:

```js
const { evaluarMotorPredictivo } = require("../services/predictive-engine");
const { alertasGeneradas, alertasResueltas } = await evaluarMotorPredictivo(unidadId, kmNuevo);
```

Comportamiento bidireccional:
- `km_recorridos ≥ umbral_km` Y no hay alerta `ACTIVO` previa → **INSERT** alerta.
- `km_recorridos <  umbral_km` Y hay alerta `ACTIVO` huérfana → **UPDATE → RESUELTO**.

El segundo caso solo se materializa cuando un admin **corrige el km hacia atrás** (ver §3.3); en el flujo normal del chofer el km solo crece, así que ese branch es no-op.

Consumidores del helper:
- `chofer.controller.js → crearReporteLlegada` (flujo normal)
- `unit.controller.js → updateUnit` (corrección admin)

**Regla**: cualquier flujo nuevo que mueva `unidades.kilometraje` debe llamar al helper. NO duplicar la lógica de evaluación inline — duplicarla ya causó un bug (el `getPartsStatus` y el motor leían el invariante de forma distinta).

#### 3.3 Edición del kilometraje desde Unidades — diferenciado por rol

`PUT /units/:id` (`updateUnit`) acepta cambios de `kilometraje` con reglas distintas según el rol del solicitante:

| Rol | Puede subir km | Puede bajar km | Mensaje de error si infringe |
|---|---|---|---|
| `ENCARGADO` | ✅ | ❌ | `No puedes reducir el kilometraje de la unidad ABC-123. Actual: X km, ingresaste Y km. Solo un administrador puede corregir errores hacia atrás.` |
| `ADMIN` | ✅ | ✅ | (sin restricción — es la herramienta de corrección de errores humanos del chofer) |

Cuando el km cambia, **siempre** se dispara `evaluarMotorPredictivo` post-UPDATE:
- Si subió → puede emitir nuevas alertas `ACTIVO`.
- Si bajó → resuelve alertas `ACTIVO` huérfanas (las que existían por una lectura inflada anterior del chofer).

La respuesta incluye el resultado del motor:
```json
{
  "message": "Unidad actualizada — Motor predictivo: 1 alerta(s) nueva(s), 2 alerta(s) resuelta(s).",
  "unidad": { ... },
  "motor": { "alertasGeneradas": 1, "alertasResueltas": 2 }
}
```

> **No se inserta en `reportes_llegada`**: la edición admin es una **corrección manual**, no una bitácora del chofer. La trazabilidad queda en `unidades.kilometraje` (último valor) y en los reportes históricos previos del chofer.

### 4. Estado de Mantenimiento

| `estado` | UI label | Significado | Quién lo provoca |
|---|---|---|---|
| `PENDIENTE` | Pendiente | Creado, esperando técnico o inicio | Admin/Encargado/Chofer (solicitud) |
| `EN_PROCESO` | En proceso | Técnico trabajando | Admin/Encargado/Técnico |
| `COMPLETADO` | Completado | Trabajo realizado, contadores reseteados, esperando aprobación del jefe mecánico | Admin/Encargado/Técnico |
| `CERRADO` | Cerrado | Aprobado y archivado, **INMUTABLE** | Admin/Encargado (vía "Cerrar / Aprobar") |
| `REALIZADO` | **Resuelto en ruta** | Trabajo correctivo resuelto por el chofer en campo — contadores reseteados al instante. **INMUTABLE** desde su creación. | Backend (al recibir `partes_campo` en `crearReporteLlegada`) |

> **Terminología canónica `REALIZADO` → "Resuelto en ruta"**: en TODA la UI (badges, columnas Kanban, filtros, dashboards, KPIs) el estado `REALIZADO` se renderiza como **"Resuelto en ruta"**. Las cadenas legacy "En Campo" / "Realizado" están deprecadas — si las encuentras en código nuevo, son un bug. El motivo: "Resuelto en ruta" comunica al instante que es un trabajo cerrado por el chofer en campo (vs. uno en taller).

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

### 11. Configuración Predictiva — Desactivación con impacto (caso especial)

`configuracion_partes` es el **único toggle con dialog explicativo previo** (no toast post-hoc) porque el costo de equivocarse es alto: deja alertas huérfanas en producción. Para todas las demás entidades, ver §15 (patrón canónico de advertencias).

Flujo en `/configuraciones`:
- Se abre un **dialog explicativo** mostrando el impacto antes de confirmar:
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

### 15. Desactivación con Advertencias — patrón unificado

Toda entidad con `activo` (unidades, choferes, técnicos, materiales, especialidades, rutas, usuarios) sigue el **mismo contrato** al desactivar. La acción **NUNCA bloquea**: solo informa al admin del impacto colateral. Si quiere borrar de verdad, usa Eliminar (admin-only).

#### 15.1 Contrato Backend

Cada `toggleXStatus` retorna:
```json
{
  "message": "Chofer Juan desactivado correctamente",
  "activo": false,
  "advertencias": [
    "Tiene 2 unidad(es) activa(s) asignada(s). ...",
    "..."
  ]
}
```

`advertencias` se construye **solo cuando `activo` pasa de `true → false`**. Si está vacío, el front lo ignora.

| Entidad | Qué advertir al desactivar |
|---|---|
| `unidades` | chofer asignado (sigue ligado pero no opera); mantenimientos `PENDIENTE`/`EN_PROCESO` |
| `usuarios` | impacto en perfil vinculado (CHOFER → unidades activas, TECNICO → mantenimientos activos, OWNER → unidades en propiedad) |
| `choferes` | unidades activas asignadas (no podrá registrar llegadas / reportar fallas) |
| `tecnicos` | mantenimientos `PENDIENTE`/`EN_PROCESO` asignados (sugerir reasignación) |
| `materiales` | mantenimientos en curso que ya lo consumieron + stock que queda congelado |
| `especialidades` | técnicos activos con esa especialidad (mantienen asignación, pero deja de ofrecerse para nuevos) |
| `rutas` | reportes de llegada históricos que la usan (los choferes ya no podrán seleccionarla) |

#### 15.2 Contrato Frontend

```jsx
const toggleMutation = useMutation({
  mutationFn: (entity) => toggleEntityStatus(entity.id),
  onSuccess: (res) => {
    toast.success(res.message)
    if (Array.isArray(res?.advertencias)) {
      res.advertencias.forEach((adv) => toast.warning(adv, { duration: 9000 }))
    }
    mutate()
  },
  onError: (err) => toast.error(err.message, { duration: 6000 }),
})
```

Reglas:
- `toast.warning` con duración **9000ms** (sticky suficiente para leerlo).
- Una advertencia = un toast (no concatenar).
- El `toast.success` siempre va primero, las advertencias después.

#### 15.3 Filtrado en selectores (regla del "actualmente asignado")

Los `<Select>` que ofrecen elegir una entidad con `activo` (chofer en `unit-form`, técnico al crear/editar mantenimiento, material al agregar al detalle, especialidad al crear técnico, etc.) **filtran inactivos**, pero con una excepción inviolable:

> **Si la entidad que se está editando ya tiene asignado un valor que ahora está inactivo, ese valor se mantiene visible en el dropdown con el sufijo `(inactivo)` / `(inactiva)`.** Nunca lo quitamos silenciosamente — eso rompe la edición y deja al usuario sin entender qué pasó.

```jsx
const opciones = (() => {
  const all = Array.isArray(items) ? items : []
  const currentId = entity?.x_id ? Number(entity.x_id) : null
  return all.filter(
    (i) => i.activo !== false || (currentId && Number(i.id) === currentId)
  )
})()

// JSX
{opciones.map((i) => {
  const inactivo = i.activo === false
  return <SelectItem key={i.id} value={String(i.id)}>{i.nombre}{inactivo ? " (inactivo)" : ""}</SelectItem>
})}
```

Casos especiales ya implementados:
- **Materiales** en `maintenances-table`: se filtra por `activo !== false && stock > 0` (regla compuesta).
- **Especialidades** (texto, no FK): si la guardada no aparece en activas pero existe en el catálogo inactiva, se inyecta con `_inactiva: true` para mostrarla.

#### 15.4 Validación de unidad inactiva al crear mantenimiento

`createMaintenance` rechaza con `409 { code: "UNIDAD_DESACTIVADA", message: "La unidad ${placa} está desactivada — reactívala antes de registrar un mantenimiento." }`. El frontend lee `err.code === "UNIDAD_DESACTIVADA"` y muestra el mensaje específico.

#### 15.5 Chofer con todas sus unidades desactivadas

`getMiUnidad` distingue entre "no tiene unidades" y "todas sus unidades están desactivadas". En el segundo caso devuelve `409 { code: "UNIDADES_DESACTIVADAS", unidades_desactivadas: [{placa, modelo, ...}] }`. `useMiUnidad` expone la flag `soloDesactivadas` y el dashboard del chofer (`/chofer/dashboard`) renderiza un banner ámbar con las placas y un CTA para contactar al admin — **nunca** un error genérico.

### 16. Vinculación Usuario ↔ Perfil (chofer / técnico / dueño)

Crear o editar un `chofer`, `tecnico` o `dueno` que se enlaza a un `usuario` pasa por el helper común `validarUsuarioVinculable` en cada controlador:

```js
async function validarUsuarioVinculable({ usuario_id, rolEsperado, tabla, excludeId = null }) {
  // Verifica: existe + activo + rol correcto + no vinculado a otro perfil del mismo tipo
}
```

Códigos de error que devuelve (todos `409`):
- `USUARIO_NO_ENCONTRADO`
- `USUARIO_DESACTIVADO`
- `USUARIO_ROL_INCORRECTO` (p.ej. intentar vincular un OWNER como chofer)
- `USUARIO_YA_VINCULADO` (otro perfil del mismo tipo ya lo usa)

Frontend (`chofer-form`, `tecnicos/page`, `owners-table`):
- El `<Select>` de "Cuenta de usuario" filtra a usuarios `activo && rol correcto && no vinculado a otro perfil`.
- Si se está editando un perfil cuya cuenta vinculada quedó **inactiva**, el dropdown la mantiene visible con sufijo `(inactivo)` y un banner ámbar arriba ("Esta cuenta está desactivada — el perfil seguirá vinculado pero el usuario no podrá iniciar sesión").
- Al desactivar un usuario, el backend devuelve `advertencias` describiendo el impacto en el perfil vinculado (ver §15.1).

### 16.1 Datos personales centralizados en `usuarios`

**Single source of truth**: cualquier dato que pertenece a la persona (no al rol que cumple) vive **solo** en `usuarios`. Los perfiles (`choferes`, `tecnicos`, `duenos`) lo leen vía JOIN.

| Dato | Tabla | Por qué ahí |
|---|---|---|
| `nombre`, `correo`, `telefono`, `dni` | `usuarios` | Datos de la persona — no cambian si cambia su rol |
| `licencia` | `choferes` | Operacional del rol chofer |
| `especialidad` | `tecnicos` | Operacional del rol técnico |

Reglas:
- **Backend**: `user.controller.createUser/updateUser` aceptan y validan `telefono` (regex `^9\d{8}$`, opcional, formato móvil PE) y `dni` (regex `^\d{8}$`, opcional, único en la tabla). Los SELECTs de `chofer.controller`, `technician.controller` y `unit.controller` proyectan estos campos como `usuario_telefono`, `usuario_dni`, `chofer_telefono`, `dueno_telefono` vía JOIN con `usuarios`. **Nunca** los aceptan en su propio `INSERT/UPDATE`.
- **Frontend**: los formularios de Choferes (`chofer-form.jsx`) y Técnicos (`tecnicos/page.jsx`) **no tienen inputs** para `telefono` ni `dni`. Muestran un panel read-only con los datos del usuario seleccionado y un mensaje "Para modificar, edita el usuario desde la página Usuarios". Las tablas (`choferes-table`, `tecnicos/page`) muestran `usuario_telefono`/`usuario_dni` con fallback `—` cuando son null.
- **Migración**: `run-migrations.js` agrega `usuarios.telefono` y `usuarios.dni` (idempotente con `IF NOT EXISTS`), copia los datos legacy desde `choferes.telefono` y `tecnicos.dni`, y luego hace `DROP COLUMN IF EXISTS` en las tablas viejas. Sin pérdida de datos en producción siempre que la migración corra antes que el nuevo código.

Si en el futuro se centralizan más datos (dirección, fecha de nacimiento), seguir el mismo patrón: agregar columna en `usuarios`, editar solo desde Usuarios, leer por JOIN en perfiles, panel read-only en sus forms.

### 17. Reportes (PDF / Excel) — arquitectura "Report Library"

Generación de reportes vive en una **librería de componentes reutilizables** — no se reinventa por cada nuevo reporte.

#### 17.1 Backend

- Utilidad común `src/utils/report-export.js` con `toExcel(rows, cols, meta)` y `toPdf(rows, cols, meta)` usando `exceljs` y `pdfkit`.
- Cada reporte vive como un endpoint en `report.controller.js` y devuelve **un sobre uniforme**:
  ```json
  {
    "title": "Estado de Cuenta del Dueño",
    "generated_at": "2026-05-13T...",
    "filters": { "from": "...", "to": "..." },
    "columns": [{ "key": "placa", "label": "Placa" }, ...],
    "rows": [{...}, ...],
    "summary": { "total": 12345.67, ... }
  }
  ```
- El query string `?format=xlsx|pdf` activa la descarga (vía `report-export`); sin él, devuelve JSON para renderizar en pantalla.
- Endpoint legacy `getMyUnitsReport` se mantiene aparte para alimentar la página funcional `/dueno/mantenimientos` (datos crudos con materiales anidados) — **no tocarlo**, no es un reporte sino una vista operativa.

#### 17.2 Frontend

Componentes reutilizables en `@/components/reports/`:
- `<ReportFiltersBar />` — barra estándar de filtros con presets de fecha (Hoy, Esta semana, Este mes, Personalizado).
- `<ReportViewer report={...} onExport={(fmt) => ...} />` — renderiza columnas + filas + summary + botones "Descargar PDF / Excel".

Páginas `/reportes` (admin), `/dueno/reportes`, `/tecnico/reportes`, `/chofer/reportes` siguen el mismo layout: tabs por tipo de reporte → filtros → viewer. Para agregar un reporte nuevo: define endpoint en backend (con el sobre uniforme), declara el descriptor `{ key, label, endpoint, filters }` en la página y el viewer hace el resto.

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

## 🎨 ESTÁNDARES DE UI/UX (OBLIGATORIOS — NO MEZCLAR)

Estos patrones están establecidos y **deben aplicarse consistentemente** en TODA entidad nueva o modificada. Mezclar patrones para la misma funcionalidad es un error de implementación.

### 1. Soft Delete / Activar–Desactivar (patrón canónico)

**Toda entidad administrable tiene un campo `activo BOOLEAN DEFAULT TRUE`.**  
No se elimina lo que tiene historial o relaciones — se desactiva.

| Elemento | Implementación requerida |
|---|---|
| **Base de datos** | `ALTER TABLE x ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE` en `run-migrations.js` |
| **Backend SELECT** | Incluir `x.activo` en la consulta. Ordenar por `nombre ASC` (NO por `activo DESC` — desactivar no mueve la fila) |
| **Backend endpoint toggle** | `PATCH /:id/status` → flip `activo`, responde `{ message, activo, advertencias: string[] }` (ver §15.1 para qué advertir por entidad) |
| **Backend endpoint DELETE** | `DELETE /:id` con `restrictTo("ADMIN")` + validación de dependencias (mensaje específico si no procede) |
| **Frontend servicio** | `toggleXStatus(id)` usando `makePatchRequest(`/x/${id}/status`, {})` |
| **Frontend tabla/fila** | Columna **"Estado"** con `<Switch checked={x.activo !== false} onCheckedChange={() => toggleMutation.mutate(x)} />` + `<Badge>` |
| **Frontend toast** | `onSuccess` muestra `res.message` Y recorre `res.advertencias` con `toast.warning(adv, { duration: 9000 })` (ver §15.2) |
| **Frontend selectores** | Filtran inactivos PERO mantienen el actualmente asignado con sufijo `(inactivo)` (ver §15.3) |
| **Badge activo** | `variant="outline" className="border-green-500 text-green-600"` → texto "Activo/Activa" |
| **Badge inactivo** | `variant="secondary"` → texto "Inactivo/Inactiva" |
| **Fila inactiva** | `className={x.activo === false ? "opacity-60 bg-muted/30" : ""}` en `<TableRow>` / `<Card>` |
| **Mutation** | `useMutation` de `@tanstack/react-query` — NO función async manual sin mutation |

Entidades que ya siguen este patrón: `usuarios`, `unidades`, `choferes`, `tecnicos`, `materiales`, `configuracion_partes`, `especialidades`, `rutas`.

**Regla de desactivación libre**: la desactivación NO bloquea, solo advierte (ver §15). Eliminar es la operación que valida dependencias y rechaza con mensaje accionable. El toggle es reversible siempre.

---

### 2. Acciones de Fila — Dropdown Tres Puntos (patrón canónico)

**SIEMPRE** usar `DropdownMenu` con `MoreHorizontal` para acciones de fila. **NUNCA** botones de icono aislados (lápiz, basura, etc.) directamente en la tabla.

```jsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="h-8 w-8 p-0">
      <span className="sr-only">Abrir menú</span>
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={...}>
      <Edit className="mr-2 h-4 w-4" /> Editar
    </DropdownMenuItem>
    {/* ... más acciones ... */}
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={...}>
      <Trash className="mr-2 h-4 w-4" /> Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- El Switch de `activo` va **inline en la columna Estado**, NO en el dropdown.
- Eliminar siempre **al final con separador y color `text-destructive`**.
- El dropdown lleva `<DropdownMenuLabel>Acciones</DropdownMenuLabel>` en la cima.

---

### 3. Errores Backend — Mensajes específicos

El interceptor de `api.js` prioriza `error.response?.data?.message` antes que `error.response?.data?.error`, y **enriquece el `Error` rechazado con `code`, `status` y `data`** del payload del backend, para que el frontend pueda reaccionar a casos específicos sin parsear strings:

```js
// utils/api.js — interceptor
const enriched = new Error(errorMessage);
enriched.code   = error.response?.data?.code;
enriched.status = error.response?.status;
enriched.data   = error.response?.data;
return Promise.reject(enriched);
```

Los helpers (`makeGetRequest`, etc.) hacen **rethrow** del `Error` enriquecido:
```js
const rethrow = (error, fallback) => {
  if (error instanceof Error) throw error;
  throw new Error(error?.message || fallback);
};
```

> **Regla**: cuando crees un servicio nuevo, **NO envuelvas el error** en `new Error(err.message)` — perdería `code` y `data`. Reenvía el `Error` original con `throw err`.

**Regla de claves** (auditada y aplicada en todo el backend):
- `message` → errores de negocio legibles por el usuario (`400 / 401 / 403 / 404 / 409`).
- `code` → identificador estable de la regla violada, en `SCREAMING_SNAKE_CASE`. **Obligatorio en respuestas de las que el frontend deba reaccionar de forma diferenciada** (UI especial, redirect, banner explicativo).
- `error` → errores técnicos de servidor (`500`); el front muestra un mensaje genérico.

**Códigos canónicos en uso** (no inventar variantes nuevas si ya existe uno equivalente):

| `code` | Cuándo se emite | Quién lo consume |
|---|---|---|
| `UNIDAD_DESACTIVADA` | `createMaintenance` con `unidad.activo = false` | dialog de creación → toast con el message |
| `UNIDADES_DESACTIVADAS` | `getMiUnidad` cuando todas las unidades del chofer están inactivas | `useMiUnidad` → banner ámbar en `/chofer/dashboard` |
| `USUARIO_NO_ENCONTRADO` | `validarUsuarioVinculable` | forms de chofer/tecnico/dueno |
| `USUARIO_DESACTIVADO` | `validarUsuarioVinculable` | forms de chofer/tecnico/dueno |
| `USUARIO_ROL_INCORRECTO` | `validarUsuarioVinculable` | forms de chofer/tecnico/dueno |
| `USUARIO_YA_VINCULADO` | `validarUsuarioVinculable` | forms de chofer/tecnico/dueno |

```js
// ✅ correcto — el usuario verá el detalle
res.status(400).json({ message: "No se puede eliminar: tiene mantenimientos activos." });
res.status(404).json({ message: "Unidad no encontrada." });
res.status(409).json({ message: `Ya existe un usuario con username '${u}'.` });

// ✅ correcto — interno, no llega al usuario tal cual
res.status(500).json({ error: "Error interno del servidor" });

// ❌ incorrecto — un 400 con clave `error` funciona pero rompe la convención
res.status(400).json({ error: "No se puede eliminar..." });
```

**Regla de redacción** (aplicada en role middleware, auth, units, choferes, técnicos, materiales, alertas, rutas, dueños, configuración, etc.):

| Patrón | Antes (vago) | Después (claro y accionable) |
|---|---|---|
| Recurso no encontrado | "Material no encontrado" | "Material no encontrado." (punto final + entidad explícita) |
| Validación de input | "nombre y password son obligatorios" | "El nombre y la contraseña son obligatorios." |
| Conflicto de unicidad | "Ya existe un usuario con ese correo" | `Ya existe un usuario registrado con el correo ${correo}.` |
| Permisos | "Acceso denegado..." | `Acceso denegado: tu rol (${rol}) no tiene permisos. Roles permitidos: ADMIN, ENCARGADO.` |
| Regla de negocio violada | "Stock insuficiente" | `Stock insuficiente. Disponible: ${mat.stock}.` |
| Regla por rol | "El kilometraje no puede ser menor..." | `No puedes reducir el kilometraje de la unidad ${placa}. Actual: ${kmActual} km, ingresaste ${kmNuevo} km. Solo un administrador puede corregir errores hacia atrás.` |

Tres ingredientes obligatorios para mensajes de negocio:
1. **Qué falló** (la entidad y el atributo concreto).
2. **Por qué falló** (regla violada o estado actual con números).
3. **Qué hacer** (acción correctora o quién puede ejecutarla).

---

### 4. Formularios — Reset al abrir (useEffect canónico)

Cuando un mismo componente de formulario se usa para **crear y editar**, `useForm` solo aplica `defaultValues` en el primer montaje. **Siempre** agregar un `useEffect` que llame `form.reset()` al cambiar el prop fuente:

```jsx
useEffect(() => {
  form.reset(entity
    ? { campo1: entity.campo1 || "", campo2: entity.campo2 || 0 }
    : { campo1: "", campo2: 0 }
  )
}, [entity])
```

Entidades corregidas con este patrón: `chofer-form.jsx`, `unit-form.jsx`, `owner-form.jsx`, `owner-access-form.jsx`. En diálogos abiertos por handler imperativo (`openEdit(item) → form.reset(...)`) este patrón es equivalente y aceptado (`tecnicos`, `configuraciones`, `materials-table`, `rutas`).

---

### 4-bis. Formularios — Validación con Zod (OBLIGATORIO)

**Toda validación de formulario es responsabilidad de Zod.** Se prohíben validaciones ad-hoc con `if`/`toast` como única defensa: ignoran tipos, no muestran mensajes inline y son inconsistentes entre pantallas.

#### Patrón A — RHF + zodResolver (default)

Para formularios "normales" (campos escalares y/o sub-arrays manejables con `useFieldArray`):

```jsx
const schema = z.object({
  nombre: z.string().trim().min(2, { message: "Mínimo 2 caracteres." }).max(120),
  km: z.coerce.number().int().min(0, { message: "No puede ser negativo." }),
})
const form = useForm({ resolver: zodResolver(schema), defaultValues: { nombre: "", km: 0 } })

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="nombre" render={({ field }) => (
        <FormItem>
          <FormLabel>Nombre *</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />            {/* SIEMPRE, sin excepciones */}
        </FormItem>
      )} />
    </form>
  </Form>
)
```

#### Patrón B — Zod + safeParse manual (wizards complejos / sub-diálogos en `useState`)

Para multi-step forms o cuando el componente ya tiene mucho estado controlado y un refactor a RHF rompería la UX (`reportar-llegada`, sub-diálogos de `maintenances-table.jsx`):

```jsx
const [errors, setErrors] = useState({})

const validate = () => {
  const parsed = schema.safeParse({ ...payloadDesdeUseState })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const fe = { campo1: flat.fieldErrors.campo1?.[0], campo2: flat.fieldErrors.campo2?.[0] }
    setErrors(fe)
    toast.error(Object.values(fe).find(Boolean) || "Hay errores en el formulario.")
    return null
  }
  setErrors({})
  return parsed.data
}

// JSX: cada input lee de su useState y muestra el error inline
<Input value={x} onChange={(e) => { setX(e.target.value); setErrors(er => ({ ...er, campoX: undefined })) }}
       aria-invalid={!!errors.campoX} />
{errors.campoX && <p className="text-xs text-destructive">{errors.campoX}</p>}
```

**Reglas comunes a A y B:**

| Regla | Aplicación |
|---|---|
| `z.string().trim()` siempre que el campo sea libre | Evita "  " que pasa `min(1)`. |
| `z.coerce.number()` para inputs numéricos | El value de `<Input type="number">` siempre llega como string. |
| `min/max` explícitos en cada string | Sin `max`, un usuario puede pegar 100k caracteres y reventar la BD. |
| Mensajes en español, accionables | `"Ingresa un kilometraje válido."` ≠ `"Required"`. |
| `aria-invalid={!!error}` en inputs con error | Accesibilidad y feedback visual coherente. |
| `maxLength={N}` en HTML coincide con `.max(N)` de Zod | Bloqueo en navegador + validación de servidor. |
| Inputs de teléfono Perú | `regex(/^9\d{8}$/)` y `onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}` + `inputMode="numeric"` + `maxLength={9}`. |
| Inputs decimales (precio, costo) | `z.string().refine(v => /^\d+(\.\d{1,2})?$/.test(v))` o `z.coerce.number().positive().max(999999.99)`. |

#### Forms cubiertos por estos patrones

| Form | Patrón | Notas |
|---|---|---|
| `login`, `usuarios`, `tecnicos`, `configuraciones` (ambos), `unit-form`, `chofer-form`, `owner-form`, `owner-access-form`, `mantenimientos/page` (crear), `materiales/page` (crear), `materials-table` (editar), `solicitar-mantenimiento`, `rutas/page` | A (RHF+zod) | |
| `tecnico/mis-trabajos` (`MaterialManager`, `CompleteJobDialog`) | A (RHF+zod) | Sub-diálogos con RHF independiente. |
| `maintenances-table` (editar) | A (RHF+zod) | `superRefine` para técnico requerido al completar. |
| `chofer/reportar-llegada` | B (safeParse) | Wizard de 3 pasos + sub-arrays de partes. Schema construido como factory `makeLlegadaSchema(kmActual)`. |
| `maintenances-table` sub-diálogos (agregar material, completar, cerrar/aprobar) | B (safeParse) | Estado heredado en `useState`; `addMaterialSchema` / `completeSchema` / `closeSchema`. |

---

### 5. `<SelectItem>` — value nunca vacío

Shadcn `Select` usa `value=""` internamente para limpiar la selección. **Nunca** usar `value=""` en un `<SelectItem>`.

```jsx
// ✅ correcto
<SelectItem value="none">Sin asignar</SelectItem>
// onValueChange: (v) => field.onChange(v === "none" ? "" : v)

// ❌ incorrecto — crash en runtime
<SelectItem value="">Sin asignar</SelectItem>
```

---

### 6. React.Fragment con key en listas

Cuando cada ítem de un `.map()` renderiza **múltiples elementos** (ej. fila principal + fila expandible), usar `<React.Fragment key={...}>` — el shorthand `<>` no acepta `key`.

```jsx
// ✅ correcto
{items.map((item) => (
  <React.Fragment key={item.id}>
    <TableRow>...</TableRow>
    {expanded && <TableRow>...</TableRow>}
  </React.Fragment>
))}

// ❌ incorrecto — warning de key prop
{items.map((item) => (
  <>
    <TableRow key={item.id}>...</TableRow>
  </>
))}
```

---

### 7. Dialog de creación — No usar `externalCreateTrigger` con useRef

El patrón `externalCreateTrigger` (boolean toggle pasado desde el page al componente, con `useRef` para detectar primer render) **causa que el dialog se abra solo** en React 18 Strict Mode (el `useEffect` corre dos veces en desarrollo).

**Solución canónica**: el botón de creación vive **dentro del componente tabla** o el `isCreating` state se eleva al page con setters directos (no toggles).

---

### 8. Mutaciones — useMutation (no async manual)

Para acciones que modifican datos (create, update, delete, toggle), **siempre** usar `useMutation` de TanStack Query:

```jsx
const toggleMutation = useMutation({
  mutationFn: (entity) => toggleEntityStatus(entity.id),
  onSuccess: (res) => { toast.success(res.message); mutate() },
  onError: (err) => toast.error(err.message, { duration: 6000 }),
})
```

Ventajas: `isPending` para deshabilitar Switch durante operación, manejo de errores centralizado, invalidación de cache correcta.

---

### 9. Modelo de Datos — Entidades con `activo`

Las siguientes tablas tienen columna `activo BOOLEAN DEFAULT TRUE` (`rutas` usa `activa`):

| Tabla | Propósito | Quién filtra inactivos en sus selectores |
|---|---|---|
| `usuarios` | Cuenta deshabilitada (no puede iniciar sesión) | forms de chofer/tecnico/dueno (vinculación) |
| `tecnicos` | Técnico dado de baja o sin actividad | `mantenimientos/page` (crear), `maintenances-table` (editar/completar) |
| `configuracion_partes` | Regla predictiva suspendida | motor predictivo, `parts-status`, form preventivo |
| `unidades` | Bus vendido / fuera de flota | `getMiUnidad` (chofer), `createMaintenance` (rechazo) |
| `choferes` | Chofer que ya no trabaja | `unit-form` (asignación) |
| `materiales` | Material discontinuado | `maintenances-table` "agregar material" (combinado con `stock > 0`) |
| `especialidades` | Especialidad que ya no se ofrece | `tecnicos/page` (form crear/editar técnico) |
| `rutas` (`activa`) | Ruta suspendida | `chofer.getRutas` (dropdown de llegada) |

> **Histórico vs. selector**: los inactivos siguen apareciendo en LECTURA de datos históricos (un mantenimiento viejo con material inactivo, un reporte de llegada con ruta inactiva, etc.). El filtro `activo` aplica únicamente a SELECTORES de creación/edición — nunca rompe la trazabilidad del historial.

---

### 10. Catálogos Administrables

Datos que parecen "listas fijas" pero son administrables desde el panel:

| Catálogo | Página de gestión | Usado en |
|---|---|---|
| Umbrales de partes (`configuracion_partes`) | `/configuraciones` → sección "Configuración Predictiva" | Motor predictivo, form mantenimiento preventivo |
| Especialidades de técnicos (`especialidades`) | `/configuraciones` → sección "Especialidades de Técnicos" | Form de creación/edición de técnicos |
| Rutas (`rutas`) | `/rutas` | Selector de llegada del chofer |

**Nunca hardcodear** estos valores en el frontend — siempre vienen de la BD.

---

### 11. Nomenclatura Estándar de Navegación

| Nombre en UI | Ruta | Descripción |
|---|---|---|
| Estado de Flota | `/partes-unidades` | Estado predictivo de partes por unidad |
| Estado Predictivo | botón en `/unidades` | Acceso directo por unidad al estado predictivo |
| Configuración Predictiva | `/configuraciones` (sección) | Umbrales de km por componente |

**No usar**: "Partes de Unidades", "Gestionar Partes" — términos deprecados.

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
13. **UI consistente**: usa siempre `@/components/ui/` (Shadcn). Tailwind para grillas. NO crear nuevos sistemas de diseño. **Lee la sección "ESTÁNDARES DE UI/UX" antes de tocar cualquier tabla o formulario.**
14. **Hook `useMiUnidad`**: hook canónico para unidades del chofer. No hacer fetch directo en páginas del chofer.
15. **`Providers.jsx`**: toda rama de `useEffect` que retorne debe llamar `setIsLoading(false)` antes. El `if (!pathname) return` inicial es obligatorio para hidratación Next.js 15.
16. **SIEMPRE verifica antes de crear**: antes de añadir componentes/spinners/animaciones/utilidades, revisa `@/components/ui/` y `@/hooks/`. Ya existen:
    - `Skeleton` — bloque de carga genérico
    - `PageSkeleton` — variantes `table`, `grid`, `list` con props `rowCount`, `columnCount`, `title`, `action`
    - `tailwindcss-animate` ya configurado: usa `animate-in fade-in-0 slide-in-from-bottom-2 duration-200`
    - Para loading de página usa `PageSkeleton`, **no** spinners aislados
17. **Confirmación de impacto antes de operaciones destructivas/silenciosas**: cuando una acción "apaga" algo (desactivar regla, eliminar dueño, quitar técnico), muestra al usuario qué entidades quedan colgando y ofrece la limpieza (como el dialog de desactivar configuración).

18. **Patrón `activo` completo**: cuando añadas `activo` a una entidad, el patrón es SIEMPRE los 8 pasos: migración SQL → backend SELECT + PATCH status (con `advertencias[]`) → backend DELETE admin-only → servicio frontend → columna Estado con Switch+Badge → fila muted si inactiva → `useMutation` para el toggle (que muestra `advertencias` como `toast.warning`) → filtrar inactivos en TODOS los selectores que la usen (manteniendo el actualmente asignado). Implementar a medias rompe la experiencia.
19. **`ORDER BY` en listas con `activo`**: ordenar por `nombre ASC` (o `creado_en DESC`), NUNCA por `activo DESC` en listas donde el usuario puede hacer toggle — causa salto visual de filas.
20. **Acciones de fila**: siempre `DropdownMenu` tres puntos. El Switch de estado va en su propia columna "Estado", no en el menú. Nunca botones de icono sueltos.
21. **Catálogos en BD**: listas como `especialidades`, `rutas`, `configuracion_partes` deben venir de la BD. Nunca hardcodearlos como arrays en el frontend.
22. **DELETE solo ADMIN, universal**: TODA ruta `DELETE` (sin excepciones) lleva `restrictTo("ADMIN")` y oculta el `DropdownMenuItem` "Eliminar" para roles no admin (`{isAdmin && <DropdownMenuItem .../>}`). Encargado solo desactiva. Si añades una entidad nueva con borrado, sigue esta regla — no inventes excepciones.
23. **Códigos de error en backend**: cuando el frontend deba reaccionar de forma diferenciada (UI especial, banner, redirect), añade `code` SCREAMING_SNAKE_CASE en la respuesta. **Nunca** parsees mensajes en el frontend para detectar reglas — usa `err.code`. Mantén la tabla canónica de códigos en §3 actualizada al añadir nuevos.
24. **Vinculación usuario↔perfil**: usa el helper `validarUsuarioVinculable` en cualquier controlador que enlace un `usuario` a un perfil (chofer/tecnico/dueno o futuros). Verifica existencia + activo + rol esperado + no duplicación. Devuelve códigos `USUARIO_*` (ver §16). El frontend filtra los inactivos pero mantiene visible el actualmente vinculado con sufijo `(inactivo)`.
25. **Terminología `REALIZADO` = "Resuelto en ruta"**: nunca escribas "En Campo" o "Realizado" en UI nueva. Es estado de mantenimiento correctivo cerrado por el chofer en ruta. Inmutable desde su creación. Resetea contadores predictivos al instante.
26. **Reportes**: para añadir un reporte nuevo NO crees página desde cero — declara endpoint en `report.controller.js` con el sobre uniforme `{ title, columns, rows, summary, generated_at, filters }`, añade el descriptor a la página `/reportes` (o la del rol correspondiente) y deja que `<ReportFiltersBar />` + `<ReportViewer />` hagan el resto. PDF/Excel via `report-export.js` con `?format=pdf|xlsx`. **No** mezcles datos crudos operativos con reportes (el endpoint legacy `getMyUnitsReport` alimenta `/dueno/mantenimientos`, separado de los reportes descargables).
27. **Advertencias al desactivar**: TODA `toggleXStatus` en backend devuelve `advertencias: string[]` describiendo el impacto colateral (relaciones activas, datos congelados). Nunca bloquea — solo informa. El frontend las muestra con `toast.warning(adv, { duration: 9000 })`. Una advertencia = un toast.

¡Usa esta fundación para expandir Taller JF a la mejor plataforma de gestión del país!
