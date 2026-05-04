# 🤖 INSTRUCCIONES DEL SISTEMA: TALLER JF (Fleet Maintenance Management)

**Contexto del Agente:** Eres un Ingeniero de Software Senior y un Experto Profesional en la Gestión de Mantenimiento de Flotas. Estás a cargo de evolucionar, mantener y depurar "TALLER JF", un sistema monolítico (Frontend en Next.js y Backend en Node.js + Express) conectado a una base de datos PostgreSQL alojada en Neon.

Tu objetivo principal al interactuar con el usuario es mantener la rigidez de esta arquitectura de gestión vehicular, priorizando la reducción de costos, la trazabilidad de repuestos/técnicos y la previsibilidad a través del mantenimiento preventivo algorítmico basado en kilometraje.

---

## 🏗️ ARQUITECTURA DEL SISTEMA Y STACK TECNOLÓGICO

1. **Frontend (`/JF-FRONT`)**:
   - Framework: **Next.js 15 (App Router)**
   - UI/Estilos: **Tailwind CSS + Shadcn UI** + **React Hook Form (con Zod para validaciones estandarizadas)**.
   - Estado/Data-fetching: Servicios modulares en `/src/services`. Hooks personalizados en `/src/hooks`.
   - Autenticación cliente: `authService.js` guarda token y user en `localStorage`. El middleware de Next.js (`middleware.js`) valida cookies auxiliares (`auth_token`, `auth_role`) para proteger rutas en el servidor.
   - Proveedores globales: `Providers.jsx` gestiona auth, tema y sidebar. **Cada rama del `useEffect` de Providers debe llamar `setIsLoading(false)` antes de retornar** para evitar que el spinner quede congelado.

2. **Backend (`/JF-BACK`)**:
   - Framework: **Node.js + Express.js**
   - Base de Datos: **PostgreSQL (Neon Cloud)** usando la librería `pg` nativa (sin ORM, consultas SQL parametrizadas).
   - Autenticación y Autorización: **JWT**. Accesos protegidos por `auth.middleware.js` y `role.middleware.js`.

---

## ⚙️ REGLAS DE NEGOCIO Y WORKFLOW PRINCIPAL

### 1. Actores del Sistema (RBAC)

| Rol | Rutas frontend | Descripción |
|---|---|---|
| `CHOFER` | `/chofer/*` | Ve y opera **sus** unidades asignadas. |
| `OWNER` (Dueño) | `/dueno/*` | Visibilidad de flota: unidades, mantenimientos y costos. Sin edición directa. |
| `TECNICO` | `/tecnico/*` | Ve sus trabajos asignados, marca avances y cierra órdenes de trabajo. |
| `ENCARGADO` / `ADMIN` | `/` y rutas de gestión | Control total: técnicos, partes, choferes, unidades, mantenimientos. |

> **Nota CHOFER**: Un chofer **puede tener múltiples unidades asignadas** (`unidades.chofer_id`). El endpoint `GET /api/choferes/mi-unidad` devuelve `{ unidades: [...] }` (array). El hook `useMiUnidad` (en `/src/hooks/useMiUnidad.js`) gestiona la lista y la unidad activa seleccionada. Todas las pantallas del chofer usan este hook y muestran un `<Select>` para cambiar de unidad cuando hay más de una.

### 2. Flujo Automático Predictivo (Core Engine)
El sistema abandona el mantenimiento correctivo reactivo a favor de un **motor de reglas de kilometraje**:
1. **Configuración**: El encargado define en `configuracion_partes` que el `Cambio de Aceite` toca cada `5,000 km` y las `Balatas` cada `10,000 km` (configurable por unidad).
2. **Reporte de Llegada**: El chofer, al arribar de una ruta, usa `/api/choferes/llegada` para declarar el kilometraje del tacómetro. El kilometraje **no puede ser menor** al valor ya registrado en la unidad.
3. **Disparador Matemático**: El backend resta `kilometraje_actual` menos `ultimo_mantenimiento_km` de `estado_partes_unidad`. Si supera el umbral, crea una **Alerta Preventiva** en `alertas_mantenimiento`.
4. **Cierre de Ciclo**: El Encargado marca el mantenimiento como `COMPLETADO` → el frontend muestra un Modal de Cierre donde se indica el **Técnico responsable** y se seleccionan (checkboxes) las piezas cambiadas.
5. **Reinicio de Vida Útil**: El backend hace `UPSERT` en `estado_partes_unidad`, reiniciando `ultimo_mantenimiento_km` al odómetro actual y apagando las alertas asociadas.

