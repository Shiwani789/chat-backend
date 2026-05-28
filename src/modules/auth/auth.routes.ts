import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { errorResponse } from '../../utils/errorResponse';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { phone, username, profilePic } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const baseUsername = username || `User_${phone.slice(-4)}`;
      let finalUsername = baseUsername;
      let counter = 1;

      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${baseUsername}_${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: { phone, username: finalUsername, profilePic: profilePic || null },
      });
    } else if (profilePic) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profilePic },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(errorResponse('Failed to register', error));
  }
});
