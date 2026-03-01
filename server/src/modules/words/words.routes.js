const express = require('express');
const { prisma } = require('../../db/prisma');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /words?groupId=...
 * List words for current user, optional filter by groupId. Order by createdAt desc.
 */
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query;
    const where = { userId: req.user.id };
    if (groupId && typeof groupId === 'string') where.groupId = groupId;

    const words = await prisma.word.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      words.map((w) => ({
        id: w.id,
        group_id: w.groupId,
        user_id: w.userId,
        original: w.original,
        translation: w.translation,
        correct_count: w.correctCount,
        last_reviewed: w.lastReviewed ? w.lastReviewed.toISOString() : null,
        created_at: w.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error('[words GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /words
 * Body: { original, translation, group_id }
 */
router.post('/', async (req, res) => {
  try {
    const { original, translation, group_id: groupId } = req.body;
    if (!original || typeof original !== 'string' || !translation || typeof translation !== 'string') {
      return res.status(400).json({ error: 'original and translation are required' });
    }
    if (groupId) {
      const group = await prisma.wordGroup.findFirst({
        where: { id: groupId, userId: req.user.id },
      });
      if (!group) {
        return res.status(400).json({ error: 'Group not found' });
      }
    }
    const word = await prisma.word.create({
      data: {
        userId: req.user.id,
        groupId: groupId || null,
        original: original.trim(),
        translation: translation.trim(),
      },
    });
    res.status(201).json({
      id: word.id,
      group_id: word.groupId,
      user_id: word.userId,
      original: word.original,
      translation: word.translation,
      correct_count: word.correctCount,
      last_reviewed: word.lastReviewed ? word.lastReviewed.toISOString() : null,
      created_at: word.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[words POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /words/:id
 * Body: { original, translation }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { original, translation } = req.body;
    const existing = await prisma.word.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }
    const data = {};
    if (typeof original === 'string') data.original = original.trim();
    if (typeof translation === 'string') data.translation = translation.trim();
    const updated = await prisma.word.update({
      where: { id },
      data,
    });
    res.json({
      id: updated.id,
      group_id: updated.groupId,
      user_id: updated.userId,
      original: updated.original,
      translation: updated.translation,
      correct_count: updated.correctCount,
      last_reviewed: updated.lastReviewed ? updated.lastReviewed.toISOString() : null,
      created_at: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[words PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /words/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.word.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }
    await prisma.word.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('[words DELETE]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /words/:id/progress
 * Body: { knew: boolean, correctDelta?: number, incorrectDelta?: number }
 */
router.post('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { knew, correctDelta = 1, incorrectDelta = -1 } = req.body;
    const existing = await prisma.word.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }
    const delta = knew ? Number(correctDelta) : Number(incorrectDelta);
    const newCount = Math.max(0, existing.correctCount + delta);
    const updated = await prisma.word.update({
      where: { id },
      data: {
        correctCount: newCount,
        lastReviewed: new Date(),
      },
    });
    res.json({
      id: updated.id,
      correct_count: updated.correctCount,
      last_reviewed: updated.lastReviewed.toISOString(),
    });
  } catch (err) {
    console.error('[words POST progress]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
