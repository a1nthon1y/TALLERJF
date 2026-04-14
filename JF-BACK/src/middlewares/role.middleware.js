const checkRole = (rolesPermitidos) => {
  return (req, res, next) => {
    // Evaluamos que existan datos de usuario (seteados por authMiddleware)
    if (!req.user) {
      return res.status(401).json({ error: "No autorizado. Inicie sesión." });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: "Acceso denegado. No tienes permisos para realizar esta acción." });
    }

    next();
  };
};

module.exports = checkRole;
