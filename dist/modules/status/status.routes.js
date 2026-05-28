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
exports.statusRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
exports.statusRouter = (0, express_1.Router)();
exports.statusRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, content, mediaUrl, type, bgColor } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        const status = yield prisma_1.prisma.status.create({
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
    }
    catch (error) {
        console.error('Create status error:', error);
        res.status(500).json({ error: 'Failed to create status' });
    }
}));
exports.statusRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const statuses = yield prisma_1.prisma.status.findMany({
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
        const grouped = new Map();
        for (const status of statuses) {
            if (!grouped.has(status.userId)) {
                grouped.set(status.userId, {
                    user: status.user,
                    statuses: [],
                });
            }
            (_a = grouped.get(status.userId)) === null || _a === void 0 ? void 0 : _a.statuses.push(status);
        }
        res.json(Array.from(grouped.values()));
    }
    catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
}));
exports.statusRouter.post('/:statusId/view', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { statusId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        yield prisma_1.prisma.statusView.upsert({
            where: {
                statusId_userId: { statusId, userId },
            },
            update: {},
            create: { statusId, userId },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Record status view error:', error);
        res.status(500).json({ error: 'Failed to record view' });
    }
}));
