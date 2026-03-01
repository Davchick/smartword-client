const express = require('express');
const { prisma } = require('../../db/prisma');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

/**
 * GET /profile
 * Returns current user profile (id, email, is_premium, ai_messages_used, created_at).
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      is_premium: user.isPremium,
      ai_messages_used: user.aiMessagesUsed,
      created_at: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[profile GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /profile
 * Optional: update profile fields (e.g. for IAP / is_premium). For now only allow updating ai_messages_used from server-side; client can refetch.
 */
router.patch('/', authMiddleware, async (req, res) => {
  try {
    const { is_premium } = req.body;
    const data = {};
    if (typeof is_premium === 'boolean') data.isPremium = is_premium;

    if (Object.keys(data).length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, isPremium: true, aiMessagesUsed: true, createdAt: true },
      });
      return res.json({
        id: user.id,
        email: user.email,
        is_premium: user.isPremium,
        ai_messages_used: user.aiMessagesUsed,
        created_at: user.createdAt.toISOString(),
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, isPremium: true, aiMessagesUsed: true, createdAt: true },
    });
    res.json({
      id: updated.id,
      email: updated.email,
      is_premium: updated.isPremium,
      ai_messages_used: updated.aiMessagesUsed,
      created_at: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[profile PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
