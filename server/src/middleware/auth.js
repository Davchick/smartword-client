const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { prisma } = require('../db/prisma');

/**
 * Проверяет Authorization: Bearer <access_token>, верифицирует JWT,
 * загружает пользователя из БД и кладёт в req.user.
 * При ошибке возвращает 401.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (!decoded.sub || decoded.sub !== decoded.userId) {
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token payload' });
    }
  }

  const userId = decoded.userId || decoded.sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPremium: true, aiMessagesUsed: true, createdAt: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
  }

  req.user = user;
  next();
}

module.exports = { authMiddleware };