### 3. Flujo del Chofer (pantallas)
- **Dashboard** (`/chofer/dashboard`): Estado de componentes de la unidad con banner de "listo para viaje" o alertas críticas. Historial reciente de mantenimientos.
- **Llegada al Taller** (`/chofer/reportar-llegada`): Ingresa kilometraje del tacómetro y ruta/origen. Puede adjuntar opcionalmente una solicitud de mantenimiento correctivo en el mismo paso. **Este es el único lugar donde se actualiza el odómetro de la unidad.**
- **Solicitar Mantenimiento** (`/chofer/solicitar-mantenimiento`): Registra una solicitud correctiva con procedencia y requerimientos. **No pide kilometraje** — usa automáticamente el valor almacenado en la unidad (se muestra como dato informativo, no editable).
- **Mis Mantenimientos** (`/chofer/mis-mantenimientos`): Historial expandible con técnico asignado, materiales usados (nombre + cantidad) y observaciones.

---

## 💾 MODELO DE DATOS PRINCIPAL (PostgreSQL)

- `usuarios`: Autenticación y roles.
- `choferes` / `duenos` / `tecnicos`: Identidades de personal atadas a usuarios.
- `unidades`: `placa`, `modelo`, `año`, `tipo`, `kilometraje` actual, `chofer_id` (un chofer puede tener N unidades).
- `mantenimientos`: Registro de reparación (preventiva o correctiva). Contiene `kilometraje_actual`, `tecnico_id`, `estado` (`PENDIENTE`, `EN_PROCESO`, `COMPLETADO`).
- `detalles_mantenimiento`: Materiales, cantidades y costos usados en cada mantenimiento. El endpoint de historial expone `materiales_detalle` como JSON (`nombre` + `cantidad`) **sin exponer costos al chofer**.
- `reportes_llegada`: Bitácora histórica inmutable (ruta, km, comentarios) por cada llegada declarada por el chofer.
- `configuracion_partes`: Catálogo maestro de piezas preventivas con `umbral_km` configurable.
- `estado_partes_unidad`: Relación NxN entre Configuración y Unidad. Registra `ultimo_mantenimiento_km` y `porcentaje` de desgaste calculado.
- `alertas_mantenimiento`: Alertas generadas automáticamente cuando el recorrido supera el umbral de una parte.

---

## 🚀 INSTRUCCIONES PARA EL PRÓXIMO AGENTE (O LLM)

1. **Lee siempre este archivo antes de tocar código.** Si algo cambia en la lógica de negocio, actualiza este archivo al final.
2. **Lee el modelo relacional**: Antes de proponer nuevas características, entiende el esquema cruzado entre `estado_partes_unidad`, `configuracion_partes` y `mantenimientos`.
3. **Usa SQL preciso**: Consultas parametrizadas (`pool.query('...WHERE id = $1', [id])`). Sin ORM, sin hardcodeo de datos.
4. **Seguridad de roles**: Toda ruta nueva del backend debe estar protegida. El chofer **solo** puede leer datos de sus propias unidades (`req.user.id`). Nunca exponer costos de materiales al rol `CHOFER`.
5. **Kilometraje es sagrado**: Cualquier flujo que modifique `kilometraje` debe validar que el nuevo valor ≥ al valor actual en BD.
6. **No dupliques campos**: Si un dato ya existe en la unidad (ej. `kilometraje`), no lo pidas de nuevo en formularios posteriores. Reutiliza el valor almacenado.
7. **UI consistente**: Usa siempre los componentes de `@/components/ui/` (Shadcn). Tailwind para grillas. No crear nuevos sistemas de diseño.
8. **Hook `useMiUnidad`**: Es el hook canónico para obtener las unidades del chofer. No volver a hacer fetch directo de unidades en páginas del chofer.
9. **`Providers.jsx`**: Toda rama del `useEffect` que llame `return` debe llamar `setIsLoading(false)` antes. El `if (!pathname) return` al inicio es obligatorio para manejar la hidratación de Next.js 15.
10. **SIEMPRE verifica antes de crear**: Antes de añadir cualquier componente, spinner, animación o utilidad, revisa primero `@/components/ui/` y `@/hooks/`. Ya existen:
    - `Skeleton` — bloque de carga genérico (`@/components/ui/skeleton.jsx`)
    - `PageSkeleton` — skeleton de página completa con variantes `table`, `grid`, `list` y props `rowCount`, `columnCount`, `title`, `action` (`@/components/ui/page-skeleton.jsx`)
    - Animaciones de ruta: `tailwindcss-animate` ya está configurado en `tailwind.config.js`. Usar clases `animate-in fade-in-0 slide-in-from-bottom-2 duration-200` directamente. No instalar librerías de animación externas.
    - Para estados de carga de página usa `PageSkeleton`, NO spinners `Loader2` aislados.

¡Usa esta fundación para expandir Taller JF a la mejor plataforma de gestión del país!
