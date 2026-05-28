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
exports.messagesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
exports.messagesRouter = (0, express_1.Router)();
exports.messagesRouter.get('/:user1/:user2', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user1, user2 } = req.params;
    try {
        yield prisma_1.prisma.message.updateMany({
            where: { senderId: user2, receiverId: user1, status: { not: 'READ' } },
            data: { status: 'READ' },
        });
        const messages = yield prisma_1.prisma.message.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
}));
exports.messagesRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderId, receiverId, content, type, mediaUrl, mediaName, mediaSize, duration, } = req.body;
    if (!senderId || !receiverId) {
        return res.status(400).json({ error: 'senderId and receiverId are required' });
    }
    if (!content && !mediaUrl) {
        return res.status(400).json({ error: 'content or mediaUrl is required' });
    }
    try {
        const message = yield prisma_1.prisma.message.create({
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
    }
    catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
}));
exports.messagesRouter.delete('/:messageId/for-me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        const message = yield prisma_1.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || (message.senderId !== userId && message.receiverId !== userId)) {
            return res.status(404).json({ error: 'Message not found' });
        }
        yield prisma_1.prisma.messageDeletion.upsert({
            where: { messageId_userId: { messageId, userId } },
            update: {},
            create: { messageId, userId },
        });
        res.json({ success: true, messageId, deletedFor: userId });
    }
    catch (error) {
        console.error('Delete for me error:', error);
        res.status(500).json({ error: 'Failed to delete message for me' });
    }
}));
exports.messagesRouter.delete('/:messageId/for-everyone', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        const message = yield prisma_1.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== userId) {
            return res.status(403).json({ error: 'Only sender can delete this message for everyone' });
        }
        const deletedMessage = yield prisma_1.prisma.message.update({
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
    }
    catch (error) {
        console.error('Delete for everyone error:', error);
        res.status(500).json({ error: 'Failed to delete message for everyone' });
    }
}));
