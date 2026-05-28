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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const calls_routes_1 = require("./modules/calls/calls.routes");
const prisma_1 = require("./config/prisma");
const conversations_routes_1 = require("./modules/conversations/conversations.routes");
const messages_routes_1 = require("./modules/messages/messages.routes");
const status_routes_1 = require("./modules/status/status.routes");
const users_routes_1 = require("./modules/users/users.routes");
const errorResponse_1 = require("./utils/errorResponse");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({ limit: '50mb' }));
exports.app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'whatsapp-clone-backend' });
});
exports.app.get('/api/health/db', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ ok: true, database: 'connected' });
    }
    catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json((0, errorResponse_1.errorResponse)('Database unavailable', error));
    }
}));
exports.app.use('/api/auth', auth_routes_1.authRouter);
exports.app.use('/api/users', users_routes_1.usersRouter);
exports.app.use('/api/conversations', conversations_routes_1.conversationsRouter);
exports.app.use('/api/messages', messages_routes_1.messagesRouter);
exports.app.use('/api/status', status_routes_1.statusRouter);
exports.app.use('/api/calls', calls_routes_1.callsRouter);
