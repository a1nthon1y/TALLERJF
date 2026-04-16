#!/usr/bin/env bash
# ============================================================
# TALLERJF — Test integral de API  (backend: http://localhost:4001)
# ============================================================
BASE="http://localhost:4001/api"
PASS=0; FAIL=0; SKIP=0
TOKEN_ADMIN=""
TOKEN_ENCARGADO=""
TOKEN_OWNER=""
TOKEN_CHOFER=""
UNIT_ID=""
MAINT_ID=""
MATERIAL_ID=""
TECH_ID=""
OWNER_USER_ID=""
OWNER_ID=""
CHOFER_USER_ID=""
CHOFER_ID=""

# ── helpers ─────────────────────────────────────────────────
GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; NC="\033[0m"; BOLD="\033[1m"

ok()   { echo -e "  ${GREEN}✔ PASS${NC}  $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗ FAIL${NC}  $1 — $2"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⊘ SKIP${NC}  $1"; ((SKIP++)); }
sep()  { echo -e "\n${BOLD}━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# Ejecuta curl y devuelve el cuerpo; guarda status en $STATUS
req() {
  local method="$1" url="$2" data="$3" tok="$4"
  local args=(-s -o /tmp/tjf_body.txt -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
  [[ -n "$tok"  ]] && args+=(-H "Authorization: Bearer $tok")
  [[ -n "$data" ]] && args+=(-d "$data")
  STATUS=$(curl "${args[@]}")
  BODY=$(cat /tmp/tjf_body.txt)
}

# Verifica que $STATUS esté en la lista de códigos aceptables
assert_status() {
  local label="$1"; shift
  for code in "$@"; do [[ "$STATUS" == "$code" ]] && { ok "$label (HTTP $STATUS)"; return; }; done
  fail "$label" "HTTP $STATUS — $BODY"
}

# ── 1. Auth ──────────────────────────────────────────────────
sep "AUTH"

# Registro de usuario de prueba (puede fallar si ya existe, ignorar)
req POST "$BASE/auth/register" '{"nombre":"Test Admin","correo":"testadmin_jf@test.com","password":"Test1234!","rol":"ADMIN"}'
# No assert — puede ser 409 si ya existe

# Login ADMIN
req POST "$BASE/auth/login" '{"username":"tadmin","password":"Test1234!"}'
if [[ "$STATUS" == "200" ]]; then
  TOKEN_ADMIN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  ok "Login ADMIN por username (HTTP 200)"
else
  fail "Login ADMIN" "HTTP $STATUS — $BODY"
fi

# Login con credenciales incorrectas → debe ser 401
req POST "$BASE/auth/login" '{"username":"usuarioinexistente","password":"wrong"}'
assert_status "Login credenciales inválidas → 401" "401"

# Sin token → protegida debe ser 401/403
req GET "$BASE/units" "" ""
assert_status "Ruta protegida sin token → 401/403" "401" "403"

# ── 2. Usuarios (ADMIN) ───────────────────────────────────────
sep "USUARIOS"

if [[ -z "$TOKEN_ADMIN" ]]; then skip "Listar usuarios (sin token admin)"; else
  req GET "$BASE/users" "" "$TOKEN_ADMIN"
  assert_status "GET /users (ADMIN)" "200"
fi

# Crear usuario ENCARGADO
if [[ -n "$TOKEN_ADMIN" ]]; then
  req POST "$BASE/users" '{"nombre":"Encargado Test","correo":"encargado_jf@test.com","password":"Test1234!","rol":"ENCARGADO","activo":true}' "$TOKEN_ADMIN"
  if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
    ok "Crear usuario ENCARGADO (HTTP $STATUS)"
  else
    skip "Crear usuario ENCARGADO (ya existe o error: $STATUS)"
  fi
  # Login ENCARGADO
  req POST "$BASE/auth/login" '{"username":"etest","password":"Test1234!"}'
  [[ "$STATUS" == "200" ]] && TOKEN_ENCARGADO=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

# Crear usuario OWNER
if [[ -n "$TOKEN_ADMIN" ]]; then
  req POST "$BASE/users" '{"nombre":"Owner Test","correo":"owner_jf@test.com","password":"Test1234!","rol":"OWNER","activo":true}' "$TOKEN_ADMIN"
  OWNER_USER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  [[ "$STATUS" == "201" || "$STATUS" == "200" ]] && ok "Crear usuario OWNER (HTTP $STATUS)" || skip "Crear usuario OWNER ($STATUS)"

  # Login OWNER
  req POST "$BASE/auth/login" '{"username":"otest","password":"Test1234!"}'
  [[ "$STATUS" == "200" ]] && TOKEN_OWNER=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

# Crear usuario CHOFER
if [[ -n "$TOKEN_ADMIN" ]]; then
  req POST "$BASE/users" '{"nombre":"Chofer Test","correo":"chofer_jf@test.com","password":"Test1234!","rol":"CHOFER","activo":true}' "$TOKEN_ADMIN"
  CHOFER_USER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  [[ "$STATUS" == "201" || "$STATUS" == "200" ]] && ok "Crear usuario CHOFER (HTTP $STATUS)" || skip "Crear usuario CHOFER ($STATUS)"

  # Login CHOFER
  req POST "$BASE/auth/login" '{"username":"ctest","password":"Test1234!"}'
  [[ "$STATUS" == "200" ]] && TOKEN_CHOFER=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

# ENCARGADO no puede crear usuarios → 403
if [[ -n "$TOKEN_ENCARGADO" ]]; then
  req POST "$BASE/users" '{"nombre":"X","correo":"x@x.com","password":"123456","rol":"CHOFER"}' "$TOKEN_ENCARGADO"
  assert_status "ENCARGADO no puede crear usuarios → 403" "403"
fi

# ── 3. Técnicos ───────────────────────────────────────────────
sep "TÉCNICOS"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/technicians" "" "$TOKEN_ADMIN"
  assert_status "GET /technicians" "200"

  TECH_DNI="T$(date +%s%N | tail -c6)"
  req POST "$BASE/technicians" "{\"nombre\":\"Técnico Test\",\"dni\":\"$TECH_DNI\",\"especialidad\":\"Motor\",\"activo\":true}" "$TOKEN_ADMIN"
  TECH_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  assert_status "POST /technicians" "201" "200"

  if [[ -n "$TECH_ID" ]]; then
    req PUT "$BASE/technicians/$TECH_ID" "{\"nombre\":\"Técnico Test Upd\",\"dni\":\"$TECH_DNI\",\"especialidad\":\"Frenos\"}" "$TOKEN_ADMIN"
    assert_status "PUT /technicians/:id" "200"
  fi
fi

# ── 4. Owners ─────────────────────────────────────────────────
sep "OWNERS (dueños)"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/owners" "" "$TOKEN_ADMIN"
  assert_status "GET /owners (ADMIN)" "200"

  # Crear owner vinculado al usuario owner
  local_uid=${OWNER_USER_ID:-1}
  req POST "$BASE/owners" "{\"usuario_id\":$local_uid}" "$TOKEN_ADMIN"
  OWNER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
    ok "POST /owners (vincular usuario OWNER)"
  else
    skip "POST /owners ($STATUS — puede ya existir)"
    # Intentar obtener ID existente
    req GET "$BASE/owners" "" "$TOKEN_ADMIN"
    OWNER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  fi
fi

# OWNER puede ver su perfil
if [[ -n "$TOKEN_OWNER" ]]; then
  req GET "$BASE/owners/me" "" "$TOKEN_OWNER"
  assert_status "GET /owners/me (OWNER)" "200"
fi

# CHOFER no puede listar owners → 403
if [[ -n "$TOKEN_CHOFER" ]]; then
  req GET "$BASE/owners" "" "$TOKEN_CHOFER"
  assert_status "CHOFER no puede listar owners → 403" "403"
fi

# ── 5. Choferes ───────────────────────────────────────────────
sep "CHOFERES"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/choferes" "" "$TOKEN_ADMIN"
  assert_status "GET /choferes (ADMIN)" "200"

  local_uid=${CHOFER_USER_ID:-2}
  req POST "$BASE/choferes" "{\"usuario_id\":$local_uid,\"licencia\":\"A-001\",\"telefono\":\"987654321\"}" "$TOKEN_ADMIN"
  CHOFER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  if [[ "$STATUS" == "201" || "$STATUS" == "200" ]]; then
    ok "POST /choferes"
  else
    skip "POST /choferes ($STATUS — puede ya existir)"
    req GET "$BASE/choferes" "" "$TOKEN_ADMIN"
    CHOFER_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  fi
fi

# CHOFER puede ver su unidad
if [[ -n "$TOKEN_CHOFER" ]]; then
  req GET "$BASE/choferes/mi-unidad" "" "$TOKEN_CHOFER"
  assert_status "GET /choferes/mi-unidad (CHOFER)" "200" "404"
fi

# ── 6. Unidades ───────────────────────────────────────────────
sep "UNIDADES"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/units" "" "$TOKEN_ADMIN"
  assert_status "GET /units" "200"

  owner_ref=${OWNER_ID:-3}
  PLACA_TEST="T$(date +%s | tail -c5)"
  req POST "$BASE/units" "{\"placa\":\"$PLACA_TEST\",\"modelo\":\"Bus Prueba\",\"tipo\":\"OMNIBUS\",\"año\":2023,\"kilometraje\":50000,\"dueno_id\":$owner_ref}" "$TOKEN_ADMIN"
  UNIT_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  assert_status "POST /units" "201" "200"

  if [[ -n "$UNIT_ID" ]]; then
    req GET "$BASE/units/$UNIT_ID" "" "$TOKEN_ADMIN"
    assert_status "GET /units/:id" "200"

    req PUT "$BASE/units/$UNIT_ID" "{\"placa\":\"$PLACA_TEST\",\"modelo\":\"Bus Actualizado\",\"tipo\":\"OMNIBUS\",\"año\":2023,\"kilometraje\":51000,\"dueno_id\":$owner_ref}" "$TOKEN_ADMIN"
    assert_status "PUT /units/:id" "200"
  fi
fi

# OWNER ve sus unidades
if [[ -n "$TOKEN_OWNER" ]]; then
  req GET "$BASE/units/my-units" "" "$TOKEN_OWNER"
  assert_status "GET /units/my-units (OWNER)" "200"
fi

# ── 7. Materiales ─────────────────────────────────────────────
sep "MATERIALES"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/materials" "" "$TOKEN_ADMIN"
  assert_status "GET /materials" "200"

  MAT_NAME="Aceite Motor $(date +%s | tail -c5)"
  req POST "$BASE/materials" "{\"nombre\":\"$MAT_NAME\",\"descripcion\":\"Aceite sintético\",\"stock\":10,\"precio\":45.50}" "$TOKEN_ADMIN"
  MATERIAL_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  assert_status "POST /materials" "201" "200"

  if [[ -n "$MATERIAL_ID" ]]; then
    req PUT "$BASE/materials/$MATERIAL_ID" "{\"nombre\":\"$MAT_NAME Upd\",\"descripcion\":\"Aceite sintético\",\"stock\":15,\"precio\":47.00}" "$TOKEN_ADMIN"
    assert_status "PUT /materials/:id" "200"
  fi
fi

# ── 8. Mantenimientos ─────────────────────────────────────────
sep "MANTENIMIENTOS"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/maintenances" "" "$TOKEN_ADMIN"
  assert_status "GET /maintenances" "200"

  unit_ref=${UNIT_ID:-1}
  tech_ref=${TECH_ID:-1}
  req POST "$BASE/maintenances" "{\"unidad_id\":$unit_ref,\"tipo\":\"PREVENTIVO\",\"descripcion\":\"Prueba mantenimiento\",\"observaciones\":\"Test\",\"kilometraje_actual\":51000,\"tecnico_id\":$tech_ref,\"estado\":\"PENDIENTE\"}" "$TOKEN_ADMIN"
  MAINT_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
  assert_status "POST /maintenances" "201" "200"

  if [[ -n "$MAINT_ID" ]]; then
    req GET "$BASE/maintenances/$MAINT_ID" "" "$TOKEN_ADMIN"
    assert_status "GET /maintenances/:id" "200"

    req PUT "$BASE/maintenances/$MAINT_ID" "{\"estado\":\"REALIZADO\",\"tecnico_id\":$tech_ref}" "$TOKEN_ADMIN"
    assert_status "PUT /maintenances/:id (→ REALIZADO)" "200"

    req GET "$BASE/maintenances/unit/$unit_ref" "" "$TOKEN_ADMIN"
    assert_status "GET /maintenances/unit/:id" "200"
  fi

  # CHOFER no puede crear mantenimiento → 403
  if [[ -n "$TOKEN_CHOFER" ]]; then
    req POST "$BASE/maintenances" "{\"unidad_id\":$unit_ref,\"tipo\":\"CORRECTIVO\",\"descripcion\":\"No autorizado\",\"estado\":\"PENDIENTE\"}" "$TOKEN_CHOFER"
    assert_status "CHOFER no puede crear mantenimiento → 403" "403"
  fi
fi

# ── 9. Alertas ────────────────────────────────────────────────
sep "ALERTAS"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/alerts" "" "$TOKEN_ADMIN"
  assert_status "GET /alerts" "200"
fi

# ── 10. Configuraciones ───────────────────────────────────────
sep "CONFIGURACIONES"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/config" "" "$TOKEN_ADMIN"
  assert_status "GET /config" "200"

  unit_ref=${UNIT_ID:-1}
  req POST "$BASE/config" '{"nombre":"Filtro de aire","umbral_km":5000}' "$TOKEN_ADMIN"
  assert_status "POST /config" "201" "200"
fi

# ── 11. Reportes ─────────────────────────────────────────────
sep "REPORTES"

if [[ -n "$TOKEN_ADMIN" ]]; then
  req GET "$BASE/reports/maintenances" "" "$TOKEN_ADMIN"
  assert_status "GET /reports/maintenances" "200"

  req GET "$BASE/reports/materials" "" "$TOKEN_ADMIN"
  assert_status "GET /reports/materials" "200"

  req GET "$BASE/reports/costs" "" "$TOKEN_ADMIN"
  assert_status "GET /reports/costs" "200"
fi

# OWNER ve su reporte
if [[ -n "$TOKEN_OWNER" ]]; then
  req GET "$BASE/reports/my-units" "" "$TOKEN_OWNER"
  assert_status "GET /reports/my-units (OWNER)" "200"
fi

# ── 12. Control de acceso por rol ─────────────────────────────
sep "CONTROL DE ACCESO (RBAC)"

# CHOFER accede a su unidad
if [[ -n "$TOKEN_CHOFER" ]]; then
  req GET "$BASE/choferes/mi-unidad" "" "$TOKEN_CHOFER"
  assert_status "CHOFER: GET /choferes/mi-unidad" "200" "404"
fi

# CHOFER no puede ver todos los choferes
if [[ -n "$TOKEN_CHOFER" ]]; then
  req GET "$BASE/choferes" "" "$TOKEN_CHOFER"
  assert_status "CHOFER no puede listar choferes → 403" "403"
fi

# OWNER no puede listar todos los usuarios
if [[ -n "$TOKEN_OWNER" ]]; then
  req GET "$BASE/users" "" "$TOKEN_OWNER"
  assert_status "OWNER no puede listar usuarios → 403" "403"
fi

# OWNER no puede crear unidades
if [[ -n "$TOKEN_OWNER" ]]; then
  req POST "$BASE/units" '{"placa":"ZZZ-000","modelo":"X","año":2020,"kilometraje":0,"dueno_id":1}' "$TOKEN_OWNER"
  assert_status "OWNER no puede crear unidades → 403" "403"
fi

# ── Resumen ───────────────────────────────────────────────────
sep "RESUMEN"
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo -e "  Total: $TOTAL   ${GREEN}✔ $PASS${NC}   ${RED}✗ $FAIL${NC}   ${YELLOW}⊘ $SKIP${NC}"
echo ""
[[ $FAIL -eq 0 ]] && echo -e "  ${GREEN}${BOLD}Todas las pruebas pasaron correctamente.${NC}" || echo -e "  ${RED}${BOLD}$FAIL prueba(s) fallaron. Revisar arriba.${NC}"
echo ""
exit $FAIL
