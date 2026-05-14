const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Acceso denegado: falta el token de autenticación." });
  }

  try {
    const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    // Tokens inválidos/expirados deben ser 401 (no autorizado), no 400 (bad request).
    // Esto permite al frontend distinguir "tu sesión expiró" de "los datos están mal".
    const reason = error?.name === "TokenExpiredError"
      ? "Tu sesión expiró. Vuelve a iniciar sesión."
      : "Token inválido. Vuelve a iniciar sesión.";
    res.status(401).json({ message: reason });
  }
};

module.exports = authMiddleware;
