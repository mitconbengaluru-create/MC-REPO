import { Router } from 'express';
import { prisma } from '../config/database.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const matchedUser = await prisma.user.findUnique({ where: { email } });

  if (!matchedUser) {
    return res.status(401).json({ message: "No organizational records found matching this email address." });
  }

  // In development / demo mode, accept standard dev passwords or DEV_PASSWORD environment variable
  const devPassword = process.env.DEV_PASSWORD || 'password123';
  const isDevAuth = process.env.NODE_ENV !== 'production';

  if (isDevAuth) {
    const isPassValid = password === devPassword || password === 'admin';
    if (!isPassValid) {
      return res.status(401).json({ message: "Invalid credentials entered." });
    }
  }

  return res.status(200).json({
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      status: matchedUser.status,
      designation: matchedUser.designation
    },
    token: `mock-jwt-token-for-${matchedUser.email}`
  });
});

export default router;
