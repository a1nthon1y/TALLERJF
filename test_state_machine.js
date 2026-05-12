// ============================================================
// TALLERJF — Test del state machine de mantenimientos
// PENDIENTE → EN_PROCESO → COMPLETADO → CERRADO + edits
// ============================================================
const BASE = process.env.BASE || "http://localhost:4101/api";

let PASS = 0, FAIL = 0;
const C = {
  g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", c: "\x1b[36m", b: "\x1b[1m", n: "\x1b[0m",
};
const ok = (m) => { console.log(`  ${C.g}✔${C.n} ${m}`); PASS++; };
const fail = (m, why = "") => { console.log(`  ${C.r}✗${C.n} ${m}\n     ${C.r}${why}${C.n}`); FAIL++; };
const info = (m) => console.log(`  ${C.c}ℹ${C.n} ${m}`);
const sep = (m) => console.log(`\n${C.b}━━ ${m} ━━━━━━━━━━━━━━━━━━━━${C.n}`);

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null, text = "";
  try { text = await res.text(); json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, body: json, raw: text };
}

(async () => {
  // ── 1. AUTH ───────────────────────────────────────────
  sep("AUTH");
  let r = await req("POST", "/auth/login", { username: "tadmin", password: "Test1234!" });
  if (r.status !== 200) {
    fail("Login ADMIN", `HTTP ${r.status} — ${r.raw.slice(0, 200)}`);
    console.log("\nAbortado: sin token no podemos seguir.");
    process.exit(1);
  }
  const TOKEN = r.body.token;
  ok(`Login ADMIN (HTTP 200) — user=${r.body.user?.username} rol=${r.body.user?.rol}`);

  // ── 2. SETUP ───────────────────────────────────────────
  sep("SETUP — buscar fixtures");
  r = await req("GET", "/units", null, TOKEN);
  if (r.status !== 200 || !Array.isArray(r.body) || r.body.length === 0) {
    fail("GET /units", `HTTP ${r.status}`); process.exit(1);
  }
  const unit = r.body[0];
  ok(`Unidad: ${unit.placa} (id=${unit.id}, km=${unit.kilometraje})`);

  r = await req("GET", "/technicians", null, TOKEN);
  const tech = (r.body || []).find(t => t.activo);
  if (!tech) { fail("Sin técnicos activos"); process.exit(1); }
  ok(`Técnico: id=${tech.id} ${tech.nombre || ""}`);

  r = await req("GET", "/config", null, TOKEN);
  const partesActivas = (r.body || []).filter(p => p.activo);
  if (partesActivas.length === 0) { fail("Sin partes activas"); process.exit(1); }
  const PARTE_ID = partesActivas[0].id;
  const PARTE_ID_2 = partesActivas[1]?.id;
  ok(`Partes activas: ${partesActivas.map(p => p.id).join(",")}`);

  r = await req("GET", "/materials", null, TOKEN);
  const mat = (r.body || []).find(m => (m.stock || 0) > 5 && m.nombre !== "Servicio en Ruta");
  if (!mat) { fail("Sin materiales con stock > 5"); process.exit(1); }
  ok(`Material: id=${mat.id} ${mat.nombre} (stock=${mat.stock})`);

  // ── 3. CREAR PREVENTIVO (PENDIENTE) ───────────────────
  sep("CREAR PREVENTIVO (PENDIENTE)");
  // Bug #2: ya no se acepta kilometraje_actual del cliente; se toma del odómetro.
  const KM_BEFORE = unit.kilometraje || 0;
  r = await req("POST", "/maintenances", {
    unidad_id: unit.id,
    tipo: "PREVENTIVO",
    observaciones: "Test del state machine — preventivo programado",
    tecnico_id: tech.id,
    partes_programadas: [PARTE_ID],
  }, TOKEN);
  if (r.status !== 201) { fail("Crear", `HTTP ${r.status} — ${r.raw.slice(0,300)}`); process.exit(1); }
  const MAINT_ID = r.body.id;
  const CODIGO = r.body.codigo;
  ok(`Crear PREVENTIVO (HTTP 201) — id=${MAINT_ID} código=${CODIGO}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  const prog0 = JSON.stringify(r.body.partes_programadas);
  if (prog0 === `[${PARTE_ID}]`) ok(`partes_programadas persistidas: ${prog0}`);
  else fail("partes_programadas", `esperado [${PARTE_ID}] obtuvo ${prog0}`);
  if (r.body.estado === "PENDIENTE") ok("Estado inicial = PENDIENTE");
  else fail("Estado inicial", r.body.estado);
  if (r.body.kilometraje_actual === KM_BEFORE)
    ok(`Snapshot km tomado del odómetro (${KM_BEFORE})`);
  else fail("Snapshot km", `esperado ${KM_BEFORE} obtuvo ${r.body.kilometraje_actual}`);

  // Verificar que el odómetro de la unidad NO se modificó (Bug #2)
  r = await req("GET", "/units", null, TOKEN);
  const unitAfter = (r.body || []).find(u => u.id === unit.id);
  if (unitAfter && unitAfter.kilometraje === KM_BEFORE)
    ok(`Odómetro intacto tras crear (sigue ${KM_BEFORE}) ✅`);
  else fail("Bug #2: odómetro se sobrescribió", `antes=${KM_BEFORE} ahora=${unitAfter?.kilometraje}`);

  // ── 3b. PARTS-STATUS expone estado y km_restantes (Bug #1) ────
  sep("Bug #1: parts-status devuelve estado + km_restantes");
  r = await req("GET", `/units/${unit.id}/parts-status`, null, TOKEN);
  if (r.status === 200 && Array.isArray(r.body) && r.body.length > 0) {
    const sample = r.body[0];
    const expectedKeys = ["estado", "km_restantes", "porcentaje", "km_recorridos", "configuracion_parte_id"];
    const missing = expectedKeys.filter(k => !(k in sample));
    if (missing.length === 0) ok(`Campos presentes: ${expectedKeys.join(", ")}`);
    else fail("Campos faltantes en parts-status", missing.join(", "));

    const validStates = ["CRITICO", "ADVERTENCIA", "OK"];
    const allValid = r.body.every(p => validStates.includes(String(p.estado)));
    if (allValid) ok(`Todos los estados son válidos (${[...new Set(r.body.map(p => p.estado))].join(", ")})`);
    else fail("Estados inválidos", JSON.stringify(r.body.map(p => p.estado)));

    // Coherencia: km_restantes = umbral_km - km_recorridos
    const ok_calc = r.body.every(p => Number(p.km_restantes) === Number(p.umbral_km) - Number(p.km_recorridos));
    if (ok_calc) ok("km_restantes = umbral_km - km_recorridos (coherente)");
    else fail("km_restantes incoherente", JSON.stringify(r.body[0]));
  } else fail("parts-status no devolvió datos", `HTTP ${r.status}`);

  // ── 4. EDITAR EN PENDIENTE ────────────────────────────
  sep("EDITAR (PENDIENTE) — agregar nota + reasignar");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "PENDIENTE",
    tecnico_id: tech.id,
    nota_adicional: "Nota agregada en estado PENDIENTE",
    partes_reparadas: [],
    partes_programadas: [PARTE_ID],
  }, TOKEN);
  if (r.status === 200) ok("Editar PENDIENTE (HTTP 200)");
  else fail("Editar PENDIENTE", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if ((r.body.observaciones || "").includes("NOTA DEL ENCARGADO")) ok("Nota anexada al historial (audit log)");
  else fail("Nota no anexada", `obs=${r.body.observaciones}`);

  // ── 4b. SIN ASIGNAR → debe quedar tecnico_id = null ───
  sep("Editar — desasignar técnico (Bug #3)");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "PENDIENTE",
    tecnico_id: null,
    partes_reparadas: [],
  }, TOKEN);
  if (r.status === 200) ok("PUT desasignar (HTTP 200)");
  else fail("PUT desasignar", `HTTP ${r.status} — ${r.raw.slice(0,200)}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if (r.body.tecnico_id === null) ok("tecnico_id quedó NULL ✅");
  else fail(`Bug #3 sigue activo`, `tecnico_id = ${r.body.tecnico_id} (no se desasignó)`);

  // Reasignar para continuar
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "PENDIENTE", tecnico_id: tech.id, partes_reparadas: [],
  }, TOKEN);

  // ── 5. AVANZAR PENDIENTE → EN_PROCESO ─────────────────
  sep("AVANZAR PENDIENTE → EN_PROCESO");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "EN_PROCESO", tecnico_id: tech.id, partes_reparadas: [],
  }, TOKEN);
  if (r.status === 200) ok("Transición a EN_PROCESO (HTTP 200)");
  else fail("EN_PROCESO", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if (!r.body.fecha_realizacion) ok("fecha_realizacion sigue NULL en EN_PROCESO (fix #10) ✅");
  else fail("Bug #10 regresión", `fecha_realizacion=${r.body.fecha_realizacion}`);

  // ── 6. AGREGAR MATERIAL EN EN_PROCESO ────────────────
  sep("MATERIALES en EN_PROCESO");
  r = await req("POST", `/maintenances/${MAINT_ID}/materials`, { material_id: mat.id, cantidad: 1 }, TOKEN);
  if (r.status === 201) ok(`Agregar material en EN_PROCESO (HTTP 201) — detalle id=${r.body.id}`);
  else fail("Agregar material", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);
  const detalleId = r.body?.id;

  // ── 7. EDITAR PARTES EN EN_PROCESO ───────────────────
  sep("EDITAR partes en EN_PROCESO");
  if (PARTE_ID_2) {
    r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
      estado: "EN_PROCESO", tecnico_id: tech.id,
      partes_reparadas: [],
      partes_programadas: [PARTE_ID, PARTE_ID_2],
    }, TOKEN);
    if (r.status === 200) ok("Editar partes en EN_PROCESO (HTTP 200)");
    else fail("Editar partes", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);
    r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
    const prog = JSON.stringify(r.body.partes_programadas);
    if (prog.includes(String(PARTE_ID_2))) ok(`Plan ampliado: ${prog}`);
    else fail("Nueva parte no agregada", prog);
  } else {
    info("Solo hay 1 parte activa, salto sub-test");
  }

  // ── 8. AVANZAR EN_PROCESO → COMPLETADO ───────────────
  sep("AVANZAR EN_PROCESO → COMPLETADO");
  r = await req("GET", `/units/${unit.id}/parts-status`, null, TOKEN);
  const partAntes = (r.body || []).find(p => String(p.id) === String(PARTE_ID));
  info(`ultimo_mantenimiento_km ANTES: ${partAntes?.ultimo_mantenimiento_km}`);

  const partesFinal = PARTE_ID_2 ? [PARTE_ID, PARTE_ID_2] : [PARTE_ID];
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "COMPLETADO", tecnico_id: tech.id,
    nota_adicional: "Trabajo terminado en test",
    partes_reparadas: partesFinal,
    partes_programadas: partesFinal,
  }, TOKEN);
  if (r.status === 200) ok("Transición a COMPLETADO (HTTP 200)");
  else fail("COMPLETADO", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if (r.body.fecha_realizacion) ok(`fecha_realizacion seteada al completar (${r.body.fecha_realizacion})`);
  else fail("fecha_realizacion NO seteada al completar");

  r = await req("GET", `/units/${unit.id}/parts-status`, null, TOKEN);
  const partDesp = (r.body || []).find(p => String(p.id) === String(PARTE_ID));
  info(`ultimo_mantenimiento_km DESPUÉS: ${partDesp?.ultimo_mantenimiento_km}`);
  if ((partDesp?.ultimo_mantenimiento_km ?? 0) >= KM_BEFORE)
    ok(`Contador predictivo reseteado (km=${partDesp.ultimo_mantenimiento_km} >= ${KM_BEFORE})`);
  else fail("Contador NO reseteado", `esperaba >= ${KM_BEFORE}, obtuvo ${partDesp?.ultimo_mantenimiento_km}`);

  // ── 9. MATERIAL EN COMPLETADO — DEBE FALLAR ──────────
  sep("MATERIALES bloqueados en COMPLETADO");
  r = await req("POST", `/maintenances/${MAINT_ID}/materials`, { material_id: mat.id, cantidad: 1 }, TOKEN);
  if (r.status === 400) ok(`Material rechazado en COMPLETADO (HTTP 400) — ${r.body?.error || ""}`);
  else fail("Material aceptado en COMPLETADO", `HTTP ${r.status}`);

  // ── 10. ADMIN REBOBINA COMPLETADO → EN_PROCESO ───────
  sep("ADMIN rebobina COMPLETADO → EN_PROCESO");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "EN_PROCESO", tecnico_id: tech.id, partes_reparadas: [],
  }, TOKEN);
  if (r.status === 200) ok("ADMIN rebobinó (HTTP 200)");
  else fail("Rebobinar admin", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);

  // ── 11. RE-COMPLETAR ─────────────────────────────────
  sep("Re-completar");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, {
    estado: "COMPLETADO", tecnico_id: tech.id,
    partes_reparadas: partesFinal, partes_programadas: partesFinal,
  }, TOKEN);
  if (r.status === 200) ok("Re-completar (HTTP 200)");
  else fail("Re-completar", `HTTP ${r.status}`);

  // ── 12. CERRAR ───────────────────────────────────────
  sep("COMPLETADO → CERRADO");
  r = await req("PUT", `/maintenances/${MAINT_ID}/close`, { observaciones_cierre: "Aprobado en test automatizado" }, TOKEN);
  if (r.status === 200) ok("Cerrar mantenimiento (HTTP 200)");
  else fail("Cerrar", `HTTP ${r.status} — ${r.raw.slice(0,300)}`);

  r = await req("GET", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if (r.body.estado === "CERRADO") ok("Estado final = CERRADO ✅");
  else fail("Estado final", r.body.estado);
  if ((r.body.observaciones || "").includes("CIERRE DEL ENCARGADO") ||
      (r.body.observaciones || "").includes("Aprobado en test")) ok("Nota de cierre presente en observaciones");
  else fail("Nota cierre no anexada");

  // ── 13. CERRADO INMUTABLE ────────────────────────────
  sep("CERRADO inmutable");
  r = await req("PUT", `/maintenances/${MAINT_ID}/edit`, { estado: "PENDIENTE", partes_reparadas: [] }, TOKEN);
  if (r.status === 400) ok(`Edit rechazado en CERRADO (HTTP 400) — ${r.body?.error || ""}`);
  else fail("Edit aceptado en CERRADO", `HTTP ${r.status}`);

  r = await req("PUT", `/maintenances/${MAINT_ID}/close`, { observaciones_cierre: "otra" }, TOKEN);
  if (r.status === 400) ok(`Close rechazado en CERRADO (HTTP 400) — ${r.body?.error || ""}`);
  else fail("Close aceptado en CERRADO", `HTTP ${r.status}`);

  r = await req("POST", `/maintenances/${MAINT_ID}/materials`, { material_id: mat.id, cantidad: 1 }, TOKEN);
  if (r.status === 400) ok(`Material rechazado en CERRADO (HTTP 400) — ${r.body?.error || ""}`);
  else fail("Material aceptado en CERRADO", `HTTP ${r.status}`);

  // ── 14. DELETE BLOQUEADO ─────────────────────────────
  sep("DELETE bloqueado en CERRADO");
  r = await req("DELETE", `/maintenances/${MAINT_ID}`, null, TOKEN);
  if (r.status === 400) ok(`Delete rechazado en CERRADO (HTTP 400) — ${r.body?.error || ""}`);
  else fail("Delete aceptado en CERRADO", `HTTP ${r.status}`);

  // ── 15. BUG #4: TECNICO no debe poder usar PUT /:id genérico ─
  sep("Bug #4: ownership check para TECNICO");
  r = await req("GET", "/users", null, TOKEN);
  const tecnicoUsers = (r.body || []).filter(u => u.rol === "TECNICO" && u.activo);
  if (tecnicoUsers.length === 0) {
    info("No hay usuarios TECNICO activos — sub-test salteado");
  } else {
    // No tenemos password de los técnicos existentes. Creamos uno temporal
    // con username único y luego lo desactivamos al final.
    const stamp = Date.now();
    const newTecUser = {
      nombre: `Test Tecnico ${stamp}`,
      correo: `testtec_${stamp}@test.com`,
      username: `testtec${stamp}`,
      password: "Test1234!",
      rol: "TECNICO",
    };
    r = await req("POST", "/users", newTecUser, TOKEN);
    if (r.status === 201 || r.status === 200) {
      // createUser responde { message, user } — extraer el id correcto
      const TEC_USER_ID = r.body?.user?.id ?? r.body?.id;
      ok(`Usuario TECNICO creado (id=${TEC_USER_ID})`);

      r = await req("POST", "/auth/login", { username: newTecUser.username, password: newTecUser.password });
      if (r.status === 200) {
        const TEC_TOKEN = r.body.token;
        ok("Login TECNICO (HTTP 200)");

        // Crear un mantenimiento target asignado a OTRO técnico (tech.id)
        r = await req("POST", "/maintenances", {
          unidad_id: unit.id, tipo: "CORRECTIVO",
          observaciones: "Mantenimiento target del test de seguridad",
          tecnico_id: tech.id,
        }, TOKEN);
        const TARGET_ID = r.body?.id;
        if (TARGET_ID) {
          info(`Mantenimiento target #${TARGET_ID} asignado a tecnico ${tech.id} (no al test user)`);

          // 15a. PUT /:id genérico DEBE fallar (403 — TECNICO removido del checkRole)
          r = await req("PUT", `/maintenances/${TARGET_ID}`,
            { estado: "EN_PROCESO", tecnico_id: tech.id, partes_reparadas: [] }, TEC_TOKEN);
          if (r.status === 403)
            ok(`PUT /:id genérico bloqueado para TECNICO (HTTP 403) ✅`);
          else fail("Bug #4: PUT /:id pasó como TECNICO", `HTTP ${r.status} — ${r.raw.slice(0,200)}`);

          // 15b. /:id/edit también bloqueado para TECNICO (ya estaba antes)
          r = await req("PUT", `/maintenances/${TARGET_ID}/edit`,
            { estado: "EN_PROCESO", partes_reparadas: [] }, TEC_TOKEN);
          if (r.status === 403)
            ok(`PUT /:id/edit bloqueado para TECNICO (HTTP 403) ✅`);
          else fail("/:id/edit pasó como TECNICO", `HTTP ${r.status}`);

          // 15c. /:id/my-status — el técnico de test no tiene fila en `tecnicos`,
          // por lo que el endpoint devuelve 404 ("No tienes registro de técnico asociado").
          // Si tuviera fila pero el trabajo fuera ajeno, devolvería 403. Ambos cuentan.
          r = await req("PUT", `/maintenances/${TARGET_ID}/my-status`,
            { estado: "EN_PROCESO" }, TEC_TOKEN);
          if (r.status === 403 || r.status === 404)
            ok(`my-status sobre trabajo ajeno bloqueado (HTTP ${r.status}) ✅`);
          else fail("Ownership check ausente", `HTTP ${r.status} — ${r.raw.slice(0,200)}`);

          // Verificar al final que el target sigue en PENDIENTE (no fue alterado)
          r = await req("GET", `/maintenances/${TARGET_ID}`, null, TOKEN);
          if (r.body?.estado === "PENDIENTE")
            ok(`Mantenimiento target NO fue alterado por el técnico ✅`);
          else fail("El target fue alterado", `estado=${r.body?.estado}`);

          // Cleanup
          await req("DELETE", `/maintenances/${TARGET_ID}`, null, TOKEN);
        } else fail("No se pudo crear mantenimiento target", "");
      } else fail("Login TECNICO", `HTTP ${r.status} — ${r.raw.slice(0,200)}`);

      // Cleanup: desactivar el usuario técnico de test (cumple además con
      // probar por ahí que toggle status funciona)
      if (TEC_USER_ID) {
        await req("PUT", `/users/${TEC_USER_ID}/status`, { activo: false }, TOKEN);
      }
    } else {
      info(`No se pudo crear usuario TECNICO (HTTP ${r.status}) — sub-test salteado`);
    }
  }

  // ── RESUMEN ──────────────────────────────────────────
  sep("RESUMEN");
  console.log(`${C.g}PASS: ${PASS}${C.n}  ·  ${C.r}FAIL: ${FAIL}${C.n}`);
  console.log(`Test creó mantenimiento ${C.y}#${MAINT_ID}${C.n} (${CODIGO}), quedó CERRADO.`);
  process.exit(FAIL > 0 ? 1 : 0);
})().catch(e => {
  console.error("UNCAUGHT:", e);
  process.exit(2);
});
