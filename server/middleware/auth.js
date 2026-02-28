const jwt = require('jsonwebtoken');

function _getTokenFromHeader(req) {
  const header = req.headers.authorization || req.headers['x-access-token'];
  if (!header) return null;
  return header.startsWith('Bearer ') ? header.split(' ')[1] : header;
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    return next();
  };
}

function requireAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    return next();
  };
}

module.exports = { verifyToken, requireRole, requireAnyRole };