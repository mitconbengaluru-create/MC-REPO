import { Router } from 'express';
import { prisma } from '../config/database.js';
import { broadcastSystemNotification } from '../utils/notification.util.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const router = Router();
const BCRYPT_ROUNDS = 12;

// Status endpoint
router.get('/login', (req, res) => {
  return res.status(200).json({
    status: 'ACTIVE',
    endpoint: '/api/auth/login',
    supportedMethods: ['POST'],
    message: 'Authentication API endpoint is active.'
  });
});

// LOGIN — rate-limited to 5 attempts per 15 min per IP
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email address and password are required.' });
    }

    const matchedUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!matchedUser) {
      // Intentionally vague — prevents user enumeration
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (matchedUser.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is disabled. Contact your administrator.' });
    }

    // Verify password against bcrypt hash
    let passwordValid = false;
    if (matchedUser.password) {
      // Check if stored password is already a bcrypt hash
      const isBcryptHash = matchedUser.password.startsWith('$2b$') || matchedUser.password.startsWith('$2a$');
      if (isBcryptHash) {
        passwordValid = await bcrypt.compare(password, matchedUser.password);
      } else {
        // Legacy plaintext password — validate then upgrade to hash
        if (password === matchedUser.password) {
          passwordValid = true;
          // Transparently upgrade to bcrypt hash on successful login
          const hashedPwd = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await prisma.user.update({
            where: { id: matchedUser.id },
            data: { password: hashedPwd }
          });
        }
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Determine if forced password change is required
    const requiresPasswordChange = matchedUser.mustChangePassword === true;

    // Issue a signed JWT
    const token = jwt.sign(
      { sub: matchedUser.id, email: matchedUser.email, role: matchedUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry || '8h' }
    );

    // Broadcast system notification
    await broadcastSystemNotification(
      'User Sign-In Alert',
      `${matchedUser.name} (${matchedUser.email}) logged into MITCON Credentia vault.`
    );

    return res.status(200).json({
      success: true,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        status: matchedUser.status,
        designation: matchedUser.designation,
        mustChangePassword: requiresPasswordChange
      },
      token
    });
  } catch (err) {
    console.error('[Auth Login Fatal Error]:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Authentication service failure. Please check backend configuration.' 
    });
  }
});

// LOGOUT — requires valid session
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const operatorName = req.user?.name || 'Staff Member';
    await broadcastSystemNotification(
      'User Sign-Out Alert',
      `${operatorName} (${req.user?.email}) signed out of the system.`
    );
    return res.status(200).json({ success: true, message: 'Signed out successfully.' });
  } catch (err) {
    return res.status(200).json({ success: true });
  }
});

// CHANGE PASSWORD — requires valid session; user can only change their own password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body || {};
    const userId = req.user.id; // Always from the authenticated token — never from body

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    const policy = await prisma.securityPolicy.findUnique({ where: { key: 'global_policy' } }).catch(() => null);
    const minLength = policy?.passwordMinLength || 8;

    if (newPassword.length < minLength) {
      return res.status(400).json({ success: false, message: `New password must be at least ${minLength} characters long.` });
    }

    // Additional strength requirements
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one letter and one number.' });
    }

    // Verify current password if the account is not in forced-change mode
    if (!req.user.mustChangePassword && currentPassword) {
      const isBcryptHash = req.user.password?.startsWith('$2b$') || req.user.password?.startsWith('$2a$');
      let currentValid = false;
      if (isBcryptHash) {
        currentValid = await bcrypt.compare(currentPassword, req.user.password);
      } else {
        currentValid = currentPassword === req.user.password;
      }
      if (!currentValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    // Hash the new password
    const hashedNew = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNew,
        mustChangePassword: false
      }
    });

    // Issue a fresh token so the user doesn't need to re-login
    const newToken = jwt.sign(
      { sub: updated.id, email: updated.email, role: updated.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry || '8h' }
    );

    await broadcastSystemNotification(
      'Password Changed',
      `Account password was updated for user ${updated.name} (${updated.email}).`
    );

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      token: newToken,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        designation: updated.designation,
        mustChangePassword: false
      }
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

export default router;
