const express = require('express');
const { prisma } = require('../../db/prisma');
const { authMiddleware } = require('../../middleware/auth');
const { env } = require('../../config/env');

const router = express.Router();

const FREE_MESSAGES_LIMIT = 999999;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'arcee-ai/trinity-large-preview:free';

async function callOpenRouter(messages, maxTokens = 300, temperature = 0.85) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://smartword.app',
      'X-Title': 'SmartWord',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * POST /chat/translate
 * Body: { text }
 * Returns: { result }
 */
router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const prompt = `Translate the following text into Russian. Return ONLY the translation, no explanations, no quotes:\n\n${text}`;
    const result = await callOpenRouter([{ role: 'user', content: prompt }], 200, 0.5);
    res.json({ result: result.trim() });
  } catch (err) {
    console.error('[chat/translate]', err);
    res.status(502).json({ error: 'AI service error' });
  }
});

/**
 * POST /chat/hint
 * Body: { text }
 * Returns: { result }
 */
router.post('/hint', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const prompt = `The user is learning a foreign language and doesn't know how to respond to this message:\n\n"${text}"\n\nWrite 2-3 short natural reply suggestions. CRITICAL RULES:\n- Use EXACTLY the same language, dialect, and style as the message above. If the message is in American English slang — reply in American English slang. If Arabic — reply in Arabic. If French — reply in French. Zero exceptions.\n- Never use Russian or any other language not present in the message.\n- Match the tone and register precisely (casual, formal, slang, etc.).\n- Keep each suggestion to one short sentence.\n- Format as a numbered list (1. 2. 3.). No explanations, no translations.`;
    const result = await callOpenRouter([{ role: 'user', content: prompt }], 200, 0.5);
    res.json({ result: result.trim() });
  } catch (err) {
    console.error('[chat/hint]', err);
    res.status(502).json({ error: 'AI service error' });
  }
});

/**
 * POST /chat
 * Body: { messages, group_id?, group_name? }
 * Returns: { reply, messages_used } or 403 { error: "limit_reached", used }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { messages, group_id: groupId, group_name: groupName } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isPremium: true, aiMessagesUsed: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isPremium && user.aiMessagesUsed >= FREE_MESSAGES_LIMIT) {
      return res.status(403).json({
        error: 'limit_reached',
        used: user.aiMessagesUsed,
      });
    }

    const wordsWhere = { userId: req.user.id };
    if (groupId) wordsWhere.groupId = groupId;
    const words = await prisma.word.findMany({
      where: wordsWhere,
      orderBy: { correctCount: 'asc' },
      take: 40,
      select: { original: true, translation: true },
    });
    const hasWords = words.length > 0;

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const lastContent = lastUserMsg?.content ?? '';
    const isFreeChat = lastContent.includes('Свободное общение');

    let systemPrompt;
    if (isFreeChat || !hasWords) {
      systemPrompt = `You are Lexi — a real person who loves chatting with people from around the world.

The user has chosen free conversation mode.

FIRST MESSAGE ONLY: Ask in Russian which language they want to practice. One short casual question, nothing more. Example: "Какой язык хочешь практиковать?"

AFTER THEY NAME A LANGUAGE — ABSOLUTE RULES, NO EXCEPTIONS:
1. Switch to that language IMMEDIATELY and PERMANENTLY.
2. NEVER write in Russian again — not a single word, not even a greeting, not even punctuation markers.
3. If the user writes in Russian — IGNORE the Russian and reply ONLY in the chosen language. Do not acknowledge they wrote in Russian.
4. This applies to ALL languages: English, Arabic (العربية), Chinese, Japanese, French, Spanish, German, Turkish, Korean — any language at all.
5. For Arabic: write in Modern Standard Arabic or the dialect the user prefers. Never switch to English.
6. Be a genuinely engaging conversation partner. Ask about their life, plans, opinions.
7. Keep replies to 1-3 sentences. One question per message.
8. Match their energy and tone.
9. Never correct grammar. Just chat naturally like a human.
10. Never say "Let's practice!", "Great job!", "I'm an AI".`;
    } else {
      const wordPairs = words.map((w) => `${w.original} / ${w.translation}`).join(', ');
      const sampleOriginals = words.slice(0, 5).map((w) => w.original).join(' ');
      let detectedLanguage = 'English';
      if (/[\u4e00-\u9fff]/.test(sampleOriginals)) detectedLanguage = 'Chinese';
      else if (/[\u3040-\u30ff]/.test(sampleOriginals)) detectedLanguage = 'Japanese';
      else if (/[\u0600-\u06ff]/.test(sampleOriginals)) detectedLanguage = 'Arabic';
      else if (/[\u00C0-\u024F]/.test(sampleOriginals)) detectedLanguage = 'French or Spanish or another Romance language — detect precisely from the words';
      else if (/[a-zA-Z]/.test(sampleOriginals)) detectedLanguage = 'English';

      const langFromGroup = groupName ? groupName.replace(/[«»"']/g, '').trim() : null;
      const targetLanguage = langFromGroup || detectedLanguage;

      systemPrompt = `You are Lexi — a real person texting with the user. Not a teacher, not a bot. Just a native ${targetLanguage} speaker who enjoys good conversation.

LANGUAGE RULE — ABSOLUTE: Every single message in ${targetLanguage} only. Never Russian, never any other language, even if the user writes in Russian. No exceptions whatsoever. If the user writes in Russian — reply in ${targetLanguage} only, as if you didn't notice.

For Arabic (if ${targetLanguage} is Arabic): write in Arabic script only. Never transliterate. Never use English.

NO EMOJIS. Ever.

User vocabulary (background context only):
${wordPairs}

VOCABULARY RULE: These words are just a reference. Only use a word if it would come up completely naturally in real conversation. Never force a word. Naturalness wins over everything.

CONVERSATION RULES:
- Be genuinely engaging. Follow the user's lead.
- 1-3 sentences per message. One question max.
- Match their tone and energy.
- Never correct grammar. Never say "Great job!". Just talk like a human.`;
    }

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const reply = await callOpenRouter(openRouterMessages, 300, 0.85);

    const newCount = (user.aiMessagesUsed ?? 0) + 1;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { aiMessagesUsed: newCount },
    });

    res.json({ reply: reply || '...', messages_used: newCount });
  } catch (err) {
    console.error('[chat POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
