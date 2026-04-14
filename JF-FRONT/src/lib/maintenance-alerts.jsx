/**
 * @typedef {Object} MaintenancePart
 * @property {string} id - ID único de la parte
 * @property {string} name - Nombre de la parte
 * @property {number} maintenanceInterval - Intervalo en kilómetros
 * @property {string} description - Descripción de la parte
 * @property {number} lastMaintenanceKm - Último mantenimiento en km
 * @property {string} unitId - ID de la unidad
 * @property {string} unitPlate - Placa de la unidad
 * @property {number} unitCurrentKm - Kilometraje actual de la unidad
 */

/**
 * Determina si una parte necesita mantenimiento
 * @param {MaintenancePart} part - Parte a evaluar
 * @returns {boolean} - Verdadero si necesita mantenimiento
 */
export function needsMaintenance(part) {
  const kmSinceLastMaintenance = part.unitCurrentKm - part.lastMaintenanceKm
  return kmSinceLastMaintenance >= part.maintenanceInterval
}

/**
 * Calcula el porcentaje de vida útil restante de una parte
 * @param {MaintenancePart} part - Parte a evaluar
 * @returns {number} - Porcentaje de vida útil restante
 */
export function remainingLifePercentage(part) {
  const kmSinceLastMaintenance = part.unitCurrentKm - part.lastMaintenanceKm
  const percentage = 100 - (kmSinceLastMaintenance / part.maintenanceInterval) * 100
  return Math.max(0, Math.min(100, percentage))
}

/**
 * Obtiene el estado de la parte (crítico, advertencia, normal)
 * @param {MaintenancePart} part - Parte a evaluar
 * @returns {"critical" | "warning" | "normal"} - Estado de la parte
 */
export function getPartStatus(part) {
  const percentage = remainingLifePercentage(part)
  if (percentage <= 10) return "critical"
  if (percentage <= 25) return "warning"
  return "normal"
}

// Datos de ejemplo para las partes que requieren mantenimiento
export const vehicleParts = [
  {
    id: "1",
    name: "Motor",
    maintenanceInterval: 5000,
    description: "Cambio de aceite y revisión general del motor",
    lastMaintenanceKm: 40000,
    unitId: "1",
    unitPlate: "ABC-123",
    unitCurrentKm: 44800, // Casi necesita mantenimiento (90% usado)
  },
  {
    id: "2",
    name: "Frenos",
    maintenanceInterval: 10000,
    description: "Revisión y cambio de pastillas de freno",
    lastMaintenanceKm: 35000,
    unitId: "1",
    unitPlate: "ABC-123",
    unitCurrentKm: 44800, // Necesita mantenimiento
  },
  {
    id: "3",
    name: "Transmisión",
    maintenanceInterval: 20000,
    description: "Revisión y cambio de aceite de transmisión",
    lastMaintenanceKm: 30000,
    unitId: "2",
    unitPlate: "XYZ-789",
    unitCurrentKm: 78000, // Necesita mantenimiento urgente
  },
  {
    id: "4",
    name: "Filtro de aire",
    maintenanceInterval: 15000,
    description: "Cambio de filtro de aire",
    lastMaintenanceKm: 70000,
    unitId: "2",
    unitPlate: "XYZ-789",
    unitCurrentKm: 78000, // Necesita mantenimiento
  },
  {
    id: "5",
    name: "Sistema de refrigeración",
    maintenanceInterval: 30000,
    description: "Revisión y cambio de líquido refrigerante",
    lastMaintenanceKm: 65000,
    unitId: "3",
    unitPlate: "DEF-456",
    unitCurrentKm: 32000, // Normal
  },
]

/**
 * Obtiene todas las partes que necesitan mantenimiento
 * @returns {MaintenancePart[]} - Array de partes que necesitan mantenimiento
 */
export function getMaintenanceAlerts() {
  return vehicleParts.filter((part) => needsMaintenance(part))
}

/**
 * Obtiene partes que están próximas a necesitar mantenimiento (menos del 25% de vida útil)
 * @returns {MaintenancePart[]} - Array de partes próximas a necesitar mantenimiento
 */
export function getUpcomingMaintenanceAlerts() {
  return vehicleParts.filter((part) => {
    const percentage = remainingLifePercentage(part)
    return percentage <= 25 && percentage > 0
  })
}

