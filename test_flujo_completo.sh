#!/usr/bin/env bash
# ============================================================
# TALLERJF — Test de flujo completo por roles
# ============================================================
BASE="http://localhost:4001/api"
PASS_FAIL=0
PASS_OK=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

check() {
  local label="$1" body="$2" expect="$3" not_expect="${4:-}"
  if echo "$body" | grep -qE "$expect"; then
    if [ -n "$not_expect" ] && echo "$body" | grep -qE "$not_expect"; then
      echo -e "${RED}FAIL${NC} $label — encontrado '$not_expect' (no debería)"
      PASS_FAIL=$((PASS_FAIL+1))
    else
      echo -e "${GREEN}OK  ${NC} $label"
      PASS_OK=$((PASS_OK+1))
    fi
  else
    echo -e "${RED}FAIL${NC} $label — esperado '$expect'"
    echo "       resp: $(echo "$body" | head -c 200)"
    PASS_FAIL=$((PASS_FAIL+1))
  fi
}
skip() { echo -e "${YELLOW}SKIP${NC} $1"; }
header() { echo -e "\n${CYAN}══════════ $1 ══════════${NC}"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null; }

# ─────────────────────────────────────────────────────────────
# 1. AUTENTICACIÓN
# ─────────────────────────────────────────────────────────────
header "1. AUTENTICACIÓN"

ADMIN_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"aespinoza","password":"123456"}')
check "Login ADMIN (aespinoza)" "$ADMIN_RES" '"rol":"ADMIN"'
ADMIN_TOKEN=$(echo $ADMIN_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

ENC_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"etest","password":"Test1234!"}')
check "Login ENCARGADO (etest)" "$ENC_RES" '"rol":"ENCARGADO"'
ENC_TOKEN=$(echo $ENC_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

OWN_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"otest","password":"Test1234!"}')
check "Login OWNER (otest)" "$OWN_RES" '"rol":"OWNER"'
OWN_TOKEN=$(echo $OWN_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

CHO_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"ajesus","password":"123456"}')
check "Login CHOFER (ajesus — unidad ABC-123)" "$CHO_RES" '"rol":"CHOFER"'
CHO_TOKEN=$(echo $CHO_RES | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

BAD_RES=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"username":"noexiste","password":"mal"}')
check "Login inválido rechazado" "$BAD_RES" '"error"'

# ─────────────────────────────────────────────────────────────
# 2. PARTS STATUS — Nuevo endpoint
# ─────────────────────────────────────────────────────────────
header "2. PARTS STATUS (GET /units/:id/parts-status)"

PS1=$(curl -s "$BASE/units/1/parts-status" -H "Authorization: Bearer $ADMIN_TOKEN")
check "ADMIN ve parts-status unidad 1" "$PS1" "umbral_km"
check "parts-status incluye km_recorridos" "$PS1" "km_recorridos"
check "parts-status incluye porcentaje" "$PS1" "porcentaje"

PS_CHO=$(curl -s "$BASE/units/1/parts-status" -H "Authorization: Bearer $CHO_TOKEN")
check "CHOFER ve parts-status de su unidad" "$PS_CHO" "umbral_km"

PS_ENC=$(curl -s "$BASE/units/1/parts-status" -H "Authorization: Bearer $ENC_TOKEN")
check "ENCARGADO ve parts-status" "$PS_ENC" "umbral_km"

PS_OWN=$(curl -s "$BASE/units/1/parts-status" -H "Authorization: Bearer $OWN_TOKEN")
check "OWNER ve parts-status" "$PS_OWN" "umbral_km"

PS_404=$(curl -s "$BASE/units/99999/parts-status" -H "Authorization: Bearer $ADMIN_TOKEN")
check "parts-status unidad inexistente => mensaje de error" "$PS_404" '"message"|"error"'

PS_UNAUTH=$(curl -s "$BASE/units/1/parts-status")
check "parts-status sin token rechazado" "$PS_UNAUTH" '"error"|"token"|"Unauthorized"|"No token"'

