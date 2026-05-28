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
exports.authRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const errorResponse_1 = require("../../utils/errorResponse");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, username, profilePic } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'phone is required' });
    }
    try {
        let user = yield prisma_1.prisma.user.findUnique({ where: { phone } });
        if (!user) {
            const baseUsername = username || `User_${phone.slice(-4)}`;
            let finalUsername = baseUsername;
            let counter = 1;
            while (yield prisma_1.prisma.user.findUnique({ where: { username: finalUsername } })) {
                finalUsername = `${baseUsername}_${counter}`;
                counter++;
            }
            user = yield prisma_1.prisma.user.create({
                data: { phone, username: finalUsername, profilePic: profilePic || null },
            });
        }
        else if (profilePic) {
            user = yield prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { profilePic },
            });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json((0, errorResponse_1.errorResponse)('Failed to register', error));
    }
}));
