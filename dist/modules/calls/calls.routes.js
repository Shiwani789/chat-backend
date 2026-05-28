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
exports.callsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
exports.callsRouter = (0, express_1.Router)();
exports.callsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { callerId, receiverId, type, status, duration } = req.body;
    if (!callerId || !receiverId) {
        return res.status(400).json({ error: 'callerId and receiverId are required' });
    }
    try {
        const callLog = yield prisma_1.prisma.callLog.create({
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
    }
    catch (error) {
        console.error('Create call log error:', error);
        res.status(500).json({ error: 'Failed to create call log' });
    }
}));
exports.callsRouter.get('/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const calls = yield prisma_1.prisma.callLog.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch call logs' });
    }
}));
