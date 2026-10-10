const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AdminUser, ActivityLog } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!EMAIL_RE.test(email) || email.length > 100 || password.length > 200) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  if (!process.env.JWT_SECRET) {
    // Fail loudly in server logs rather than signing a token nobody can
    // verify (or, worse, a hardcoded fallback secret making every deploy
    // share the same key).
    throw new Error('JWT_SECRET is not configured.');
  }

  const user = await AdminUser.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (user) {
      await ActivityLog.create({ adminUserId: user.id, action: 'LOGIN_FAILED', details: `Failed login attempt for ${email}` });
    }
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  await ActivityLog.create({ adminUserId: user.id, action: 'LOGIN', details: `${user.email} logged in` });

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
}));

module.exports = router;