echo ""
echo "  Datos parts-status unidad 1:"
echo "$PS1" | python3 -c "
import sys,json
try:
  data = json.load(sys.stdin)
  for p in data[:5]:
    print(f\"    [{p.get('porcentaje','?')}%] {p.get('nombre','?')}: {p.get('km_recorridos','?')} / {p.get('umbral_km','?')} km\")
except Exception as e: print(' error:', e)
" 2>/dev/null

# ─────────────────────────────────────────────────────────────
# 3. DELETE CONFIG — Nuevo endpoint
# ─────────────────────────────────────────────────────────────
header "3. DELETE CONFIG (/api/config/:id)"

CONFIGS=$(curl -s "$BASE/config" -H "Authorization: Bearer $ADMIN_TOKEN")
check "GET /config devuelve lista" "$CONFIGS" "umbral_km"

# Encontrar último duplicado de "Filtro de aire"
DUP_ID=$(echo "$CONFIGS" | python3 -c "
import sys,json
try:
  data = json.load(sys.stdin)
  filtros = [c for c in data if 'Filtro' in c.get('nombre','')]
  if len(filtros) > 1:
    print(filtros[-1]['id'])
except: pass
" 2>/dev/null)

if [ -n "$DUP_ID" ]; then
  DEL_RES=$(curl -s -X DELETE "$BASE/config/$DUP_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  check "ADMIN elimina config duplicada id=$DUP_ID" "$DEL_RES" "eliminada"
  DEL_AGAIN=$(curl -s -X DELETE "$BASE/config/$DUP_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  check "Re-eliminar => 404 o error" "$DEL_AGAIN" '"error"|"not found"'
else
  skip "No hay configs duplicadas para eliminar"
fi

# RBAC: CHOFER no puede eliminar config
CHO_DEL=$(curl -s -X DELETE "$BASE/config/1" -H "Authorization: Bearer $CHO_TOKEN")
check "CHOFER no puede eliminar config (RBAC)" "$CHO_DEL" '"error"|"Forbidden"|"No autorizado"|"rol"'

# RBAC: sin token
UNAUTH_DEL=$(curl -s -X DELETE "$BASE/config/1")
check "Sin token no puede eliminar config" "$UNAUTH_DEL" '"error"|"token"|"Unauthorized"'

# ─────────────────────────────────────────────────────────────
# 4. FLUJO CHOFER — Llegada al Taller
# ─────────────────────────────────────────────────────────────
header "4. FLUJO CHOFER — Llegada al Taller (POST /choferes/llegada)"

MI_UNIDAD=$(curl -s "$BASE/choferes/mi-unidad" -H "Authorization: Bearer $CHO_TOKEN")
check "CHOFER ve su unidad asignada" "$MI_UNIDAD" "placa"

KM_ACTUAL=$(echo "$MI_UNIDAD" | python3 -c "
import sys,json
try: print(json.load(sys.stdin).get('unidad',{}).get('kilometraje',51000))
except: print(51000)
" 2>/dev/null)
KM_NUEVO=$((KM_ACTUAL + 150))
echo "  → km actual=$KM_ACTUAL, registrando con km=$KM_NUEVO"

LLEGADA=$(curl -s -X POST "$BASE/choferes/llegada" \
  -H "Authorization: Bearer $CHO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"unidad_id\":1,\"kilometraje\":$KM_NUEVO,\"origen\":\"Lima - Arequipa\",\"comentarios\":\"Prueba automatizada\"}")
check "CHOFER registra llegada al taller" "$LLEGADA" "exitosamente|registrado|reporte"
ALERTAS_NUEVAS=$(echo "$LLEGADA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('alertasNuevas',0))" 2>/dev/null || echo "0")
echo "  → Alertas predictivas generadas: $ALERTAS_NUEVAS"

# Verificar km actualizado en unidad
KM_AFTER=$(curl -s "$BASE/units/1" -H "Authorization: Bearer $ADMIN_TOKEN")
KM_DB=$(echo "$KM_AFTER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('kilometraje','?'))" 2>/dev/null)
echo "  → km en DB tras llegada: $KM_DB"
check "Kilometraje unidad actualizado en DB ($KM_DB)" "$KM_AFTER" "\"kilometraje\":$KM_NUEVO"

# Kilometraje menor rechazado
LLEGADA_MENOR=$(curl -s -X POST "$BASE/choferes/llegada" \
  -H "Authorization: Bearer $CHO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"unidad_id\":1,\"kilometraje\":100,\"origen\":\"Test\"}")
check "Llegada con km menor al actual rechazada" "$LLEGADA_MENOR" '"error"'

# Sin token rechazado
LLEGADA_UNAUTH=$(curl -s -X POST "$BASE/choferes/llegada" \
  -H "Content-Type: application/json" \
  -d "{\"unidad_id\":1,\"kilometraje\":$KM_NUEVO,\"origen\":\"Test\"}")
check "Llegada sin token rechazada" "$LLEGADA_UNAUTH" '"error"|"token"|"Unauthorized"'

# ─────────────────────────────────────────────────────────────
# 5. FLUJO CHOFER — Solicitar Mantenimiento Correctivo
# ─────────────────────────────────────────────────────────────
header "5. FLUJO CHOFER — Solicitar Mantenimiento Correctivo"

KM_HOY=$(echo "$KM_DB" | python3 -c "
import sys
try: print(int(sys.stdin.read().strip()))
except: print($KM_NUEVO)
" 2>/dev/null || echo "$KM_NUEVO")

MANT_CHO=$(curl -s -X POST "$BASE/maintenances" \
  -H "Authorization: Bearer $CHO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"unidad_id\":\"1\",
    \"tipo\":\"correctivo\",
    \"observaciones\":\"PROCEDENCIA: Lima - Arequipa\n\nREQUERIMIENTOS:\n- Cambio de aceite\n- Revision de frenos\n\nOBSERVACIONES:\nViaje sin novedades\",
    \"kilometraje_actual\":$KM_HOY
  }")
check "CHOFER crea mantenimiento correctivo (tipo lowercase)" "$MANT_CHO" '"id"|"mantenimiento"|CORRECTIVO|correctivo'
check "No hay error de constraint en tipo" "$MANT_CHO" '.' '"violates check constraint"'
MANT_ID=$(echo $MANT_CHO | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
echo "  → Mantenimiento id=$MANT_ID tipo=$(echo $MANT_CHO | python3 -c \"import sys,json; print(json.load(sys.stdin).get('tipo','?'))\" 2>/dev/null)"

# ENCARGADO también puede crear mantenimiento
MANT_ENC=$(curl -s -X POST "$BASE/maintenances" \
  -H "Authorization: Bearer $ENC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"unidad_id\":\"1\",\"tipo\":\"PREVENTIVO\",\"observaciones\":\"Mantenimiento preventivo trimestral\",\"kilometraje_actual\":$KM_HOY,\"tecnico_id\":\"1\"}")
check "ENCARGADO crea mantenimiento preventivo con técnico" "$MANT_ENC" '"id"|PREVENTIVO'
MANT_ENC_ID=$(echo $MANT_ENC | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

# ─────────────────────────────────────────────────────────────
# 6. FLUJO ENCARGADO — Mantenimientos y partes predictivas
# ─────────────────────────────────────────────────────────────
header "6. FLUJO ENCARGADO — Mantenimientos y Estado Predictivo"

ALL_MANTS=$(curl -s "$BASE/maintenances" -H "Authorization: Bearer $ENC_TOKEN")
check "ENCARGADO ve todos los mantenimientos" "$ALL_MANTS" '\['

MANT_COUNT=$(echo "$ALL_MANTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
echo "  → Total mantenimientos: $MANT_COUNT"

UNITS_LIST=$(curl -s "$BASE/units" -H "Authorization: Bearer $ENC_TOKEN")
check "ENCARGADO ve lista de unidades" "$UNITS_LIST" '\['

# parts-status múltiples unidades (como haría el frontend)
for UNIT_ID in 1 3; do
  PS=$(curl -s "$BASE/units/$UNIT_ID/parts-status" -H "Authorization: Bearer $ENC_TOKEN")
  PCOUNT=$(echo "$PS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "?")
  check "ENCARGADO parts-status unidad $UNIT_ID ($PCOUNT partes)" "$PS" 'umbral_km|\[\]'
done

# Actualizar estado de un mantenimiento
if [ -n "$MANT_ENC_ID" ]; then
  UPD_STATUS=$(curl -s -X PUT "$BASE/maintenances/$MANT_ENC_ID" \
    -H "Authorization: Bearer $ENC_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"estado":"EN_PROCESO","tecnico_id":"1"}')
  check "ENCARGADO cambia estado a EN_PROCESO" "$UPD_STATUS" 'EN_PROCESO|exitoso'

  UPD_COMP=$(curl -s -X PUT "$BASE/maintenances/$MANT_ENC_ID" \
    -H "Authorization: Bearer $ENC_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"estado":"COMPLETADO","tecnico_id":"1"}')
  check "ENCARGADO cambia estado a COMPLETADO" "$UPD_COMP" 'COMPLETADO|exitoso'

  CLOSE_RES=$(curl -s -X PUT "$BASE/maintenances/$MANT_ENC_ID/close" \
    -H "Authorization: Bearer $ENC_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"observaciones_cierre":"Aprobado y verificado en prueba"}')
  check "ENCARGADO cierra mantenimiento (CERRADO)" "$CLOSE_RES" 'CERRADO|exitoso|cerrado'
fi

# CHOFER no puede cerrar
if [ -n "$MANT_ID" ]; then
  CHO_CLOSE=$(curl -s -X PUT "$BASE/maintenances/$MANT_ID/close" -H "Authorization: Bearer $CHO_TOKEN" -H "Content-Type: application/json" -d '{}')
  check "CHOFER no puede cerrar mantenimiento (RBAC)" "$CHO_CLOSE" '"error"|"Forbidden"|"rol"|"No autorizado"'
fi

# ─────────────────────────────────────────────────────────────
# 7. FLUJO ADMIN — Configuración Predictiva (CRUD completo)
# ─────────────────────────────────────────────────────────────
header "7. FLUJO ADMIN — Configuración Predictiva"

TS=$(date +%s)
NEW_CFG=$(curl -s -X POST "$BASE/config" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{\"nombre\":\"Test-$TS\",\"umbral_km\":7777}")
check "ADMIN crea regla predictiva" "$NEW_CFG" '"id"'
NEW_CFG_ID=$(echo $NEW_CFG | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [ -n "$NEW_CFG_ID" ]; then
  UPD_CFG=$(curl -s -X PUT "$BASE/config/$NEW_CFG_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"umbral_km":9999,"activo":true}')
  check "ADMIN edita regla umbral_km=9999" "$UPD_CFG" '9999'
  
  DEACT_CFG=$(curl -s -X PUT "$BASE/config/$NEW_CFG_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"umbral_km":9999,"activo":false}')
  check "ADMIN desactiva regla" "$DEACT_CFG" 'false'

  DEL_CFG=$(curl -s -X DELETE "$BASE/config/$NEW_CFG_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  check "ADMIN elimina regla de prueba" "$DEL_CFG" 'eliminada'
fi

ENC_CFG=$(curl -s -X POST "$BASE/config" -H "Authorization: Bearer $ENC_TOKEN" -H "Content-Type: application/json" -d '{"nombre":"EncTest","umbral_km":1}')
check "ENCARGADO también puede crear config" "$ENC_CFG" '"id"'
ENC_CFG_ID=$(echo $ENC_CFG | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
[ -n "$ENC_CFG_ID" ] && curl -s -X DELETE "$BASE/config/$ENC_CFG_ID" -H "Authorization: Bearer $ENC_TOKEN" > /dev/null

CHO_CFG=$(curl -s -X POST "$BASE/config" -H "Authorization: Bearer $CHO_TOKEN" -H "Content-Type: application/json" -d '{"nombre":"Hack","umbral_km":1}')
check "CHOFER NO puede crear config" "$CHO_CFG" '"error"|"Forbidden"|"rol"'

OWN_CFG=$(curl -s -X POST "$BASE/config" -H "Authorization: Bearer $OWN_TOKEN" -H "Content-Type: application/json" -d '{"nombre":"Hack","umbral_km":1}')
check "OWNER NO puede crear config" "$OWN_CFG" '"error"|"Forbidden"|"rol"'

# ─────────────────────────────────────────────────────────────
# 8. FLUJO OWNER — Reportes y costos
# ─────────────────────────────────────────────────────────────
header "8. FLUJO OWNER — Reportes"

OWN_REPORT=$(curl -s "$BASE/reports/my-units" -H "Authorization: Bearer $OWN_TOKEN")
check "OWNER accede a /reports/my-units" "$OWN_REPORT" '\[|\[\]' '"error"'
echo "  → Respuesta: $(echo $OWN_REPORT | head -c 150)"

# CHOFER no puede ver reporte de dueño
CHO_OWN=$(curl -s "$BASE/reports/my-units" -H "Authorization: Bearer $CHO_TOKEN")
check "CHOFER NO accede a /reports/my-units" "$CHO_OWN" '"error"|"Forbidden"|"rol"'

# OWNER ve sus mantenimientos por unidad
OWN_UNIT_MANTS=$(curl -s "$BASE/reports/chofer-report" -H "Authorization: Bearer $OWN_TOKEN" 2>/dev/null || echo '{"x":1}')
echo "  → Owner report resp: $(echo $OWN_UNIT_MANTS | head -c 100)"

# ─────────────────────────────────────────────────────────────
# 9. FLUJO TECNICO — Crear usuario, login, ver trabajos
# ─────────────────────────────────────────────────────────────
header "9. FLUJO TECNICO — Login y trabajos"

TEC_USR=$(curl -s -X POST "$BASE/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Tec Prueba $TS\",\"correo\":\"tec_$TS@test.com\",\"password\":\"Test1234!\",\"rol\":\"TECNICO\"}")
check "ADMIN crea usuario TECNICO" "$TEC_USR" '"id"|"username"|TECNICO'
TEC_USERNAME=$(echo $TEC_USR | python3 -c "
import sys,json
d = json.load(sys.stdin)
print(d.get('username', d.get('usuario', {}).get('username','')))" 2>/dev/null || echo "")
echo "  → username generado: $TEC_USERNAME"

if [ -n "$TEC_USERNAME" ]; then
  TEC_LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"$TEC_USERNAME\",\"password\":\"Test1234!\"}")
  check "TECNICO puede hacer login" "$TEC_LOGIN" '"rol":"TECNICO"'
  TEC_TOKEN=$(echo $TEC_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

  MY_JOBS=$(curl -s "$BASE/maintenances/my-jobs" -H "Authorization: Bearer $TEC_TOKEN")
  check "TECNICO accede a /my-jobs" "$MY_JOBS" '\[|\[\]' '"error"'

  TEC_UNAUTH=$(curl -s "$BASE/maintenances/my-jobs")
  check "my-jobs sin token rechazado" "$TEC_UNAUTH" '"error"|"token"|"Unauthorized"'

  # TECNICO no puede ver todos los mantenimientos (solo sus trabajos)
  TEC_ALL=$(curl -s "$BASE/maintenances" -H "Authorization: Bearer $TEC_TOKEN")
  echo "  → TECNICO en GET /maintenances: $(echo $TEC_ALL | head -c 100)"
fi

# ─────────────────────────────────────────────────────────────
# 10. MATERIALES — CRUD básico para ENCARGADO
# ─────────────────────────────────────────────────────────────
header "10. MATERIALES — CRUD"

MAT_LIST=$(curl -s "$BASE/materials" -H "Authorization: Bearer $ENC_TOKEN")
check "ENCARGADO ve lista de materiales" "$MAT_LIST" '\[|\[\]'

NEW_MAT=$(curl -s -X POST "$BASE/materials" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"MatTest-$TS\",\"descripcion\":\"Material de prueba\",\"precio\":50.00,\"stock\":10}")
check "ADMIN crea material" "$NEW_MAT" '"id"'
NEW_MAT_ID=$(echo $NEW_MAT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',d.get('material',{}).get('id','')))" 2>/dev/null || echo "")
echo "  → Material creado id=$NEW_MAT_ID"

# Agregar material a un mantenimiento
if [ -n "$MANT_ID" ] && [ -n "$NEW_MAT_ID" ]; then
  ADD_MAT=$(curl -s -X POST "$BASE/maintenances/$MANT_ID/materials" \
    -H "Authorization: Bearer $ENC_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"material_id\":$NEW_MAT_ID,\"cantidad\":2}")
  check "ENCARGADO agrega material a mantenimiento" "$ADD_MAT" '"id"|exitoso'
fi

# ─────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────
TOTAL=$((PASS_OK + PASS_FAIL))
echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "  RESULTADO: ${GREEN}$PASS_OK OK${NC} / ${RED}$PASS_FAIL FAIL${NC} de $TOTAL pruebas"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
[ $PASS_FAIL -eq 0 ] && exit 0 || exit 1
