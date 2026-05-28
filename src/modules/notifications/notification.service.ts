import admin from 'firebase-admin';
import { prisma } from '../../config/prisma';

let firebaseReady = false;

function initFirebase() {
  if (firebaseReady || admin.apps.length) {
    firebaseReady = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase push disabled: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  firebaseReady = true;
}

export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  }
) {
  initFirebase();
  if (!firebaseReady) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return;

  try {
    await admin.messaging().send({
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
  } catch (error) {
    console.error('Push notification error:', error);
  }
}
