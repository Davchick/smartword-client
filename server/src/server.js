const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const authRouter = require('./modules/auth/auth.routes');
const profileRouter = require('./modules/profile/profile.routes');
const groupsRouter = require('./modules/groups/groups.routes');
const wordsRouter = require('./modules/words/words.routes');
const statsRouter = require('./modules/stats/stats.routes');
const chatRouter = require('./modules/chat/chat.routes');

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/groups', groupsRouter);
app.use('/words', wordsRouter);
app.use('/stats', statsRouter);
app.use('/chat', chatRouter);

const port = env.port;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${port}`);
});

