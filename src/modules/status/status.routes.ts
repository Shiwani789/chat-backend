import { Router } from 'express';
import { prisma } from '../../config/prisma';

export const statusRouter = Router();

statusRouter.post('/', async (req, res) => {
  const { userId, content, mediaUrl, type, bgColor } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const status = await prisma.status.create({
      data: {
        userId,
        content,
        mediaUrl,
        type: type || 'text',
        bgColor: bgColor || '#075E54',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      include: {
        user: { select: { id: true, username: true, profilePic: true } },
      },
    });
    res.json(status);
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

statusRouter.get('/', async (_req, res) => {
  try {
    const statuses = await prisma.status.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, profilePic: true } },
        views: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    const grouped = new Map<string, { user: unknown; statuses: typeof statuses }>();
    for (const status of statuses) {
      if (!grouped.has(status.userId)) {
        grouped.set(status.userId, {
          user: status.user,
          statuses: [],
        });
      }
      grouped.get(status.userId)?.statuses.push(status);
    }

    res.json(Array.from(grouped.values()));
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

statusRouter.post('/:statusId/view', async (req, res) => {
  const { statusId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    await prisma.statusView.upsert({
      where: {
        statusId_userId: { statusId, userId },
      },
      update: {},
      create: { statusId, userId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Record status view error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});
