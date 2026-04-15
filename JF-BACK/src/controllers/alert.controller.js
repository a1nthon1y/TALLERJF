const pool = require("../config/db");

// 🔹 Obtener todas las alertas activas
const getActiveAlerts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.id, u.placa, cp.nombre AS parte, a.mensaje, a.estado, a.unidad_id, a.parte_id
            FROM alertas_mantenimiento a 
            JOIN unidades u ON a.unidad_id = u.id 
            JOIN configuracion_partes cp ON a.parte_id = cp.id 
            WHERE a.estado = 'ACTIVO'
            ORDER BY a.id DESC`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔹 Resolver una alerta
const resolveAlert = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE alertas_mantenimiento SET estado = 'RESUELTO' WHERE id = $1 RETURNING id",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Alerta no encontrada" });
        res.status(200).json({ message: "Alerta resuelta" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getActiveAlerts,
    resolveAlert,
};
