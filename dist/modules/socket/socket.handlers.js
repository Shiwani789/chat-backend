"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const prisma_1 = require("../../config/prisma");
const notification_service_1 = require("../notifications/notification.service");
function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        socket.on('register', (userId) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: { socketId: socket.id, isOnline: true, lastSeen: new Date() },
                });
                socket.broadcast.emit('user-online', { userId, isOnline: true });
            }
            catch (error) {
                console.error('Error registering user socket:', error);
            }
        }));
        socket.on('send-message', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!data.senderId || !data.receiverId || (!data.content && !data.mediaUrl)) {
                    socket.emit('message-error', { error: 'senderId, receiverId, and content or mediaUrl are required' });
                    return;
                }
                const message = yield prisma_1.prisma.message.create({
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
                const receiver = yield prisma_1.prisma.user.findUnique({ where: { id: data.receiverId } });
                let outgoingMessage = message;
                const sender = yield prisma_1.prisma.user.findUnique({
                    where: { id: data.senderId },
                    select: { username: true },
                });
                if (receiver === null || receiver === void 0 ? void 0 : receiver.socketId) {
                    outgoingMessage = yield prisma_1.prisma.message.update({
                        where: { id: message.id },
                        data: { status: 'DELIVERED' },
                    });
                    io.to(receiver.socketId).emit('receive-message', Object.assign(Object.assign({}, outgoingMessage), { senderName: sender === null || sender === void 0 ? void 0 : sender.username }));
                }
                yield (0, notification_service_1.sendPushToUser)(data.receiverId, {
                    title: (sender === null || sender === void 0 ? void 0 : sender.username) || 'New message',
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
            }
            catch (error) {
                console.error('Error sending message:', error);
            }
        }));
        socket.on('delete-message-for-me', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!message || (message.senderId !== data.userId && message.receiverId !== data.userId)) {
                    socket.emit('message-error', { error: 'Message not found' });
                    return;
                }
                yield prisma_1.prisma.messageDeletion.upsert({
                    where: { messageId_userId: { messageId: data.messageId, userId: data.userId } },
                    update: {},
                    create: { messageId: data.messageId, userId: data.userId },
                });
                socket.emit('message-deleted-for-me', { messageId: data.messageId });
            }
            catch (error) {
                console.error('Delete message for me error:', error);
            }
        }));
        socket.on('delete-message-for-everyone', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!message || message.senderId !== data.userId) {
                    socket.emit('message-error', { error: 'Only sender can delete this message for everyone' });
                    return;
                }
                const deletedMessage = yield prisma_1.prisma.message.update({
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
                yield emitToUser(message.receiverId, 'message-deleted-for-everyone', deletedMessage);
            }
            catch (error) {
                console.error('Delete message for everyone error:', error);
            }
        }));
        socket.on('messages-read', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma_1.prisma.message.updateMany({
                    where: { senderId: data.senderId, receiverId: data.receiverId, status: { not: 'READ' } },
                    data: { status: 'READ' },
                });
                const sender = yield prisma_1.prisma.user.findUnique({ where: { id: data.senderId } });
                if (sender === null || sender === void 0 ? void 0 : sender.socketId) {
                    io.to(sender.socketId).emit('messages-read-update', { receiverId: data.receiverId });
                }
            }
            catch (error) {
                console.error('Error marking messages read:', error);
            }
        }));
        socket.on('typing-start', (data) => __awaiter(this, void 0, void 0, function* () {
            yield emitToUser(data.receiverId, 'typing-start', { senderId: data.senderId });
        }));
        socket.on('typing-stop', (data) => __awaiter(this, void 0, void 0, function* () {
            yield emitToUser(data.receiverId, 'typing-stop', { senderId: data.senderId });
        }));
        socket.on('call-user', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userToCall = yield prisma_1.prisma.user.findUnique({ where: { id: data.userToCallId } });
                const caller = yield prisma_1.prisma.user.findUnique({ where: { id: data.callerId } });
                if (userToCall === null || userToCall === void 0 ? void 0 : userToCall.socketId) {
                    io.to(userToCall.socketId).emit('incoming-call', {
                        callerId: data.callerId,
                        callerName: (caller === null || caller === void 0 ? void 0 : caller.username) || data.callerName,
                        signalData: data.signalData,
                        callType: data.callType || 'video',
                    });
                }
                yield (0, notification_service_1.sendPushToUser)(data.userToCallId, {
                    title: (caller === null || caller === void 0 ? void 0 : caller.username) || 'Incoming call',
                    body: `${data.callType === 'voice' ? 'Voice' : 'Video'} call`,
                    data: {
                        type: 'call',
                        callType: data.callType || 'video',
                        callerId: data.callerId,
                        callerName: (caller === null || caller === void 0 ? void 0 : caller.username) || data.callerName || 'Unknown',
                    },
                });
                yield prisma_1.prisma.callLog.create({
                    data: {
                        callerId: data.callerId,
                        receiverId: data.userToCallId,
                        type: data.callType || 'video',
                        status: 'outgoing',
                    },
                });
            }
            catch (error) {
                console.error('Error calling user:', error);
            }
        }));
        socket.on('answer-call', (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield emitToUser(data.callerId, 'call-accepted', {
                    signalData: data.signalData,
                    answererId: data.answererId,
                });
                const callLog = yield prisma_1.prisma.callLog.findFirst({
                    where: { callerId: data.callerId, receiverId: data.answererId },
                    orderBy: { createdAt: 'desc' },
                });
                if (callLog) {
                    yield prisma_1.prisma.callLog.update({
                        where: { id: callLog.id },
                        data: { status: 'answered' },
                    });
                }
            }
            catch (error) {
                console.error('Error answering call:', error);
            }
        }));
        socket.on('ice-candidate', (data) => __awaiter(this, void 0, void 0, function* () {
            yield emitToUser(data.targetUserId, 'ice-candidate', data.candidate);
        }));
        socket.on('end-call', (data) => __awaiter(this, void 0, void 0, function* () {
            yield emitToUser(data.toUserId, 'call-ended');
        }));
        socket.on('disconnect', () => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma_1.prisma.user.findFirst({ where: { socketId: socket.id } });
                if (user) {
                    yield prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: { socketId: null, isOnline: false, lastSeen: new Date() },
                    });
                    socket.broadcast.emit('user-online', { userId: user.id, isOnline: false, lastSeen: new Date() });
                }
            }
            catch (error) {
                console.error('Error handling disconnect:', error);
            }
        }));
    });
    function emitToUser(userId, event, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId } });
                if (user === null || user === void 0 ? void 0 : user.socketId) {
                    io.to(user.socketId).emit(event, payload);
                }
            }
            catch (error) {
                console.error(`Error emitting ${event}:`, error);
            }
        });
    }
    function getMessagePreview(type, content) {
        if (content)
            return content;
        if (type === 'image')
            return 'Photo';
        if (type === 'video')
            return 'Video';
        if (type === 'voice')
            return 'Voice message';
        if (type === 'document')
            return 'Document';
        return 'New message';
    }
}
