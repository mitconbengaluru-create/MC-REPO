import { Router } from 'express';
import { prisma } from '../config/database.js';
import { broadcastSystemNotification } from '../utils/notification.util.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();
const BCRYPT_ROUNDS = 12;

// All user/policy/security routes require authentication
router.use(requireAuth);

// GET /api/users — Admins can list users (passwords excluded)
router.get('/users', requireRole(['admin', 'super-admin']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        designation: true,
        createdAt: true,
        mustChangePassword: true
        // password deliberately excluded
      }
    });
    res.status(200).json(users);
  } catch (err) {
    console.error('Error reading users from PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to read users.' });
  }
});

// POST /api/users — Only super-admin can create new accounts
router.post('/users', requireRole(['super-admin']), async (req, res) => {
  const body = req.body;
  try {
    const email = (body.email || '').trim().toLowerCase();
    if (!email.endsWith('@mitconindia.com') && !email.endsWith('@mitconcredentia.in')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email domain. Authorized organizational domains are: @mitconindia.com or @mitconcredentia.in'
      });
    }

    if (!body.name || !body.role) {
      return res.status(400).json({ success: false, message: 'Name and role are required.' });
    }

    // Generate a secure random default password (not hardcoded)
    const tempPassword = crypto.randomBytes(8).toString('hex'); // 16-char random hex
    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        id: `usr-${crypto.randomUUID()}`,
        name: body.name,
        email,
        role: body.role || "others",
        createdAt: new Date(),
        status: 'active',
        designation: body.designation || null,
        password: hashedPassword,
        mustChangePassword: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        designation: true,
        createdAt: true,
        mustChangePassword: true
      }
    });

    await broadcastSystemNotification(
      'New User Account Created',
      `${req.user.name} created a new user account for ${newUser.name} (${newUser.email}). Role: ${newUser.role.toUpperCase()}.`
    );

    // Return the temp password once so the admin can share it securely — it's hashed in DB
    res.status(200).json({ ...newUser, temporaryPassword: tempPassword });
  } catch (err) {
    console.error('Error creating user in PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// DELETE /api/users/:id — Only super-admin can delete accounts
router.delete('/users/:id', requireRole(['super-admin']), async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } }).catch(() => null);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await prisma.user.delete({ where: { id } });

    await broadcastSystemNotification(
      'User Account Revoked',
      `${req.user.name} permanently deleted user account ${target.email}.`
    );

    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting user from PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// GET /api/policies — Any authenticated user can read policies
router.get('/policies', async (req, res) => {
  try {
    let policy = await prisma.securityPolicy.findUnique({ where: { key: 'global_policy' } });
    if (!policy) {
      policy = await prisma.securityPolicy.create({
        data: {
          key: 'global_policy',
          passwordMinLength: 8,
          requireMfa: false,
          sessionTimeoutMinutes: 30,
          allowedUploadFormats: ['pdf', 'docx', 'xlsx'],
          autoRejectExpiredCheckouts: false,
          maxCheckoutDurationDays: 30
        }
      });
    }
    res.status(200).json(policy);
  } catch (err) {
    console.error('Error reading policies from PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to read policies.' });
  }
});

// PUT /api/policies — Only admins can change security policy
router.put('/policies', requireRole(['admin', 'super-admin']), async (req, res) => {
  const body = req.body;
  try {
    let policy = await prisma.securityPolicy.findUnique({ where: { key: 'global_policy' } });
    if (!policy) {
      policy = await prisma.securityPolicy.create({
        data: {
          key: 'global_policy',
          passwordMinLength: 8,
          requireMfa: false,
          sessionTimeoutMinutes: 30,
          allowedUploadFormats: ['pdf', 'docx', 'xlsx'],
          autoRejectExpiredCheckouts: false,
          maxCheckoutDurationDays: 30
        }
      });
    }

    const updatedPolicy = await prisma.securityPolicy.update({
      where: { key: 'global_policy' },
      data: {
        passwordMinLength: body.passwordMinLength ?? policy.passwordMinLength,
        requireMfa: body.requireMfa ?? policy.requireMfa,
        sessionTimeoutMinutes: body.sessionTimeoutMinutes ?? policy.sessionTimeoutMinutes,
        allowedUploadFormats: body.allowedUploadFormats ?? policy.allowedUploadFormats,
        autoRejectExpiredCheckouts: body.autoRejectExpiredCheckouts ?? policy.autoRejectExpiredCheckouts,
        maxCheckoutDurationDays: body.maxCheckoutDurationDays ?? policy.maxCheckoutDurationDays
      }
    });

    res.status(200).json(updatedPolicy);
  } catch (err) {
    console.error('Error updating policies in PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to update policies.' });
  }
});

export default router;
