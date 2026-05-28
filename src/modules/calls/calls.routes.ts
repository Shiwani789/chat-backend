import { Router } from 'express';
import { prisma } from '../../config/prisma';

export const callsRouter = Router();

callsRouter.post('/', async (req, res) => {
  const { callerId, receiverId, type, status, duration } = req.body;

  if (!callerId || !receiverId) {
    return res.status(400).json({ error: 'callerId and receiverId are required' });
  }

  try {
    const callLog = await prisma.callLog.create({
      data: {
        callerId,
        receiverId,
        type: type || 'voice',
        status: status || 'missed',
        duration: duration || 0,
      },
      include: {
        caller: { select: { id: true, username: true, profilePic: true } },
        receiver: { select: { id: true, username: true, profilePic: true } },
      },
    });
    res.json(callLog);
  } catch (error) {
    console.error('Create call log error:', error);
    res.status(500).json({ error: 'Failed to create call log' });
  }
});

callsRouter.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const calls = await prisma.callLog.findMany({
      where: {
        OR: [{ callerId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        caller: { select: { id: true, username: true, profilePic: true } },
        receiver: { select: { id: true, username: true, profilePic: true } },
      },
    });
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});
