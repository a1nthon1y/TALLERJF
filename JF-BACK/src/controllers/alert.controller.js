const pool = require("../config/db");

// 🔹 Obtener todas las alertas activas
const getActiveAlerts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.id, u.placa, p.nombre AS parte, a.mensaje, a.estado 
            FROM alertas_mantenimiento a 
            JOIN unidades u ON a.unidad_id = u.id 
            JOIN partes_unidades p ON a.parte_id = p.id 
            WHERE a.estado = 'ACTIVO'`
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
        await pool.query("UPDATE alertas_mantenimiento SET estado = 'RESUELTO' WHERE id = $1", [id]);
        res.status(200).json({ message: "Alerta resuelta" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getActiveAlerts,
    resolveAlert,
};
