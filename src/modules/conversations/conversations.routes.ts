import { Router } from 'express';
import { prisma } from '../../config/prisma';

export const conversationsRouter = Router();

conversationsRouter.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        deletions: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, profilePic: true, isOnline: true, lastSeen: true, about: true } },
        receiver: { select: { id: true, username: true, profilePic: true, isOnline: true, lastSeen: true, about: true } },
      },
    });

    const conversationMap = new Map<string, unknown>();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversationMap.has(partnerId)) {
        const partner = msg.senderId === userId ? msg.receiver : msg.sender;
        const unreadCount = await prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            status: { not: 'READ' },
          },
        });

        conversationMap.set(partnerId, {
          user: partner,
          lastMessage: {
            content: msg.content,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            mediaName: msg.mediaName,
            mediaSize: msg.mediaSize,
            duration: msg.duration,
            deletedForEveryone: msg.deletedForEveryone,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
            status: msg.status,
          },
          unreadCount,
        });
      }
    }

    res.json(Array.from(conversationMap.values()));
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});
