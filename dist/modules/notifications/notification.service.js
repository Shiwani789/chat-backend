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
exports.sendPushToUser = sendPushToUser;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const prisma_1 = require("../../config/prisma");
let firebaseReady = false;
function initFirebase() {
    var _a;
    if (firebaseReady || firebase_admin_1.default.apps.length) {
        firebaseReady = true;
        return;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase push disabled: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
        return;
    }
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
    firebaseReady = true;
}
function sendPushToUser(userId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        initFirebase();
        if (!firebaseReady)
            return;
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        if (!(user === null || user === void 0 ? void 0 : user.fcmToken))
            return;
        try {
            yield firebase_admin_1.default.messaging().send({
                token: user.fcmToken,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'messages',
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
            });
        }
        catch (error) {
            console.error('Push notification error:', error);
        }
    });
}
