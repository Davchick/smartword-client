const express = require('express');
const { prisma } = require('../../db/prisma');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LEARNED_THRESHOLD = 5;

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

/**
 * GET /stats
 * Returns totalWords, learnedWords (correct_count >= 5), currentStreak, weekActivity.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const words = await prisma.word.findMany({
      where: { userId: req.user.id },
      select: { correctCount: true, lastReviewed: true },
    });

    const allWords = words.map((w) => ({
      correct_count: w.correctCount,
      last_reviewed: w.lastReviewed ? w.lastReviewed.toISOString() : null,
    }));

    const totalWords = allWords.length;
    const learnedWords = allWords.filter((w) => w.correct_count >= LEARNED_THRESHOLD).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const activeDays = new Set();
    for (const w of allWords) {
      if (w.last_reviewed) {
        const d = new Date(w.last_reviewed);
        d.setHours(0, 0, 0, 0);
        activeDays.add(toDateStr(d));
      }
    }

    const weekActivity = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = toDateStr(day);
      const todayStr = toDateStr(today);
      weekActivity.push({
        date: dateStr,
        dayLabel: DAY_LABELS[day.getDay()],
        hasActivity: activeDays.has(dateStr),
        isFuture: day > today,
        isToday: dateStr === todayStr,
      });
    }

    let streak = 0;
    const cursor = new Date(today);
    while (true) {
      const dateStr = toDateStr(cursor);
      if (activeDays.has(dateStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({
      totalWords,
      learnedWords,
      currentStreak: streak,
      weekActivity,
    });
  } catch (err) {
    console.error('[stats GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
