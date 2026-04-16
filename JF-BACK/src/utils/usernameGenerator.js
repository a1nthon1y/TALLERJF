const pool = require("../config/db");

const PREPOSITIONS = new Set(["de", "del", "la", "los", "las", "van", "der", "el", "y"]);

/**
 * Normaliza un string: minúsculas, sin tildes, solo alfanumérico
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes/diacríticos
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Genera la base del username a partir del nombre completo.
 * Regla: primera letra del primer nombre + primer apellido significativo
 * Ejemplos:
 *   "Anthony Espinoza"          → "aespinoza"
 *   "María de los Ángeles Quispe" → "mquispe"
 *   "José Ramírez Huamán"       → "jramirez"
 *   "ESPINOZA"                  → "espinoza"
 */
function buildBase(nombre) {
  const words = nombre
    .trim()
    .split(/\s+/)
    .map((w) => normalize(w))
    .filter((w) => w.length > 0 && !PREPOSITIONS.has(w));

  if (words.length === 0) return "usuario";
  if (words.length === 1) return words[0];

  const firstInitial = words[0][0];          // primera letra del nombre
  const lastName = words[words.length - 1];  // último apellido significativo

  // Si el primer nombre y el apellido son iguales (ej: "Espinoza Espinoza")
  // usar dos letras del nombre
  if (words.length >= 2 && words[0] === words[words.length - 1]) {
    return words[0].slice(0, 2) + lastName;
  }

  return firstInitial + lastName;
}

/**
 * Genera un username único en la base de datos.
 * Si "aespinoza" ya existe, prueba "aespinoza2", "aespinoza3", etc.
 * @param {string} nombre  - Nombre completo del usuario
 * @param {number|null} excludeId - ID del usuario a excluir (para edición)
 * @returns {Promise<string>} username disponible
 */
async function generateUsername(nombre, excludeId = null) {
  const base = buildBase(nombre);
  let candidate = base;
  let counter = 2;

  while (true) {
    const params = excludeId
      ? [candidate, excludeId]
      : [candidate];
    const query = excludeId
      ? "SELECT id FROM usuarios WHERE username = $1 AND id != $2"
      : "SELECT id FROM usuarios WHERE username = $1";

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return candidate;

    candidate = base + counter;
    counter++;
  }
}

module.exports = { generateUsername, buildBase, normalize };
