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
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'username is required' });
    }
    try {
        let user = yield prisma_1.prisma.user.findUnique({ where: { username } });
        if (!user) {
            user = yield prisma_1.prisma.user.create({ data: { username } });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process user' });
    }
}));
exports.usersRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma_1.prisma.user.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));
exports.usersRouter.get('/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}));
exports.usersRouter.put('/:userId/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { username, about, profilePic } = req.body;
    try {
        const user = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: Object.assign(Object.assign(Object.assign({}, (username && { username })), (about !== undefined && { about })), (profilePic !== undefined && { profilePic })),
        });
        res.json(user);
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
}));
exports.usersRouter.put('/:userId/fcm-token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { fcmToken } = req.body;
    if (!fcmToken) {
        return res.status(400).json({ error: 'fcmToken is required' });
    }
    try {
        yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('FCM token update error:', error);
        res.status(500).json({ error: 'Failed to update FCM token' });
    }
}));
