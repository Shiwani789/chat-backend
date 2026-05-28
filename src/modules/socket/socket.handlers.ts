import { Server } from 'socket.io';
import { prisma } from '../../config/prisma';
import { sendPushToUser } from '../notifications/notification.service';

type SendMessagePayload = {
  senderId: string;
  receiverId: string;
  content?: string;
  type?: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  duration?: number;
};

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('register', async (userId: string) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { socketId: socket.id, isOnline: true, lastSeen: new Date() },
        });
        socket.broadcast.emit('user-online', { userId, isOnline: true });
      } catch (error) {
        console.error('Error registering user socket:', error);
      }
    });

    socket.on('send-message', async (data: SendMessagePayload) => {
      try {
        if (!data.senderId || !data.receiverId || (!data.content && !data.mediaUrl)) {
          socket.emit('message-error', { error: 'senderId, receiverId, and content or mediaUrl are required' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            content: data.content || '',
            senderId: data.senderId,
            receiverId: data.receiverId,
            type: data.type || 'text',
            mediaUrl: data.mediaUrl,
            mediaName: data.mediaName,
            mediaSize: data.mediaSize,
            duration: data.duration,
          },
        });

        const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } });
        let outgoingMessage = message;

        const sender = await prisma.user.findUnique({
          where: { id: data.senderId },
          select: { username: true },
        });

        if (receiver?.socketId) {
          outgoingMessage = await prisma.message.update({
            where: { id: message.id },
            data: { status: 'DELIVERED' },
          });

          io.to(receiver.socketId).emit('receive-message', {
            ...outgoingMessage,
            senderName: sender?.username,
          });
        }

        await sendPushToUser(data.receiverId, {
          title: sender?.username || 'New message',
          body: getMessagePreview(data.type || 'text', data.content),
          data: {
            type: 'message',
            chatUserId: data.senderId,
            senderId: data.senderId,
            receiverId: data.receiverId,
            messageId: outgoingMessage.id,
          },
        });

        socket.emit('message-sent', outgoingMessage);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('delete-message-for-me', async (data: { messageId: string; userId: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message || (message.senderId !== data.userId && message.receiverId !== data.userId)) {
          socket.emit('message-error', { error: 'Message not found' });
          return;
        }

        await prisma.messageDeletion.upsert({
          where: { messageId_userId: { messageId: data.messageId, userId: data.userId } },
          update: {},
          create: { messageId: data.messageId, userId: data.userId },
        });

        socket.emit('message-deleted-for-me', { messageId: data.messageId });
      } catch (error) {
        console.error('Delete message for me error:', error);
      }
    });

    socket.on('delete-message-for-everyone', async (data: { messageId: string; userId: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message || message.senderId !== data.userId) {
          socket.emit('message-error', { error: 'Only sender can delete this message for everyone' });
          return;
        }

        const deletedMessage = await prisma.message.update({
          where: { id: data.messageId },
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

        socket.emit('message-deleted-for-everyone', deletedMessage);
        await emitToUser(message.receiverId, 'message-deleted-for-everyone', deletedMessage);
      } catch (error) {
        console.error('Delete message for everyone error:', error);
      }
    });

    socket.on('messages-read', async (data: { senderId: string; receiverId: string }) => {
      try {
        await prisma.message.updateMany({
          where: { senderId: data.senderId, receiverId: data.receiverId, status: { not: 'READ' } },
          data: { status: 'READ' },
        });

        const sender = await prisma.user.findUnique({ where: { id: data.senderId } });
        if (sender?.socketId) {
          io.to(sender.socketId).emit('messages-read-update', { receiverId: data.receiverId });
        }
      } catch (error) {
        console.error('Error marking messages read:', error);
      }
    });

    socket.on('typing-start', async (data: { senderId: string; receiverId: string }) => {
      await emitToUser(data.receiverId, 'typing-start', { senderId: data.senderId });
    });

    socket.on('typing-stop', async (data: { senderId: string; receiverId: string }) => {
      await emitToUser(data.receiverId, 'typing-stop', { senderId: data.senderId });
    });

    socket.on('call-user', async (data: { callerId: string; userToCallId: string; signalData: unknown; callerName?: string; callType?: string }) => {
      try {
        const userToCall = await prisma.user.findUnique({ where: { id: data.userToCallId } });
        const caller = await prisma.user.findUnique({ where: { id: data.callerId } });

        if (userToCall?.socketId) {
          io.to(userToCall.socketId).emit('incoming-call', {
            callerId: data.callerId,
            callerName: caller?.username || data.callerName,
            signalData: data.signalData,
            callType: data.callType || 'video',
          });
        }

        await sendPushToUser(data.userToCallId, {
          title: caller?.username || 'Incoming call',
          body: `${data.callType === 'voice' ? 'Voice' : 'Video'} call`,
          data: {
            type: 'call',
            callType: data.callType || 'video',
            callerId: data.callerId,
            callerName: caller?.username || data.callerName || 'Unknown',
          },
        });

        await prisma.callLog.create({
          data: {
            callerId: data.callerId,
            receiverId: data.userToCallId,
            type: data.callType || 'video',
            status: 'outgoing',
          },
        });
      } catch (error) {
        console.error('Error calling user:', error);
      }
    });

    socket.on('answer-call', async (data: { answererId: string; callerId: string; signalData: unknown }) => {
      try {
        await emitToUser(data.callerId, 'call-accepted', {
          signalData: data.signalData,
          answererId: data.answererId,
        });

        const callLog = await prisma.callLog.findFirst({
          where: { callerId: data.callerId, receiverId: data.answererId },
          orderBy: { createdAt: 'desc' },
        });

        if (callLog) {
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: { status: 'answered' },
          });
        }
      } catch (error) {
        console.error('Error answering call:', error);
      }
    });

    socket.on('ice-candidate', async (data: { targetUserId: string; candidate: unknown }) => {
      await emitToUser(data.targetUserId, 'ice-candidate', data.candidate);
    });

    socket.on('end-call', async (data: { toUserId: string }) => {
      await emitToUser(data.toUserId, 'call-ended');
    });

    socket.on('disconnect', async () => {
      try {
        const user = await prisma.user.findFirst({ where: { socketId: socket.id } });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { socketId: null, isOnline: false, lastSeen: new Date() },
          });
          socket.broadcast.emit('user-online', { userId: user.id, isOnline: false, lastSeen: new Date() });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  async function emitToUser(userId: string, event: string, payload?: unknown) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.socketId) {
        io.to(user.socketId).emit(event, payload);
      }
    } catch (error) {
      console.error(`Error emitting ${event}:`, error);
    }
  }

  function getMessagePreview(type: string, content?: string) {
    if (content) return content;
    if (type === 'image') return 'Photo';
    if (type === 'video') return 'Video';
    if (type === 'voice') return 'Voice message';
    if (type === 'document') return 'Document';
    return 'New message';
  }
}
