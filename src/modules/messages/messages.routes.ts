import { Router } from 'express';
import { prisma } from '../../config/prisma';

export const messagesRouter = Router();

messagesRouter.get('/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    await prisma.message.updateMany({
      where: { senderId: user2, receiverId: user1, status: { not: 'READ' } },
      data: { status: 'READ' },
    });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 },
        ],
        deletions: {
          none: { userId: user1 },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

messagesRouter.post('/', async (req, res) => {
  const {
    senderId,
    receiverId,
    content,
    type,
    mediaUrl,
    mediaName,
    mediaSize,
    duration,
  } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: 'senderId and receiverId are required' });
  }

  if (!content && !mediaUrl) {
    return res.status(400).json({ error: 'content or mediaUrl is required' });
  }

  try {
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: content || '',
        type: type || 'text',
        mediaUrl,
        mediaName,
        mediaSize,
        duration,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

messagesRouter.delete('/:messageId/for-me', async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || (message.senderId !== userId && message.receiverId !== userId)) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: {},
      create: { messageId, userId },
    });

    res.json({ success: true, messageId, deletedFor: userId });
  } catch (error) {
    console.error('Delete for me error:', error);
    res.status(500).json({ error: 'Failed to delete message for me' });
  }
});

messagesRouter.delete('/:messageId/for-everyone', async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) {
      return res.status(403).json({ error: 'Only sender can delete this message for everyone' });
    }

    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message was deleted',
        mediaUrl: null,
        mediaName: null,
        mediaSize: null,
        duration: null,
        deletedForEveryone: true,
        deletedAt: new Date(),
      },
    });

    res.json(deletedMessage);
  } catch (error) {
    console.error('Delete for everyone error:', error);
    res.status(500).json({ error: 'Failed to delete message for everyone' });
  }
});
