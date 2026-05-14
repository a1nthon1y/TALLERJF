const checkRole = (rolesPermitidos) => {
  return (req, res, next) => {
    // Evaluamos que existan datos de usuario (seteados por authMiddleware)
    if (!req.user) {
      return res.status(401).json({ message: "Sesión no válida. Inicia sesión para continuar." });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        message: `Acceso denegado: tu rol (${req.user.rol}) no tiene permisos para esta acción. Roles permitidos: ${rolesPermitidos.join(", ")}.`,
      });
    }

    next();
  };
};

module.exports = checkRole;
