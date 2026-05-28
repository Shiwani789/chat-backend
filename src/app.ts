import cors from 'cors';
import express from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { callsRouter } from './modules/calls/calls.routes';
import { conversationsRouter } from './modules/conversations/conversations.routes';
import { messagesRouter } from './modules/messages/messages.routes';
import { statusRouter } from './modules/status/status.routes';
import { usersRouter } from './modules/users/users.routes';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'whatsapp-clone-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/status', statusRouter);
app.use('/api/calls', callsRouter);
