import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Intercepts Socket.IO handshake request to perform real JWT token authentication.
 * 
 * @function socketAuthMiddleware
 * @param {import('socket.io').Socket} socket - Socket instance
 * @param {function} next - Callback function
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    // Extract token from handshake auth, query, or Authorization header
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    if (!token) {
      return next(new Error('Authentication error: Token missing.'));
    }

    // Verify the real signed JWT
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }

    // Load the user from DB to verify account is still active
    const { prisma } = await import('../config/database.js');
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, role: true, status: true }
    });

    if (!user || user.status !== 'active') {
      return next(new Error('Authentication error: User account not found or deactivated.'));
    }

    // Bind authentication context to socket session
    socket.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: null,
    };

    next();
  } catch (err) {
    console.error('[SocketAuth] Handshake error:', err);
    next(new Error('Authentication error: Internal validation failure.'));
  }
}

export default socketAuthMiddleware;
