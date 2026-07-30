import { prisma } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Express middleware protecting endpoints against unauthenticated requests.
 * Verifies a real signed JWT issued at login. No fallbacks, no mock tokens.
 */
export async function requireAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: 'Access token is missing.' });
    }

    // Verify the JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }

    // Load the user from DB (ensures account still active/exists)
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Express middleware protecting endpoints against revoked session tokens.
 */
export async function requireSession(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ success: false, message: 'No active session.' });
}

/**
 * Express middleware restricting route endpoints to designated access roles.
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({ success: false, message: 'Forbidden: no role assigned.' });
    }
    // super-admin always has access
    if (userRole === 'super-admin') return next();
    // Check if user's role is in the allowed list
    if (allowedRoles.includes(userRole)) return next();
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
  };
}

/**
 * Express middleware restricting routes to matching permission specifications.
 */
export function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (userRole === 'super-admin' || userRole === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
  };
}

export default {
  requireAuth,
  requireSession,
  requireRole,
  requirePermission,
};
