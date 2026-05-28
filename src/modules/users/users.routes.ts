import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { errorResponse } from '../../utils/errorResponse';

export const usersRouter = Router();

usersRouter.post('/', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.create({ data: { username } });
    }
    res.json(user);
  } catch (error) {
    console.error('User upsert error:', error);
    res.status(500).json(errorResponse('Failed to process user', error));
  }
});

usersRouter.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        phone: true,
        about: true,
        profilePic: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json(errorResponse('Failed to fetch users', error));
  }
});

usersRouter.get('/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        username: true,
        phone: true,
        about: true,
        profilePic: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json(errorResponse('Failed to fetch user', error));
  }
});

usersRouter.put('/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { username, about, profilePic } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(about !== undefined && { about }),
        ...(profilePic !== undefined && { profilePic }),
      },
    });
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json(errorResponse('Failed to update profile', error));
  }
});

usersRouter.put('/:userId/fcm-token', async (req, res) => {
  const { userId } = req.params;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'fcmToken is required' });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('FCM token update error:', error);
    res.status(500).json(errorResponse('Failed to update FCM token', error));
  }
});
