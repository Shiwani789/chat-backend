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
exports.conversationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
exports.conversationsRouter = (0, express_1.Router)();
exports.conversationsRouter.get('/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const messages = yield prisma_1.prisma.message.findMany({
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
        const conversationMap = new Map();
        for (const msg of messages) {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!conversationMap.has(partnerId)) {
                const partner = msg.senderId === userId ? msg.receiver : msg.sender;
                const unreadCount = yield prisma_1.prisma.message.count({
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
    }
    catch (error) {
        console.error('Conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
}));
